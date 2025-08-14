const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testExportPNG() {
    console.log('Testing PNG export functionality...');
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to the app
        await page.goto('http://localhost:3001');
        
        // Wait for canvas to load
        await page.waitForSelector('#canvas');
        await page.waitForTimeout(2000); // Give time for any images to load
        
        // Take screenshot of initial state
        await page.screenshot({ path: 'test-export-1-initial.png' });
        
        // Check if export button exists
        const exportBtn = await page.$('#export-btn');
        if (!exportBtn) {
            throw new Error('Export button not found');
        }
        
        console.log('✓ Export button found');
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        // Click export button
        console.log('Clicking export button...');
        await exportBtn.click();
        
        // Wait for download
        try {
            const download = await downloadPromise;
            console.log('✓ Download triggered:', download.suggestedFilename());
            
            // Save the download
            const downloadPath = path.join(__dirname, 'test-export-result.png');
            await download.saveAs(downloadPath);
            
            // Check if file was created and has content
            const stats = fs.statSync(downloadPath);
            if (stats.size > 1000) { // Should be at least 1KB for a valid PNG
                console.log('✓ PNG export successful! File size:', stats.size, 'bytes');
                
                // Clean up
                fs.unlinkSync(downloadPath);
            } else {
                console.log('✗ PNG export file too small:', stats.size, 'bytes');
            }
            
        } catch (timeoutError) {
            console.log('✗ No download triggered - checking for error dialogs...');
            
            // Check for any alert dialogs
            const dialogs = await page.evaluate(() => {
                return window.exportCanvasToPNG ? 'Export function available' : 'Export function not available';
            });
            console.log('Export function status:', dialogs);
            
            // Take screenshot for debugging
            await page.screenshot({ path: 'test-export-error.png' });
        }
        
    } catch (error) {
        console.error('Test error:', error);
        await page.screenshot({ path: 'test-export-error.png' });
    }
    
    await browser.close();
    console.log('PNG export test completed');
}

testExportPNG();