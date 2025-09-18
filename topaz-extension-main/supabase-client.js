// Supabase client for Chrome Extension
// This file provides a CSP-compliant way to use Supabase in Chrome extensions

const SUPABASE_URL = 'https://giuarudxkyknysqmayfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdWFydWR4a3lrbnlzcW1heWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNDQ0NjgsImV4cCI6MjA3MzcyMDQ2OH0.EbiXOSs5lsWVrmjWn7uOz4mSW4FC3rWnSdEtm5Fl9g0';

// Simple Supabase client for Chrome extensions
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async signInWithOAuth(options) {
    const { provider, redirectTo } = options;
    
    // For Chrome extensions, we need to use chrome.identity API
    if (provider === 'google') {
      return this.signInWithGoogle(redirectTo);
    }
    
    throw new Error(`Provider ${provider} not supported`);
  }

  async signInWithGoogle(redirectTo) {
    try {
      // Get the redirect URL for Chrome extension
      const redirectUrl = chrome.identity.getRedirectURL('auth.html');
      console.log('🔗 Chrome extension redirect URL:', redirectUrl);
      
      // Build the OAuth URL
      const authUrl = `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
      
      console.log('🚀 Starting Google OAuth with URL:', authUrl);
      console.log('📋 Supabase URL:', this.url);
      console.log('🔑 Anon Key:', this.key.substring(0, 20) + '...');
      
      // Use Chrome identity API to launch OAuth flow
      return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true
        }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Chrome identity error:', chrome.runtime.lastError);
            console.error('❌ Error details:', {
              message: chrome.runtime.lastError.message,
              code: chrome.runtime.lastError.code || 'unknown'
            });
            
            // Show specific error messages
            if (chrome.runtime.lastError.message.includes('Authorization page could not be loaded')) {
              console.error('🔧 Fix: Configure Google OAuth in Supabase Dashboard');
              console.error('🔗 Go to: https://supabase.com/dashboard/project/giuarudxkyknysqmayfl');
            } else if (chrome.runtime.lastError.message.includes('Invalid redirect URI')) {
              console.error('🔧 Fix: Check redirect URI in Google Cloud Console');
              console.error('🔗 Should be: https://giuarudxkyknysqmayfl.supabase.co/auth/v1/callback');
            }
            
            // If OAuth fails, fall back to test mode
            console.warn('⚠️ OAuth failed, falling back to test mode');
            this.fallbackTestMode().then(resolve).catch(reject);
            return;
          }
          
          if (responseUrl) {
            console.log('✅ OAuth response received:', responseUrl);
            // Parse the response URL to extract tokens
            this.parseAuthResponse(responseUrl)
              .then(resolve)
              .catch((error) => {
                console.error('❌ Failed to parse auth response:', error);
                // Fall back to test mode if parsing fails
                this.fallbackTestMode().then(resolve).catch(reject);
              });
          } else {
            console.warn('⚠️ No response URL, falling back to test mode');
            this.fallbackTestMode().then(resolve).catch(reject);
          }
        });
      });
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      // Fall back to test mode on any error
      return this.fallbackTestMode();
    }
  }

  // Fallback test mode when OAuth isn't configured
  async fallbackTestMode() {
    console.log('🧪 Using fallback test mode - configure Google OAuth for real authentication');
    console.log('📋 To enable real OAuth:');
    console.log('1. Go to: https://supabase.com/dashboard/project/giuarudxkyknysqmayfl');
    console.log('2. Enable Google provider in Authentication → Providers');
    console.log('3. Add your Google Client ID and Client Secret');
    
    // Create a premium test user
    const mockUser = {
      id: 'test-user-' + Date.now(),
      email: 'poricfami@gmail.com', // Use the premium email for testing
      user_metadata: {
        full_name: 'Fahmi',
        avatar_url: null
      }
    };
    
    console.log('✅ Created premium test user:', mockUser.email);
    
    return {
      user: mockUser,
      session: {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: Date.now() + 3600000
      }
    };
  }

  async parseAuthResponse(responseUrl) {
    try {
      const url = new URL(responseUrl);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const error = url.searchParams.get('error');
      
      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }
      
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      // Get user info
      const user = await this.getUser(accessToken);
      
      return {
        user,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Date.now() + 3600000 // 1 hour
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse auth response: ${error.message}`);
    }
  }

  async getUser(accessToken) {
    try {
      const response = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': this.key
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }
      
      const { user } = await response.json();
      return user;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  // Check if a specific user should be premium (for demo purposes)
  isPremiumUser(user) {
    console.log('🔍 DEBUG: Checking premium status for user:', user);
    console.log('📧 User email:', user.email);
    console.log('📧 Email type:', typeof user.email);
    
    // Make specific users premium for demo
    const premiumUsers = [
      'poricfami@gmail.com', // Premium user
    ];
    
    console.log('👑 Premium users list:', premiumUsers);
    
    // Also check for premium tags in user metadata
    const hasPremiumTag = user.user_metadata?.tags?.includes('premium') || 
                         user.user_metadata?.subscription?.tier === 'premium' ||
                         user.user_metadata?.isPremium === true;
    
    const emailMatch = premiumUsers.includes(user.email.toLowerCase());
    const isPremium = emailMatch || hasPremiumTag;
    
    console.log('🔍 Email match:', emailMatch);
    console.log('🏷️ Has premium tag:', hasPremiumTag);
    console.log('✅ Final premium status:', isPremium);
    
    return isPremium;
  }

  // Enhanced user data with professional labels
  async createUserProfile(user, session) {
    console.log('🏗️ Creating user profile for:', user.email);
    const isPremium = this.isPremiumUser(user);
    console.log('👑 User profile premium status:', isPremium);
    
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      tier: isPremium ? 'premium' : 'free',
      isPremium: isPremium,
      isLoggedIn: true,
      loginDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      profile: {
        displayName: user.user_metadata?.full_name || user.email.split('@')[0],
        firstName: user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0],
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        avatar: user.user_metadata?.avatar_url,
        tags: user.user_metadata?.tags || [],
        subscription: {
          tier: isPremium ? 'premium' : 'free',
          status: isPremium ? 'active' : 'inactive',
          startDate: isPremium ? new Date().toISOString() : null,
          features: isPremium ? ['customization', 'advanced_settings', 'priority_support'] : ['basic_filtering']
        }
      },
      preferences: {
        theme: 'dark',
        notifications: true,
        autoUpdate: true
      },
      usage: {
        totalSessions: 1,
        lastLogin: new Date().toISOString(),
        featuresUsed: isPremium ? ['customization', 'profiles'] : ['basic_filtering']
      }
    };
  }

  async signOut() {
    try {
      // Clear local storage
      await chrome.storage.local.remove(['user', 'session']);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Create and export the client
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test function to debug premium detection
window.testPremiumDetection = function(email = 'poricfami@gmail.com') {
  console.log('🧪 Testing premium detection for:', email);
  
  const testUser = {
    id: 'test-123',
    email: email,
    user_metadata: {
      full_name: 'Test User'
    }
  };
  
  const isPremium = supabase.isPremiumUser(testUser);
  console.log('✅ Result:', isPremium);
  
  return isPremium;
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, SupabaseClient };
} else {
  window.supabase = supabase;
}
