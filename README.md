# PrepMe - AI Interview Simulation App

A web-based application for practicing job interviews using AI-powered voice interactions. Upload your resume and job description, then conduct realistic interview simulations with AI interviewers.

## Features

- **User Authentication**: Email/password and Google OAuth login
- **File Uploads**: Drag-and-drop resume and job description (PDF or text)
- **3-Stage Interview Simulation**:
  - HR Phone Screen
  - Hiring Manager Interview
  - Team Interview
- **Voice Interaction**: Real-time voice conversations using OpenAI's Whisper and GPT-4
- **Text Input Alternative**: Type responses if preferred
- **Audio Visualizer**: Visual feedback during interviewer speech
- **Post-Interview Feedback**: AI-generated scoring and detailed feedback
- **Admin Dashboard**: Edit interviewer prompts and settings
- **Interview History**: Review past interviews and feedback

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Storage**: Supabase Storage
- **AI**: OpenAI (GPT-4, Whisper)
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 18+ and npm/yarn
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
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. First-Time Setup

1. **Create an account**: Sign up with email/password or Google OAuth
2. **Upload your data**: 
   - Upload or paste your resume
   - Upload or paste the job description
   - Optionally add company website and notes
3. **Start interviewing**: Click "Start Interview" to begin

### 6. Admin Access

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

### PDF Text Extraction Not Working

The prototype includes a placeholder for PDF extraction. To fully implement:
1. Install `pdf-parse`: `npm install pdf-parse`
2. Update `app/api/extract-text/route.ts` to use the library

### Microphone Not Working

- Ensure browser permissions are granted
- Use HTTPS in production (required for microphone access)
- Check browser console for errors

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

