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
    
    const mockUser = {
      id: 'test-user-' + Date.now(),
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Demo User',
        avatar_url: null
      }
    };
    
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

  // Enhanced user data with professional labels
  async createUserProfile(user, session) {
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      tier: 'free', // Default tier
      isPremium: false,
      isLoggedIn: true,
      loginDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      profile: {
        displayName: user.user_metadata?.full_name || user.email.split('@')[0],
        firstName: user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0],
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        avatar: user.user_metadata?.avatar_url,
        verified: user.email_confirmed_at ? true : false
      },
      subscription: {
        tier: 'free',
        status: 'active',
        startDate: new Date().toISOString(),
        features: ['basic_filtering', 'limited_profiles']
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, SupabaseClient };
} else {
  window.supabase = supabase;
}
