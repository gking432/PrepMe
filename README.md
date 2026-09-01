# PrepMe - AI Interview Simulation App

A portfolio demo of an AI-powered interview coach. A visitor can preload a fictional resume and role, run a realistic voice or typed recruiter screen, review evidence-linked feedback, and see how that feedback becomes targeted practice.

## Portfolio Demo

The checked-in configuration defaults to public demo mode. It is deliberately optimized for a convincing one-time visit: no account is required, uploaded files are not saved by PrepMe, and completed demo state stays in the visitor's browser.

- Enter interview details and press **Continue** for the primary path: the actual realtime voice or typed recruiter screen.
- Use **Fill demo data** to populate an explicitly fictional candidate, résumé, role, employers, and job posting while staying in the normal setup flow.
- Use **View demo feedback** to skip the interview and inspect completed fictional feedback and all six workshops.
- Open the AI icon on a phone—or **How the AI works** on a larger screen—to inspect the pipeline, model boundaries, reliability controls, and checked-in evaluation results.
- Read the [implementation case study](docs/portfolio-case-study.md) for the AI workflow, architecture, reliability choices, and extension points.

## Features

- **Frictionless Demo**: The public HR screen does not require an account
- **File Uploads**: Drag-and-drop resume and job description (PDF or text)
- **Multi-Stage Interview Architecture**:
  - HR Phone Screen
  - Hiring Manager Interview
  - Team Interview
- **Voice Interaction**: Real-time WebRTC conversations using the OpenAI Realtime API
- **Text Input Alternative**: Type responses if preferred
- **Audio Visualizer**: Visual feedback during interviewer speech
- **Post-Interview Feedback**: AI-generated scoring and detailed feedback
- **Admin Dashboard**: Edit interviewer prompts and settings
- **Demo Persistence**: Browser-local session, feedback, and practice state
- **Public-Safe Controls**: Payload limits, request throttles, and SSRF-safe website import

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Storage**: Supabase Storage
- **AI**: OpenAI Realtime and transcription; Anthropic rubric grading and coaching generation
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 20.9+ and npm
- Supabase account (free tier works)
- OpenAI API key
- Google OAuth credentials (optional, for Google login)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd PrepMe
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase project dashboard:
   - Go to **SQL Editor**
   - Copy and paste the contents of `supabase/schema.sql`
   - Run the SQL script to create all tables and policies
   - Go to **Storage** and create a bucket named `resumes` (public access)
   - Go to **Authentication** → **Providers** and enable:
     - Email provider
     - Google provider (add your OAuth credentials)

3. Get your Supabase credentials:
   - Go to **Settings** → **API**
   - Copy your **Project URL** and **anon/public key**
   - Copy your **service_role key** (keep this secret!)

### 3. Set Up Environment Variables

1. Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Fill in your environment variables in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Admin Configuration (your email for admin access)
ADMIN_EMAIL=your_admin_email@example.com

# App URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Defaults to true when omitted; set false to restore the account-backed product flow
NEXT_PUBLIC_PORTFOLIO_DEMO_MODE=true
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Verify the Demo

```bash
npm test
npm run lint
npm run build
```

The test suite includes eight portfolio golden scenarios. They validate fictional-data isolation, transcript coverage decisions, all-six-area coaching routing, and the structured model contracts shown in the in-app technical panel.

### 6. First-Time Product Setup

This section applies when `NEXT_PUBLIC_PORTFOLIO_DEMO_MODE=false`.

1. **Create an account**: Sign up with email/password or Google OAuth
2. **Upload your data**: 
   - Upload or paste your resume
   - Upload or paste the job description
   - Optionally add company website and notes
3. **Start interviewing**: Click "Start Interview" to begin

### 7. Admin Access

To access the admin dashboard:
1. Make sure your email is set in `ADMIN_EMAIL` in `.env.local`
2. Log in with that email
3. Click "Admin" in the dashboard header
4. Edit interview prompts, questions, tone, and depth levels

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add all environment variables in Vercel's project settings
4. Update `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
5. Deploy!

## Project Structure

```
PrepMe/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── interview/    # Interview API endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── interview/         # Interview simulation pages
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── FileUpload.tsx    # File upload component
│   └── AudioVisualizer.tsx # Audio visualization
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase client (server)
│   └── supabase-client.ts # Supabase client (client)
├── supabase/              # Database schema
│   └── schema.sql        # SQL schema file
└── README.md             # This file
```

## API Routes

- `POST /api/interview/start` - Start a new interview session
- `POST /api/interview/voice` - Process voice input and generate response
- `POST /api/interview/text` - Process text input and generate response
- `POST /api/interview/feedback` - Generate interview feedback
- `POST /api/extract-text` - Extract text from uploaded files

## Database Schema

The app uses the following main tables:
- `user_profiles` - User account information
- `user_interview_data` - Resume, job description, and notes
- `interview_sessions` - Interview session records
- `interview_feedback` - AI-generated feedback
- `interview_prompts` - Admin-configurable interview prompts

## Customization

### Changing Interview Stages

Edit the default prompts in the admin dashboard, or modify the SQL schema to add/remove stages.

### Adjusting AI Behavior

1. Go to Admin Dashboard
2. Edit system prompts for each stage
3. Modify question sets
4. Adjust tone and depth level

### Styling

The app uses Tailwind CSS. Modify `app/globals.css` or component classes to change styling.

## Troubleshooting

### Microphone Not Working

- Ensure browser permissions are granted
- Use HTTPS in production (required for microphone access)
- Check browser console for errors
- Use the typed-reply mode when microphone access is unavailable

### Supabase Connection Issues

- Verify all environment variables are set correctly
- Check Supabase project is active
- Ensure RLS policies are set up correctly

### OpenAI API Errors

- Verify API key is correct and has credits
- Check rate limits
- Ensure you have access to GPT-4 and Whisper models

## Security Notes

- Never commit `.env.local` to version control
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-side only)
- Use environment variables for all secrets
- Enable HTTPS in production
- Review and adjust RLS policies as needed
- Add a shared edge/provider rate limit for multi-instance production hosting; the built-in limiter is deliberately lightweight and per instance

## Future Enhancements

- Full PDF text extraction
- Audio recording storage
- Multiple interview templates
- Interview analytics dashboard
- Email notifications
- Mobile app version

## License

This is a prototype application. Use at your own discretion.

## Support

For issues or questions, check the code comments or refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
