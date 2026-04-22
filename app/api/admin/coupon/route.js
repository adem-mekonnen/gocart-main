import authAdmin from "@/middlewares/authAdmin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";

// Helper to handle Auth + Admin check to reduce repetition
const checkAdminAuth = async () => {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized - No session found", status: 401 };
    
    const is_Admin = await authAdmin(userId);
    if (!is_Admin) return { error: "Unauthorized - Admin access required", status: 403 };
    
    return { userId };
};

export async function POST(request) {
    try {
        const authCheck = await checkAdminAuth();
        if (authCheck.error) return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });

        const { coupon } = await request.json();
        if (!coupon || !coupon.code) return NextResponse.json({ error: "Invalid coupon data" }, { status: 400 });

        coupon.code = coupon.code.toUpperCase();

        // 1. Check for duplicates BEFORE creating
        const existing = await prisma.coupon.findUnique({ where: { code: coupon.code } });
        if (existing) return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });

        await prisma.coupon.create({ data: coupon }).then(async(coupon ) => {
            // run inngest scheduler function to delete coupon on expiry
            await inngest.send({
                name: "delete-coupon-on-expiry",
                data: {
                    code: coupon.code,
                    expiresAt: coupon.expiresAt,
                },
            });
        });
        return NextResponse.json({ message: "Coupon created successfully" }, { status: 201 });
    } catch (error) {
        console.error("Error creating coupon:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const authCheck = await checkAdminAuth();
        if (authCheck.error) return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });

        const { searchParams } = new URL(request.url); // Fixed how you get URL params
        const code = searchParams.get("code");
        
        if (!code) return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });

        // Ensure we delete the uppercase version
        await prisma.coupon.delete({ where: { code: code.toUpperCase() } });
        return NextResponse.json({ message: "Coupon deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const authCheck = await checkAdminAuth();
        if (authCheck.error) return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });

        const coupons = await prisma.coupon.findMany();
        return NextResponse.json({ coupons }, { status: 200 });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}