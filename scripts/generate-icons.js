const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// SVG source with QuestCord lightning bolt
const iconSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background Circle -->
  <circle cx="256" cy="256" r="240" fill="url(#grad)"/>
  
  <!-- Lightning Bolt -->
  <path d="M 300 100 L 200 256 L 260 256 L 212 412 L 350 240 L 280 240 L 300 100 Z" 
        fill="#FFFFFF" 
        stroke="#FCD34D" 
        stroke-width="8" 
        stroke-linejoin="round"/>
  
  <!-- Shine effect -->
  <circle cx="256" cy="256" r="240" fill="url(#shine)" opacity="0.3"/>
  <defs>
    <radialGradient id="shine">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
  </defs>
</svg>
`.trim();

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  for (const size of sizes) {
    try {
      const filename = `icon-${size}x${size}.png`;
      const filepath = path.join(publicDir, filename);

      await sharp(Buffer.from(iconSVG))
        .resize(size, size)
        .png()
        .toFile(filepath);

      console.log(`✅ Generated ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  // Generate favicon.ico (multi-size)
  try {
    await sharp(Buffer.from(iconSVG))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));
    
    console.log('\n✅ Generated favicon-32.png (rename to favicon.ico if needed)');
  } catch (error) {
    console.error('❌ Failed to generate favicon:', error.message);
  }

  // Generate Apple Touch Icon (180x180)
  try {
    await sharp(Buffer.from(iconSVG))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
    console.log('✅ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('❌ Failed to generate apple touch icon:', error.message);
  }

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);

