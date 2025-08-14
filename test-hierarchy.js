const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('Testing hierarchical canvas navigation...');
    
    console.log('1. Visiting http://localhost:3001...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-hierarchy-1-initial.png', fullPage: true });
    
    console.log('2. Testing sidebar toggle...');
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-hierarchy-2-sidebar.png', fullPage: true });
    
    console.log('3. Testing new folder creation...');
    await page.click('#new-folder-btn');
    
    // Handle the prompt dialog
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept('Test Folder');
    });
    
    // Wait for folder creation to complete
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-hierarchy-3-folder-created.png', fullPage: true });
    
    console.log('4. Testing tree navigation update...');
    // Check if tree has been updated
    const treeItems = await page.locator('.tree-item').count();
    console.log(`Found ${treeItems} items in tree navigation`);
    
    console.log('5. Testing folder interaction...');
    // Try to find and interact with the folder on canvas
    const folders = await page.locator('.folder-element').count();
    console.log(`Found ${folders} folders on canvas`);
    
    if (folders > 0) {
      console.log('6. Testing folder double-click navigation...');
      await page.locator('.folder-element').first().dblclick();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-hierarchy-4-folder-navigation.png', fullPage: true });
      
      // Check if breadcrumb updated
      const breadcrumbText = await page.locator('#breadcrumb').textContent();
      console.log('Breadcrumb:', breadcrumbText);
    }
    
    console.log('7. Testing new canvas creation from tree...');
    // Try to create a new canvas using the tree navigation
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    
    // Look for add button in tree (+ button)
    const addButtons = await page.locator('.tree-action').count();
    console.log(`Found ${addButtons} tree action buttons`);
    
    if (addButtons > 0) {
      await page.locator('.tree-action').first().click();
      
      // Handle the new canvas dialog
      page.on('dialog', async dialog => {
        console.log('New canvas dialog:', dialog.message());
        await dialog.accept('Child Canvas');
      });
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-hierarchy-5-child-canvas.png', fullPage: true });
    }
    
    console.log('8. Testing breadcrumb navigation...');
    const breadcrumbItems = await page.locator('.breadcrumb-item').count();
    console.log(`Found ${breadcrumbItems} breadcrumb items`);
    
    if (breadcrumbItems > 1) {
      // Click on first breadcrumb item to navigate back
      await page.locator('.breadcrumb-item').first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-hierarchy-6-breadcrumb-nav.png', fullPage: true });
    }
    
    console.log('9. Final tree state check...');
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    
    const finalTreeItems = await page.locator('.tree-item').count();
    console.log(`Final tree has ${finalTreeItems} items`);
    
    await page.screenshot({ path: 'test-hierarchy-7-final.png', fullPage: true });
    
    console.log('Hierarchical navigation test completed successfully!');
    
  } catch (error) {
    console.error('Error during hierarchy test:', error);
    await page.screenshot({ path: 'test-hierarchy-error.png', fullPage: true });
  }
  
  await browser.close();
})();