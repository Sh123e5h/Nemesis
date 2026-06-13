import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Downloading images via Puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Set viewport to the approximate image sizes so the screenshot fits the image
  await page.setViewport({ width: 640, height: 800 });
  
  await page.goto('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Nemesis_-_Gheorghe_Tattarescu.jpg/640px-Nemesis_-_Gheorghe_Tattarescu.jpg', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'public/lore/nemesis_myth.jpg' });
  
  await page.setViewport({ width: 220, height: 400 });
  await page.goto('https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Nemesis_%28Resident_Evil%29.png/220px-Nemesis_%28Resident_Evil%29.png', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'public/lore/nemesis_re.png' });
  
  await browser.close();
  console.log('Images downloaded!');
})();
