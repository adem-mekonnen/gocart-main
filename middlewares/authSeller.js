import { prisma } from "@/lib/db"; // Use the alias!

const authSeller = async (userId) => {
  if (!userId) return false;

  try {
    const store = await prisma.store.findUnique({
      where: { userId: userId },
    });

    if (store && store.status === "approved") {
        return store.id;
    }
    
    return false;
    
  } catch (error) {
    console.error("Error in authSeller helper:", error);
    return false;
  }
};

export default authSeller;