# Supabase Edge Function Deployment

## Welcome Email Function

This function sends a welcome email to new users after they sign up.

### Deploy the Function

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref giuarudxkyknysqmayfl
```

4. Deploy the function:
```bash
supabase functions deploy send-welcome-email
```

### Function Details

- **Path**: `/supabase/functions/send-welcome-email/index.ts`
- **Purpose**: Sends welcome email to new users
- **Trigger**: Called from extension after successful sign up
- **Email Content**: 
  - Subject: "Welcome to Topaz!"
  - Body: Personalized welcome message with upgrade prompt
  - Format: Both HTML and plain text

### Usage

The function is called automatically from the extension's `auth.html` after successful Google OAuth:

```javascript
await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: userEmail,
    name: userName
  })
});
```

### Environment Variables

The function uses the following environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided by Supabase

### Testing

You can test the function locally:

```bash
supabase functions serve send-welcome-email
```

Then test with curl:
```bash
curl -X POST 'http://localhost:54321/functions/v1/send-welcome-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com", "name": "Test User"}'
```
