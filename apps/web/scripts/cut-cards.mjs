/**
 * cut-cards.mjs
 * Corta un sprite sheet horizontal en cartas individuales.
 *
 * USO:
 *   node apps/web/scripts/cut-cards.mjs
 *
 * ANTES de correr:
 *   1. npm install sharp  (en la raíz o en apps/web)
 *   2. Colocá las 4 imágenes en apps/web/public/cards/raw/:
 *        oros.png   copas.png   espadas.png   bastos.png
 *        dorso.png  (opcional)
 *   3. Ajustá CARD_W, CARD_H, START_X, START_Y si hace falta.
 *
 * SALIDA:
 *   apps/web/public/cards/1_oros.png, 2_oros.png ... 12_bastos.png
 */

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.join(__dirname, '..', 'public', 'cards', 'raw')
const OUT_DIR = path.join(__dirname, '..', 'public', 'cards')

fs.mkdirSync(OUT_DIR, { recursive: true })

// Valores en el orden en que aparecen en el sprite (izquierda → derecha)
const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]

// ── CONFIGURACIÓN ─────────────────────────────────────────────
// Ajustá estos valores según tus imágenes.
// Tip: abrí la imagen en un editor y medí la posición X del borde
// izquierdo de la primera carta y el ancho de cada carta.
const CONFIG = {
  oros:    { cardW: 130, cardH: 210, startX: 10, startY: 10 },
  copas:   { cardW: 130, cardH: 210, startX: 10, startY: 10 },
  espadas: { cardW: 130, cardH: 210, startX: 10, startY: 10 },
  bastos:  { cardW: 130, cardH: 210, startX: 10, startY: 10 },
}
// ─────────────────────────────────────────────────────────────

async function cortarPalo(palo) {
  const inputPath = path.join(RAW_DIR, `${palo}.png`)
  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️  No encontré ${palo}.png en raw/ — saltando`)
    return
  }

  const { cardW, cardH, startX, startY } = CONFIG[palo]
  const meta = await sharp(inputPath).metadata()
  console.log(`\n📦 ${palo}.png — ${meta.width}×${meta.height}px`)

  for (let i = 0; i < VALORES.length; i++) {
    const valor = VALORES[i]
    const left = startX + i * cardW

    if (left + cardW > (meta.width ?? 0)) {
      console.warn(`  ⚠️  Carta ${valor} se sale del borde (left=${left})`)
      continue
    }

    const outFile = path.join(OUT_DIR, `${valor}_${palo}.png`)
    await sharp(inputPath)
      .extract({ left, top: startY, width: cardW, height: cardH })
      .png()
      .toFile(outFile)

    console.log(`  ✓  ${valor}_${palo}.png`)
  }
}

// Dorso
async function copiarDorso() {
  const src = path.join(RAW_DIR, 'dorso.png')
  const dst = path.join(OUT_DIR, 'dorso.png')
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst)
    console.log('\n  ✓  dorso.png')
  } else {
    console.warn('\n⚠️  No encontré dorso.png — las cartas tapadas usarán el fallback azul')
  }
}

console.log('🃏 Cortando cartas...')
for (const palo of ['oros', 'copas', 'espadas', 'bastos']) {
  await cortarPalo(palo)
}
await copiarDorso()
console.log('\n✅ Listo! Las imágenes están en apps/web/public/cards/')
console.log('   Si las cartas quedaron cortadas mal, ajustá cardW/startX en el script.')
