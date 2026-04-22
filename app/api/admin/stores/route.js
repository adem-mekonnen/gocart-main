import authAdmin from "@/middlewares/authAdmin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 

// Get all approved stores for admin dashboard
export async function GET(request) {
    try {
        // 1. Await auth() as required in Next.js 15+ / Clerk v6
        const { userId } = await auth();
        
        // 2. Early return if the user is not logged in at all
        if (!userId) {
          return NextResponse.json({ error: "Unauthenticated - Please log in" }, { status: 401 });
        }
        
        // 3. Check if the logged-in user is an admin
        const isAdmin = await authAdmin(userId);
        
        // 4. Return error if they are logged in but NOT an admin
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden - Not an admin" }, { status: 403 });
        }
        
        // 5. Fetch APPROVED stores from the database, including the user details
        const stores = await prisma.store.findMany({ 
            where: { status: "approved" }, 
            include: { user: true } 
        });
        
        // 6. Return the stores in the response
        return NextResponse.json({ stores });
        
    } catch (error) {
        console.error("Error fetching approved stores for admin dashboard:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}