// API route to scrape company website content for persona context
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    try {
      // Fetch the website with realistic browser headers
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        // Timeout after 15 seconds
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        // Provide more specific error messages
        if (response.status === 403) {
          throw new Error(`Access denied (403). This website may require authentication or block automated access. Please copy and paste the job description manually.`)
        } else if (response.status === 404) {
          throw new Error(`Page not found (404). Please check the URL and try again.`)
        } else if (response.status === 429) {
          throw new Error(`Too many requests (429). Please wait a moment and try again.`)
        } else {
          throw new Error(`HTTP error! status: ${response.status}. The website may be blocking automated access.`)
        }
      }

      const html = await response.text()

      // Try to extract job description from common job posting sites
      let extractedContent = ''
      
      // LinkedIn job postings
      const linkedinJobMatch = html.match(/<div[^>]*class="[^"]*job-details[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                                        html.match(/<section[^>]*class="[^"]*job-details[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
                                        html.match(/<div[^>]*data-testid="[^"]*job-details[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      
      // Indeed job postings
      const indeedJobMatch = html.match(/<div[^>]*id="jobDescriptionText"[^>]*>([\s\S]*?)<\/div>/i) ||
                                   html.match(/<div[^>]*class="[^"]*jobsearch-jobDescriptionText[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      
      // Generic job description patterns
      const jobDescMatch = html.match(/<div[^>]*(?:class|id)=[^"']*job[^"']*description[^"']*[^>]*>([\s\S]*?)<\/div>/i) ||
                          html.match(/<section[^>]*(?:class|id)=[^"']*job[^"']*description[^"']*[^>]*>([\s\S]*?)<\/section>/i) ||
                          html.match(/<article[^>]*(?:class|id)=[^"']*job[^"']*description[^"']*[^>]*>([\s\S]*?)<\/article>/i)
      
      // Try to extract from main content area
      const mainContentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                              html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                              html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      
      let jobContent = ''
      if (linkedinJobMatch) {
        jobContent = linkedinJobMatch[1]
      } else if (indeedJobMatch) {
        jobContent = indeedJobMatch[1]
      } else if (jobDescMatch) {
        jobContent = jobDescMatch[1]
      } else if (mainContentMatch) {
        jobContent = mainContentMatch[1]
      } else {
        // Fallback to full HTML
        jobContent = html
      }

      // Extract text content from HTML
      // Remove script and style tags
      let text = jobContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      // Extract key sections (about, mission, values, etc.) - for company websites
      const aboutMatch = html.match(/<section[^>]*about[^>]*>[\s\S]*?<\/section>/i) ||
                        html.match(/<div[^>]*about[^>]*>[\s\S]*?<\/div>/i)
      const missionMatch = html.match(/<section[^>]*mission[^>]*>[\s\S]*?<\/section>/i) ||
                          html.match(/<div[^>]*mission[^>]*>[\s\S]*?<\/div>/i)
      const valuesMatch = html.match(/<section[^>]*values?[^>]*>[\s\S]*?<\/section>/i) ||
                         html.match(/<div[^>]*values?[^>]*>[\s\S]*?<\/div>/i)

      extractedContent = text.substring(0, 10000) // Increased limit for job descriptions

      // Try to extract meta description
      const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      if (metaDescMatch) {
        extractedContent = `[Company Description: ${metaDescMatch[1]}]\n\n${extractedContent}`
      }

      // Try to extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) {
        extractedContent = `[Company: ${titleMatch[1]}]\n\n${extractedContent}`
      }

      return NextResponse.json({
        content: extractedContent,
        url: normalizedUrl,
        success: true,
      })
    } catch (fetchError: any) {
      console.error('Error fetching website:', fetchError)
      return NextResponse.json({
        error: `Failed to fetch website: ${fetchError.message}`,
        content: `[Unable to fetch website content from ${normalizedUrl}. The interviewer will use the job description and resume information instead.]`,
        url: normalizedUrl,
        success: false,
      }, { status: 200 }) // Return 200 so interview can continue
    }
  } catch (error) {
    console.error('Error scraping website:', error)
    return NextResponse.json(
      { error: 'Failed to scrape website', content: '', success: false },
      { status: 500 }
    )
  }
}

