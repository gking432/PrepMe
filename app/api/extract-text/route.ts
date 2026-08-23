// API route to extract text from uploaded resumes and job-description files.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { PORTFOLIO_DEMO_MODE } from '@/lib/portfolio-demo'
import { enforceRateLimit } from '@/lib/demo-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const IMAGE_MIME_FALLBACKS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function fileExtension(fileName: string) {
  const normalized = fileName.toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex) : ''
}

function detectFileKind(file: File) {
  const type = (file.type || '').toLowerCase()
  const ext = fileExtension(file.name || '')

  if (type === 'text/plain' || ext === '.txt') return 'text'
  if (type === 'application/pdf' || ext === '.pdf') return 'pdf'
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) return 'docx'
  if (type === 'application/msword' || ext === '.doc') return 'doc'
  if (type.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image'

  return 'unknown'
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

async function uploadPdfArtifacts(buffer: Buffer, parser?: any) {
  let thumbnailUrl: string | undefined
  let fullPagePreviewUrl: string | undefined
  let pdfUrl: string | undefined
  let fullPagePreviewBytes: Buffer | undefined

  if (parser) {
    try {
      const [thumbResult, fullResult] = await Promise.all([
        parser.getScreenshot({ first: 1, desiredWidth: 400 }),
        parser.getScreenshot({ first: 1, desiredWidth: 1200 }),
      ])

      if (thumbResult?.pages?.[0]?.data) {
        const thumbPath = `thumbnails/${randomUUID()}.png`
        const thumbBytes = Buffer.from(thumbResult.pages[0].data)
        if (!PORTFOLIO_DEMO_MODE) {
          const { error } = await supabaseAdmin.storage
            .from('resumes')
            .upload(thumbPath, thumbBytes, { contentType: 'image/png', upsert: false })
          if (!error) {
            thumbnailUrl = supabaseAdmin.storage.from('resumes').getPublicUrl(thumbPath).data.publicUrl
          }
        }
      }

      if (fullResult?.pages?.[0]?.data) {
        const fullPath = `previews/${randomUUID()}.png`
        fullPagePreviewBytes = Buffer.from(fullResult.pages[0].data)
        if (!PORTFOLIO_DEMO_MODE) {
          const { error } = await supabaseAdmin.storage
            .from('resumes')
            .upload(fullPath, fullPagePreviewBytes, { contentType: 'image/png', upsert: false })
          if (!error) {
            fullPagePreviewUrl = supabaseAdmin.storage.from('resumes').getPublicUrl(fullPath).data.publicUrl
          }
        }
      }
    } catch (thumbErr) {
      console.error('Screenshot generation/upload failed (non-blocking):', thumbErr)
    }
  }

  try {
    if (PORTFOLIO_DEMO_MODE) {
      return { fullPagePreviewBytes }
    }
    const pdfPath = `pdfs/${randomUUID()}.pdf`
    const { error } = await supabaseAdmin.storage
      .from('resumes')
      .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: false })
    if (!error) {
      pdfUrl = supabaseAdmin.storage.from('resumes').getPublicUrl(pdfPath).data.publicUrl
    }
  } catch (pdfStorageErr) {
    console.error('PDF storage failed (non-blocking):', pdfStorageErr)
  }

  return { thumbnailUrl, fullPagePreviewUrl, pdfUrl, fullPagePreviewBytes }
}

async function ocrImageBuffer(buffer: Buffer, mediaType: string) {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.RESUME_OCR_MODEL || 'gpt-4o-mini'
  const base64 = buffer.toString('base64')
  const response = await client.chat.completions.create({
    model,
    max_tokens: 4000,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all readable resume or job-description text from this image. Return only the extracted text, preserving headings and bullets as plain text. No commentary.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mediaType};base64,${base64}` },
          },
        ],
      },
    ] as any,
  })

  const text = response.choices?.[0]?.message?.content || ''
  return normalizeExtractedText(text)
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, 'extract-resume', { limit: 8, windowMs: 60 * 60 * 1000 })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large. The public demo accepts files up to 8 MB.' }, { status: 413 })
    }

    const kind = detectFileKind(file)
    const ext = fileExtension(file.name || '')

    if (kind === 'text') {
      const text = normalizeExtractedText(await file.text())
      return NextResponse.json({ text, detectedType: 'text' })
    }

    if (kind === 'docx') {
      try {
        const mammoth = await import('mammoth')
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await mammoth.extractRawText({ buffer })
        const text = normalizeExtractedText(result.value || '')

        if (!text) {
          return NextResponse.json({
            error: 'Could not find readable text in this DOCX. Please paste the resume text manually.',
          }, { status: 400 })
        }

        return NextResponse.json({ text, detectedType: 'docx' })
      } catch (docxError: any) {
        console.error('DOCX parsing error:', docxError)
        return NextResponse.json({
          error: `Failed to parse DOCX: ${docxError.message || 'unknown error'}`,
        }, { status: 500 })
      }
    }

    if (kind === 'doc') {
      return NextResponse.json({
        error: 'Old .doc files are not supported yet. Please upload a PDF, DOCX, TXT, or paste the resume text.',
      }, { status: 400 })
    }

    if (kind === 'pdf') {
      try {
        const { PDFParse } = await import('pdf-parse')
        const buffer = Buffer.from(await file.arrayBuffer())
        const parser = new PDFParse({ data: buffer })

        try {
          const result = await parser.getText()
          const artifacts = await uploadPdfArtifacts(buffer, parser)
          let text = normalizeExtractedText(result.text || '')

          if (!text && artifacts.fullPagePreviewBytes) {
            try {
              text = await ocrImageBuffer(artifacts.fullPagePreviewBytes, 'image/png')
            } catch (ocrError) {
              console.error('PDF OCR fallback failed:', ocrError)
            }
          }

          if (!text) {
            return NextResponse.json({
              error: 'PDF appears to be empty or image-only. Please upload a clearer PDF, DOCX, or paste the text manually.',
              ...artifacts,
            }, { status: 400 })
          }

          return NextResponse.json({
            text,
            detectedType: 'pdf',
            thumbnailUrl: artifacts.thumbnailUrl,
            pdfUrl: artifacts.pdfUrl,
            fullPagePreviewUrl: artifacts.fullPagePreviewUrl,
          })
        } finally {
          await parser.destroy()
        }
      } catch (pdfError: any) {
        console.error('PDF parsing error details:', {
          message: pdfError.message,
          code: pdfError.code,
          stack: pdfError.stack,
        })

        return NextResponse.json({
          error: `Failed to parse PDF: ${pdfError.message || 'unknown error'}`,
        }, { status: 500 })
      }
    }

    if (kind === 'image') {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const mediaType = file.type || IMAGE_MIME_FALLBACKS[ext] || 'image/png'
        const text = await ocrImageBuffer(buffer, mediaType)

        if (!text) {
          return NextResponse.json({
            error: 'Could not read text from this image. Try uploading a clearer photo or paste the text instead.',
          }, { status: 400 })
        }

        return NextResponse.json({ text, detectedType: 'image' })
      } catch (imgError: any) {
        console.error('Image OCR error:', imgError)
        return NextResponse.json({
          error: `Failed to read image text: ${imgError.message || 'please paste the text instead.'}`,
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, JPG, PNG, or WebP file.',
    }, { status: 400 })
  } catch (error) {
    console.error('Error extracting text:', error)
    return NextResponse.json(
      { error: 'Failed to extract text from file' },
      { status: 500 }
    )
  }
}
