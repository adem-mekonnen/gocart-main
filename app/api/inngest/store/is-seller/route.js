import { auth } from "@clerk/nextjs/server";    
import { NextResponse } from "next/server";
import  prisma  from "@/lib/db";
import authSeller from "@/middlewares/authSeller";

export async function GET() { 
  try {
    const { userId } = auth(); 
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Kept your variable name 'isSeller' (Note: it holds the store ID string)
    const isSeller = await authSeller(userId); 

    if (!isSeller) {
      return NextResponse.json({ error: "Unauthorized Seller or Store Not Approved" }, { status: 403 });
    }

    // Fetch the store info using the ID returned by authSeller
    const storeInfo = await prisma.store.findUnique({
      where: { userId }, // isSeller contains the Store ID here
    });

    // Returning exactly what you requested: { isSeller, storeInfo }
    return NextResponse.json({ isSeller, storeInfo }, { status: 200 });

  } catch (error) { 
    console.error("Error in authSeller route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}