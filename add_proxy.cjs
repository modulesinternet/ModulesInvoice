const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('/api/proxy-file')) {
  const proxyCode = `
app.get('/api/proxy-file', async (req: Request, res: Response) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) {
    return res.status(400).send('Missing url parameter');
  }
  try {
    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch file');
    }
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err: any) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
});
`;

  code = code.replace(/app\.listen\(/, proxyCode + '\n  app.listen(');
  fs.writeFileSync('server.ts', code);
}
