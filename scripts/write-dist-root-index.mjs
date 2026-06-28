import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const distIndexPath = path.join(distDir, 'index.html')
const launcherPath = path.join(distDir, 'LANCER-HORLOGE.cmd')
const webDir = path.join(distDir, 'web')
const webLauncherPath = path.join(webDir, 'LANCER-WEB.cmd')
const webServerScriptPath = path.join(webDir, 'serve-web.ps1')

fs.mkdirSync(distDir, { recursive: true })

const legacyEntries = ['assets', 'vite.svg', 'aflogo.png', 'aflogo.tiff']
for (const entry of legacyEntries) {
  const target = path.join(distDir, entry)
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true })
  }
}

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=./web/index.html" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Horloge DELF DALF</title>
    <script>
      window.location.replace('./web/index.html')
    </script>
  </head>
  <body>
    <p>Redirection en cours vers l'application...</p>
  </body>
</html>
`

fs.writeFileSync(distIndexPath, html, 'utf8')

const launcher = [
  '@echo off',
  'setlocal',
  'set "APP=%~dp0desktop\\win-unpacked\\Horloge DELF DALF.exe"',
  'if not exist "%APP%" (',
  '  echo Executable introuvable: %APP%',
  "  echo Lance d'abord npm run dist:win",
  '  pause',
  '  exit /b 1',
  ')',
  'start "" "%APP%"',
].join('\r\n')

fs.writeFileSync(launcherPath, `${launcher}\r\n`, 'utf8')

if (fs.existsSync(webDir)) {
  const webServerScript = [
    'param(',
    '  [int]$Port = 8787',
    ')',
    '',
    '$ErrorActionPreference = "Stop"',
    '$basePath = Split-Path -Parent $MyInvocation.MyCommand.Path',
    '$listener = [System.Net.HttpListener]::new()',
    '$prefix = "http://127.0.0.1:$Port/"',
    '$listener.Prefixes.Add($prefix)',
    '$listener.Start()',
    'Write-Host "Serveur web local demarre sur $prefix"',
    'Start-Process "$prefix/index.html" | Out-Null',
    '',
    'try {',
    '  while ($listener.IsListening) {',
    '    $context = $listener.GetContext()',
    '    $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")',
    '    if ([string]::IsNullOrWhiteSpace($requestPath)) {',
    '      $requestPath = "index.html"',
    '    }',
    '    $requestPath = $requestPath -replace "/", "\\"',
    '    $filePath = Join-Path $basePath $requestPath',
    '',
    '    if (-not (Test-Path $filePath -PathType Leaf)) {',
    '      $context.Response.StatusCode = 404',
    '      $context.Response.Close()',
    '      continue',
    '    }',
    '',
    '    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()',
    '    $contentType = switch ($extension) {',
    '      ".html" { "text/html; charset=utf-8" }',
    '      ".js"   { "text/javascript; charset=utf-8" }',
    '      ".css"  { "text/css; charset=utf-8" }',
    '      ".svg"  { "image/svg+xml" }',
    '      ".png"  { "image/png" }',
    '      ".jpg"  { "image/jpeg" }',
    '      ".jpeg" { "image/jpeg" }',
    '      ".ico"  { "image/x-icon" }',
    '      default  { "application/octet-stream" }',
    '    }',
    '',
    '    $bytes = [System.IO.File]::ReadAllBytes($filePath)',
    '    $context.Response.ContentType = $contentType',
    '    $context.Response.ContentLength64 = $bytes.Length',
    '    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)',
    '    $context.Response.OutputStream.Close()',
    '    $context.Response.Close()',
    '  }',
    '} finally {',
    '  $listener.Stop()',
    '  $listener.Close()',
    '}',
  ].join('\r\n')

  const webLauncher = [
    '@echo off',
    'setlocal',
    'set "SCRIPT=%~dp0serve-web.ps1"',
    'if not exist "%SCRIPT%" (',
    '  echo Script introuvable: %SCRIPT%',
    '  pause',
    '  exit /b 1',
    ')',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"',
  ].join('\r\n')

  fs.writeFileSync(webServerScriptPath, `${webServerScript}\r\n`, 'utf8')
  fs.writeFileSync(webLauncherPath, `${webLauncher}\r\n`, 'utf8')
}

console.log('dist/index.html redirection generated')
