const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('Testing folder navigation workflow...');
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    console.log('1. Initial state - checking breadcrumb and tree...');
    const initialBreadcrumb = await page.locator('#breadcrumb').textContent();
    console.log('Initial breadcrumb:', initialBreadcrumb);
    
    // Check tree navigation
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    
    const initialTreeItems = await page.locator('.tree-item .tree-label').allTextContents();
    console.log('Initial tree items:', initialTreeItems);
    
    await page.click('#sidebar-close');
    await page.waitForTimeout(500);
    
    console.log('2. Creating new folder with fixed integration...');
    page.once('dialog', async dialog => {
      console.log('Folder dialog:', dialog.message());
      await dialog.accept('Fixed Folder');
    });
    
    await page.click('#new-folder-btn');
    await page.waitForTimeout(3000); // Wait for tree reload
    
    console.log('3. Checking updated tree navigation...');
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    
    const updatedTreeItems = await page.locator('.tree-item .tree-label').allTextContents();
    console.log('Updated tree items:', updatedTreeItems);
    
    await page.screenshot({ path: 'test-folder-nav-1-tree-updated.png', fullPage: true });
    
    // Expand the main canvas node to see children
    const expandButtons = await page.locator('.tree-expand.collapsed').count();
    console.log(`Found ${expandButtons} collapsed nodes`);
    
    if (expandButtons > 0) {
      await page.locator('.tree-expand.collapsed').first().click();
      await page.waitForTimeout(500);
      
      const expandedTreeItems = await page.locator('.tree-item .tree-label').allTextContents();
      console.log('Expanded tree items:', expandedTreeItems);
      
      await page.screenshot({ path: 'test-folder-nav-2-tree-expanded.png', fullPage: true });
    }
    
    await page.click('#sidebar-close');
    await page.waitForTimeout(500);
    
    console.log('4. Testing folder navigation via double-click...');
    const folders = await page.locator('.folder-element').count();
    console.log(`Found ${folders} folders on canvas`);
    
    if (folders > 0) {
      // Try to navigate to the newest folder (Fixed Folder)
      await page.locator('.folder-element').last().dblclick();
      await page.waitForTimeout(2000);
      
      const folderBreadcrumb = await page.locator('#breadcrumb').textContent();
      console.log('After folder navigation:', folderBreadcrumb);
      
      await page.screenshot({ path: 'test-folder-nav-3-folder-navigation.png', fullPage: true });
      
      console.log('5. Testing breadcrumb navigation back...');
      const parentBreadcrumbs = await page.locator('.breadcrumb-item:not(.active)');
      const parentCount = await parentBreadcrumbs.count();
      console.log(`Found ${parentCount} clickable breadcrumb items`);
      
      if (parentCount > 0) {
        await parentBreadcrumbs.first().click();
        await page.waitForTimeout(1000);
        
        const backBreadcrumb = await page.locator('#breadcrumb').textContent();
        console.log('After breadcrumb navigation back:', backBreadcrumb);
        
        await page.screenshot({ path: 'test-folder-nav-4-breadcrumb-back.png', fullPage: true });
      }
      
      console.log('6. Checking tree consistency...');
      await page.click('#sidebar-toggle');
      await page.waitForTimeout(500);
      
      const activeTreeItem = await page.locator('.tree-item.active .tree-label').textContent();
      console.log('Active tree item:', activeTreeItem);
      
      await page.screenshot({ path: 'test-folder-nav-5-final-tree.png', fullPage: true });
    }
    
    console.log('Folder navigation workflow test completed!');
    
  } catch (error) {
    console.error('Error during folder navigation test:', error);
    await page.screenshot({ path: 'test-folder-nav-error.png', fullPage: true });
  }
  
  await browser.close();
})();