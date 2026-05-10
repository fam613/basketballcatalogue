const ALLOWED_ORIGINS = new Set([
  'https://basketballcatalogue.lovable.app',
  'https://d55ffaf8-32e9-43c1-9a62-b2430739dad4.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
])

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

const API_BASE = 'https://api.balldontlie.io/nba/v1'

const ALLOWED_PARAMS = new Set(['per_page', 'cursor', 'player_id', 'season', 'postseason', 'seasons[]', 'player_ids[]', 'team_ids[]'])

function isEndpointAllowed(endpoint: string): boolean {
  if (endpoint.includes('..') || endpoint.includes('//')) return false
  const cleanPath = endpoint.split('?')[0]
  return /^(players\/active|players|teams|season_averages|stats|games)$/.test(cleanPath)
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')?.trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Bad request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isEndpointAllowed(endpoint)) {
      return new Response(JSON.stringify({ error: 'Bad request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiUrl = new URL(`${API_BASE}/${endpoint}`)
    for (const [key, value] of url.searchParams.entries()) {
      if (key === 'endpoint') continue
      if (!ALLOWED_PARAMS.has(key)) continue
      if (key === 'per_page' && parseInt(value) > 100) continue
      apiUrl.searchParams.append(key, value)
    }

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: apiKey },
    })

    const text = await response.text()

    if (!response.ok) {
      const isFallbackable = response.status === 429 || response.status >= 500
      return new Response(JSON.stringify({
        error: isFallbackable ? 'SERVICE_UNAVAILABLE' : 'Request failed',
        fallback: isFallbackable,
        status: response.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
