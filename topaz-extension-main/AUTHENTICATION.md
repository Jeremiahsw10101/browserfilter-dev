# Topaz Chrome Extension - Authentication Setup

## Overview
This Chrome extension now includes Supabase + Google OAuth authentication. Users must sign in before accessing the main functionality.

## Authentication Flow

1. **Extension Installation**: No changes - extension installs normally
2. **First Click**: When user clicks the extension icon, authentication check runs
3. **Not Signed In**: Shows simple sign-in page with Google button
4. **Sign In Process**: 
   - Opens popup window with Google OAuth
   - User authenticates with Google
   - Redirects back to extension
   - Stores user data and session
   - Sends welcome email
5. **Signed In**: Shows main popup with user status ("Free tier")

## Files Added/Modified

### New Files
- `auth.html` - OAuth redirect page for Google authentication

### Modified Files
- `manifest.json` - Added "identity" permission for OAuth
- `popup/popup.html` - Added auth page and user status display
- `popup/popup.css` - Added auth page and user status styles
- `popup/popup.js` - Added authentication logic and flow control

## Configuration

### Supabase Setup
- Project URL: `https://giuarudxkyknysqmayfl.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdWFydWR4a3lrbnlzcW1heWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNDQ0NjgsImV4cCI6MjA3MzcyMDQ2OH0.EbiXOSs5lsWVrmjWn7uOz4mSW4FC3rWnSdEtm5Fl9g0`

### Google OAuth Setup
- Extension ID: `piaccjfinlhfpahdilmnkbnfmlinaomp`
- Redirect URI: `https://giuarudxkyknysqmayfl.supabase.co/auth/v1/callback`

### User Data Storage
User data is stored in Chrome's local storage:
```javascript
{
  user: {
    id: "user-id",
    email: "user@example.com", 
    name: "User Name",
    avatar_url: "https://...",
    tier: "free"
  },
  session: { /* Supabase session */ }
}
```

## Features

### Authentication
- ✅ Google OAuth integration
- ✅ Session management
- ✅ User data storage
- ✅ Authentication state persistence

### User Interface
- ✅ Clean sign-in page matching extension theme
- ✅ User status display in main popup ("Free tier")
- ✅ Loading states and error handling
- ✅ Minimal design - no extra complexity

### Email Integration
- ✅ Welcome email sent after sign up
- ✅ Uses Supabase Edge Functions
- ✅ Email content: "You signed up. Upgrade to premium to unlock more features"

## Testing

1. Install the extension
2. Click the extension icon
3. Should see sign-in page
4. Click "Continue with Google"
5. Complete Google OAuth flow
6. Should return to main popup with user status
7. Check email for welcome message

## Notes

- Authentication is required before accessing any extension features
- User data persists across browser sessions
- Welcome email is sent automatically on first sign up
- All existing functionality remains unchanged after authentication
- UI matches existing extension theme and design
