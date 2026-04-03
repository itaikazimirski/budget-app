import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// Indigo background (#6366f1) with white "₪" text rendered as SVG
function makeSvg(size) {
  const fontSize = Math.round(size * 0.45)
  const pad = Math.round(size * 0.15)
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#6366f1"/>
      <text
        x="50%" y="54%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
      >₪</text>
    </svg>
  `)
}

await sharp(makeSvg(192)).png().toFile('public/icons/icon-192.png')
await sharp(makeSvg(512)).png().toFile('public/icons/icon-512.png')
await sharp(makeSvg(180)).png().toFile('public/icons/apple-touch-icon.png')

console.log('Icons generated successfully.')
