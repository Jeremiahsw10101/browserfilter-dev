// Real Supabase Authentication for Chrome Extension
// Cache bust: v3 - Real Google OAuth

document.addEventListener('DOMContentLoaded', function() {
    const googleSignInButton = document.getElementById('googleSignIn');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', handleGoogleSignIn);
    }
    
    // Check if we're returning from OAuth
    handleAuthCallback();
});

async function handleGoogleSignIn() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const buttonEl = document.getElementById('googleSignIn');
    
    try {
        loadingEl.style.display = 'flex';
        buttonEl.style.display = 'none';
        errorEl.style.display = 'none';
        
        console.log('🚀 Starting real Google OAuth...');
        
        // Use the Supabase client for real authentication
        const { user, session, error } = await window.supabase.signInWithOAuth({
            provider: 'google',
            redirectTo: chrome.identity.getRedirectURL('auth.html')
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        if (user && session) {
            // Create enhanced user profile
            const userProfile = await window.supabase.createUserProfile(user, session);
            
            // Store enhanced user data
            await chrome.storage.local.set({
                user: userProfile,
                session: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at
                }
            });
            
            // Send welcome email
            await sendWelcomeEmail(user.email, userProfile.name);
            
            // Notify popup of successful authentication
            chrome.runtime.sendMessage({
                type: 'AUTH_SUCCESS',
                user: userProfile
            });
            
            // Close the auth window
            window.close();
        }
        
    } catch (error) {
        console.error('❌ Google sign-in error:', error);
        errorEl.textContent = error.message || 'Failed to sign in with Google. Please try again.';
        errorEl.style.display = 'block';
        loadingEl.style.display = 'none';
        buttonEl.style.display = 'flex';
    }
}

async function handleAuthCallback() {
    // Check if we're returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const error = urlParams.get('error');
    
    if (error) {
        console.error('OAuth error:', error);
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.textContent = `Authentication failed: ${error}`;
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (accessToken) {
        try {
            console.log('🔄 Processing OAuth callback...');
            
            // Get user info from Supabase
            const user = await window.supabase.getUser(accessToken);
            
            if (user) {
                // Store user data
                await chrome.storage.local.set({
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.email,
                        avatar_url: user.user_metadata?.avatar_url,
                        tier: 'free'
                    },
                    session: {
                        access_token: accessToken,
                        expires_at: Date.now() + 3600000 // 1 hour
                    }
                });
                
                // Send welcome email
                await sendWelcomeEmail(user.email, user.user_metadata?.full_name || user.email);
                
                // Notify popup of successful authentication
                chrome.runtime.sendMessage({
                    type: 'AUTH_SUCCESS',
                    user: user
                });
                
                // Close the auth window
                window.close();
            }
        } catch (error) {
            console.error('❌ Auth callback error:', error);
            const errorEl = document.getElementById('error');
            if (errorEl) {
                errorEl.textContent = 'Failed to complete authentication. Please try again.';
                errorEl.style.display = 'block';
            }
        }
    }
}

async function sendWelcomeEmail(email, name) {
    try {
        const SUPABASE_URL = 'https://giuarudxkyknysqmayfl.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdWFydWR4a3lrbnlzcW1heWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNDQ0NjgsImV4cCI6MjA3MzcyMDQ2OH0.EbiXOSs5lsWVrmjWn7uOz4mSW4FC3rWnSdEtm5Fl9g0';
        
        await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                name: name
            })
        });
        
        console.log('✅ Welcome email sent successfully');
    } catch (error) {
        console.warn('⚠️ Failed to send welcome email:', error);
        // Don't throw error - email failure shouldn't break auth
    }
}