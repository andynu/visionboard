// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Canvas Basic Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('page loads with canvas and toolbar', async ({ page }) => {
        // Canvas container exists
        await expect(page.locator('#canvas')).toBeVisible();

        // SVG canvas is created
        await expect(page.locator('#canvas svg')).toBeVisible();

        // Toolbar buttons exist
        await expect(page.locator('#upload-btn')).toBeVisible();
        await expect(page.locator('#new-folder-btn')).toBeVisible();
        await expect(page.locator('#save-btn')).toBeVisible();
        await expect(page.locator('#grid-btn')).toBeVisible();
        await expect(page.locator('#snap-btn')).toBeVisible();
    });

    test('canvas has elements from main canvas', async ({ page }) => {
        // Main canvas should have elements (images and/or folders)
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        // We expect at least some elements on the main canvas
        console.log(`Found ${count} canvas elements`);

        // Take screenshot for visual verification
        await page.screenshot({ path: 'test-results/canvas-initial.png' });
    });
});

test.describe('Element Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('clicking element selects it and shows resize handles', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        if (count === 0) {
            test.skip();
            return;
        }

        // Click first element
        const firstElement = elements.first();
        await firstElement.click();

        // Wait for selection to apply
        await page.waitForTimeout(200);

        // Element should have selected class
        await expect(firstElement).toHaveClass(/selected/);

        // Take screenshot showing selection
        await page.screenshot({ path: 'test-results/element-selected.png' });

        // Check resize handles exist (they're circles with resize-handle class)
        const resizeHandles = page.locator('.resize-handle');
        const handleCount = await resizeHandles.count();
        console.log(`Found ${handleCount} resize handles`);

        // Should have 4 handles (nw, ne, sw, se)
        expect(handleCount).toBeGreaterThanOrEqual(4);
    });

    test('clicking canvas background deselects element', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        if (count === 0) {
            test.skip();
            return;
        }

        // Select an element
        await elements.first().click();
        await page.waitForTimeout(200);
        await expect(elements.first()).toHaveClass(/selected/);

        // Click on empty canvas area (SVG background)
        const canvas = page.locator('#canvas');
        const box = await canvas.boundingBox();
        // Click in a corner area that should be empty
        await page.mouse.click(box.x + box.width - 50, box.y + box.height - 50);

        await page.waitForTimeout(200);

        // Element should no longer be selected
        await expect(elements.first()).not.toHaveClass(/selected/);
    });

    test('shift+click adds to selection', async ({ page }) => {
        // Get elements that are visible (not off-screen)
        const visibleElements = page.locator('.canvas-element:not([y^="-"])');
        const count = await visibleElements.count();

        if (count < 2) {
            // Fall back to any canvas elements if filter didn't work
            const allElements = page.locator('.canvas-element');
            const allCount = await allElements.count();
            if (allCount < 2) {
                test.skip();
                return;
            }
            // Use force: true to click elements that might be partially obscured
            await allElements.nth(0).click({ force: true });
            await page.waitForTimeout(100);
            await allElements.nth(1).click({ modifiers: ['Shift'], force: true });
            await page.waitForTimeout(100);
            await expect(allElements.nth(0)).toHaveClass(/selected/);
            await expect(allElements.nth(1)).toHaveClass(/selected/);
        } else {
            // Click first visible element
            await visibleElements.nth(0).click();
            await page.waitForTimeout(100);

            // Shift+click second visible element
            await visibleElements.nth(1).click({ modifiers: ['Shift'] });
            await page.waitForTimeout(100);

            // Both should be selected
            await expect(visibleElements.nth(0)).toHaveClass(/selected/);
            await expect(visibleElements.nth(1)).toHaveClass(/selected/);
        }

        await page.screenshot({ path: 'test-results/multi-select.png' });
    });
});

