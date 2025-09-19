"""
Pydantic models for subscription management
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CreateCustomerRequest(BaseModel):
    """Request model for creating a Stripe customer"""
    user_id: str = Field(..., description="Internal user ID")
    email: str = Field(..., description="Customer email address")
    name: Optional[str] = Field(None, description="Customer name")

class CreateSubscriptionRequest(BaseModel):
    """Request model for creating a subscription"""
    customer_id: str = Field(..., description="Stripe customer ID")
    plan_id: str = Field(..., description="Subscription plan ID")
    payment_method_id: str = Field(..., description="Stripe payment method ID")

class SubscriptionResponse(BaseModel):
    """Response model for subscription data"""
    id: str
    status: str
    plan_id: str
    plan_name: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    created_at: datetime
    updated_at: datetime

class CustomerResponse(BaseModel):
    """Response model for customer data"""
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime

class PaymentIntentResponse(BaseModel):
    """Response model for payment intent"""
    client_secret: str
    subscription_id: str
    status: str

class WebhookEvent(BaseModel):
    """Model for Stripe webhook events"""
    id: str
    type: str
    data: dict
    created: int

class SubscriptionUpdateRequest(BaseModel):
    """Request model for updating subscription"""
    subscription_id: str
    action: str = Field(..., description="Action: 'cancel' or 'reactivate'")

class UserSubscriptionStatus(BaseModel):
    """Model for user's subscription status"""
    user_id: str
    has_subscription: bool
    subscription: Optional[SubscriptionResponse] = None
    plan: dict
    features: List[str]
    limitations: List[str]

class BillingInfo(BaseModel):
    """Model for billing information"""
    subscription_id: str
    next_billing_date: datetime
    amount: float
    currency: str
    status: str
    payment_method: Optional[dict] = None
