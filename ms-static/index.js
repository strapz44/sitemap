const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.STATIC_PORT || process.env.PORT || 3001);
const host = process.env.STATIC_HOST || '0.0.0.0';
const publicDir = path.join(__dirname, 'public');
const mapRoot = path.resolve(process.env.STATIC_MAP_ROOT || process.env.STATIC_BASE_DIR || process.env.HTML_ROOT || publicDir);

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'text/plain; charset=utf-8';
  }
}

function safeResolve(root, ...segs) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...segs);
  if (!target.startsWith(base + path.sep) && target !== base) return null;
  return target;
}

function serveFile(res, fp) {
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType(fp));
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const raw = (req.url || '/').split('?')[0];
  const urlPath = decodeURIComponent(raw);

  if (urlPath === '/' || urlPath === '') {
    const home = path.join(publicDir, 'index.html');
    serveFile(res, home);
    return;
  }

  const segs = urlPath.replace(/^\/+/, '').split('/').filter(Boolean);

  // Try mapped root: <mapRoot>/<...>/index.html
  const mappedIndex = safeResolve(mapRoot, ...segs, 'index.html');
  if (mappedIndex) {
    try {
      const st = fs.statSync(mappedIndex);
      if (st.isFile()) { serveFile(res, mappedIndex); return; }
    } catch (_) {}
  }

  // Fallback to public directory
  let fallbackPath = safeResolve(publicDir, ...segs);
  if (!fallbackPath) { res.statusCode = 400; res.end('Bad request'); return; }
  try {
    const st2 = fs.statSync(fallbackPath);
    if (st2.isDirectory()) fallbackPath = path.join(fallbackPath, 'index.html');
    serveFile(res, fallbackPath);
  } catch (e) {
    res.statusCode = 404; res.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Static server running at http://${host}:${port}`);
  console.log(`Public dir: ${publicDir}`);
  console.log(`Map root:  ${mapRoot}`);
});
