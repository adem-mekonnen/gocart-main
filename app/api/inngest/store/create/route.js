import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import imagekit from "@/lib/imagekit";

export async function POST(request) {
  try {
    // 1. Await the session
    const { userId } = await auth(); 
    
    // Check terminal log to see if this is null
    console.log("POST DEBUG: userId is:", userId);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Ensure User exists in DB before linking Store (Foreign Key constraint)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
       return NextResponse.json({ error: "User record not found in database. Please wait for sync." }, { status: 400 });
    }

    // 3. Check existing store
    const existingStore = await prisma.store.findUnique({ where: { userId } });
    if (existingStore) {
      return NextResponse.json({ error: "Store already exists" }, { status: 400 });
    }

    // 4. Upload to ImageKit
    const buffer = Buffer.from(await image.arrayBuffer());
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: image.name,
      folder: "/logos",
    });

    const optimizedImageUrl = imagekit.url({
      src: uploadResponse.url,
      transformation:[{ width: "512", format: "webp" }],
    });

    // 5. Create store
    const newStore = await prisma.store.create({
      data: {
        userId,
        name,
        description,
        username: username.toLowerCase(),
        email,
        contact,
        address,
        logo: optimizedImageUrl,
      },
    });

    return NextResponse.json({ message: "Success", storeId: newStore.id }, { status: 201 });

  } catch (error) {
    console.error("POST Error Details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth(); 
    
    console.log("GET DEBUG: userId is:", userId);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { userId },
    });

    if (!store) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ status: store.status });
  } catch (error) {
    console.error("GET Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}