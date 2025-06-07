import fs from 'fs/promises';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROXY_FILE = `${__dirname}/proxies.js`;
const TEST_URL = 'http://google.com';
const TIMEOUT = 5000;
const CONCURRENCY = 10;

async function testProxy(proxy) {
  const [host, port] = proxy.split(':');
  return new Promise((resolve) => {
    const options = {
      host,
      port: parseInt(port),
      path: TEST_URL,
      method: 'GET',
      headers: { Host: 'example.com', Connection: 'close' },
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 400));
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function validateProxies() {
  // Import existing proxies
  const module = await import(PROXY_FILE);
  const proxies = [...module.default];
  const activeProxies = [];
  
  console.log(`Testing ${proxies.length} proxies...`);

  // Process proxies in batches
  for (let i = 0; i < proxies.length; i += CONCURRENCY) {
    const batch = proxies.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(proxy => testProxy(proxy).then(active => ({ proxy, active })))
    );
    
    results.forEach(({ proxy, active }) => {
      if (active) {
        activeProxies.push(proxy);
        console.log(`✅ Active: ${proxy}`);
      } else {
        console.log(`❌ Inactive: ${proxy}`);
      }
    });
  }

  // Update proxy file
  const content = `const proxies = [\n  "${activeProxies.join('",\n  "')}"\n];\nexport default proxies;`;
  await fs.writeFile(PROXY_FILE, content);
  
  console.log(`\nValidation complete!`);
  console.log(`Active proxies: ${activeProxies.length}/${proxies.length}`);
  console.log(`Updated ${PROXY_FILE}`);
}

validateProxies().catch(console.error);