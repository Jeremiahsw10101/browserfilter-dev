// Stripe Configuration for Topaz Extension
// Professional payment integration

const STRIPE_CONFIG = {
  // Replace with your actual Stripe publishable key
  publishableKey: 'pk_test_51234567890abcdef...',
  
  // Replace with your actual Stripe checkout links
  checkoutLinks: {
    monthly: 'https://buy.stripe.com/test_monthly_1234567890',
    yearly: 'https://buy.stripe.com/test_yearly_1234567890',
    lifetime: 'https://buy.stripe.com/test_lifetime_1234567890'
  },
  
  // Pricing tiers
  pricing: {
    monthly: {
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Advanced AI-powered filtering',
        'Unlimited custom profiles', 
        'Priority support',
        'Sync across all devices',
        'Analytics dashboard'
      ]
    },
    yearly: {
      price: 99.99,
      currency: 'USD', 
      interval: 'year',
      discount: 'Save 17%',
      features: [
        'Everything in Monthly',
        'Advanced analytics',
        'Custom integrations',
        'Priority feature requests'
      ]
    },
    lifetime: {
      price: 299.99,
      currency: 'USD',
      interval: 'lifetime',
      discount: 'Best Value',
      features: [
        'Everything in Yearly',
        'Lifetime updates',
        'Exclusive features',
        'Direct developer access'
      ]
    }
  }
};

// Professional upgrade handler
function handleProfessionalUpgrade() {
  console.log('💳 Opening professional Stripe checkout');
  
  // Show upgrade options dialog first
  window.ui.showDialog({
    title: 'Choose Your Plan',
    content: `
      <div style="padding: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <!-- Monthly Plan -->
          <div style="border: 1px solid #333; border-radius: 8px; padding: 16px; text-align: center;">
            <h4 style="color: #ff9823; margin: 0 0 8px 0;">Monthly</h4>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">$${STRIPE_CONFIG.pricing.monthly.price}</div>
            <div style="font-size: 12px; color: #999; margin-bottom: 12px;">per month</div>
            <button onclick="openStripeCheckout('monthly')" style="width: 100%; padding: 8px; background: #ff9823; color: white; border: none; border-radius: 4px; cursor: pointer;">Choose Monthly</button>
          </div>
          
          <!-- Yearly Plan -->
          <div style="border: 2px solid #ff9823; border-radius: 8px; padding: 16px; text-align: center; position: relative;">
            <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: #ff9823; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px;">POPULAR</div>
            <h4 style="color: #ff9823; margin: 8px 0 8px 0;">Yearly</h4>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">$${STRIPE_CONFIG.pricing.yearly.price}</div>
            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">per year</div>
            <div style="font-size: 10px; color: #ff9823; margin-bottom: 12px;">${STRIPE_CONFIG.pricing.yearly.discount}</div>
            <button onclick="openStripeCheckout('yearly')" style="width: 100%; padding: 8px; background: #ff9823; color: white; border: none; border-radius: 4px; cursor: pointer;">Choose Yearly</button>
          </div>
          
          <!-- Lifetime Plan -->
          <div style="border: 1px solid #333; border-radius: 8px; padding: 16px; text-align: center;">
            <h4 style="color: #ff9823; margin: 0 0 8px 0;">Lifetime</h4>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">$${STRIPE_CONFIG.pricing.lifetime.price}</div>
            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">one-time</div>
            <div style="font-size: 10px; color: #ff9823; margin-bottom: 12px;">${STRIPE_CONFIG.pricing.lifetime.discount}</div>
            <button onclick="openStripeCheckout('lifetime')" style="width: 100%; padding: 8px; background: #ff9823; color: white; border: none; border-radius: 4px; cursor: pointer;">Choose Lifetime</button>
          </div>
        </div>
        
        <div style="text-align: center; font-size: 12px; color: #666;">
          <p>All plans include 30-day money-back guarantee</p>
          <p>Secure payment powered by Stripe</p>
        </div>
      </div>
    `,
    buttons: [
      {
        text: 'Maybe Later',
        onClick: () => true
      }
    ]
  });
}

// Open Stripe checkout for specific plan
function openStripeCheckout(plan) {
  const stripeUrl = STRIPE_CONFIG.checkoutLinks[plan];
  
  if (stripeUrl) {
    chrome.tabs.create({
      url: stripeUrl,
      active: true
    });
    
    window.ui.showNotification({
      type: 'success',
      message: `Opening ${plan} checkout...`,
      duration: 2000
    });
  } else {
    window.ui.showNotification({
      type: 'error',
      message: 'Checkout link not configured',
      duration: 3000
    });
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.STRIPE_CONFIG = STRIPE_CONFIG;
  window.handleProfessionalUpgrade = handleProfessionalUpgrade;
  window.openStripeCheckout = openStripeCheckout;
}
