import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";
import Stripe from "stripe"; // Use the import properly

export async function POST(request) {
  try {
    const { userId, has } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { addressId, items, couponCode, paymentMethod } = body;

    if (!addressId || !items || items.length === 0 || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isPlusMember = has({ role: 'plus' }) || has({ plan: 'plus' }); 

    // 2. Verify Coupon
    let coupon = null;
    if (couponCode) {
      coupon = await prisma.coupon.findFirst({
        where: { code: { equals: couponCode, mode: 'insensitive' } },
      });

      if (!coupon) return NextResponse.json({ error: "Invalid coupon" }, { status: 400 });

      if (coupon.forNewUser) {
        const orderCount = await prisma.order.count({ where: { userId } });
        if (orderCount > 0) return NextResponse.json({ error: "Valid for first order only" }, { status: 400 });
      }

      if (coupon.forMember && !isPlusMember) {
        return NextResponse.json({ error: "Plus membership required" }, { status: 403 });
      }
    }

    // 3. Performance Fix: Fetch all products in ONE query
    const productIds = items.map(item => item.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map(dbProducts.map(p =>[p.id, p]));

    // 4. Group by Store using a standard Object
    const ordersByStore = {};
    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) continue;
      
      const storeId = product.storeId;
      if (!ordersByStore[storeId]) ordersByStore[storeId] = [];
      ordersByStore[storeId].push({ ...item, price: product.price });
    }

    let isShippingFeeAdded = false;

    // 5. Create Orders
    const orderPromises = Object.entries(ordersByStore).map(async ([storeId, sellerItems]) => {
      let storeTotal = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      
      if (coupon) {
        const discountAmount = (storeTotal * coupon.discount) / 100;
        storeTotal = storeTotal - discountAmount;
      }

      if (!isPlusMember && !isShippingFeeAdded) {
        storeTotal += 5;
        isShippingFeeAdded = true;
      }

      return prisma.order.create({
        data: {
          userId,
          storeId,
          addressId,
          total: parseFloat(storeTotal.toFixed(2)),
          paymentMethod,
          isPaid: false, 
          isCouponUsed: !!coupon,
          coupon: coupon || {},
          orderItems: {
            create: sellerItems.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      });
    });

    // 🚨 FIX IS HERE: We save the created orders to variables so Stripe can read them!
    const createdOrders = await Promise.all(orderPromises);
    const fullAmount = createdOrders.reduce((sum, order) => sum + order.total, 0);
    const orderIds = createdOrders.map(order => order.id);
     
    if (paymentMethod === "STRIPE") {
      // Initialize the Stripe instance correctly
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 
      
      // Added fallback base URL just in case 'origin' fails
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL;

      const session = await stripe.checkout.sessions.create({ 
        payment_method_types: ['card'],
        line_items:[
          {
            price_data: {
              currency: 'usd', 
              product_data: {  
                name: 'Store Order' 
              },
              unit_amount: Math.round(fullAmount * 100) // fullAmount is now defined!
            },
            quantity: 1
          }
        ],
        mode: 'payment', 
        success_url: `${origin}/loading?nextUrl=orders`,
        cancel_url: `${origin}/cart`, 
        metadata: {
          orderIds: orderIds.join(','), // orderIds is now defined!
          userId: userId,
          applId: 'goCart'
        }
      });
      
      return NextResponse.json({ session });
    }

    // 6. Clear user cart in Neon DB (Only runs for COD orders)
    await prisma.user.update({
      where: { id: userId },
      data: { cart:[] }
    });

    return NextResponse.json({ message: "Order placed successfully!" });

  } catch (error) {
    console.error("ORDER API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET all orders for the user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR:[
          { paymentMethod: PaymentMethod.COD},
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] }
        ]
      },
      include: {
        orderItems: {
          include: { product: true }
        },
        address: true,
        store: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Order GET Error:", error);
    return NextResponse.json({error : error.message},{status : 400});
   
  }
}