import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId, has } = await auth(request); 

    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: "Coupon code required" }, { status: 400 });

    // 1. Only look up by code to see if it exists at all
    const coupon = await prisma.coupon.findFirst({
      where: { 
        code: code.toUpperCase(),
      },
    });

    // 2. If it doesn't exist in the database at all
    if (!coupon) {
      return NextResponse.json({ error: "This coupon does not exist" }, { status: 404 });
    }

    // 3. Manually check if it has expired
    // We compare the current time to the expiration date
    if (new Date() > new Date(coupon.expiresAt)) {
       return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
    }

    // 4. Check for New User (LAP2025 is TRUE in your DB)
    if (coupon.forNewUser) {
      const orderCount = await prisma.order.findMany({ where: { userId } });
      if (orderCount.length > 0) {
        return NextResponse.json({ error: "Valid for your first order only" }, { status: 400 });
      }
    }

    // 5. Check membership
    if (coupon.forMember) {
        const hasPlusPlan = has({ plan: 'plus' }); 
        if (!hasPlusPlan) {
             return NextResponse.json({ error: "Valid for Plus members only" }, { status: 403 });
        }
    }

    return NextResponse.json({ coupon });

  } catch (error) {
    console.error("Coupon Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}