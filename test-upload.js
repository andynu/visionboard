const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch(); // Run in headless mode
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('/api/upload')) {
      console.log('UPLOAD REQUEST:', request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/upload')) {
      console.log('UPLOAD RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('Visiting http://localhost:3001...');
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if there are existing images in the storage directory we can use
    console.log('Looking for existing images to upload...');
    
    // Get paths to test images
    const image1Path = path.join(__dirname, 'test-images/red-square.png');
    const image2Path = path.join(__dirname, 'test-images/blue-square.png');
    
    console.log('Clicking Add Images button...');
    await page.click('#upload-btn');
    
    // Wait for file input to appear and upload files
    console.log('Uploading images...');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles([image1Path, image2Path]);
    
    // Wait a moment for upload to process
    await page.waitForTimeout(2000);
    
    // Take screenshot after upload
    await page.screenshot({ path: 'after-upload.png', fullPage: true });
    console.log('Screenshot after upload saved as after-upload.png');
    
    // Check if images appeared on canvas
    const images = await page.locator('img').count();
    console.log(`Found ${images} images on the canvas`);
    
    // Get current page content
    const bodyText = await page.locator('body').textContent();
    console.log('Page content after upload:');
    console.log(bodyText);
    
  } catch (error) {
    console.error('Error during upload test:', error);
    // Take screenshot of error state
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }
  
  await browser.close();
})();