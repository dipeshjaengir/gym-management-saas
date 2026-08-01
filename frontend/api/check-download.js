const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const checkUrl = (targetUrl, redirectDepth = 0) => {
      if (redirectDepth > 5) {
        return Promise.resolve({ status: 500, error: 'Too many redirects' });
      }

      return new Promise((resolve) => {
        const client = targetUrl.startsWith('https') ? https : http;
        const options = {
          method: 'HEAD',
          headers: {
            'User-Agent': 'GymLedger-Verify-Agent'
          }
        };

        const request = client.request(targetUrl, options, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            // Follow redirect recursively
            resolve(checkUrl(response.headers.location, redirectDepth + 1));
          } else {
            resolve({
              status: response.statusCode,
              contentType: response.headers['content-type'] || '',
              contentLength: parseInt(response.headers['content-length'] || '0', 10)
            });
          }
        });

        request.on('error', (err) => {
          resolve({ status: 500, error: err.message });
        });

        request.end();
      });
    };

    const result = await checkUrl(url);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
