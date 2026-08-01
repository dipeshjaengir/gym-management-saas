import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { URL } from 'url'
import https from 'https'
import http from 'http'

// Custom local dev server middleware to run /api/check-download mock CORS-safely
const localCheckDownloadPlugin = () => ({
  name: 'local-check-download',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/api/check-download')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = urlObj.searchParams.get('url');
        
        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        const checkUrl = (tUrl: string, depth = 0) => {
          if (depth > 5) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Too many redirects' }));
            return;
          }

          const client = tUrl.startsWith('https') ? https : http;
          const options = {
            method: 'HEAD',
            headers: {
              'User-Agent': 'GymLedger-Verify'
            }
          };

          const request = client.request(tUrl, options, (response) => {
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              checkUrl(response.headers.location, depth + 1);
            } else {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: response.statusCode || 200,
                contentType: response.headers['content-type'] || '',
                contentLength: parseInt(response.headers['content-length'] || '0', 10)
              }));
            }
          });

          request.on('error', (err) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          });

          request.end();
        };

        checkUrl(targetUrl);
        return;
      }
      next();
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localCheckDownloadPlugin()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
