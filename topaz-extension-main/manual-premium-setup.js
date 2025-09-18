// Manual Premium User Setup Script
// Run this in browser console to manually set premium status

async function setUserPremium(email, isPremium = true) {
  try {
    // Get current user data
    const result = await chrome.storage.local.get(['user']);
    
    if (result.user) {
      console.log('👤 Current user:', result.user);
      
      // Update premium status
      result.user.isPremium = isPremium;
      result.user.tier = isPremium ? 'premium' : 'free';
      result.user.subscription.tier = isPremium ? 'premium' : 'free';
      result.user.subscription.status = isPremium ? 'active' : 'inactive';
      
      if (isPremium) {
        result.user.subscription.features = ['customization', 'advanced_settings', 'priority_support'];
        result.user.profile.subscription.features = ['customization', 'advanced_settings', 'priority_support'];
      } else {
        result.user.subscription.features = ['basic_filtering'];
        result.user.profile.subscription.features = ['basic_filtering'];
      }
      
      // Save updated user data
      await chrome.storage.local.set({ user: result.user });
      
      console.log('✅ User premium status updated:', {
        email: result.user.email,
        isPremium: result.user.isPremium,
        tier: result.user.tier
      });
      
      // Reload the popup to see changes
      console.log('🔄 Please refresh the extension popup to see changes');
      
    } else {
      console.log('❌ No user data found. Please sign in first.');
    }
  } catch (error) {
    console.error('❌ Error updating premium status:', error);
  }
}

// Usage examples:
// setUserPremium('poricfami@gmail.com', true);  // Make premium
// setUserPremium('poricfami@gmail.com', false); // Make free

console.log('🔧 Premium User Setup Script loaded!');
console.log('📝 Usage: setUserPremium("email@example.com", true/false)');
console.log('💡 Example: setUserPremium("poricfami@gmail.com", true)');
