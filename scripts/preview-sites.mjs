// Local-only preview identity. This script is never imported into the Worker.
import { createServer } from 'node:http';
const upstream = 'http://127.0.0.1:5191';
const origin = 'http://127.0.0.1:5192';
createServer(async (req, res) => {
  try {
    if (req.headers.host !== '127.0.0.1:5192') { res.writeHead(403).end(); return; }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value && !['host','connection','content-length'].includes(key)) headers.set(key, Array.isArray(value) ? value.join(',') : value);
    headers.set('oai-authenticated-user-id', 'local-preview-only');
    headers.set('oai-authenticated-user-email', 'preview@example.test');
    headers.set('oai-authenticated-user-full-name', 'Anteprima locale');
    if (headers.get('origin') === origin) headers.set('origin', upstream);
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const response = await fetch(new URL(req.url, upstream), {method:req.method,headers,body:body.length ? body : undefined,redirect:'manual'});
    const out = Object.fromEntries(response.headers); delete out['content-encoding'];delete out['content-length'];
    if (out.location?.startsWith(upstream)) out.location=origin+out.location.slice(upstream.length);
    res.writeHead(response.status,out);res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(502,{'Content-Type':'text/plain'});res.end('Anteprima in avvio. Riprova tra qualche secondo.'); }
}).listen(5192,'127.0.0.1',()=>console.log(`Progress Sets preview: ${origin} (dati di prova locali)`));
