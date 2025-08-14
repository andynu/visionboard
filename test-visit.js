const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Visiting http://localhost:3001...');
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    
    console.log(`Page Title: ${title}`);
    console.log(`Current URL: ${url}`);
    
    // Get page content
    const bodyText = await page.locator('body').textContent();
    console.log('Page Content:');
    console.log(bodyText);
    
    // Take a screenshot
    await page.screenshot({ path: 'page-screenshot.png', fullPage: true });
    console.log('Screenshot saved as page-screenshot.png');
    
  } catch (error) {
    console.error('Error visiting page:', error);
  }
  
  await browser.close();
})();