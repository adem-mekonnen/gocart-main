import authAdmin from "@/middlewares/authAdmin";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // 1. Await auth() as required in Next.js 15+ / Clerk v6
    const { userId } = await auth(); 
    
    // 2. Early return if the user is not logged in at all (Unauthenticated)
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated - Please log in" }, { status: 401 });
    }

    // 3. Check if the logged-in user is an admin
    const isAdmin = await authAdmin(userId);
    
    // 4. Return error if they are logged in but NOT an admin (Forbidden/Unauthorized)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Not an admin" }, { status: 403 }); // 403 is more accurate for "Forbidden"
    }
    
    // 5. Success!
    return NextResponse.json({ isAdmin });
    
  } catch (error) {
    console.error("Admin Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}