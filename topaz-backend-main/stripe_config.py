"""
Stripe configuration and utilities for Topaz Backend
"""
import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Subscription plans configuration
SUBSCRIPTION_PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "usd",
        "interval": "forever",
        "features": [
            "Block up to 5 keywords",
            "Basic analytics dashboard",
            "Community support",
            "YouTube & X filtering",
            "Basic keyword management"
        ],
        "limitations": [
            "Limited to 5 keywords",
            "Basic analytics only",
            "No priority support"
        ]
    },
    "premium": {
        "id": "premium",
        "name": "Premium",
        "price": 9.99,
        "currency": "usd",
        "interval": "month",
        "stripe_price_id": os.getenv("STRIPE_PREMIUM_PRICE_ID"),  # You'll set this in Stripe Dashboard
        "features": [
            "Unlimited keywords",
            "Advanced analytics & reports",
            "Priority support",
            "All platforms (YouTube, X, LinkedIn, Reddit)",
            "Advanced keyword management",
            "Real-time notifications",
            "Export data",
            "Custom filtering rules"
        ],
        "limitations": []
    }
}

def get_plan_by_id(plan_id: str):
    """Get subscription plan by ID"""
    return SUBSCRIPTION_PLANS.get(plan_id)

def get_all_plans():
    """Get all available subscription plans"""
    return list(SUBSCRIPTION_PLANS.values())

def is_stripe_configured():
    """Check if Stripe is properly configured"""
    return all([
        stripe.api_key,
        STRIPE_PUBLISHABLE_KEY,
        STRIPE_WEBHOOK_SECRET
    ])

def get_stripe_config():
    """Get Stripe configuration for frontend"""
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "plans": get_all_plans()
    }
