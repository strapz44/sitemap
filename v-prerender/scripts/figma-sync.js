const https = require('https')
const fs = require('fs')
const path = require('path')

const TOKEN = process.env.FIGMA_TOKEN
const FILE_KEY = process.env.FIGMA_FILE_KEY

if (!TOKEN || !FILE_KEY) {
  console.warn('Figma sync skipped: missing FIGMA_TOKEN or FIGMA_FILE_KEY')
  process.exit(0)
}

const host = 'api.figma.com'
const baseHeaders = {
  'X-Figma-Token': TOKEN,
}

function getJSON(p) {
  return new Promise((resolve, reject) => {
    const options = { host, path: p, method: 'GET', headers: baseHeaders }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (e) {
          const snippet = String(data || '').slice(0, 180)
          reject(new Error('Failed to parse JSON for ' + p + ': ' + e.message + ' | body: ' + snippet))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function toKebab(str) {
  return String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .toLowerCase()
}

function rgbaToCss(v) {
  const r = Math.round((v.r || 0) * 255)
  const g = Math.round((v.g || 0) * 255)
  const b = Math.round((v.b || 0) * 255)
  const a = typeof v.a === 'number' ? v.a : 1
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

async function main() {
  const outDir = path.join(__dirname, '..', 'design')
  fs.mkdirSync(outDir, { recursive: true })

  console.log('Figma sync start', JSON.stringify({ token_set: !!TOKEN, file_key_len: (FILE_KEY || '').length }))

  let file = null
  let styles = null
  let components = null
  try {
    file = await getJSON(`/v1/files/${FILE_KEY}`)
    fs.writeFileSync(path.join(outDir, 'figma-file.json'), JSON.stringify(file, null, 2))
  } catch (e) {
    fs.writeFileSync(path.join(outDir, 'figma-file.error.txt'), String(e && e.message ? e.message : e))
  }
  try {
    styles = await getJSON(`/v1/files/${FILE_KEY}/styles`)
    fs.writeFileSync(path.join(outDir, 'figma-styles.json'), JSON.stringify(styles, null, 2))
  } catch (e) {
    fs.writeFileSync(path.join(outDir, 'figma-styles.error.txt'), String(e && e.message ? e.message : e))
  }
  try {
    components = await getJSON(`/v1/files/${FILE_KEY}/components`)
    fs.writeFileSync(path.join(outDir, 'figma-components.json'), JSON.stringify(components, null, 2))
  } catch (e) {
    fs.writeFileSync(path.join(outDir, 'figma-components.error.txt'), String(e && e.message ? e.message : e))
  }

  let variables = null
  try {
    variables = await getJSON(`/v1/files/${FILE_KEY}/variables`)
    fs.writeFileSync(path.join(outDir, 'figma-variables.json'), JSON.stringify(variables, null, 2))
  } catch (e) {
    // Variables endpoint may not be available or file may not use variables
    fs.writeFileSync(path.join(outDir, 'figma-variables.error.txt'), String(e && e.message ? e.message : e))
  }

  try {
    const list = (variables && variables.meta && Array.isArray(variables.meta.variables)) ? variables.meta.variables : []
    const collections = (variables && variables.meta && Array.isArray(variables.meta.variableCollections)) ? variables.meta.variableCollections : []

    // Build a quick map: collectionId -> first mode id
    const defaultModeByCollection = {}
    for (const col of collections) {
      const firstMode = Array.isArray(col.modes) && col.modes.length ? col.modes[0].modeId : null
      if (firstMode) defaultModeByCollection[col.id] = firstMode
    }

    const cssLines = []
    cssLines.push(':root {')

    for (const v of list) {
      if (v.resolvedType !== 'COLOR') continue
      const modeId = defaultModeByCollection[v.variableCollectionId] || Object.keys(v.valuesByMode || {})[0]
      const raw = modeId ? v.valuesByMode[modeId] : null
      if (!raw || !raw.color) continue
      const name = '--figma-' + toKebab(v.name)
      cssLines.push(`  ${name}: ${rgbaToCss({ r: raw.color.r, g: raw.color.g, b: raw.color.b, a: typeof raw.color.a === 'number' ? raw.color.a : 1 })};`)
    }

    cssLines.push('}')

    const cssPath = path.join(__dirname, '..', 'src', 'assets', 'styles', 'figma-tokens.css')
    fs.mkdirSync(path.dirname(cssPath), { recursive: true })
    fs.writeFileSync(cssPath, cssLines.join('\n'))
  } catch (e) {
    const cssPath = path.join(__dirname, '..', 'src', 'assets', 'styles', 'figma-tokens.css')
    if (!fs.existsSync(cssPath)) {
      fs.mkdirSync(path.dirname(cssPath), { recursive: true })
      fs.writeFileSync(cssPath, ':root {}')
    }
    console.warn('Figma tokens generation skipped or partial:', String(e && e.message ? e.message : e))
  }

  console.log('Figma sync complete (non-fatal)')
}

main()
  .then(() => { process.exit(0) })
  .catch((e) => {
    try {
      const cssPath = path.join(__dirname, '..', 'src', 'assets', 'styles', 'figma-tokens.css')
      if (!fs.existsSync(cssPath)) {
        fs.mkdirSync(path.dirname(cssPath), { recursive: true })
        fs.writeFileSync(cssPath, ':root {}')
      }
    } catch (_) {}
    console.error('Figma sync soft-fail:', String(e && e.message ? e.message : e))
    process.exit(0)
  })
