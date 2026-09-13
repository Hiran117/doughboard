export default async function handler(req, res) {
  const { path = [] } = req.query
  const upstreamPath = Array.isArray(path) ? path.join('/') : path

  const url = new URL(`https://swap.cookiescan.io/api/${upstreamPath}`)
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v))
    else if (value !== undefined) url.searchParams.set(key, value)
  }

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers: { 'content-type': 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
    })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: 'proxy_failed', message: e instanceof Error ? e.message : String(e) })
  }
}
