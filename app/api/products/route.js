import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function GET(request) {
  try {
    // Fixed 'isStock' -> 'inStock' and optimized the query
    const products = await prisma.product.findMany({
      where: {
        inStock: true, // <--- FIX IS HERE
        store: {
          isActive: true, // Filters active stores directly in the DB
        },
      },
      include: {
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });

  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}