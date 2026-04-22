import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 1. Initialize Stripe with the SECRET KEY
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        // Get the raw body text for Stripe signature verification
        const body = await request.text();
        
        // 2. Correct Next.js App Router syntax for getting headers
        const sig = request.headers.get('stripe-signature');
        
        if (!sig) {
            return NextResponse.json({ error: "No signature provided" }, { status: 400 });
        }

        // 3. Construct the event using your WEBHOOK secret
        const event = stripe.webhooks.constructEvent(
            body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // 4. Define the logic to process payment intents
        const handlePaymentIntent = async (paymentIntentId, isPaid) => {
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            });

            if (!sessions.data || sessions.data.length === 0) return;

            // Extract metadata (Matched to your checkout code keys: orderIds, userId, applId)
            const { orderIds, userId, applId } = sessions.data[0].metadata;
            
            // Safety check: ensure the webhook is for this app
            if (applId !== 'goCart') {
                console.log("Ignoring webhook for a different application");
                return; 
            }

            const orderIdsArray = orderIds.split(',');

            if (isPaid) {
                // UPDATE: Mark all orders as paid
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { isPaid: true }
                    });
                }));

                // UPDATE: Clear the user's cart in the database
                await prisma.user.update({
                    where: { id: userId },
                    data: { cart: [] }
                });
            } else {
                // DELETE: If payment failed, remove the orders so they don't clog the DB
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.delete({
                        where: { id: orderId }
                    });
                }));
            }
        };

        // 5. Handle different event types from Stripe
        switch (event.type) {
            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true);
                break;
            }
            case 'payment_intent.payment_failed': {
                await handlePaymentIntent(event.data.object.id, false);
                break;
            }
            default:
                console.log("Unhandled event type:", event.type);
                break;
        }

        return NextResponse.json({ received: true });
        
    } catch (error) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}