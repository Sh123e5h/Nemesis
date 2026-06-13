import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import crypto from 'crypto';

const PROJECT_ROOT = path.resolve(process.cwd());
const OUTPUT_PDF = path.join(PROJECT_ROOT, 'Nemesis_Official_Documentation.pdf');

// Helpers for reading files
async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (e) {
    return '';
  }
}

async function getFilesRecursively(dir, extension = '.tsx') {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const file of list) {
    const fullPath = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(await getFilesRecursively(fullPath, extension));
    } else if (file.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Generate the massive markdown content
async function generateMarkdown() {
  console.log('Gathering content...');
  let md = '';

  // 1. Title Page & Credits
  md += `
<div style="text-align: center; margin-top: 150px; page-break-after: always;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'logo.svg')}" width="200" />
  <h1 style="font-size: 4em; margin-bottom: 0;">NEMESIS</h1>
  <h2 style="font-size: 2em; color: #64748b;">The Definitive Technical & Product Manual</h2>
  <br/><br/><br/>
  <h3>Lead Architect & Principal Engineer:</h3>
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'shireesh.webp')}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 4px solid #0ea5e9; margin: 10px auto; display: block; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);" />
  <h2 style="color: #0ea5e9; font-size: 2.5em; border-bottom: 2px solid #0ea5e9; display: inline-block; padding-bottom: 10px; margin-top: 10px;">Shireesh Kashyap</h2>
  <p style="font-size: 1.2em; max-width: 600px; margin: 20px auto; color: #475569;">
    The visionary and primary driving force behind the Nemesis architecture, database design, and frontend engineering.
  </p>
  <br/><br/>
  <p>Contributors: Shashwat, Shivam</p>
  <p style="margin-top: 100px;">Generated automatically from source code.</p>
</div>

`;

  // 2. Executive Dedication (To pad and highlight Shireesh)
  md += `<div style="page-break-after: always; display: flex; flex-direction: column; min-height: 85vh;">

# Architect's Note

**Shireesh Kashyap**, the Main Developer and Lead Architect, began his technological voyage at the age of 19 during his early schooling at Sir Padampat Singhania Education Centre in Kanpur. 

Long before architecting complex web platforms, Shireesh’s passion for computing was ignited by after-school gaming sessions—immersed in the worlds of *Counter-Strike 1.6*, *Assassin's Creed II*, and *Resident Evil*. It was within the *Resident Evil* universe that he encountered the relentless, invincible antagonist known as "Nemesis," a name that would later inspire the uncompromising resilience of this very platform.

This early fascination with digital worlds soon evolved into a profound interest in operating systems and cybersecurity. Shireesh began exploring Linux, mastering various hardware configurations and distributions like Arch Linux. His growing expertise in cybersecurity led to some audacious early exploits, including successfully hacking his Computer Science teacher's Gmail account, penetrating the school's internal systems, and accessing several other teachers' accounts. These experiences cultivated a deep, practical understanding of network security and systems architecture, eventually leading him to develop a website for his school as an early passion project. 

Today, as a Computer Science and Engineering student at Pranveer Singh Institute of Technology (PSIT), Kanpur, Shireesh has channeled his expertise into building Nemesis. While contributions were made by the team, the core engine—including the glassmorphism design system, the offline-first synchronization logic, the real-time collaboration web sockets, and the complex Row Level Security policies—were entirely conceptualized, designed, and implemented by Shireesh.

This manual serves as the comprehensive reference guide to the Nemesis platform. It documents every module, every database table, every edge function, and the vast UI component library that makes Nemesis possible. It is a living record of the engineering passion poured into this project. Thank you for reading this documentation and for using Nemesis.

<div style="flex-grow: 1;"></div>

<div style="margin-top: 60px; display: flex; align-items: center; justify-content: flex-start; gap: 20px;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'shireesh.webp')}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #0ea5e9; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);" />
  <div>
    <h2 style="font-family: 'Brush Script MT', 'Great Vibes', cursive, serif; font-size: 3.5em; margin: 0; color: #0f172a; font-weight: normal;">Shireesh Kashyap</h2>
    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 1.1em; font-family: 'Outfit', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Lead Architect</p>
  </div>
</div>

</div>`;

  // 3. PRD Content
  const prdContent = await safeReadFile(path.join(PROJECT_ROOT, 'PRD.md'));
  
  // 2.5 Lore and Easter Eggs
  md += `<div style="page-break-after: always;">

# The Lore of Nemesis

The name **Nemesis** was not chosen lightly. Engineered by Shireesh Kashyap, the system's identity draws deeply from both classical mythology and iconic pop culture, converging into a platform designed to be a student's ultimate academic weapon.

## Mythology: The Goddess of Retribution
In ancient Greek religion, **Nemesis** is the goddess who enacts retribution against those who succumb to hubris (arrogance before the gods). In the context of our platform, *Nemesis* represents the ultimate tool to strike back against procrastination, disorganized notes, and academic chaos.

<div style="text-align: center; margin: 20px 0;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'lore', 'nemesis_myth.jpg')}" style="height: 300px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
  <p style="font-size: 0.9em; color: #64748b;"><em>Gheorghe Tattarescu's depiction of Nemesis.</em></p>
</div>

## Resident Evil: The Ultimate Pursuer
The name also pays homage to the legendary **Nemesis-T Type** from Capcom's *Resident Evil* franchise. Just as the terrifying Nemesis relentlessly pursues its targets through Raccoon City, this platform relentlessly tracks tasks, deadlines, and study goals, ensuring nothing slips through the cracks.

<div style="text-align: center; margin: 20px 0;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'lore', 'nemesis_re.png')}" style="height: 300px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
  <p style="font-size: 0.9em; color: #64748b;"><em>The iconic Nemesis-T Type.</em></p>
</div>

## The Nemesis Logo Story
The logo of Nemesis reflects a stylized **atomic nucleus**, with orbiting electrons. It symbolizes *centralization* and *energy*. Students bring scattered fragments of knowledge—notes, files, messages—into the nucleus of Nemesis, creating a high-energy reactor for learning and collaboration.

<div style="text-align: center; margin: 20px 0;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'logo.svg')}" style="width: 150px; background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);" />
</div>

## Developer Easter Eggs
The codebase is filled with hidden gems and backend overrides placed by Shireesh Kashyap during the late-night engineering sessions:

1. **The Dev Bypass Hack:** Deep within \`AdminAuth.tsx\`, entering \`admin@nemesis.com\` triggers an immediate bypass of the PostgreSQL RLS policies by hijacking the first available user ID in the system.
2. **The 2026 Pepper:** The system's cryptographic pepper, \`nemesis_2026_pepper_v1\`, is hardcoded into the SHA-256 client-side hashing algorithm, predicting the platform's stability well into the future.
3. **The Hover Spin:** Clicking the logo in the Admin Command Center triggers a \`transform rotate-3 hover:rotate-0\` CSS transition—a subtle nod to the "spinning atom" motif.

</div>`;
  
  // Inject some images into the PRD randomly to make it look great
  let prdWithImages = prdContent;
  const imageAssets = [
    path.join(PROJECT_ROOT, 'public', 'showcase', 'dashboard.png'),
    path.join(PROJECT_ROOT, 'public', 'showcase', 'planner.png'),
    path.join(PROJECT_ROOT, 'public', 'showcase', 'organizer.png'),
    path.join(PROJECT_ROOT, 'public', 'showcase', 'group.png'),
    path.join(PROJECT_ROOT, 'public', 'landing-assets', 'hero-core.png'),
    path.join(PROJECT_ROOT, 'public', 'landing-assets', 'groups-3d.png'),
  ];
  
  // Simple heuristic: inject images before large headers
  let imgIndex = 0;
  prdWithImages = prdWithImages.replace(/^## \d+\. /gm, (match) => {
    if (imgIndex < imageAssets.length) {
      const img = `<img src="file://${imageAssets[imgIndex]}" style="width: 100%; border-radius: 12px; margin: 40px 0; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);" />\n\n<div style="page-break-before: always;"></div>\n\n`;
      imgIndex++;
      return img + match;
    }
    return `<div style="page-break-before: always;"></div>\n\n` + match;
  });

  md += prdWithImages;

  // 4. Massive Codebase API Reference (to reach 100-150 pages)
  md += `\n\n<div style="page-break-before: always;"></div>\n\n# Part II: Complete Codebase API Reference\n\n`;
  md += `<div style="display: flex; align-items: center; gap: 20px; background: #f8fafc; padding: 20px; border-left: 4px solid #0ea5e9; border-radius: 8px; margin-bottom: 30px;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'shireesh.webp')}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #0ea5e9; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
  <div>
    <h3 style="margin: 0; color: #0f172a;">Frontend Architecture & UI Systems</h3>
    <p style="margin: 5px 0 0 0; color: #475569;">This section documents the inner workings of the frontend architecture, cataloging the hundreds of components engineered from scratch by <strong>Shireesh Kashyap</strong>.</p>
  </div>
</div>\n\n`;

  console.log('Extracting codebase reference...');
  const tsxFiles = await getFilesRecursively(path.join(PROJECT_ROOT, 'src'), '.tsx');
  const tsFiles = await getFilesRecursively(path.join(PROJECT_ROOT, 'src'), '.ts');
  const allFiles = [...tsxFiles, ...tsFiles];

  for (const file of allFiles) {
    const content = await safeReadFile(file);
    const relativePath = path.relative(PROJECT_ROOT, file);
    const lines = content.split('\\n');
    
    // We append the raw code but nicely formatted, adding massive length to the document
    md += `<div style="page-break-before: always;"></div>\n\n`;
    md += `## File: \`${relativePath}\`\n\n`;
    md += `**Lines of Code:** ${lines.length}\n\n`;
    md += `**Lead Engineer:** Shireesh Kashyap\n\n`;
    
    // Extract imports and components roughly
    const imports = lines.filter(l => l.startsWith('import')).join('\\n');
    if (imports.length > 0) {
      md += `### Dependencies\n\`\`\`typescript\n${imports}\n\`\`\`\n\n`;
    }

    md += `### Source Code Implementation\n`;
    // Truncate if insanely large to avoid V8 memory limits, but we want length, so we take up to 500 lines per file
    const sourceCode = lines.slice(0, 800).join('\\n');
    md += `\`\`\`typescript\n${sourceCode}\n\`\`\`\n\n`;
    
    if (lines.length > 800) {
      md += `*(File truncated for print. See source repository for remaining ${lines.length - 800} lines.)*\n\n`;
    }
  }

  // 5. Database Schema & Backend Reference
  md += `\n\n<div style="page-break-before: always;"></div>\n\n# Part III: Backend Infrastructure & Edge Functions\n\n`;
  md += `<div style="display: flex; align-items: center; gap: 20px; background: #f8fafc; padding: 20px; border-left: 4px solid #0ea5e9; border-radius: 8px; margin-bottom: 30px;">
  <img src="file://${path.join(PROJECT_ROOT, 'public', 'shireesh.webp')}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #0ea5e9; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
  <div>
    <h3 style="margin: 0; color: #0f172a;">Database & Serverless Logic</h3>
    <p style="margin: 5px 0 0 0; color: #475569;">The entire PostgreSQL schema, Row Level Security (RLS) policies, and Deno Edge Functions were architected to scale to millions of users seamlessly, a direct result of Shireesh's engineering vision.</p>
  </div>
</div>\n\n`;
  
  const supabaseFiles = await getFilesRecursively(path.join(PROJECT_ROOT, 'supabase'), '.sql');
  for (const file of supabaseFiles) {
    const content = await safeReadFile(file);
    const relativePath = path.relative(PROJECT_ROOT, file);
    md += `## Schema Definition: \`${relativePath}\`\n\n`;
    md += `\`\`\`sql\n${content}\n\`\`\`\n\n`;
  }

  return md;
}

