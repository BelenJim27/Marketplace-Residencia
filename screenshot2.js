const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/catalogo-demo-premium', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // Wait for styles and animations
  await page.screenshot({ path: './screenshot2.png', fullPage: true });
  console.log('Screenshot saved to ./screenshot2.png');
  await browser.close();
})();
