# Development Notes

## Important Implementation Notes

### PDF Text Extraction
PDF text extraction is currently a placeholder. To fully implement:
1. Install: `npm install pdf-parse @types/pdf-parse`
2. Uncomment the PDF parsing code in `app/api/extract-text/route.ts`
3. The code is already written, just commented out

### OpenAI Voice API
The app uses:
- **Whisper** for speech-to-text (transcription)
- **GPT-4** for generating interview responses
- **Text-to-Speech** is not used - responses are displayed as text

For true voice responses, you would need to:
1. Use OpenAI's TTS API or another service
2. Play audio responses in the browser
3. This is more complex and requires additional setup

### Environment Variables
All sensitive keys should be in `.env.local` (not committed to git):
- Supabase keys
- OpenAI API key
- Admin email

### Database Relationships
The schema uses foreign keys but some queries need to be done in two steps:
- First get the session with `user_interview_data_id`
- Then fetch the actual interview data using that ID
- This is because Supabase doesn't always handle nested selects well

### Authentication Flow
- Email/password auth works immediately
- Google OAuth requires:
  1. Google Cloud Console setup
  2. OAuth credentials in Supabase
  3. Redirect URL configuration

### Interview Flow Logic
The interview progression is simple:
- HR Screen: 6+ messages → Hiring Manager
- Hiring Manager: 8+ messages → Team Interview
- Team Interview: 10+ messages → Check for "questions for us" → End

You can customize this in the API routes or add more sophisticated logic.

### Admin Access
- Set `ADMIN_EMAIL` in `.env.local`
- In development, admin access is more permissive
- In production, only the specified email can access admin

### File Storage
Currently, files are processed and text is stored in the database.
To store actual files:
1. Upload to Supabase Storage bucket
2. Store URL in database
3. Update file upload component

### Mobile Responsiveness
The app uses Tailwind's responsive classes but may need adjustments for:
- Mobile interview interface
- Touch interactions
- Smaller screens

## Known Limitations

1. **PDF Extraction**: Not fully implemented (see above)
2. **Voice Responses**: Text-only (no TTS)
3. **Audio Recording**: Not stored permanently
4. **Real-time Streaming**: Responses are generated, not streamed
5. **Interview Timing**: No automatic time limits
6. **Multiple Languages**: English only

## Future Enhancements

- Full PDF text extraction
- Audio response playback
- Interview recording storage
- Real-time response streaming
- Mobile app version
- Interview analytics
- Custom interview templates
- Multi-language support

