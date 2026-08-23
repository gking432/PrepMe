// API route to extract job posting/company content from URLs.
import { NextRequest, NextResponse } from 'next/server'
import { assertSafePublicUrl, enforceRateLimit, rejectOversizedRequest } from '@/lib/demo-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_CONTENT_LENGTH = 12000

function normalizeUrl(input: string) {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('No URL provided')
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
}

function stripHtml(html: string) {
  return decodeHtml(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|section|article|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
}

function cleanText(text: string) {
  return decodeHtml(text)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH)
}

function textFromHtml(html: string) {
  return cleanText(stripHtml(html))
}

function buildSections(sections: Array<[string, any]>) {
  return cleanText(
    sections
      .filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0
        return typeof value === 'string' ? value.trim().length > 0 : !!value
      })
      .map(([label, value]) => {
        const body = Array.isArray(value)
          ? value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join('\n')
          : String(value)
        return `${label}:\n${textFromHtml(body)}`
      })
      .join('\n\n')
  )
}

async function fetchWithHeaders(url: string, init?: RequestInit) {
  let currentUrl = (await assertSafePublicUrl(url)).toString()

  for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,text/plain;q=0.7,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.google.com/',
        ...init?.headers,
      },
      signal: init?.signal || AbortSignal.timeout(15000),
    })

    if (![301, 302, 303, 307, 308].includes(response.status)) return response
    const location = response.headers.get('location')
    if (!location) return response
    currentUrl = (await assertSafePublicUrl(new URL(location, currentUrl).toString())).toString()
  }

  throw new Error('Too many redirects')
}

function findJobPosting(value: any): any | null {
  if (!value) return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }

  if (typeof value === 'object') {
    const type = value['@type']
    const typeList = Array.isArray(type) ? type : [type]
    if (typeList.some((entry) => String(entry || '').toLowerCase() === 'jobposting')) {
      return value
    }

    if (value['@graph']) {
      const found = findJobPosting(value['@graph'])
      if (found) return found
    }

    for (const nested of Object.values(value)) {
      const found = findJobPosting(nested)
      if (found) return found
    }
  }

  return null
}

function locationText(location: any) {
  if (!location) return ''
  if (typeof location === 'string') return location
  const address = location.address
  if (typeof address === 'string') return address
  if (address && typeof address === 'object') {
    return [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', ')
  }
  return ''
}

function jobPostingToText(job: any) {
  const company = typeof job.hiringOrganization === 'string'
    ? job.hiringOrganization
    : job.hiringOrganization?.name
  const location = Array.isArray(job.jobLocation)
    ? job.jobLocation.map(locationText).filter(Boolean).join(' / ')
    : locationText(job.jobLocation)

  return buildSections([
    ['Title', job.title || job.name],
    ['Company', company],
    ['Location', location],
    ['Employment Type', Array.isArray(job.employmentType) ? job.employmentType.join(', ') : job.employmentType],
    ['Description', job.description],
    ['Responsibilities', job.responsibilities],
    ['Qualifications', job.qualifications || job.educationRequirements || job.experienceRequirements],
    ['Skills', job.skills],
  ])
}

function extractJsonLdJobPosting(html: string) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []

  for (const script of scripts) {
    const raw = script
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(decodeHtml(raw))
      const job = findJobPosting(parsed)
      if (job) {
        const text = jobPostingToText(job)
        if (text.length > 200) return text
      }
    } catch {
      // Keep looking. Some pages ship malformed JSON-LD.
    }
  }

  return ''
}

function collectLikelyJobStrings(value: any, output: string[] = [], depth = 0) {
  if (!value || depth > 8 || output.join('\n').length > MAX_CONTENT_LENGTH) return output

  if (typeof value === 'string') {
    const cleaned = cleanText(textFromHtml(value))
    if (cleaned.length > 120 && /responsib|qualif|require|experience|salary|benefit|about|role|team|job/i.test(cleaned)) {
      output.push(cleaned)
    }
    return output
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectLikelyJobStrings(item, output, depth + 1))
    return output
  }

  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (/description|content|responsib|qualif|requirement|summary|job|posting|title|role|position/i.test(key)) {
        collectLikelyJobStrings(nested, output, depth + 1)
      } else if (depth < 5) {
        collectLikelyJobStrings(nested, output, depth + 1)
      }
    }
  }

  return output
}

function extractFromNextData(html: string) {
  const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (!match?.[1]) return ''

  try {
    const parsed = JSON.parse(decodeHtml(match[1]))
    return cleanText([...new Set(collectLikelyJobStrings(parsed))].join('\n\n'))
  } catch {
    return ''
  }
}

function extractLikelyDomContent(html: string) {
  const patterns = [
    /<div[^>]*(?:class|id)=["'][^"']*(?:job|posting|description|details)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*(?:class|id)=["'][^"']*(?:job|posting|description|details)[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const text = textFromHtml(match[1])
      if (text.length > 250) return text
    }
  }

  return textFromHtml(html)
}

