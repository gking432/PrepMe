-- Add pdf_url column for storing the actual PDF file (for full-screen viewer)
ALTER TABLE public.user_resumes ADD COLUMN IF NOT EXISTS pdf_url TEXT;
-- Add full_page_preview_url for larger screenshot (same approach as card thumbnail, works reliably)
ALTER TABLE public.user_resumes ADD COLUMN IF NOT EXISTS full_page_preview_url TEXT;
