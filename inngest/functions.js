import { inngest } from "./client";
import { prisma } from "@/lib/db"; 

// 1. Corrected syncUserCreation
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-create" },
  { event: "clerk/user.created" },
  async ({ event, step }) => {
    // FIX: Change event.data.data to event.data
    const user = event.data; 

    await step.run("create-user-in-db", async () => {
      const email = user.email_addresses?.[0]?.email_address || "";
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";

      return await prisma.user.create({
        data: {
          id: user.id,
          email: email,
          name: `${firstName} ${lastName}`.trim(),
          image: user.image_url || "",
        },
      });
    });
  }
);

// 2. Corrected syncUserUpdate
export const syncUserUpdate = inngest.createFunction(
  { id: "sync-user-update" },
  { event: "clerk/user.updated" },
  async ({ event, step }) => {
    // FIX: Change event.data.data to event.data
    const user = event.data;

    await step.run("update-user-in-db", async () => {
      const email = user.email_addresses?.[0]?.email_address || "";
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";

      return await prisma.user.update({
        where: { id: user.id },
        data: {
          email: email,
          name: `${firstName} ${lastName}`.trim(),
          image: user.image_url || "",
        },
      });
    });
  }
);

// 3. Corrected syncUserDeletion
export const syncUserDeletion = inngest.createFunction(
  { id: "sync-user-deletion" },
  { event: "clerk/user.deleted" },
  async ({ event, step }) => {
    // FIX: Change event.data.data to event.data
    const user = event.data;

    await step.run("delete-user-in-db", async () => {
      return await prisma.user.delete({
        where: { id: user.id },
      });
    });
  }
);

/// 4. Corrected Coupon Expiry
// This function should be triggered when you CREATE the coupon
export const deleteCouponOnExpiry = inngest.createFunction(
  { id: "delete-expired-coupons" },
  { event: 'app/coupon.created' }, // Triggered when coupon is created
  async ({ event, step }) => {
     const { data } = event; // data should contain { code, expiresAt }
     
     // Sleep until the expiry date
     await step.sleepUntil(data.expiresAt);
     
     await step.run("delete-expired-coupon", async () => {
       await prisma.coupon.deleteMany({ // Use deleteMany to be safe
        where: { code: data.code },
      });
    });
  }
);