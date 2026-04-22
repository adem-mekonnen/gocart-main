import { auth } from "@clerk/nextjs/server"; // Use the correct clerk auth import
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// update user cart
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

   // FIX: Read the body ONLY ONCE
    const body = await request.json();
    const { cart } = body; 

    // save the cart object directly to the JSON column in Neon
    await prisma.user.update({
        where: { id: userId },
        data: { cart: cart } 
    });

    return NextResponse.json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// get user cart
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { cart: true }
    });

    // Return the JSON cart object (default to empty if null)
    return NextResponse.json(user?.cart || { total: 0, cartItems: {} });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}