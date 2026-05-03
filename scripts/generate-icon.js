const sharp = require('sharp')
const toIco = require('to-ico')
const fs = require('fs')
const path = require('path')

const SIZES = [16, 24, 32, 48, 64, 128, 256]

const SVG = '<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">' +
  '<defs>' +
  '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" stop-color="#a78bfa"/>' +
  '<stop offset="100%" stop-color="#6d28d9"/>' +
  '</linearGradient>' +
  '</defs>' +
  '<rect width="256" height="256" rx="52" fill="url(#g)"/>' +
  '<path d="M96 84 L168 128 L96 172" stroke="white" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
  '</svg>'

async function generate() {
  const assetsDir = path.join(__dirname, '..', 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  const pngBuffers = []

  for (const size of SIZES) {
    const png = await sharp(Buffer.from(SVG))
      .resize(size, size)
      .png()
      .toBuffer()
    pngBuffers.push(png)
    console.log('  ' + size + 'x' + size + ' PNG rendered')
  }

  const icoBuffer = await toIco(pngBuffers)
  const icoPath = path.join(assetsDir, 'icon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log('\nIcon saved to: ' + icoPath)
  console.log('File size: ' + (icoBuffer.length / 1024).toFixed(1) + ' KB')
}

generate().catch(function(err) {
  console.error('Icon generation failed:', err)
  process.exit(1)
})