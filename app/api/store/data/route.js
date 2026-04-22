// get store info and store products 
import { NextResponse } from "next/server";
import prisma from "@/lib/db"; 

export async function GET(request) {
  try {
    // 1. Properly initialize the URL to extract search params
    const { searchParams } = new URL(request.url);
    
    // 2. Get the raw parameter first to prevent a null pointer crash
    const usernameParam = searchParams.get("username"); 

    if (!usernameParam) {
      return NextResponse.json(
        { error: "Username query parameter is required" }, 
        { status: 400 }
      );
    }
    // 3. Safe to convert to lowercase now
    const username = usernameParam.toLowerCase(); 

    // 4. Query the database
    // We use findFirst because we are filtering by both a unique field (username) 
    // and a non-unique field (isActive)
    const store = await prisma.store.findFirst({
      where: { 
        username: username, 
        isActive: true // Ensure the store is active
      }, 
      include: {
        Product: { // Matches your Prisma schema 'Product' model
          where: {
            inStock: true // Only return products that are currently in stock
          },
          include: { 
            rating: true // Matches your Prisma schema 'rating' field
          }
        }
      }
    });

    // 5. If no store is found matching these criteria
    if (!store) {
      return NextResponse.json(
        { error: "Store not found or currently inactive" }, 
        { status: 404 }
      );
    }

    // 6. Return the successfully found store with its nested products and ratings
    return NextResponse.json({ store }, { status: 200 });
  
  } catch (error) {
    console.error("Error fetching store info and products:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}