async function extractGreenhouseJob(url: URL) {
  const host = url.hostname.toLowerCase()
  if (!host.includes('greenhouse.io')) return null

  const parts = url.pathname.split('/').filter(Boolean)
  const board = parts[0]
  let jobId = ''

  const jobsIndex = parts.findIndex((part) => part === 'jobs')
  if (jobsIndex >= 0) jobId = parts[jobsIndex + 1] || ''
  jobId = jobId || url.searchParams.get('gh_jid') || ''

  if (!board || !jobId) return null

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(jobId)}`
  const response = await fetchWithHeaders(apiUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  const job = await response.json()

  const text = buildSections([
    ['Title', job.title],
    ['Company', job.company_name],
    ['Location', job.location?.name],
    ['Description', job.content],
  ])

  return text.length > 200 ? text : null
}

async function extractLeverJob(url: URL) {
  if (url.hostname.toLowerCase() !== 'jobs.lever.co') return null

  const parts = url.pathname.split('/').filter(Boolean)
  const company = parts[0]
  const postingId = parts[1]
  if (!company || !postingId) return null

  const apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}?mode=json`
  const response = await fetchWithHeaders(apiUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  const job = await response.json()

  const listText = Array.isArray(job.lists)
    ? job.lists.map((list: any) => `${list.text}\n${(list.content || '').replace(/<li>/gi, '\n- ')}`).join('\n\n')
    : ''

  const text = buildSections([
    ['Title', job.text],
    ['Company', company],
    ['Location', job.categories?.location],
    ['Team', job.categories?.team],
    ['Description', job.description || job.descriptionPlain],
    ['Details', listText],
    ['Additional Information', job.additional || job.additionalPlain],
  ])

  return text.length > 200 ? text : null
}

async function extractAtsJob(normalizedUrl: string) {
  const parsedUrl = new URL(normalizedUrl)
  const atsExtractors = [extractGreenhouseJob, extractLeverJob]

  for (const extractor of atsExtractors) {
    try {
      const text = await extractor(parsedUrl)
      if (text) return { content: text, source: 'ats_api' }
    } catch (error) {
      console.error('ATS extraction failed:', error)
    }
  }

  return null
}

async function extractWithJinaReader(normalizedUrl: string) {
  try {
    const response = await fetchWithHeaders(`https://r.jina.ai/${normalizedUrl}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) return null
    const text = cleanText(await response.text())
    if (text.length > 250) return { content: text, source: 'jina_reader' }
  } catch (error) {
    console.error('Jina Reader fallback failed:', error)
  }

  return null
}

async function extractDirectHtml(normalizedUrl: string) {
  const response = await fetchWithHeaders(normalizedUrl)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  const content =
    extractJsonLdJobPosting(html) ||
    extractFromNextData(html) ||
    extractLikelyDomContent(html)

  const decorated = buildSections([
    ['Page Title', titleMatch?.[1]],
    ['Meta Description', metaDescMatch?.[1]],
    ['Extracted Content', content],
  ])

  if (decorated.length < 250) {
    throw new Error('Could not find enough readable job content')
  }

  return { content: decorated, source: 'direct_html' }
}

export async function POST(request: NextRequest) {
  let normalizedUrl = ''

  try {
    const rateLimited = enforceRateLimit(request, 'scrape-job', { limit: 12, windowMs: 10 * 60 * 1000 })
    if (rateLimited) return rateLimited
    const oversized = rejectOversizedRequest(request, 16 * 1024)
    if (oversized) return oversized

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    normalizedUrl = (await assertSafePublicUrl(normalizeUrl(url))).toString()

    const atsResult = await extractAtsJob(normalizedUrl)
    if (atsResult) {
      return NextResponse.json({ ...atsResult, url: normalizedUrl, success: true })
    }

    try {
      const directResult = await extractDirectHtml(normalizedUrl)
      return NextResponse.json({ ...directResult, url: normalizedUrl, success: true })
    } catch (directError) {
      console.error('Direct website extraction failed:', directError)
    }

    const readerResult = await extractWithJinaReader(normalizedUrl)
    if (readerResult) {
      return NextResponse.json({ ...readerResult, url: normalizedUrl, success: true })
    }

    return NextResponse.json({
      error: 'Could not extract the job posting from this URL. Please paste the job description manually.',
      content: `[Unable to fetch website content from ${normalizedUrl}. The interviewer will use the job description and resume information instead.]`,
      url: normalizedUrl,
      success: false,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error scraping website:', error)
    return NextResponse.json({
      error: error.message || 'Failed to scrape website',
      content: normalizedUrl
        ? `[Unable to fetch website content from ${normalizedUrl}. The interviewer will use the job description and resume information instead.]`
        : '',
      url: normalizedUrl,
      success: false,
    }, { status: normalizedUrl ? 200 : 500 })
  }
}
