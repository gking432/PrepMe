// API route to extract text from PDF files
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type === 'text/plain') {
      const text = await file.text()
      return NextResponse.json({ text })
    } else if (file.type === 'application/pdf') {
      // PDF text extraction and thumbnail generation using pdf-parse v2
      try {
        const { PDFParse } = await import('pdf-parse')
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const parser = new PDFParse({ data: buffer })
        
        try {
          const result = await parser.getText()
          
          if (!result.text || result.text.trim().length === 0) {
            return NextResponse.json({
              error: 'PDF appears to be empty or contains only images. Please paste the text manually.',
            }, { status: 400 })
          }
          
          // Thumbnail (card) + full-page preview (overlay) - same approach that works for the card
          let thumbnailUrl: string | undefined
          let fullPagePreviewUrl: string | undefined
          try {
            const [thumbResult, fullResult] = await Promise.all([
              parser.getScreenshot({ first: 1, desiredWidth: 400 }),
              parser.getScreenshot({ first: 1, desiredWidth: 1200 }),
            ])
            if (thumbResult?.pages?.[0]?.data) {
              const thumbPath = `thumbnails/${randomUUID()}.png`
              const { error: e } = await supabaseAdmin.storage.from('resumes').upload(thumbPath, Buffer.from(thumbResult.pages[0].data), { contentType: 'image/png', upsert: false })
              if (!e) thumbnailUrl = supabaseAdmin.storage.from('resumes').getPublicUrl(thumbPath).data.publicUrl
            }
            if (fullResult?.pages?.[0]?.data) {
              const fullPath = `previews/${randomUUID()}.png`
              const { error: e } = await supabaseAdmin.storage.from('resumes').upload(fullPath, Buffer.from(fullResult.pages[0].data), { contentType: 'image/png', upsert: false })
              if (!e) fullPagePreviewUrl = supabaseAdmin.storage.from('resumes').getPublicUrl(fullPath).data.publicUrl
            }
          } catch (thumbErr) {
            console.error('Screenshot generation/upload failed (non-blocking):', thumbErr)
          }
          
          // Store the actual PDF for full-screen viewer
          let pdfUrl: string | undefined
          try {
            const pdfPath = `pdfs/${randomUUID()}.pdf`
            const { error: pdfUploadError } = await supabaseAdmin.storage
              .from('resumes')
              .upload(pdfPath, buffer, {
                contentType: 'application/pdf',
                upsert: false,
              })
            if (!pdfUploadError) {
              const { data: pdfUrlData } = supabaseAdmin.storage.from('resumes').getPublicUrl(pdfPath)
              pdfUrl = pdfUrlData.publicUrl
            }
          } catch (pdfStorageErr) {
            console.error('PDF storage failed (non-blocking):', pdfStorageErr)
          }
          
          return NextResponse.json({ text: result.text, thumbnailUrl: thumbnailUrl ?? undefined, pdfUrl: pdfUrl ?? undefined, fullPagePreviewUrl: fullPagePreviewUrl ?? undefined })
        } finally {
          await parser.destroy()
        }
      } catch (pdfError: any) {
        // Log the full error for debugging
        console.error('PDF parsing error details:', {
          message: pdfError.message,
          code: pdfError.code,
          stack: pdfError.stack,
        })
        
        // If pdf-parse is not installed, provide helpful error
        if (pdfError.code === 'MODULE_NOT_FOUND' || pdfError.message?.includes('Cannot find module')) {
          console.error('pdf-parse not installed. Run: npm install pdf-parse @types/pdf-parse')
          return NextResponse.json({
            error: 'PDF extraction requires pdf-parse. Please run: npm install pdf-parse @types/pdf-parse',
            text: `[PDF file: ${file.name}]\n\nPDF text extraction is not available. Please paste your resume/job description as text.`,
          }, { status: 500 })
        }
        
        // Return a more helpful error message
        return NextResponse.json({
          error: `Failed to parse PDF: ${pdfError.message}`,
          text: `[PDF file: ${file.name}]\n\nError extracting text from PDF. Please paste the text manually.`,
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  } catch (error) {
    console.error('Error extracting text:', error)
    return NextResponse.json(
      { error: 'Failed to extract text from file' },
      { status: 500 }
    )
  }
}

