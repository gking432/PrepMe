# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Supabase Project

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to initialize

### 3. Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Copy all contents and paste into SQL Editor
4. Click **Run** to execute

### 4. Configure Supabase Storage

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name it `resumes`
4. Make it **Public** (for easy access)
5. Click **Create bucket**

### 5. Set Up Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google** provider:
   - Get OAuth credentials from Google Cloud Console
   - Add Client ID and Secret to Supabase
   - Add redirect URL: `http://localhost:3000/auth/callback`

### 6. Get API Keys

**From Supabase:**
1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (found at the top, looks like `https://xxxxx.supabase.co`)
   - **Publishable key** (or "anon public key") → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (this is the public key, safe for client-side)
   - **Service role key** (or "service_role secret") → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ KEEP THIS SECRET! Server-side only)
   
   **Note:** If you see "legacy anon" or "secret key", use:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **Publishable key** (or "anon public" if available)
   - `SUPABASE_SERVICE_ROLE_KEY` = **Service role key** (the one that says "service_role" - this bypasses RLS, so keep it secret!)

**From OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Copy to `OPENAI_API_KEY`

### 7. Create Environment File

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add all your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
OPENAI_API_KEY=sk-xxx...
ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8. Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 9. First User Setup

1. Sign up with email or Google
2. Upload resume and job description
3. Start your first interview!

## Troubleshooting

**"Cannot connect to Supabase"**
- Check environment variables are correct
- Verify Supabase project is active
- Check network connection

**"OpenAI API error"**
- Verify API key is correct
- Check you have credits in OpenAI account
- Ensure you have access to GPT-4

**"Microphone not working"**
- Grant browser permissions
- Use HTTPS in production (required)
- Check browser console for errors

**"Admin access denied"**
- Set `ADMIN_EMAIL` in `.env.local` to your email
- Log out and log back in
- In development mode, admin access is more permissive

## Next Steps

- Customize interview prompts in Admin Dashboard
- Deploy to Vercel for production
- Add PDF text extraction (see README.md)

