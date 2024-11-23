const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Read both the .wasm and .js files
const wasmPath = path.join(__dirname, 'wasm', 'server.wasm.wasm');
const jsPath = path.join(__dirname, 'wasm', 'server.wasm.js');

// Debug logging
console.log('Looking for WASM file at:', wasmPath);
console.log('Looking for JS file at:', jsPath);

// List files in wasm directory
const wasmDir = path.join(__dirname, 'wasm');
if (fs.existsSync(wasmDir)) {
    console.log('Contents of wasm directory:', fs.readdirSync(wasmDir));
} else {
    console.log('wasm directory does not exist');
}

// Check if input files exist
if (!fs.existsSync(wasmPath)) {
    console.error('Error: server.wasm.wasm not found at', wasmPath);
    process.exit(1);
}

if (!fs.existsSync(jsPath)) {
    console.error('Error: server.wasm.js not found at', jsPath);
    process.exit(1);
}

const wasmBuffer = fs.readFileSync(wasmPath);
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Convert wasm to base64
const wasmBase64 = wasmBuffer.toString('base64');

// Create the template that will create blob URLs
const template = `
// Base64 encoded WebAssembly module
const wasmBase64 = "${wasmBase64}";

// Convert base64 to blob URL
const wasmBytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
const wasmBlob = new Blob([wasmBytes], { type: 'application/wasm' });
const wasmUrl = URL.createObjectURL(wasmBlob);

// Merge the existing Module configuration with our locateFile
var existingModule = window.Module || {};
var Module = {
    ...existingModule,
    locateFile: function(path) {
        if (path.endsWith('.wasm')) return wasmUrl;
        return path;
    }
};

// Original JavaScript loader code (without var Module declaration)
${jsContent.replace(/var\s+Module\s*=\s*{[\s\S]*?};/, '')}
`;

// Write the combined file
const outputPath = path.join(distDir, 'server.wasm.bundle.js');
fs.writeFileSync(outputPath, template);
console.log(`Generated combined WASM bundle at ${outputPath}`); 