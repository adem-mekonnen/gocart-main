import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request) {
  try {
    // This is the most reliable way to get the user in Next.js App Router
    const { userId } = await auth(); 
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address } = await request.json();
    address.userId = userId;
    
    const newAddress = await prisma.address.create({
        data: address
    });
    
    return NextResponse.json({ newAddress, message: "Address added successfully" });
  } catch (error) {
    console.error("Error adding address:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = await auth();
    
    // ✅ FIX 1: Check if user is logged in before asking Prisma!
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
        where: { userId }
    });
    
    return NextResponse.json({ addresses }); // Sending back 'addresses'
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}