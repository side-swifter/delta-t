// Serves the built site. Sends plain-http visits to https and adds security headers,
// so browsers never show "Not secure" for this domain.
const HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:'
      return Response.redirect(url.toString(), 301)
    }
    const res = await env.ASSETS.fetch(request)
    const out = new Response(res.body, res)
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v)
    if (url.pathname.startsWith('/assets/')) out.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return out
  },
}