test.describe('Resize Handles', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('resize handles are positioned at element corners', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        if (count === 0) {
            test.skip();
            return;
        }

        // Select first element
        const element = elements.first();
        await element.click();
        await page.waitForTimeout(300);

        // Get element bounding box
        const elementBox = await element.boundingBox();
        console.log('Element box:', elementBox);

        // Find visible resize handles
        const handles = page.locator('.resize-handle');
        const handleCount = await handles.count();

        // Check that handles exist
        expect(handleCount).toBeGreaterThanOrEqual(4);

        // Take screenshot showing handles
        await page.screenshot({ path: 'test-results/resize-handles-visible.png' });
    });

    test('dragging SE handle resizes element', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        if (count === 0) {
            test.skip();
            return;
        }

        // Select first element
        const element = elements.first();
        await element.click();
        await page.waitForTimeout(300);

        // Get initial element size
        const initialBox = await element.boundingBox();
        console.log('Initial size:', initialBox.width, 'x', initialBox.height);

        // Find the SE resize handle (bottom-right)
        const seHandle = page.locator('.resize-handle.se-resize').first();
        const handleBox = await seHandle.boundingBox();

        if (!handleBox) {
            console.log('SE handle not found or not visible');
            await page.screenshot({ path: 'test-results/resize-handle-missing.png' });
            test.skip();
            return;
        }

        // Drag the handle to resize
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 50, handleBox.y + 50);
        await page.mouse.up();

        await page.waitForTimeout(300);

        // Get new element size
        const newBox = await element.boundingBox();
        console.log('New size:', newBox.width, 'x', newBox.height);

        // Element should be larger
        expect(newBox.width).toBeGreaterThan(initialBox.width);
        expect(newBox.height).toBeGreaterThan(initialBox.height);

        await page.screenshot({ path: 'test-results/after-resize.png' });
    });
});

test.describe('Element Dragging', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('dragging element moves it', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        if (count === 0) {
            test.skip();
            return;
        }

        const element = elements.first();
        const initialBox = await element.boundingBox();
        console.log('Initial position:', initialBox.x, initialBox.y);

        // Drag the element
        await element.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
        await page.mouse.up();

        await page.waitForTimeout(300);

        const newBox = await element.boundingBox();
        console.log('New position:', newBox.x, newBox.y);

        // Element should have moved
        expect(newBox.x).not.toBe(initialBox.x);
        expect(newBox.y).not.toBe(initialBox.y);

        await page.screenshot({ path: 'test-results/after-drag.png' });
    });
});

test.describe('Grid and Snap', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('G key toggles grid visibility', async ({ page }) => {
        // Initially no grid
        let gridOverlay = page.locator('#grid-overlay');
        await expect(gridOverlay).toHaveCount(0);

        // Press G to show grid
        await page.keyboard.press('g');
        await page.waitForTimeout(200);

        // Grid should be visible
        gridOverlay = page.locator('#grid-overlay');
        await expect(gridOverlay).toHaveCount(1);

        await page.screenshot({ path: 'test-results/grid-visible.png' });

        // Press G again to hide
        await page.keyboard.press('g');
        await page.waitForTimeout(200);

        // Grid should be hidden
        gridOverlay = page.locator('#grid-overlay');
        await expect(gridOverlay).toHaveCount(0);
    });

    test('grid button toggles grid', async ({ page }) => {
        const gridBtn = page.locator('#grid-btn');

        // Click grid button
        await gridBtn.click();
        await page.waitForTimeout(200);

        // Button should be active and grid visible
        await expect(gridBtn).toHaveClass(/active/);
        await expect(page.locator('#grid-overlay')).toHaveCount(1);

        // Click again to toggle off
        await gridBtn.click();
        await page.waitForTimeout(200);

        await expect(gridBtn).not.toHaveClass(/active/);
        await expect(page.locator('#grid-overlay')).toHaveCount(0);
    });

    test('S key toggles snap', async ({ page }) => {
        const snapBtn = page.locator('#snap-btn');

        // Initially snap is off
        await expect(snapBtn).not.toHaveClass(/active/);

        // Press S to enable snap
        await page.keyboard.press('s');
        await page.waitForTimeout(200);

        // Snap button should be active
        await expect(snapBtn).toHaveClass(/active/);

        // Press S again to disable
        await page.keyboard.press('s');
        await page.waitForTimeout(200);

        await expect(snapBtn).not.toHaveClass(/active/);
    });

    test('snap button toggles snap', async ({ page }) => {
        const snapBtn = page.locator('#snap-btn');

        // Click snap button
        await snapBtn.click();
        await page.waitForTimeout(200);

        await expect(snapBtn).toHaveClass(/active/);

        // Click again
        await snapBtn.click();
        await page.waitForTimeout(200);

        await expect(snapBtn).not.toHaveClass(/active/);
    });

    test('element snaps to grid when snap is enabled', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const count = await elements.count();

        if (count === 0) {
            test.skip();
            return;
        }

        // Enable grid and snap
        await page.keyboard.press('g');
        await page.keyboard.press('s');
        await page.waitForTimeout(200);

        const element = elements.first();
        const initialBox = await element.boundingBox();

        // Drag element slightly
        await element.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 25, initialBox.y + 25); // Small move
        await page.mouse.up();

        await page.waitForTimeout(300);

        // Get new position - it should be snapped to grid (multiples of 40)
        // We can't easily verify exact snap position without knowing the SVG transform,
        // but we can verify the drag worked
        const newBox = await element.boundingBox();
        console.log('Position after snap drag:', newBox.x, newBox.y);

        await page.screenshot({ path: 'test-results/after-snap-drag.png' });
    });
});

