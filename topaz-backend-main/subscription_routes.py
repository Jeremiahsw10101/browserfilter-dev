"""
Subscription management API routes
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request
from supabase import Client

from stripe_config import stripe, STRIPE_WEBHOOK_SECRET, get_plan_by_id, is_stripe_configured
from subscription_models import (
    CreateCustomerRequest, CreateSubscriptionRequest, SubscriptionResponse,
    CustomerResponse, PaymentIntentResponse, SubscriptionUpdateRequest,
    UserSubscriptionStatus, BillingInfo
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

def get_supabase() -> Optional[Client]:
    """Dependency to get Supabase client"""
    # Import here to avoid circular imports
    from main import supabase
    return supabase

async def get_user_from_request(request: Request) -> Optional[Dict[str, Any]]:
    """Extract user information from request (implement based on your auth system)"""
    # For now, return a mock user - you'll need to implement this based on your auth
    return {
        "id": "user_123",  # This should come from your auth system
        "email": "user@example.com",
        "name": "Test User"
    }

@router.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        from stripe_config import get_all_plans
        plans = get_all_plans()
        return {
            "success": True,
            "plans": plans
        }
    except Exception as e:
        logger.error(f"Error fetching plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscription plans")

@router.post("/create-customer")
async def create_customer(
    customer_request: CreateCustomerRequest,
    request: Request,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Create a Stripe customer for the user"""
    try:
        if not is_stripe_configured():
            raise HTTPException(status_code=503, detail="Stripe not configured")

        # Create Stripe customer
        customer = stripe.Customer.create(
            email=customer_request.email,
            name=customer_request.name,
            metadata={"user_id": customer_request.user_id}
        )

        # Store customer ID in Supabase (if available)
        if supabase:
            try:
                supabase.table("user_subscriptions").upsert({
                    "user_id": customer_request.user_id,
                    "stripe_customer_id": customer.id,
                    "email": customer_request.email,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }, on_conflict="user_id").execute()
            except Exception as e:
                logger.warning(f"Failed to store customer in Supabase: {e}")

        return {
            "success": True,
            "customer_id": customer.id,
            "customer": CustomerResponse(
                id=customer.id,
                email=customer.email,
                name=customer.name,
                created_at=datetime.fromtimestamp(customer.created)
            )
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating customer: {e}")
        raise HTTPException(status_code=500, detail="Failed to create customer")

@router.post("/create-subscription")
async def create_subscription(
    subscription_request: CreateSubscriptionRequest,
    request: Request,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Create a subscription for the customer"""
    try:
        if not is_stripe_configured():
            raise HTTPException(status_code=503, detail="Stripe not configured")

        # Get plan details
        plan = get_plan_by_id(subscription_request.plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid plan ID")

        if plan["id"] == "free":
            raise HTTPException(status_code=400, detail="Cannot create subscription for free plan")

        # Attach payment method to customer
        stripe.PaymentMethod.attach(
            subscription_request.payment_method_id,
            customer=subscription_request.customer_id,
        )

        # Set as default payment method
        stripe.Customer.modify(
            subscription_request.customer_id,
            invoice_settings={
                "default_payment_method": subscription_request.payment_method_id,
            },
        )

        # Create subscription
        subscription = stripe.Subscription.create(
            customer=subscription_request.customer_id,
            items=[{
                "price": plan["stripe_price_id"],
            }],
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )

        # Store subscription in Supabase (if available)
        if supabase:
            try:
                supabase.table("user_subscriptions").upsert({
                    "user_id": subscription.metadata.get("user_id", ""),
                    "stripe_customer_id": subscription_request.customer_id,
                    "stripe_subscription_id": subscription.id,
                    "plan_id": subscription_request.plan_id,
                    "status": subscription.status,
                    "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                    "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                    "cancel_at_period_end": subscription.cancel_at_period_end,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }, on_conflict="user_id").execute()
            except Exception as e:
                logger.warning(f"Failed to store subscription in Supabase: {e}")

        return {
            "success": True,
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret,
            "status": subscription.status
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")

@router.get("/subscription/{subscription_id}")
async def get_subscription(
    subscription_id: str,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Get subscription details"""
    try:
        if not is_stripe_configured():
            raise HTTPException(status_code=503, detail="Stripe not configured")

        subscription = stripe.Subscription.retrieve(subscription_id)
        plan = get_plan_by_id(subscription.metadata.get("plan_id", "premium"))

        return {
            "success": True,
            "subscription": SubscriptionResponse(
                id=subscription.id,
                status=subscription.status,
                plan_id=subscription.metadata.get("plan_id", "premium"),
                plan_name=plan["name"] if plan else "Unknown",
                current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
                cancel_at_period_end=subscription.cancel_at_period_end,
                created_at=datetime.fromtimestamp(subscription.created),
                updated_at=datetime.now()
            )
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error fetching subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscription")

@router.post("/cancel-subscription")
async def cancel_subscription(
    update_request: SubscriptionUpdateRequest,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Cancel subscription at period end"""
    try:
        if not is_stripe_configured():
            raise HTTPException(status_code=503, detail="Stripe not configured")

        if update_request.action != "cancel":
            raise HTTPException(status_code=400, detail="Invalid action")

        subscription = stripe.Subscription.modify(
            update_request.subscription_id,
            cancel_at_period_end=True
        )

        # Update Supabase (if available)
        if supabase:
            try:
                supabase.table("user_subscriptions").update({
                    "cancel_at_period_end": True,
                    "updated_at": datetime.now().isoformat()
                }).eq("stripe_subscription_id", update_request.subscription_id).execute()
            except Exception as e:
                logger.warning(f"Failed to update subscription in Supabase: {e}")

        return {
            "success": True,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "message": "Subscription will be canceled at the end of the current period"
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error canceling subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@router.post("/reactivate-subscription")
async def reactivate_subscription(
    update_request: SubscriptionUpdateRequest,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Reactivate subscription"""
    try:
        if not is_stripe_configured():
            raise HTTPException(status_code=503, detail="Stripe not configured")

        if update_request.action != "reactivate":
            raise HTTPException(status_code=400, detail="Invalid action")

        subscription = stripe.Subscription.modify(
            update_request.subscription_id,
            cancel_at_period_end=False
        )

        # Update Supabase (if available)
        if supabase:
            try:
                supabase.table("user_subscriptions").update({
                    "cancel_at_period_end": False,
                    "updated_at": datetime.now().isoformat()
                }).eq("stripe_subscription_id", update_request.subscription_id).execute()
            except Exception as e:
                logger.warning(f"Failed to update subscription in Supabase: {e}")

        return {
            "success": True,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "message": "Subscription has been reactivated"
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error reactivating subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error reactivating subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to reactivate subscription")

@router.get("/user-status/{user_id}")
async def get_user_subscription_status(
    user_id: str,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Get user's subscription status"""
    try:
        # Default to free plan
        free_plan = get_plan_by_id("free")
        user_status = UserSubscriptionStatus(
            user_id=user_id,
            has_subscription=False,
            subscription=None,
            plan=free_plan,
            features=free_plan["features"],
            limitations=free_plan["limitations"]
        )

        # Check Supabase for subscription (if available)
        if supabase:
            try:
                result = supabase.table("user_subscriptions").select("*").eq("user_id", user_id).execute()
                if result.data:
                    sub_data = result.data[0]
                    if sub_data.get("stripe_subscription_id"):
                        # Get subscription from Stripe
                        subscription = stripe.Subscription.retrieve(sub_data["stripe_subscription_id"])
                        plan = get_plan_by_id(sub_data.get("plan_id", "premium"))
                        
                        if subscription.status == "active":
                            user_status.has_subscription = True
                            user_status.subscription = SubscriptionResponse(
                                id=subscription.id,
                                status=subscription.status,
                                plan_id=sub_data.get("plan_id", "premium"),
                                plan_name=plan["name"] if plan else "Unknown",
                                current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
                                cancel_at_period_end=subscription.cancel_at_period_end,
                                created_at=datetime.fromtimestamp(subscription.created),
                                updated_at=datetime.now()
                            )
                            user_status.plan = plan
                            user_status.features = plan["features"]
                            user_status.limitations = plan["limitations"]
            except Exception as e:
                logger.warning(f"Failed to check subscription in Supabase: {e}")

        return {
            "success": True,
            "user_status": user_status
        }
    except Exception as e:
        logger.error(f"Error getting user subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")

@router.get("/billing/{subscription_id}")
async def get_billing_info(
    subscription_id: str,
    supabase: Optional[Client] = Depends(get_supabase)
):
    """Get billing information for a subscription"""
    try:
        if not is_stripe_configured():
            raise HTTPException(status_code=503, detail="Stripe not configured")

        subscription = stripe.Subscription.retrieve(subscription_id)
        plan = get_plan_by_id(subscription.metadata.get("plan_id", "premium"))

        return {
            "success": True,
            "billing": BillingInfo(
                subscription_id=subscription.id,
                next_billing_date=datetime.fromtimestamp(subscription.current_period_end),
                amount=plan["price"] if plan else 0,
                currency=plan["currency"] if plan else "usd",
                status=subscription.status,
                payment_method=None  # You can expand this to get payment method details
            )
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error fetching billing info: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching billing info: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch billing information")
