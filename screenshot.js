const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/catalogo-demo-premium');
  await page.screenshot({ path: './screenshot.png', fullPage: true });
  console.log('Screenshot saved to ./screenshot.png');
  await browser.close();
})();
