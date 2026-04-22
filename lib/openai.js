import OpenAI from "openai";

export const openai = new OpenAI({
    // 1. Ensure your API key is correctly pulled from .env
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
    
    // 2. IMPORTANT: Remove any trailing slash from the URL in your .env
    // It should be: https://generativelanguage.googleapis.com/v1beta/openai
    baseURL: process.env.OPENAI_BASE_URL,

    // 3. 🚨 THE CRITICAL FIX: Clear the User-Agent header
    // Google's servers reject the default OpenAI SDK user-agent string.
    defaultHeaders: { 'User-Agent': '' } 
});