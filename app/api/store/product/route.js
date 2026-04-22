import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import authSeller from "@/middlewares/authSeller";
import imagekit from "@/lib/imagekit"; 

export async function POST(request) {
  try {
    // 1. MUST await auth()
    const { userId } = await auth(); 
    
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const storeId = await authSeller(userId); 

    if (!storeId) {
      return new NextResponse("Unauthorized Seller or Store Not Approved", { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const mrp = formData.get("mrp");
    const price = formData.get("price");
    const category = formData.get("category");
    const images = formData.getAll("images"); 

    if (!name || !description || !price || !mrp || !category || images.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

  const imageUrls = await Promise.all(
  images.map(async (image) => {
    const buffer = Buffer.from(await image.arrayBuffer());
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: image.name,
      folder: "/products", // Good practice to use a leading slash
    });
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

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        mrp: parseFloat(mrp),
        price: parseFloat(price),
        category,
        images: imageUrls,
        storeId: storeId 
      },
    });

    return NextResponse.json({ message: "Product created successfully", product: newProduct }, { status: 201 });

  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // 2. MUST await auth() here as well
    const { userId } = await auth(); 
    
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const storeId = await authSeller(userId); 

    if (!storeId) {
      return new NextResponse("Unauthorized Seller", { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { storeId: storeId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ products }, { status: 200 });
    
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}