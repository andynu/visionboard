const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('Visiting http://localhost:3001...');
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-resize-1-initial.png', fullPage: true });
    console.log('Initial screenshot taken');
    
    // Check if there are already images on canvas
    const images = await page.locator('.canvas-element').count();
    console.log(`Found ${images} images on canvas`);
    
    if (images > 0) {
      console.log('Testing hover to show resize handles...');
      
      // Hover over the first image
      await page.locator('.canvas-element').first().hover();
      
      // Wait a moment for handles to appear
      await page.waitForTimeout(500);
      
      // Take screenshot with resize handles visible
      await page.screenshot({ path: 'test-resize-2-hover.png', fullPage: true });
      console.log('Hover screenshot taken - resize handles should be visible');
      
      // Check if resize handles are visible
      const resizeHandles = await page.locator('.resize-handles.visible').count();
      console.log(`Found ${resizeHandles} visible resize handle groups`);
      
      // Test clicking on an image (should show selection)
      await page.locator('.canvas-element').first().click();
      await page.waitForTimeout(200);
      
      await page.screenshot({ path: 'test-resize-3-selected.png', fullPage: true });
      console.log('Selection screenshot taken');
      
    } else {
      console.log('No images found on canvas - uploading test images first...');
      
      // Upload test images first
      const image1Path = path.join(__dirname, 'test-images/red-square.png');
      const image2Path = path.join(__dirname, 'test-images/blue-square.png');
      
      await page.click('#upload-btn');
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([image1Path, image2Path]);
      
      // Wait for upload to complete
      await page.waitForTimeout(2000);
      
      // Test hover functionality
      await page.locator('.canvas-element').first().hover();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-resize-2-hover.png', fullPage: true });
      console.log('Hover screenshot with new images taken');
    }
    
  } catch (error) {
    console.error('Error during resize test:', error);
    await page.screenshot({ path: 'test-resize-error.png', fullPage: true });
  }
  
  await browser.close();
})();