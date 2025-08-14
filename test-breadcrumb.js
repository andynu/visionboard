const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('Testing enhanced breadcrumb navigation...');
    
    console.log('1. Initial load and breadcrumb check...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check initial breadcrumb
    const initialBreadcrumb = await page.locator('#breadcrumb').textContent();
    console.log('Initial breadcrumb:', initialBreadcrumb);
    
    await page.screenshot({ path: 'test-breadcrumb-1-initial.png', fullPage: true });
    
    console.log('2. Creating nested canvas structure...');
    
    // Create a folder to establish hierarchy
    page.once('dialog', async dialog => {
      console.log('Folder dialog:', dialog.message());
      await dialog.accept('Projects');
    });
    
    await page.click('#new-folder-btn');
    await page.waitForTimeout(2000);
    
    // Navigate to the folder (double-click)
    console.log('3. Navigating to folder canvas...');
    await page.locator('.folder-element').first().dblclick();
    await page.waitForTimeout(1500);
    
    const folderBreadcrumb = await page.locator('#breadcrumb').textContent();
    console.log('Folder breadcrumb:', folderBreadcrumb);
    
    await page.screenshot({ path: 'test-breadcrumb-2-folder.png', fullPage: true });
    
    console.log('4. Creating sub-folder in current canvas...');
    page.once('dialog', async dialog => {
      console.log('Sub-folder dialog:', dialog.message());
      await dialog.accept('Web Development');
    });
    
    await page.click('#new-folder-btn');
    await page.waitForTimeout(2000);
    
    // Navigate to sub-folder
    console.log('5. Navigating to sub-folder...');
    await page.locator('.folder-element').first().dblclick();
    await page.waitForTimeout(1500);
    
    const subFolderBreadcrumb = await page.locator('#breadcrumb').textContent();
    console.log('Sub-folder breadcrumb:', subFolderBreadcrumb);
    
    await page.screenshot({ path: 'test-breadcrumb-3-subfolder.png', fullPage: true });
    
    console.log('6. Testing breadcrumb navigation - clicking parent...');
    // Click on the second breadcrumb item (Projects)
    const breadcrumbItems = await page.locator('.breadcrumb-item:not(.active)');
    const breadcrumbCount = await breadcrumbItems.count();
    console.log(`Found ${breadcrumbCount} clickable breadcrumb items`);
    
    if (breadcrumbCount > 0) {
      // Click on the parent (Projects)
      await breadcrumbItems.last().click();
      await page.waitForTimeout(1000);
      
      const parentBreadcrumb = await page.locator('#breadcrumb').textContent();
      console.log('After clicking parent breadcrumb:', parentBreadcrumb);
      
      await page.screenshot({ path: 'test-breadcrumb-4-parent-nav.png', fullPage: true });
    }
    
    console.log('7. Testing breadcrumb navigation - clicking root...');
    // Click on home/root breadcrumb item
    const rootBreadcrumbItems = await page.locator('.breadcrumb-item:not(.active)');
    const rootCount = await rootBreadcrumbItems.count();
    
    if (rootCount > 0) {
      await rootBreadcrumbItems.first().click();
      await page.waitForTimeout(1000);
      
      const rootBreadcrumb = await page.locator('#breadcrumb').textContent();
      console.log('After clicking root breadcrumb:', rootBreadcrumb);
      
      await page.screenshot({ path: 'test-breadcrumb-5-root-nav.png', fullPage: true });
    }
    
    console.log('8. Checking tree sidebar consistency...');
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(500);
    
    const treeItems = await page.locator('.tree-item').count();
    console.log(`Found ${treeItems} items in tree navigation`);
    
    // Check if active item in tree matches breadcrumb
    const activeTreeItem = await page.locator('.tree-item.active').textContent();
    console.log('Active tree item:', activeTreeItem);
    
    await page.screenshot({ path: 'test-breadcrumb-6-tree-consistency.png', fullPage: true });
    
    console.log('Enhanced breadcrumb navigation test completed successfully!');
    
  } catch (error) {
    console.error('Error during breadcrumb test:', error);
    await page.screenshot({ path: 'test-breadcrumb-error.png', fullPage: true });
  }
  
  await browser.close();
})();