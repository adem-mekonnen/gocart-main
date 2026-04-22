// Get dashboard data for seller (total orders, total Earnings, and total products)
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma  from "@/lib/db";
import authSeller from "@/middlewares/authSeller";

export async function GET(request) {
  try {
    const { userId } = auth(request); 
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized Seller or Store Not Approved" }, { status: 403 });
    }

    // 1. Get all orders
    const orders = await prisma.order.findMany({
      where: { storeId },
    });

    // 2. Get all products
    const products = await prisma.product.findMany({
      where: { storeId },
    });

    // 3. Get all ratings for the products of the seller
    // FIXED: Changed 'ProductId' to 'productId' to match schema
    const ratings = await prisma.rating.findMany({
      where: {
        productId: {
          in: products.map((product) => product.id),
        },
      },
      include: {
        user: true,
        product: true,
      }
    });

    // 4. Calculate Earnings
    // FIXED: Changed 'totalAmount' to 'total' to match your Order model
    const totalEarnings = orders.reduce((acc, order) => acc + order.total, 0);

    const dashboardData = {
      ratings,
      totalOrders: orders.length,
      totalEarnings: Math.round(totalEarnings),
      totalProducts: products.length, // Renamed key for clarity
    };

    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}