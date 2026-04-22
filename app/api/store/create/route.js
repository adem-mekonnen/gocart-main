// app/api/store/create/route.js
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 

// 🚨 FIX: Notice the curly braces around { imagekit }
import { imagekit } from "@/configs/imagekit"; 
export const dynamic = "force-dynamic";
export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get("name");
    const username = formData.get("username");
    const description = formData.get("description");
    const email = formData.get("email");
    const contact = formData.get("contact");
    const address = formData.get("address");
    const image = formData.get("image");

    if (!name || !username || !description || !email || !contact || !address || !image) {
      return NextResponse.json(
        { error: "Missing required fields, including the logo image" },
        { status: 400 }
      );
    }

    const existingStore = await prisma.store.findFirst({
      where: { userId: userId },
    });

    if (existingStore) {
      return NextResponse.json(
        { error: "You already have a store", status: existingStore.status },
        { status: 400 }
      );
    }

    const usernameTaken = await prisma.store.findFirst({
      where: { username: username.toLowerCase() },
    });

    if (usernameTaken) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    // Safely parse and upload the image to ImageKit
    const buffer = Buffer.from(await image.arrayBuffer());
    
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: image.name,
      folder: "/logos", 
    });

    const optimizedImageUrl = imagekit.url({
      src: uploadResponse.url, 
      transformation:[
        {
          width: "512", 
          format: "webp", 
          cropMode: "extract",
        },
      ],
    });

    const newStore = await prisma.store.create({
      data: {
        userId: userId, 
        name: name,
        description: description,
        username: username.toLowerCase(),
        email: email,
        contact: contact,
        address: address,
        logo: optimizedImageUrl,
      },
    });

    return NextResponse.json(
      { message: "Store created, waiting for approval", storeId: newStore.id },
      { status: 201 } 
    );

  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const store = await prisma.store.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({ status: store.status });
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json({ error: "Failed to fetch store" }, { status: 500 });
  }
}