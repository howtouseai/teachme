/**
 * Script to generate placeholder icons for the extension
 * This is a utility script, not part of the extension itself
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

// Make sure the images directory exists
try {
  if (!fs.existsSync('../images')) {
    fs.mkdirSync('../images');
  }
} catch (err) {
  console.error('Error checking/creating images directory:', err);
}

// Function to create an icon
function createIcon(size) {
  console.log(`Creating ${size}x${size} icon...`);
  
  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4285f4'; // Google blue
  ctx.fillRect(0, 0, size, size);
  
  // Brain symbol (simplified as a circle)
  ctx.fillStyle = '#ffffff';
  const brainRadius = size * 0.35;
  ctx.beginPath();
  ctx.arc(size/2, size/2, brainRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Sound wave
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size * 0.04);
  
  const waveStartX = size * 0.6;
  const waveHeight = size * 0.2;
  const waveWidth = size * 0.3;
  
  ctx.beginPath();
  ctx.moveTo(waveStartX, size/2);
  ctx.bezierCurveTo(
    waveStartX + waveWidth * 0.3, size/2 - waveHeight,
    waveStartX + waveWidth * 0.7, size/2 + waveHeight,
    waveStartX + waveWidth, size/2
  );
  ctx.stroke();
  
  // Convert to PNG buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Save to file
  fs.writeFileSync(`../images/icon${size}.png`, buffer);
  console.log(`✓ Saved icon${size}.png`);
}

// Create icons of different sizes
try {
  createIcon(16);  // 16x16 icon
  createIcon(48);  // 48x48 icon
  createIcon(128); // 128x128 icon
  console.log('All icons created successfully!');
} catch (err) {
  console.error('Error creating icons:', err);
} 