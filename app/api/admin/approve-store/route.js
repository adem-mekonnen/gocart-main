import authAdmin from "@/middlewares/authAdmin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // 🚨 FIX: Matches the import used in your other files!

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

    // 5. Parse the request body
    const { storeId, status } = await request.json();
    
    // 6. Validate that both required fields exist
    if (!storeId || !status) {
      return NextResponse.json({ error: "Missing storeId or status in request body" }, { status: 400 });
    }

    // 7. Ensure the status is an allowed value to prevent bugs
    if (status !== "approved" && status !== "rejected") {
       return NextResponse.json({ error: "Invalid status. Must be 'approved' or 'rejected'." }, { status: 400 });
    }

    // 8. Update database and return dynamic messages
    if (status === "approved") {
      await prisma.store.update({
        where: { id: storeId },
        data: { status: "approved", isActive: true },
      });
      return NextResponse.json({ message: "Store approved successfully" });
      
    } else if (status === "rejected") {
      await prisma.store.update({
        where: { id: storeId },
        data: { status: "rejected", isActive: false },
      });
      return NextResponse.json({ message: "Store rejected successfully" });
    }
    
  } catch (error) {
    console.error("Error updating store status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// get all pending and rejected stores for admin dashboard
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
        // 5. Fetch pending and rejected stores from the database
        const stores = await prisma.store.findMany({ where:  
            { status :{in :["pending", "rejected"]} }, include : { user: true    } } );
        // 6. Return the stores in the response
        return NextResponse.json({ stores });
    } catch (error) {
        console.error("Error fetching stores for admin dashboard:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}