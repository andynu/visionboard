const { chromium } = require('playwright');

async function testBrowserBackSupport() {
    console.log('Testing browser back button support...');
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to the app
        await page.goto('http://localhost:3001');
        
        // Wait for initial load
        await page.waitForSelector('#canvas');
        
        // Take initial screenshot
        await page.screenshot({ path: 'test-browser-back-1-initial.png' });
        
        // Check initial URL has canvas parameter
        const initialUrl = page.url();
        console.log('Initial URL:', initialUrl);
        
        // Find and click on a folder to navigate
        const folders = await page.$$('.folder-icon');
        if (folders.length > 0) {
            console.log('Found folder, clicking to navigate...');
            await folders[0].click();
            
            // Wait for navigation
            await page.waitForTimeout(1000);
            
            // Check new URL
            const newUrl = page.url();
            console.log('New URL after navigation:', newUrl);
            
            // Take screenshot after navigation
            await page.screenshot({ path: 'test-browser-back-2-navigated.png' });
            
            // Test browser back button
            console.log('Testing browser back button...');
            await page.goBack();
            
            // Wait for back navigation
            await page.waitForTimeout(1000);
            
            // Check URL after back
            const backUrl = page.url();
            console.log('URL after browser back:', backUrl);
            
            // Take screenshot after back
            await page.screenshot({ path: 'test-browser-back-3-back.png' });
            
            // Verify we're back to initial state
            if (backUrl === initialUrl) {
                console.log('✓ Browser back button working correctly!');
            } else {
                console.log('✗ Browser back button not working correctly');
                console.log('Expected:', initialUrl);
                console.log('Got:', backUrl);
            }
            
            // Test browser forward button
            console.log('Testing browser forward button...');
            await page.goForward();
            
            await page.waitForTimeout(1000);
            const forwardUrl = page.url();
            console.log('URL after browser forward:', forwardUrl);
            
            if (forwardUrl === newUrl) {
                console.log('✓ Browser forward button working correctly!');
            } else {
                console.log('✗ Browser forward button not working correctly');
            }
            
        } else {
            // If no folders, test with tree navigation
            console.log('No folders found, testing with tree navigation...');
            
            // Click sidebar toggle to open it
            await page.click('#sidebar-toggle');
            await page.waitForTimeout(500);
            
            // Look for tree nodes
            const treeItems = await page.$$('.tree-item:not(.active)');
            if (treeItems.length > 0) {
                console.log('Found tree item, clicking to navigate...');
                await treeItems[0].click();
                
                await page.waitForTimeout(1000);
                const newUrl = page.url();
                console.log('New URL after tree navigation:', newUrl);
                
                // Test back button
                await page.goBack();
                await page.waitForTimeout(1000);
                
                const backUrl = page.url();
                console.log('URL after browser back:', backUrl);
                
                if (backUrl === initialUrl) {
                    console.log('✓ Browser back button working with tree navigation!');
                } else {
                    console.log('✗ Browser back button not working with tree navigation');
                }
            } else {
                console.log('No navigation options found, testing URL manipulation...');
                
                // Test direct URL navigation
                const testCanvasId = 'main';
                await page.goto(`http://localhost:3001?canvas=${testCanvasId}`);
                await page.waitForTimeout(1000);
                
                const directUrl = page.url();
                console.log('Direct URL navigation result:', directUrl);
                
                if (directUrl.includes(`canvas=${testCanvasId}`)) {
                    console.log('✓ Direct URL navigation working!');
                } else {
                    console.log('✗ Direct URL navigation not working');
                }
            }
        }
        
    } catch (error) {
        console.error('Test error:', error);
        await page.screenshot({ path: 'test-browser-back-error.png' });
    }
    
    await browser.close();
    console.log('Browser back button test completed');
}

testBrowserBackSupport();