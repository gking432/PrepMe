// API route to extract text from PDF files
import { NextRequest, NextResponse } from 'next/server'

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
      // PDF text extraction using pdf-parse
      try {
        // Use dynamic import - pdf-parse is a CommonJS module
        const pdfParseModule = await import('pdf-parse')
        // pdf-parse doesn't have a default export, it exports the function directly
        const pdfParse = 'default' in pdfParseModule ? pdfParseModule.default : pdfParseModule
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const data = await pdfParse(buffer)
        
        if (!data.text || data.text.trim().length === 0) {
          return NextResponse.json({
            error: 'PDF appears to be empty or contains only images. Please paste the text manually.',
          }, { status: 400 })
        }
        
        return NextResponse.json({ text: data.text })
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

