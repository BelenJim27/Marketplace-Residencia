const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });
  await page.goto('http://localhost:3000/catalogo-demo-premium', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Scroll to top to see hero
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: './screenshot-hero.png' });
  console.log('Hero screenshot saved');

  // Scroll down to see products
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: './screenshot-products.png' });
  console.log('Products screenshot saved');

  await browser.close();
})();
