# SVG.js v2.7.1 Cheatsheet

This cheatsheet covers SVG.js v2.7.1 usage as implemented in the Vision Board application.

## Basic Setup

```javascript
// Create SVG canvas
const canvas = SVG(containerElement).size('100%', '100%');
canvas.viewbox(-500, -300, 2420, 1380);

// Global reference
window.canvas = canvas;
```

## Element Creation

### Rectangle
```javascript
const rect = canvas.rect(width, height)
    .move(x, y)
    .fill('none')
    .stroke({ color: '#000000', width: 2 });
```

### Image
```javascript
const image = canvas.image(src)
    .move(x, y)
    .size(width, height);
```

### Group
```javascript
const group = canvas.group();
const rect = group.rect(width, height);
const text = group.text('Hello');
group.move(x, y);
```

### Path (for freehand drawing)
```javascript
const path = canvas.path('M10,10 L20,20 L30,10')
    .fill('none')
    .stroke({ color: '#000000', width: 2 });
```

### Line
```javascript
const line = canvas.line(x1, y1, x2, y2)
    .stroke({ color: '#000000', width: 2 });
```

## Element Properties and Manipulation

### Positioning and Sizing
```javascript
element.move(x, y);           // Set position
element.size(width, height);  // Set size
element.width(value);         // Set width only
element.height(value);        // Set height only
element.cx(x);               // Center X
element.cy(y);               // Center Y
```

### Styling
```javascript
element.fill('red');
element.fill('none');
element.stroke('#000000');
element.stroke({ color: '#000000', width: 2 });
element.opacity(0.5);
element.addClass('my-class');
element.removeClass('my-class');
```

### Transformations
```javascript
element.rotate(45);           // Rotate in degrees
element.scale(1.5);          // Scale uniformly
element.scale(1.5, 2);       // Scale X and Y differently
element.translate(dx, dy);    // Translate
```

## Event Handling

### Mouse Events
```javascript
element.click((event) => {
    event.stopPropagation();
    // Handle click
});

element.mousedown((event) => {
    // Handle mouse down
});

element.mousemove((event) => {
    // Handle mouse move
});

element.mouseup((event) => {
    // Handle mouse up
});

// Alternative event syntax
element.on('click', (event) => {
    // Handle click
});
```

### Event Data Access
```javascript
// In event handlers, access coordinates:
event.clientX  // Screen X coordinate
event.clientY  // Screen Y coordinate
event.button   // Mouse button (0=left, 1=middle, 2=right)
```

## Data Storage

### Element Data
```javascript
// Store data on element
element.data('elementData', { id: 'rect-123', type: 'rectangle' });

// Retrieve data
const data = element.data('elementData');
```

### Attributes
```javascript
// Set attributes
element.attr('data-custom-id', 'my-id');
element.attr('class', 'my-class');

// Get attributes  
const value = element.attr('data-custom-id');
```

## Element Identification and Selection

### Element IDs
```javascript
// SVG.js auto-generates IDs like 'SvgjsRect1234'
const id = element.id();

// Get element by ID (unreliable in SVG.js v2.7.1)
const el = canvas.select('#' + id);  // Sometimes fails

// Better: use DOM method
const domElement = document.getElementById(id);
```

### Element Types
```javascript
const type = element.type();  // Returns 'rect', 'image', 'group', etc.
```

## Coordinate Systems

### Viewbox and Coordinate Conversion
```javascript
const viewBox = canvas.viewbox();  // Returns {x, y, width, height, zoom}

// Convert screen coordinates to SVG coordinates
function screenToSvg(clientX, clientY) {
    const canvasElement = document.getElementById('canvas');
    const rect = canvasElement.getBoundingClientRect();
    const viewBox = canvas.viewbox();
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const svgX = viewBox.x + (mouseX / canvasElement.clientWidth) * viewBox.width;
    const svgY = viewBox.y + (mouseY / canvasElement.clientHeight) * viewBox.height;
    
    return { x: svgX, y: svgY };
}
```

### Element Bounding Box
```javascript
const bbox = element.bbox();  // Returns {x, y, width, height}
```

## Canvas Operations

### Viewbox Manipulation
```javascript
canvas.viewbox(x, y, width, height);  // Set viewbox

// Pan
const vbox = canvas.viewbox();
canvas.viewbox(vbox.x + deltaX, vbox.y + deltaY, vbox.width, vbox.height);

// Zoom
const newWidth = vbox.width / zoomFactor;
const newHeight = vbox.height / zoomFactor;
canvas.viewbox(newX, newY, newWidth, newHeight);
```

### Canvas Clearing
```javascript
canvas.clear();  // Remove all elements
```

## Element Management

### Adding/Removing Elements
```javascript
// Elements are automatically added when created
const rect = canvas.rect(100, 100);

// Remove element
element.remove();
```

### Element Hierarchy
```javascript
// Add element to group
const group = canvas.group();
const rect = group.rect(100, 100);

// Move element to different parent
element.addTo(group);
```

## Common Patterns in Vision Board

### Making Elements Interactive
```javascript
function makeElementInteractive(element) {
    // Add CSS class
    element.addClass('canvas-element');
    
    // Add click handler
    element.click((event) => {
        event.stopPropagation();
        selectElement(element);
    });
    
    // Add drag functionality
    element.mousedown((event) => {
        // Start drag logic
    });
}
```

### Creating Resize Handles
```javascript
function createResizeHandles(element) {
    const handlesGroup = canvas.group().addClass('resize-handles');
    
    // Create corner handles
    const handleSize = 8;
    const handle = handlesGroup.rect(handleSize, handleSize)
        .addClass('resize-handle')
        .fill('#fff')
        .stroke('#007AFF');
    
    return handlesGroup;
}
```

### Element Selection State
```javascript
function selectElement(element) {
    // Clear previous selection
    if (selectedElement) {
        selectedElement.removeClass('selected');
    }
    
    // Select new element
    selectedElement = element;
    element.addClass('selected');
}
```

## SVG.js v2.7.1 Specific Notes

### Version-Specific Behavior
- **Element Selection**: `canvas.select('#id')` can be unreliable
- **Event Handling**: Both `.on('event', handler)` and `.click(handler)` work
- **Class Management**: Use `.addClass()` and `.removeClass()` 
- **DOM Integration**: Mix SVG.js methods with DOM methods when needed

### Best Practices
```javascript
// Store element references using data attributes
element.attr('data-custom-id', uniqueId);

// Use DOM methods for reliable element retrieval
const domElement = document.getElementById(svgjsId);

// Combine SVG.js and DOM for robust interaction
element.addClass('selected');
domElement.classList.add('additional-class');
```

### Common Gotchas
- SVG elements don't support arbitrary properties (`element.customProp = value` fails)
- Use `element.attr('data-key', value)` for custom data
- Element references can become stale after canvas operations
- Always check if element exists before calling methods

## Performance Tips

### Efficient Rendering
```javascript
// Batch operations
canvas.clear();
elements.forEach(data => {
    const element = addElementToCanvas(data);
    makeElementInteractive(element);
});

// Use groups for complex elements
const complexElement = canvas.group();
// Add multiple sub-elements to group
```

### Memory Management
```javascript
// Clean up event listeners when removing elements
element.off();  // Remove all event listeners
element.remove();  // Remove from DOM
```