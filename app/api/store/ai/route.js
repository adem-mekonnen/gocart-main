import authSeller from "@/middlewares/authAdmin";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server"; 

/**
 * Native Gemini API Helper
 */
async function main(base64Image, mimeType) {
  // 1. Aggressive cleaning of API Key (removes quotes, commas, and spaces)
  const apiKey = (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "")
    .trim()
    .replace(/['",]/g, "");
  
  // 2. Clean Model Name
  const modelName = (process.env.OPENAI_MODEL || "gemini-1.5-flash")
    .trim()
    .replace(/^models\//, "")
    .replace(/[^a-zA-Z0-9.-]/g, "");

  // 3. SWITCHED TO v1beta (More reliable for gemini-1.5-flash)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  console.log("Attempting Gemini API (v1beta) with model:", modelName);

  const payload = {
    contents: [{
      parts: [
        {
          text: "Analyze this image. Return ONLY raw JSON. Do not include markdown code blocks. Format: {\"name\": \"...\", \"description\": \"...\"}"
        },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Image.trim()
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("Gemini API Error Detail:", response.status, responseText);
    // If 404 happens here, it's a structural error in the URL or Model name
    throw new Error(`Gemini rejected request (${response.status}). Please check if the model name is correct in .env`);
  }

  const data = JSON.parse(responseText);
  
  // Extract text safely from Gemini's nested response
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!rawContent) {
    console.log("Full Response Object:", JSON.stringify(data));
    throw new Error("AI returned an empty response. Ensure your API Key is active.");
  }

  // Final cleanup of the JSON string
  const cleaned = rawContent.replace(/```json|```/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON Parse Error. AI output was:", rawContent);
    throw new Error("AI output was not valid JSON");
  }
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const isSeller = await authSeller(userId);
    if (!isSeller) return NextResponse.json({ error: "Seller access required" }, { status: 403 });

    const { base64Image, mimeType } = await request.json();
    if (!base64Image || !mimeType) {
        return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const result = await main(base64Image, mimeType);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Internal AI Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}