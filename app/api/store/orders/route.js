// update seller order status
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import authSeller from "@/middlewares/authSeller"; // Ensure this path is correct
import { add } from "date-fns";
export async function POST(request) { // Note: PATCH is technically better for updates
  try {
      const { userId } = await auth(request);
      const storeId = await authSeller(userId);
    // 1. FIXED: Always check if the user is actually logged in first
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    // 2. FIXED: Returned standard JSON. Changed to 403 Forbidden (since they are logged in, but not an approved seller)
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized Seller or Store Not Approved" }, { status: 403 });
    }
    // Parse the request body safely
    const { orderId, newStatus } = await request.json();
    // 3. FIXED: Returned standard JSON for frontend consistency
    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Order ID and new status are required" }, { status: 400 });
    }
    // Security Check: Find the order ensuring it belongs to THIS exact store
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        storeId: storeId // Vital: prevents sellers from editing other sellers' orders
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found or unauthorized to edit" }, { status: 404 });
    }
    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
    // Success response
    return NextResponse.json(
      { message: "Order status updated", order: updatedOrder }, 
      { status: 200 }
    );
  }
    catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// get all orders for a seller
export async function GET(request) {
  try {
        const { userId } = await auth(request);
        const storeId = await authSeller(userId);
        if (!userId) {
          return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized Seller or Store Not Approved" }, { status: 403 });
        }
        const orders = await prisma.order.findMany({
            where: { storeId: storeId },
            include: {user :true, address: true, orderItems: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}