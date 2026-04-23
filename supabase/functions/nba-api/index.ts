const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const API_BASE = 'https://api.balldontlie.io/nba/v1'

// Exact endpoints allowed, plus prefix matches for sub-paths (e.g. players/active)
const ALLOWED_ENDPOINTS = new Set(['players', 'players/active', 'teams', 'season_averages', 'stats', 'games'])
const ALLOWED_PREFIXES = new Set(['players', 'teams', 'season_averages', 'stats', 'games'])

function isEndpointAllowed(endpoint: string): boolean {
  const cleanPath = endpoint.split('?')[0]
  if (ALLOWED_ENDPOINTS.has(cleanPath)) return true
  // Allow sub-paths like players/{id} by checking the first segment
  const prefix = cleanPath.split('/')[0]
  return ALLOWED_PREFIXES.has(prefix)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')?.trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isEndpointAllowed(endpoint)) {
      return new Response(JSON.stringify({ error: `Invalid endpoint: ${endpoint}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Forward all query params except 'endpoint' to the API
    const apiUrl = new URL(`${API_BASE}/${endpoint}`)
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== 'endpoint') {
        apiUrl.searchParams.append(key, value)
      }
    }

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: apiKey },
    })

    const text = await response.text()
    
    if (!response.ok) {
      const isFallbackable = response.status === 429 || response.status >= 500
      return new Response(JSON.stringify({
        error: isFallbackable ? 'SERVICE_UNAVAILABLE' : `API returned ${response.status}`,
        fallback: isFallbackable,
        status: response.status,
      }), {
        status: 200, // Return 200 so client can parse the JSON
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
