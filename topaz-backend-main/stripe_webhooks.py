"""
Stripe webhook handlers for subscription events
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from supabase import Client

from stripe_config import stripe, STRIPE_WEBHOOK_SECRET, get_plan_by_id

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

def get_supabase() -> Optional[Client]:
    """Dependency to get Supabase client"""
    # Import here to avoid circular imports
    from main import supabase
    return supabase

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        
        if not STRIPE_WEBHOOK_SECRET:
            logger.warning("Stripe webhook secret not configured")
            raise HTTPException(status_code=503, detail="Webhook secret not configured")

        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Handle the event
        event_type = event["type"]
        logger.info(f"Processing Stripe webhook event: {event_type}")

        if event_type == "customer.subscription.created":
            await handle_subscription_created(event, supabase)
        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(event, supabase)
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(event, supabase)
        elif event_type == "invoice.payment_succeeded":
            await handle_payment_succeeded(event, supabase)
        elif event_type == "invoice.payment_failed":
            await handle_payment_failed(event, supabase)
        elif event_type == "customer.subscription.trial_will_end":
            await handle_trial_will_end(event, supabase)
        else:
            logger.info(f"Unhandled event type: {event_type}")

        return {"status": "success", "event_type": event_type}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def handle_subscription_created(event, supabase: Optional[Client]):
    """Handle subscription created event"""
    try:
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        
        # Get customer details
        customer = stripe.Customer.retrieve(customer_id)
        user_id = customer.metadata.get("user_id")
        
        if not user_id:
            logger.warning(f"No user_id found for customer {customer_id}")
            return

        # Determine plan ID from subscription
        plan_id = "premium"  # Default to premium
        if subscription["items"]["data"]:
            price_id = subscription["items"]["data"][0]["price"]["id"]
            # You can map price_id to plan_id here if needed
        
        # Update Supabase
        if supabase:
            try:
                supabase.table("user_subscriptions").upsert({
                    "user_id": user_id,
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription["id"],
                    "plan_id": plan_id,
                    "status": subscription["status"],
                    "current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
                    "current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat(),
                    "cancel_at_period_end": subscription["cancel_at_period_end"],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }, on_conflict="user_id").execute()
                
                logger.info(f"Subscription created for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to update Supabase for subscription created: {e}")
        
    except Exception as e:
        logger.error(f"Error handling subscription created: {e}")

async def handle_subscription_updated(event, supabase: Optional[Client]):
    """Handle subscription updated event"""
    try:
        subscription = event["data"]["object"]
        subscription_id = subscription["id"]
        
        # Update Supabase
        if supabase:
            try:
                supabase.table("user_subscriptions").update({
                    "status": subscription["status"],
                    "current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
                    "current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat(),
                    "cancel_at_period_end": subscription["cancel_at_period_end"],
                    "updated_at": datetime.now().isoformat()
                }).eq("stripe_subscription_id", subscription_id).execute()
                
                logger.info(f"Subscription updated: {subscription_id}")
            except Exception as e:
                logger.error(f"Failed to update Supabase for subscription updated: {e}")
        
    except Exception as e:
        logger.error(f"Error handling subscription updated: {e}")

async def handle_subscription_deleted(event, supabase: Optional[Client]):
    """Handle subscription deleted event"""
    try:
        subscription = event["data"]["object"]
        subscription_id = subscription["id"]
        
        # Update Supabase
        if supabase:
            try:
                supabase.table("user_subscriptions").update({
                    "status": "canceled",
                    "updated_at": datetime.now().isoformat()
                }).eq("stripe_subscription_id", subscription_id).execute()
                
                logger.info(f"Subscription deleted: {subscription_id}")
            except Exception as e:
                logger.error(f"Failed to update Supabase for subscription deleted: {e}")
        
    except Exception as e:
        logger.error(f"Error handling subscription deleted: {e}")

async def handle_payment_succeeded(event, supabase: Optional[Client]):
    """Handle successful payment event"""
    try:
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        
        if subscription_id:
            # Update subscription status to active
            if supabase:
                try:
                    supabase.table("user_subscriptions").update({
                        "status": "active",
                        "updated_at": datetime.now().isoformat()
                    }).eq("stripe_subscription_id", subscription_id).execute()
                    
                    logger.info(f"Payment succeeded for subscription: {subscription_id}")
                except Exception as e:
                    logger.error(f"Failed to update Supabase for payment succeeded: {e}")
        
    except Exception as e:
        logger.error(f"Error handling payment succeeded: {e}")

async def handle_payment_failed(event, supabase: Optional[Client]):
    """Handle failed payment event"""
    try:
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        
        if subscription_id:
            # Update subscription status to past_due
            if supabase:
                try:
                    supabase.table("user_subscriptions").update({
                        "status": "past_due",
                        "updated_at": datetime.now().isoformat()
                    }).eq("stripe_subscription_id", subscription_id).execute()
                    
                    logger.info(f"Payment failed for subscription: {subscription_id}")
                except Exception as e:
                    logger.error(f"Failed to update Supabase for payment failed: {e}")
        
    except Exception as e:
        logger.error(f"Error handling payment failed: {e}")

async def handle_trial_will_end(event, supabase: Optional[Client]):
    """Handle trial will end event"""
    try:
        subscription = event["data"]["object"]
        subscription_id = subscription["id"]
        
        # You can send notification emails here
        logger.info(f"Trial will end for subscription: {subscription_id}")
        
        # Update Supabase if needed
        if supabase:
            try:
                supabase.table("user_subscriptions").update({
                    "updated_at": datetime.now().isoformat()
                }).eq("stripe_subscription_id", subscription_id).execute()
            except Exception as e:
                logger.error(f"Failed to update Supabase for trial will end: {e}")
        
    except Exception as e:
        logger.error(f"Error handling trial will end: {e}")
