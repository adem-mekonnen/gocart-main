// create auth admin middleware
import { clerkClient } from "@clerk/nextjs/server";

const authAdmin = async (userId) => {
  try {
    if (!userId) {
      return false;
    }

    // 1. FIX: clerkClient() must be awaited in Clerk v6 / Next.js 15+
    const client = await clerkClient();

    // 2. Fetch the user details from Clerk
    const user = await client.users.getUser(userId);

    // 3. Safety Check: Ensure the user actually has an email address
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!primaryEmail) {
      return false; 
    }

    // 4. Safety Check: Fallback to an empty string if ADMIN_EMAIL is undefined in .env
    const adminEmails = (process.env.ADMIN_EMAIL || "").split(",");

    // 5. Check if the user's email is in the admin list
    return adminEmails.includes(primaryEmail);

  } catch (error) {
    console.error("Error in authAdmin middleware:", error);
    return false;
  }
};

export default authAdmin;