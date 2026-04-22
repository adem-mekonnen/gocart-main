import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import authSeller from "@/middlewares/authSeller"; // Ensure this path is correct

// Toggle stock products 
export async function POST(request) { // Note: PATCH is technically better for updates
  try {
      const { userId } = await auth(); 
    
    // 1. FIXED: Always check if the user is actually logged in first
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const storeId = await authSeller(userId); // Check if the user is an authenticated seller

    // 2. FIXED: Returned standard JSON. Changed to 403 Forbidden (since they are logged in, but not an approved seller)
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized Seller or Store Not Approved" }, { status: 403 });
    }

    // Parse the request body safely
    const { productId } = await request.json(); 

    // 3. FIXED: Returned standard JSON for frontend consistency
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Security Check: Find the product ensuring it belongs to THIS exact store
    const product = await prisma.product.findFirst({
      where: { 
        id: productId, 
        storeId: storeId // Vital: prevents sellers from editing other sellers' products
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found or unauthorized to edit" }, { status: 404 });
    }

    // Toggle the stock status (! flips true to false, and false to true)
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { inStock: !product.inStock },
    });

    // Success response
    return NextResponse.json(
      { message: "Stock status updated", product: updatedProduct }, 
      { status: 200 }
    );

  } catch (error) {
    console.error("Error toggling product stock:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}