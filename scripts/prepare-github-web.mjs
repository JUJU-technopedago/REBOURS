import fs from 'node:fs'
import path from 'node:path'
import JavaScriptObfuscator from 'javascript-obfuscator'

const rootDir = process.cwd()
const sourceDir = path.join(rootDir, 'dist', 'web')
const targetDir = path.join(rootDir, 'release', 'github-web')

if (!fs.existsSync(sourceDir)) {
  throw new Error('dist/web folder is missing. Run npm run build first.')
}

fs.rmSync(targetDir, { recursive: true, force: true })
fs.mkdirSync(path.dirname(targetDir), { recursive: true })
fs.cpSync(sourceDir, targetDir, { recursive: true })

const assetsDir = path.join(targetDir, 'assets')
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir)
  for (const file of files) {
    if (!file.endsWith('.js')) continue

    const filePath = path.join(assetsDir, file)
    const sourceCode = fs.readFileSync(filePath, 'utf8')

    const result = JavaScriptObfuscator.obfuscate(sourceCode, {
      compact: true,
      simplify: true,
      stringArray: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      splitStrings: true,
      splitStringsChunkLength: 8,
      identifierNamesGenerator: 'hexadecimal',
      target: 'browser',
      sourceMap: false,
      renameGlobals: false,
      controlFlowFlattening: false,
      deadCodeInjection: false,
    })

    fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8')
  }
}

const notePath = path.join(targetDir, 'README-OFFLINE.txt')
fs.writeFileSync(
  notePath,
  [
    'Open index.html to launch the app.',
    'This folder is ready to be shared from GitHub download.',
    'If the browser blocks local file access, use a simple static server.',
  ].join('\n'),
  'utf8',
)

console.log(`Web package created at: ${targetDir}`)
