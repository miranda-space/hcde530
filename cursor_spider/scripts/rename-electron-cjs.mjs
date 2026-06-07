import fs from 'node:fs'
import path from 'node:path'

const electronDir = 'dist-electron/electron'
for (const file of ['main', 'preload']) {
  const from = path.join(electronDir, `${file}.js`)
  const to = path.join(electronDir, `${file}.cjs`)
  fs.renameSync(from, to)
}

fs.mkdirSync('dist-electron', { recursive: true })
fs.writeFileSync('dist-electron/package.json', JSON.stringify({ type: 'commonjs' }, null, 2))
