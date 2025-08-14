const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('Testing basic hierarchy functionality...');
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    console.log('1. Testing tree data load...');
    const treeData = await page.evaluate(() => {
      return fetch('/api/tree').then(r => r.json());
    });
    console.log('Tree data:', JSON.stringify(treeData, null, 2));
    
    console.log('2. Testing sidebar visibility...');
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(1000);
    
    const sidebarVisible = await page.locator('#sidebar.open').isVisible();
    console.log('Sidebar visible:', sidebarVisible);
    
    if (sidebarVisible) {
      const treeItems = await page.locator('.tree-item').count();
      console.log('Tree items found:', treeItems);
      
      if (treeItems > 0) {
        const treeText = await page.locator('.tree-item').first().textContent();
        console.log('First tree item:', treeText);
      }
    }
    
    console.log('3. Testing new folder creation...');
    // Close sidebar first
    await page.click('#sidebar-close');
    await page.waitForTimeout(500);
    
    // Set up dialog handler before clicking
    page.once('dialog', async dialog => {
      console.log('Dialog appeared:', dialog.message());
      await dialog.accept('Test Folder');
    });
    
    await page.click('#new-folder-btn');
    await page.waitForTimeout(3000); // Wait for folder creation
    
    console.log('4. Checking for folder on canvas...');
    const folders = await page.locator('.folder-element').count();
    console.log('Folders on canvas:', folders);
    
    await page.screenshot({ path: 'test-hierarchy-simple.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'test-hierarchy-simple-error.png', fullPage: true });
  }
  
  await browser.close();
})();