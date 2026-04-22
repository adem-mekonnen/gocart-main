import authAdmin from "@/middlewares/authAdmin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 

// Toggle store's isActive status
export async function POST(request) {
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
        
        // 5. Parse the request body correctly (🚨 FIX: Destructured storeId)
        const { storeId } = await request.json(); 
        
        if (!storeId) {
            return NextResponse.json({ error: "Missing store ID in request body" }, { status: 400 });
        }

        // 6. Find the store to check its current status
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        
        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        // 7. Update isActive field to toggle it
        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: { isActive: !store.isActive },
        });

        // 8. Return the success message AND the new status
        return NextResponse.json({ 
            message: "Store updated successfully",
            isActive: updatedStore.isActive // 💡 Pro-tip: Send the new status back to the frontend!
        });
        
    } catch (error) {
        // 🚨 FIX: Updated console error message so it doesn't say "fetching approved stores"
        console.error("Error toggling store active status:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}