async function buildPdf() {
  const markdown = await generateMarkdown();
  
  console.log('Converting Markdown to HTML...');
  const htmlContent = marked.parse(markdown);
  
  const fullHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Nemesis Documentation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Lora:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Lora', Georgia, serif;
        line-height: 1.7;
        color: #1e293b;
        max-width: 800px;
        margin: 0 auto;
        padding: 2em;
        font-size: 15px;
      }
      h1, h2, h3, h4, h5 { font-family: 'Outfit', sans-serif; color: #0f172a; margin-top: 1.5em; letter-spacing: -0.02em; }
      h1 { font-size: 2.5em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
      h2 { font-size: 2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
      code { font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.85em; }
      pre { background: #0f172a; color: #f8fafc; padding: 1em; border-radius: 8px; overflow-x: auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
      pre code { background: transparent; color: inherit; padding: 0; font-size: 0.85em; }
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; width: 100%; margin: 2em 0; }
      th, td { border: 1px solid #cbd5e1; padding: 0.75em; text-align: left; }
      th { background-color: #f8fafc; font-weight: bold; }
      blockquote { border-left: 4px solid #38bdf8; padding-left: 1em; color: #475569; margin-left: 0; font-style: italic; background: #f0f9ff; padding: 1em; border-radius: 0 8px 8px 0; }
      a { color: #0284c7; text-decoration: none; }
      .page-break { page-break-after: always; }
    </style>
  </head>
  <body>
    ${htmlContent}
  </body>
  </html>
  `;

  console.log('Writing temp HTML...');
  const tempHtmlPath = path.join(PROJECT_ROOT, 'temp_docs.html');
  await fs.writeFile(tempHtmlPath, fullHtml);

  console.log('Launching Puppeteer to generate PDF...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Wait until local file images are loaded
  await page.goto('file://' + tempHtmlPath, { waitUntil: 'networkidle0', timeout: 120000 });
  
  console.log('Printing PDF...');
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    tagged: true,
    outline: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8px; color: #94a3b8; padding: 0 1cm; width: 100%; display: flex; justify-content: space-between;">
        <span>Nemesis Official Documentation | Lead Architect: Shireesh Kashyap</span>
        <span class="pageNumber"></span>
      </div>
    `,
    margin: {
      top: '2cm',
      bottom: '2cm',
      left: '2cm',
      right: '2cm'
    },
    timeout: 300000 // 5 minutes timeout for massive PDF
  });

  await browser.close();
  
  // Cleanup
  await fs.unlink(tempHtmlPath);
  
  console.log(`✅ Massive PDF generated successfully at: ${OUTPUT_PDF}`);
}

buildPdf().catch(console.error);
