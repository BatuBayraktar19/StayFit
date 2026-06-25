const sharp = require('sharp');
const path = require('path');

const src = path.join('assets', '78854af36a954e054a4f778634f71736.jpg');
const bg = { r: 0, g: 0, b: 0, alpha: 1 };

async function make(outPath, size) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: bg })
    .sharpen({ sigma: 1.8, m1: 0, m2: 3, x1: 2, y2: 10, y3: 20 })
    .png()
    .toFile(outPath);
  console.log(`${outPath} ✓`);
}

// Monochrome variant: desaturate + threshold to pure white on black
async function makeMono(outPath, size) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: bg })
    .grayscale()
    .png()
    .toFile(outPath);
  console.log(`${outPath} ✓`);
}

async function main() {
  await make('assets/icon.png', 1024);
  await make('assets/android-icon-foreground.png', 1024);
  await make('assets/android-icon-background.png', 1024);
  await makeMono('assets/android-icon-monochrome.png', 1024);
  await make('assets/favicon.png', 32);
  console.log('\nAll icons generated!');
}

main().catch(console.error);
