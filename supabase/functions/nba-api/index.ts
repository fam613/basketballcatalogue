const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const API_BASE = 'https://api.balldontlie.io/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')?.trim().replace(/^['\"]|['\"]$/g, '')
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

    // Allowlist of valid endpoints
    const validEndpoints = ['players', 'teams', 'season_averages', 'stats', 'games']
    const basePath = endpoint.split('?')[0].split('/')[0]
    if (!validEndpoints.includes(basePath)) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
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
        error: isFallbackable ? 'SERVICE_UNAVAILABLE' : `API returned ${response.status}: ${text}`,
        fallback: isFallbackable,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
