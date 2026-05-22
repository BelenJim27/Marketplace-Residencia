import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.createContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3004/cliente/producto/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'product-page.png', fullPage: true });
    console.log('✓ Screenshot captured: product-page.png');

    // Check key elements
    const heroSpecs = await page.locator('text="Lo Importante"').isVisible();
    const productName = await page.locator('h1').isVisible();
    const qrSection = await page.locator('text="Rastreo y Autenticidad"').isVisible();

    console.log('✓ Hero Specs visible:', heroSpecs);
    console.log('✓ Product name visible:', productName);
    console.log('✓ QR Traceability section visible:', qrSection);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
