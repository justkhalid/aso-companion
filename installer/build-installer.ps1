# Makes the one-file Windows installer: dist\ASO-Companion-Setup.exe
#
# Run on the developer's Windows computer, from the repository root:
#   powershell -ExecutionPolicy Bypass -File installer\build-installer.ps1
#
# The file carries the app (a source package of the chosen commit), the build info and the Google keys, so a new computer needs
# nothing from GitHub: it unpacks the app, installs Node.js if missing, builds, and opens the app, where the director signs in
# with Google once. The Google Client ID and secret are read from the environment (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) or
# from installer\google.json ({"id":"...","secret":"..."}); that file is ignored by git. They end up only inside the exe, which
# is shared privately. Never commit them and never post the exe publicly.
param(
  [string]$Ref = 'HEAD',
  # for testing only: also take the changes that are not committed yet
  [switch]$IncludeUncommitted,
  [string]$Out = 'dist\ASO-Companion-Setup.exe'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

# ---- the Google keys ----
$id = $env:GOOGLE_CLIENT_ID; $secret = $env:GOOGLE_CLIENT_SECRET
$keyFile = Join-Path $PSScriptRoot 'google.json'
if ((-not $id -or -not $secret) -and (Test-Path $keyFile)) {
  $k = Get-Content $keyFile -Raw | ConvertFrom-Json
  $id = $k.id; $secret = $k.secret
}
if (-not $id -or -not $secret) {
  throw "The Google keys are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or make installer\google.json with {""id"":""..."",""secret"":""...""}."
}
if ($id -notmatch '^[\w.\-]+$' -or $secret -notmatch '^[\w.\-]+$') { throw 'The Google keys have an unexpected shape (letters, digits, dot, dash and underscore only).' }

# ---- the app package ----
if ($IncludeUncommitted) { $snap = (git stash create).Trim(); if ($snap) { $Ref = $snap } }
$sha = (git rev-parse $Ref).Trim()
$work = Join-Path $env:TEMP ('aso-installer-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $work | Out-Null
try {
  git archive --format=zip -o (Join-Path $work 'app.zip') $Ref -- . ':(exclude)handoff' ':(exclude)installer' ':(exclude)dist' ':(exclude)setup'
  if ($LASTEXITCODE -ne 0) { throw 'git archive failed.' }
  $pkg = (git show "${Ref}:package.json") -join "`n" | ConvertFrom-Json
  $info = [ordered]@{ version = $pkg.version; sha = $sha; date = (Get-Date).ToUniversalTime().ToString('o') }
  [IO.File]::WriteAllText((Join-Path $work 'build-info.json'), ($info | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
  [IO.File]::WriteAllText((Join-Path $work 'google.json'), (@{ id = $id; secret = $secret } | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
  Copy-Item (Join-Path $PSScriptRoot 'windows\Install-ASO.ps1') $work
  # ---- one exe: a small launcher (C#, compiled with the compiler that ships with Windows) that carries the files as resources ----
  $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  if (-not (Test-Path $csc)) { throw 'The .NET Framework compiler was not found on this computer.' }
  $outPath = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }
  New-Item -ItemType Directory -Force -Path (Split-Path $outPath) | Out-Null
  $built = Join-Path $work 'ASO-Companion-Setup.exe'
  $args = @('/nologo', '/target:winexe', "/out:$built", '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll')
  $icon = Join-Path $root 'public\aso-logo.ico'
  if (Test-Path $icon) { $args += "/win32icon:$icon" }
  foreach ($f in 'Install-ASO.ps1', 'app.zip', 'build-info.json', 'google.json') { $args += "/resource:$(Join-Path $work $f),$f" }
  # the look of the window: the crest, the glass picture and the ASO fonts of the kit
  $art = @{ 'logo.png' = 'public\kit\logo.png'; 'bg.jpg' = 'public\kit\bg\cover0.jpg'; 'bodoni.ttf' = 'public\kit\fonts\bodoni600i.ttf'; 'manrope-m.ttf' = 'public\kit\fonts\manrope500.ttf'; 'manrope-b.ttf' = 'public\kit\fonts\manrope700.ttf' }
  foreach ($k in $art.Keys) { $src = Join-Path $root $art[$k]; if (-not (Test-Path $src)) { throw "A file of the window is missing: $($art[$k])" }; $args += "/resource:$src,$k" }
  $args += (Join-Path $PSScriptRoot 'windows\Launcher.cs')
  & $csc @args
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $built)) { throw 'The installer could not be compiled.' }
  Copy-Item $built $outPath -Force
  "{0}  {1:N1} MB  version {2}  commit {3}" -f $outPath, ((Get-Item $outPath).Length / 1MB), $pkg.version, $sha.Substring(0, 8)
} finally {
  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
