// add new rating
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
export const dynamic = "force-dynamic";

export async function POST(request){
    try {
        const { userId } = await auth();
        
        // 1. Check if user is logged in
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { orderId, productId, rating, review } = await request.json();

        // 2. Validate input (optional but recommended)
        if (!orderId || !productId || !rating) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 3. FIX: Changed findUnidue to findFirst to safely search by both id and userId
        const order = await prisma.order.findFirst({
            where: { 
                id: orderId, 
                userId: userId 
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // 4. Check if the user already rated this specific product from this specific order
        const isAlreadyRated = await prisma.rating.findFirst({
            where: { productId, orderId }
        });

        // 5. FIX: Logic was reversed. We want to block them if they ALREADY rated it.
        if (isAlreadyRated) {
            return NextResponse.json({ error: "You have already rated this product for this order" }, { status: 400 });
        }

        // 6. Create the rating
        const response = await prisma.rating.create({
            data: { 
                userId, 
                productId, 
                rating: Number(rating), // Ensure it's a number
                review, 
                orderId 
            }
        });

        return NextResponse.json({ message: "Rating added successfully", rating: response });

    } catch (error) {
        console.error("RATING POST ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });   
    }
}

export async function GET(request){
    try {
        const { userId } = await auth();
        
        // FIX: Use 401 Unauthorized instead of 404 for missing users
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ratings = await prisma.rating.findMany({ 
            where: { userId } 
        });

        return NextResponse.json({ ratings }); // Changed 'rating' to 'ratings' for better naming convention
      
    } catch (error) {
        console.error("RATING GET ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });   
    }
}