import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin"; // 🚨 FIX: Import your admin middleware!

export async function GET() {
  try {
    // 1. Await auth() as required in Next.js 15+ / Clerk v6
    const { userId } = await auth();
    
    if (!userId) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // 2. 🚨 FIX: Secure this route! Only admins should see dashboard stats.
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Not an admin" }, { status: 403 });
    }

    // 3. Get total counts (these are fast)
    const totalOrders = await prisma.order.count();
    const totalStores = await prisma.store.count();
    const totalProducts = await prisma.product.count();

    // 4. 🚀 OPTIMIZATION: Use Prisma aggregate to sum revenue instantly at the database level
    const revenueAggregation = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
    });

    // Fallback to 0 if there are no orders yet (prevents errors)
    const totalRevenue = revenueAggregation._sum.total || 0;
    const revenue = totalRevenue.toFixed(2);

    // 5. Build and return the payload (Fixed the typo in 'dashboardData')
    const dashboardData = {
      totalOrders,
      totalStores,
      totalProducts,
      revenue,
    };

    return NextResponse.json(dashboardData);
    
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}