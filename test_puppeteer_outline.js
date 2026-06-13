import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent('<html><body><h1>Header 1</h1><h2>Header 2</h2></body></html>');
  
  try {
    await page.pdf({
      path: 'test_outline.pdf',
      format: 'A4',
      tagged: true,
      outline: true
    });
    console.log('PDF generated with outline: true');
  } catch (e) {
    console.error('Error with outline:', e.message);
  }
  
  await browser.close();
})();
