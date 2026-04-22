import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { syncUserCreation, syncUserUpdate, syncUserDeletion, deleteCouponOnExpiry } from "@/inngest/functions";

// API endpoint serving Inngest functions for user sync
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions:[ 
    syncUserCreation,
    syncUserUpdate,
    syncUserDeletion,
    deleteCouponOnExpiry
  ],
});