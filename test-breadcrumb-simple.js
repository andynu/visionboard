const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('Testing breadcrumb navigation functionality...');
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    console.log('1. Checking initial breadcrumb...');
    const initialBreadcrumb = await page.locator('#breadcrumb').textContent();
    console.log('Initial breadcrumb:', initialBreadcrumb);
    
    console.log('2. Creating hierarchy using tree navigation...');
    // Open sidebar
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    
    // Create new canvas using tree navigation
    page.once('dialog', async dialog => {
      console.log('New canvas dialog:', dialog.message());
      await dialog.accept('Child Canvas');
    });
    
    // Click the + button in tree to create child canvas
    const addButtons = await page.locator('.tree-action').count();
    console.log(`Found ${addButtons} tree action buttons`);
    
    if (addButtons > 0) {
      await page.locator('.tree-action').first().click();
      await page.waitForTimeout(2000);
      
      const hierarchyBreadcrumb = await page.locator('#breadcrumb').textContent();
      console.log('After creating child canvas:', hierarchyBreadcrumb);
      
      await page.screenshot({ path: 'test-breadcrumb-simple-1.png', fullPage: true });
      
      console.log('3. Testing breadcrumb navigation back to parent...');
      // Click on parent breadcrumb item
      const parentBreadcrumbs = await page.locator('.breadcrumb-item:not(.active)');
      const parentCount = await parentBreadcrumbs.count();
      console.log(`Found ${parentCount} clickable breadcrumb items`);
      
      if (parentCount > 0) {
        await parentBreadcrumbs.first().click();
        await page.waitForTimeout(1000);
        
        const parentBreadcrumb = await page.locator('#breadcrumb').textContent();
        console.log('After clicking parent breadcrumb:', parentBreadcrumb);
        
        await page.screenshot({ path: 'test-breadcrumb-simple-2.png', fullPage: true });
      }
      
      console.log('4. Creating deeper hierarchy...');
      // Create another level
      page.once('dialog', async dialog => {
        await dialog.accept('Grandchild Canvas');
      });
      
      await page.click('#sidebar-toggle');
      await page.waitForTimeout(500);
      
      // Expand the tree and create deeper hierarchy
      const expandButtons = await page.locator('.tree-expand.collapsed').count();
      if (expandButtons > 0) {
        await page.locator('.tree-expand.collapsed').first().click();
        await page.waitForTimeout(500);
      }
      
      // Find child canvas and add its child
      const childTreeItems = await page.locator('.tree-action').count();
      if (childTreeItems > 1) {
        await page.locator('.tree-action').nth(1).click(); // Second + button
        await page.waitForTimeout(2000);
        
        const deepBreadcrumb = await page.locator('#breadcrumb').textContent();
        console.log('Deep hierarchy breadcrumb:', deepBreadcrumb);
        
        await page.screenshot({ path: 'test-breadcrumb-simple-3.png', fullPage: true });
        
        console.log('5. Testing multi-level breadcrumb navigation...');
        // Navigate back multiple levels
        const deepParentBreadcrumbs = await page.locator('.breadcrumb-item:not(.active)');
        const deepParentCount = await deepParentBreadcrumbs.count();
        console.log(`Found ${deepParentCount} navigation levels`);
        
        if (deepParentCount >= 2) {
          // Click on root level
          await deepParentBreadcrumbs.first().click();
          await page.waitForTimeout(1000);
          
          const rootBreadcrumb = await page.locator('#breadcrumb').textContent();
          console.log('After navigating to root:', rootBreadcrumb);
          
          await page.screenshot({ path: 'test-breadcrumb-simple-4.png', fullPage: true });
        }
      }
    }
    
    console.log('Breadcrumb navigation test completed successfully!');
    
  } catch (error) {
    console.error('Error during breadcrumb test:', error);
    await page.screenshot({ path: 'test-breadcrumb-simple-error.png', fullPage: true });
  }
  
  await browser.close();
})();