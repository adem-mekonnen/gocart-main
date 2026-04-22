import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import authSeller from "@/middlewares/authSeller";

export async function GET() {
  try {
    // 1. MUST await auth()
    const { userId } = await auth(); 
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Await your middleware
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized Seller or Store Not Approved" }, { status: 403 });
    }

    // 3. Get all products for this store first (we need these IDs for ratings)
    const products = await prisma.product.findMany({
      where: { storeId },
    });

    const productIds = products.map((p) => p.id);

    // 4. Get all orders
    const orders = await prisma.order.findMany({
      where: { storeId },
    });

    // 5. Get ratings for these specific products
    const ratings = await prisma.rating.findMany({
      where: {
        productId: {
          in: productIds,
        },
      },
      include: {
        user: true,
        product: true,
      }
    });

    // 6. Calculate Earnings (using 'total' as per your Order model)
    const totalEarnings = orders.reduce((acc, order) => acc + order.total, 0);

    const dashboardData = {
      ratings,
      totalOrders: orders.length,
      totalEarnings: Math.round(totalEarnings),
      totalProducts: products.length,
    };

    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}