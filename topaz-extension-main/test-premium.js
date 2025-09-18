// Test premium user detection
// Run this in browser console to test

// Test user object
const testUser = {
  id: 'test-123',
  email: 'poricfami@gmail.com',
  user_metadata: {
    full_name: 'Fahmi'
  }
};

// Test the premium detection
function testPremiumDetection() {
  const premiumUsers = [
    'poricfami@gmail.com', // Premium user
  ];
  
  const hasPremiumTag = testUser.user_metadata?.tags?.includes('premium') || 
                       testUser.user_metadata?.subscription?.tier === 'premium' ||
                       testUser.user_metadata?.isPremium === true;
  
  const isPremium = premiumUsers.includes(testUser.email.toLowerCase()) || hasPremiumTag;
  
  console.log('🧪 Premium Detection Test:');
  console.log('📧 Email:', testUser.email);
  console.log('👑 Is Premium:', isPremium);
  console.log('📋 Premium Users List:', premiumUsers);
  console.log('🏷️ Has Premium Tag:', hasPremiumTag);
  
  return isPremium;
}

// Run the test
testPremiumDetection();
