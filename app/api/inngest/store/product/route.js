import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma  from "@/lib/db";
import authSeller from "@/middlewares/authSeller"; // Ensure this path is correct
import imagekit from "@/lib/imagekit";// ADDED MISSING IMPORT

// Add new product to database and trigger product.created event
export async function POST(request) {
  try {
    const { userId } = auth(request); // Get the authenticated user's ID
    
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. FIXED: Added `await` and removed `{ }` object destructuring
    const storeId = await authSeller(userId); 

    if (!storeId) {
      return new NextResponse("Unauthorized Seller or Store Not Approved", { status: 403 });
    }

    // Get the data from the form data
    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const mrp = formData.get("mrp");
    const price = formData.get("price");
    const category = formData.get("category");
    const images = formData.getAll("images"); // Get all images as an array

    // 2. FIXED: Added `mrp` to validation to prevent `NaN` Prisma crash
    if (!name || !description || !price || !mrp || !category || images.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upload images to imagekit
    const imageUrls = await Promise.all(
      images.map(async (image) => {
        const buffer = Buffer.from(await image.arrayBuffer());
        const uploadResponse = await imagekit.upload({
          file: buffer,
          fileName: image.name,
          folder: "/products", // Good practice to use a leading slash
        });
        
        // 3. FIXED: Changed `path` to `src` and fixed transformation parameters
        const url = imagekit.url({
          src: uploadResponse.url, 
          transformation:[
            {
              width: "500",
              height: "500",    
              cropMode: "extract", // Correct ImageKit crop syntax
              format: "webp"       // Added to optimize image size
            },
          ],
        });
        return url;
      })
    );

    // Create the product in Prisma
    const newProduct = await prisma.product.create({
      data: {
        name: name,
        description: description,
        mrp: parseFloat(mrp),
        price: parseFloat(price),
        category: category,
        images: imageUrls,
        storeId: storeId // Successfully linked to the approved store!
      },
    });

    return NextResponse.json({ message: "Product created successfully", product: newProduct }, { status: 201 });

  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


// Get all products for seller 
export async function GET(request) {
  try {
    const { userId } = auth(); 
    
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 4. FIXED: Added `await` and removed `{ }` object destructuring
    const storeId = await authSeller(userId); 

    if (!storeId) {
      return new NextResponse("Unauthorized Seller", { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { storeId: storeId },
      orderBy: { createdAt: 'desc' } // Optional: Good practice to show newest products first
    });

    return NextResponse.json({ products }, { status: 200 });
    
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}