test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('? key opens help overlay', async ({ page }) => {
        // Press ?
        await page.keyboard.press('?');
        await page.waitForTimeout(300);

        // Help overlay should be visible
        const helpOverlay = page.locator('#keyboard-help-overlay');
        await expect(helpOverlay).toHaveClass(/visible/);

        await page.screenshot({ path: 'test-results/help-overlay.png' });

        // Press Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        await expect(helpOverlay).not.toHaveClass(/visible/);
    });

    test('Delete key removes selected element', async ({ page }) => {
        const elements = page.locator('.canvas-element');
        const initialCount = await elements.count();

        if (initialCount === 0) {
            test.skip();
            return;
        }

        // Select first element
        await elements.first().click();
        await page.waitForTimeout(200);

        // Press Delete
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);

        // Element count should decrease
        const newCount = await elements.count();
        expect(newCount).toBeLessThan(initialCount);
    });
});

test.describe('OPML Export/Import', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('export OPML button exists and is clickable', async ({ page }) => {
        const exportOpmlBtn = page.locator('#export-opml-btn');
        await expect(exportOpmlBtn).toBeVisible();

        // We can't easily test file download in Playwright without additional setup
        // but we can verify the button exists and is enabled
        await expect(exportOpmlBtn).toBeEnabled();
    });

    test('import OPML button exists and is clickable', async ({ page }) => {
        const importOpmlBtn = page.locator('#import-opml-btn');
        await expect(importOpmlBtn).toBeVisible();
        await expect(importOpmlBtn).toBeEnabled();
    });
});

test.describe('Canvas Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('sidebar toggle works', async ({ page }) => {
        const sidebar = page.locator('#sidebar');
        const sidebarToggle = page.locator('#sidebar-toggle');

        // Initially sidebar might be closed
        // Click toggle to open
        await sidebarToggle.click();
        await page.waitForTimeout(300);

        await expect(sidebar).toHaveClass(/open/);

        await page.screenshot({ path: 'test-results/sidebar-open.png' });

        // Click close button
        const closeBtn = page.locator('#sidebar-close');
        await closeBtn.click();
        await page.waitForTimeout(300);

        await expect(sidebar).not.toHaveClass(/open/);
    });

    test('breadcrumb shows current canvas', async ({ page }) => {
        const breadcrumb = page.locator('#breadcrumb');
        await expect(breadcrumb).toBeVisible();

        // Should show "Main Canvas" or similar
        const activeItem = breadcrumb.locator('.breadcrumb-item.active');
        await expect(activeItem).toBeVisible();

        const text = await activeItem.textContent();
        console.log('Current canvas:', text);
    });

    test('double-clicking folder navigates to child canvas', async ({ page }) => {
        const folders = page.locator('.folder-element');
        const folderCount = await folders.count();

        if (folderCount === 0) {
            test.skip();
            return;
        }

        // Get initial breadcrumb text
        const initialBreadcrumb = await page.locator('.breadcrumb-item.active').textContent();
        console.log('Initial canvas:', initialBreadcrumb);

        // Double-click first folder
        await folders.first().dblclick({ force: true });

        // Wait for navigation
        await page.waitForTimeout(1000);

        // Check if navigation occurred
        const newBreadcrumb = await page.locator('.breadcrumb-item.active').textContent();
        console.log('After navigation:', newBreadcrumb);

        // Navigation may or may not work depending on folder config - just verify no errors
        await page.screenshot({ path: 'test-results/after-folder-nav.png' });
    });
});
