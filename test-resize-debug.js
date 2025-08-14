const { chromium } = require('playwright');

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
    
    // Check if there are images
    const images = await page.locator('.canvas-element').count();
    console.log(`Found ${images} images on canvas`);
    
    if (images > 0) {
      console.log('Testing resize handle interaction...');
      
      // Hover over the first image to show resize handles
      await page.locator('.canvas-element').first().hover();
      await page.waitForTimeout(500);
      
      // Check if resize handles are visible
      const resizeHandles = await page.locator('.resize-handles.visible .resize-handle').count();
      console.log(`Found ${resizeHandles} visible resize handles`);
      
      if (resizeHandles > 0) {
        // Try to get the position of the first resize handle
        const handleBounds = await page.locator('.resize-handles.visible .resize-handle').first().boundingBox();
        console.log('First resize handle bounds:', handleBounds);
        
        if (handleBounds) {
          // Try to click on the resize handle
          console.log('Clicking on resize handle...');
          await page.mouse.move(handleBounds.x + handleBounds.width/2, handleBounds.y + handleBounds.height/2);
          await page.waitForTimeout(200);
          
          // Try dragging the resize handle
          await page.mouse.down();
          await page.mouse.move(handleBounds.x + 50, handleBounds.y + 50);
          await page.waitForTimeout(100);
          await page.mouse.up();
          
          console.log('Resize drag attempt completed');
        }
      } else {
        console.log('No resize handles found - checking DOM structure...');
        
        // Debug: Check what elements exist
        const allHandles = await page.locator('.resize-handle').count();
        console.log(`Total resize handles in DOM: ${allHandles}`);
        
        const visibleGroups = await page.locator('.resize-handles').count();
        console.log(`Total resize handle groups: ${visibleGroups}`);
      }
      
      // Take screenshot after interaction
      await page.screenshot({ path: 'test-resize-debug.png', fullPage: true });
      console.log('Debug screenshot saved');
      
    } else {
      console.log('No images found on canvas');
    }
    
  } catch (error) {
    console.error('Error during resize debug test:', error);
    await page.screenshot({ path: 'test-resize-debug-error.png', fullPage: true });
  }
  
  await browser.close();
})();