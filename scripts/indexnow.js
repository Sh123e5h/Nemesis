/**
 * ⚡ INDEXNOW AUTOMATED PING SERVICE v1.1.0
 * 
 * Automatically notifies Bing, Yandex, and other search engines of site updates.
 * Includes propagation delays, User-Agent identification, and GET-fallback strategy.
 */

import http from 'https';

const HOST = 'nemesiss.in';
const KEY = 'e74b3d87a412431faae2b1e106979685';

// Publicly reachable routes to index
const PUBLIC_ROUTES = [
  '',
  '/login',
  '/signup',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/dev-team'
];

async function pingEndpoint(endpoint, data) {
  return new Promise((resolve) => {
    const options = {
      hostname: endpoint,
      port: 443,
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Nemesis-Indexer/1.1 (+https://nemesiss.in)'
      }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`✅ IndexNow: Successful POST to ${endpoint}`);
        resolve(true);
      } else {
        console.warn(`⚠️ IndexNow: ${endpoint} POST returned ${res.statusCode}. Attempting GET fallback...`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.error(`❌ IndexNow: POST error for ${endpoint}:`, err.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function getFallback(endpoint, url) {
  const encodedUrl = encodeURIComponent(url);
  const path = `/indexnow?url=${encodedUrl}&key=${KEY}`;
  
  return new Promise((resolve) => {
    const options = {
      hostname: endpoint,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Nemesis-Indexer/1.1 (+https://nemesiss.in)'
      }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`✅ IndexNow: Successful GET fallback for ${endpoint}`);
        resolve(true);
      } else {
        console.warn(`❌ IndexNow: ${endpoint} GET fallback also failed with ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      resolve(false);
    });

    req.end();
  });
}

async function startIndexing() {
  const urlList = PUBLIC_ROUTES.map(route => `https://${HOST}${route}`);
  const data = JSON.stringify({
    host: HOST,
    key: KEY,
    urlList: urlList
  });

  const endpoints = ['www.bing.com', 'yandex.com', 'api.indexnow.org'];

  console.log('⏳ IndexNow: Waiting 30 seconds for Cloudflare propagation...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log('🚀 IndexNow: Notifying search engines...');

  for (const endpoint of endpoints) {
    const success = await pingEndpoint(endpoint, data);
    if (!success) {
      // Attempt GET fallback for the homepage at least
      await getFallback(endpoint, `https://${HOST}/`);
    }
  }
}

startIndexing().catch(err => {
  console.error('❌ IndexNow system failure:', err);
});
