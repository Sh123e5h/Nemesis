import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://nemesiss.in';
const DIST_DIR = path.resolve('dist');
const OG_IMAGE = `${BASE_URL}/og-image.png`;

// Route config: each entry defines seo priority, changefreq, and optional image
const ROUTES = [
  {
    "path": "/",
    "priority": "1.0",
    "changefreq": "weekly",
    "image": {
      "loc": "https://nemesiss.in/og-image.png",
      "title": "Nemesis: Unified Academic Ecosystem"
    }
  },
  {
    "path": "/login",
    "priority": "0.8",
    "changefreq": "monthly"
  },
  {
    "path": "/signup",
    "priority": "0.8",
    "changefreq": "monthly"
  },
  {
    "path": "/signup/username",
    "priority": "0.5",
    "changefreq": "monthly"
  },
  {
    "path": "/forgot-password",
    "priority": "0.1",
    "changefreq": "monthly"
  },
  {
    "path": "/reset-password",
    "priority": "0.1",
    "changefreq": "monthly"
  },
  {
    "path": "/terms",
    "priority": "1.0",
    "changefreq": "yearly"
  },
  {
    "path": "/privacy",
    "priority": "1.0",
    "changefreq": "yearly"
  },
  {
    "path": "/dev-team",
    "priority": "1.0",
    "changefreq": "monthly"
  }
];


const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

function buildUrl(route) {
  const imageBlock = route.image
    ? `\n    <image:image>\n      <image:loc>${route.image.loc}</image:loc>\n      <image:title>${route.image.title}</image:title>\n    </image:image>`
    : '';

  return `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>${imageBlock}
  </url>`;
}

async function generate() {
  console.log('⚡ Generating Sitemap...');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${ROUTES.map(buildUrl).join('\n\n')}

</urlset>`;

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml);
  console.log('✅ Sitemap generated: dist/sitemap.xml');
}

generate().catch(err => {
  console.error('❌ Sitemap generation failed:', err);
  process.exit(1);
});
