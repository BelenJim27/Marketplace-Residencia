const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to cart
    await page.goto('http://localhost:3000/tienda/carrito', { waitUntil: 'networkidle' });
    console.log('Cart page loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'C:\Users\Citla\AppData\Local\Temp\cart-screenshot.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
