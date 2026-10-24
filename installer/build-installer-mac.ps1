# Makes the Mac installer: dist\ASO-Companion-Setup-Mac.tar.gz
#
# Run on the developer's computer (Windows is fine), from the repository root:
#   powershell -ExecutionPolicy Bypass -File installer\build-installer-mac.ps1
#
# On a Mac: open the archive (double-click), then double-click "ASO Companion Setup" inside it (the first time: right-click, Open, Open).
# The file carries the app, the build info, the Google keys and the pictures of its progress page, so nothing comes from GitHub and
# nobody types anything. The Google keys are read from the environment (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) or from
# installer\google.json (ignored by git) and end up only inside the file, which is shared privately. Never commit them.
param(
  [string]$Ref = 'HEAD',
  # for testing only: also take the changes that are not committed yet
  [switch]$IncludeUncommitted,
  [string]$Out = 'dist\ASO-Companion-Setup-Mac.tar.gz'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

$id = $env:GOOGLE_CLIENT_ID; $secret = $env:GOOGLE_CLIENT_SECRET
$keyFile = Join-Path $PSScriptRoot 'google.json'
if ((-not $id -or -not $secret) -and (Test-Path $keyFile)) { $k = Get-Content $keyFile -Raw | ConvertFrom-Json; $id = $k.id; $secret = $k.secret }
if (-not $id -or -not $secret) { throw "The Google keys are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or make installer\google.json with {""id"":""..."",""secret"":""...""}." }
if ($id -notmatch '^[\w.\-]+$' -or $secret -notmatch '^[\w.\-]+$') { throw 'The Google keys have an unexpected shape (letters, digits, dot, dash and underscore only).' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is needed to make the archive.' }

if ($IncludeUncommitted) { $snap = (git stash create).Trim(); if ($snap) { $Ref = $snap } }
$sha = (git rev-parse $Ref).Trim()
$work = Join-Path $env:TEMP ('aso-installer-mac-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path (Join-Path $work 'assets') | Out-Null
try {
  git archive --format=tar.gz -o (Join-Path $work 'app.tar.gz') $Ref -- . ':(exclude)handoff' ':(exclude)installer' ':(exclude)dist' ':(exclude)setup'
  if ($LASTEXITCODE -ne 0) { throw 'git archive failed.' }
  $pkg = (git show "${Ref}:package.json") -join "`n" | ConvertFrom-Json
  $utf8 = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText((Join-Path $work 'build-info.json'), (([ordered]@{ version = $pkg.version; sha = $sha; date = (Get-Date).ToUniversalTime().ToString('o') }) | ConvertTo-Json -Compress), $utf8)
  [IO.File]::WriteAllText((Join-Path $work 'google.json'), (@{ id = $id; secret = $secret } | ConvertTo-Json -Compress), $utf8)
  # the pictures of the progress page: the crest, the glass picture and the ASO fonts of the kit
  $art = @{ 'logo.png' = 'public\kit\logo.png'; 'bg.jpg' = 'public\kit\bg\cover0.jpg'; 'bodoni.ttf' = 'public\kit\fonts\bodoni600i.ttf'; 'manrope-m.ttf' = 'public\kit\fonts\manrope500.ttf'; 'manrope-b.ttf' = 'public\kit\fonts\manrope700.ttf' }
  foreach ($n in $art.Keys) { $src = Join-Path $root $art[$n]; if (-not (Test-Path $src)) { throw "A file of the page is missing: $($art[$n])" }; Copy-Item $src (Join-Path $work "assets\$n") }
  $payload = Join-Path $work 'payload.tgz'
  tar -czf $payload -C $work app.tar.gz google.json build-info.json assets
  if ($LASTEXITCODE -ne 0) { throw 'The payload could not be packed.' }
  $outPath = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }
  node (Join-Path $PSScriptRoot 'mac\pack.cjs') (Join-Path $PSScriptRoot 'mac\setup.sh') $payload $outPath
  if ($LASTEXITCODE -ne 0) { throw 'The installer could not be made.' }
  "version {0}  commit {1}" -f $pkg.version, $sha.Substring(0, 8)
} finally {
  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
