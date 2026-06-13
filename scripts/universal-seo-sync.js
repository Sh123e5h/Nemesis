import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Manual .env.local loader (No extra dependency required)
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const [key, ...value] = line.split('=');
      return [key.trim(), value.join('=').trim().replace(/^["']|["']$/g, '')];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncSEO() {
  console.log('🚀 Initiating Universal SEO Synchronization...');

  try {
    // 1. Fetch Latest Configuration from Supabase
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'seo_analytics_config')
      .single();

    if (error) throw error;
    const config = data.value;

    const { gtag_id, global_meta, keyword_monitor, sitemap_routes, schema_markup, indexnow_key } = config;

    // 2. Update index.html
    console.log('📄 Hydrating index.html...');
    let indexHtml = fs.readFileSync('index.html', 'utf8');

    // Update Title with data-rh="true"
    console.log(`🏷️ Syncing Title: ${global_meta.title}...`);
    const titleRegex = /<title[^>]*>[\s\S]*?<\/title>/;
    const newTitle = `<title data-rh="true" class="seo-fallback">${global_meta.title}</title>`;
    if (titleRegex.test(indexHtml)) {
      indexHtml = indexHtml.replace(titleRegex, newTitle);
    } else {
      indexHtml = indexHtml.replace(/<head>/, `<head>\n    ${newTitle}`);
    }

    // ⚠️ HYBRID AUTHORITY: These static tags allow non-JS crawlers to see metadata 
    // but include [data-rh="true"] so react-helmet-async replaces them instead of duplicating.

    // Update Meta Description
    indexHtml = indexHtml.replace(/<meta (data-rh="true" )?name="description" content=".*?" \/>/, `<meta data-rh="true" name="description" class="seo-fallback" content="${global_meta.description}" />`);
    
    // Update OG Description
    indexHtml = indexHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${global_meta.description}" />`);
    
    // Update Twitter Description
    indexHtml = indexHtml.replace(/<meta property="twitter:description" content=".*?" \/>/, `<meta property="twitter:description" content="${global_meta.description}" />`);

    // Update Keywords
    const allKeywords = keyword_monitor
      .map(k => k.keyword)
      .join(', ');
    const keywordsTag = `<meta name="keywords" content="${allKeywords}" />`;
    if (indexHtml.includes('<meta name="keywords"')) {
      indexHtml = indexHtml.replace(/<meta name="keywords" content=".*?" \/>/, keywordsTag);
    } else {
      indexHtml = indexHtml.replace(/<\/title>/, `</title>\n    ${keywordsTag}`);
    }

    // Update IndexNow Key
    indexHtml = indexHtml.replace(/<meta name="indexnow-key" content=".*?" \/>/, `<meta name="indexnow-key" content="${indexnow_key}" />`);

    // Update LD+JSON Schema Descriptions (Simple find/replace for global schema)
    indexHtml = indexHtml.replace(/"description": "The high-performance study hub.*?"/g, `"description": "${global_meta.description}"`);


    // 3. Update public/robots.txt
    console.log('🤖 Syncing robots.txt...');
    const robotsTxtContent = config.robots_txt_content || 'User-agent: *\nAllow: /';
    fs.writeFileSync('public/robots.txt', robotsTxtContent);
    console.log('✅ public/robots.txt synchronized.');

    // 4. Update generate-sitemap.js ROUTES
    console.log('🗺️ Refreshing Sitemap Configuration...');
    let sitemapScript = fs.readFileSync('scripts/generate-sitemap.js', 'utf8');
    
    // Construct the new ROUTES array string
    const newRoutesString = JSON.stringify(sitemap_routes, null, 2);
    sitemapScript = sitemapScript.replace(/const ROUTES = \[[\s\S]*?\];/, `const ROUTES = ${newRoutesString};`);
    
    fs.writeFileSync('scripts/generate-sitemap.js', sitemapScript);
    console.log('✅ generate-sitemap.js synchronized.');

    console.log('✨ Universal SEO Sync Complete.');
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

syncSEO();
