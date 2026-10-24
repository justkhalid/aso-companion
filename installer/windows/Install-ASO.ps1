# The worker of the installer: it does the work and tells the window what it is doing, one line at a time (##STEPS, ##STEP, ##SAY,
# ##PROGRESS, ##DONE, ##FAIL). It shows nothing itself: the window is drawn by the launcher (Launcher.cs).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

# where the app goes (ASO_INSTALL_DIR is for tests only) and what this installer carries: the app, the build info and the Google keys
$dir = if ($env:ASO_INSTALL_DIR) { $env:ASO_INSTALL_DIR } else { Join-Path $env:USERPROFILE 'aso-companion' }
$here = $PSScriptRoot
$test = ($env:ASO_SETUP_TEST -eq '1')
$log = Join-Path $env:TEMP 'aso-setup.log'
Set-Content -Path $log -Value ("ASO Companion setup " + (Get-Date))

function Emit([string]$s) { [Console]::Out.WriteLine($s); [Console]::Out.Flush() }
function Mark([int]$i, [string]$state) { Emit ("##STEP|$i|$state") }
function Say([string]$t) { if ($t -and $t.Trim()) { Emit ("##SAY|" + $t.Trim()) }; Add-Content -Path $log -Value $t }
function Progress([int]$v) { Emit ("##PROGRESS|$v") }

# runs a program and waits for it, returns the exit code
function Run-Wait([string]$file, [string]$argLine, [string]$workDir, [switch]$admin) {
  $out = [IO.Path]::GetTempFileName(); $err = [IO.Path]::GetTempFileName()
  $a = @{ FilePath = $file; ArgumentList = $argLine; PassThru = $true }
  if ($workDir) { $a.WorkingDirectory = $workDir }
  if ($admin) { $a.Verb = 'RunAs' } else { $a.WindowStyle = 'Hidden'; $a.RedirectStandardOutput = $out; $a.RedirectStandardError = $err }
  $p = Start-Process @a
  $null = $p.Handle   # without this the exit code can come back empty
  $p.WaitForExit()
  if (-not $admin) {
    $o = (Get-Content $out -Raw -ErrorAction SilentlyContinue) + (Get-Content $err -Raw -ErrorAction SilentlyContinue)
    Add-Content -Path $log -Value $o
    Remove-Item $out, $err -ErrorAction SilentlyContinue
  }
  return $p.ExitCode
}
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
function Have([string]$c) { return [bool](Get-Command $c -ErrorAction SilentlyContinue) }

function Install-Node {
  if (Have 'winget') {
    [void](Run-Wait 'winget' 'install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements' '')
    Refresh-Path
    if (Have 'node') { return }
  }
  $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
  $v = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version
  $msi = Join-Path $env:TEMP 'aso-node.msi'
  Invoke-WebRequest "https://nodejs.org/dist/$v/node-$v-x64.msi" -OutFile $msi
  [void](Run-Wait 'msiexec.exe' "/i `"$msi`" /qn /norestart" '' -admin)
  Refresh-Path
  if (-not (Have 'node')) { throw 'Node.js could not be installed.' }
}

# the folders and files an update never touches (the same rule as the updater in src/lib/updates.ts)
$kept = '^(data|\.env|\.aso|\.git|\.next|node_modules|\.test-state)(/|\.|$)|^aso\.log$|^server\.log$|^dev\.log$'
$cur = -1
Emit '##STEPS|Install Node.js;Unpack the app;Install the app parts;Build the app;Save the settings;Put the icon on the Desktop'

try {
  $zip = Join-Path $here 'app.zip'
  $keys = Join-Path $here 'google.json'
  $info = Join-Path $here 'build-info.json'
  if (-not (Test-Path $zip) -or -not (Test-Path $keys)) { throw 'This setup file is incomplete. Ask for a new copy of it.' }
  Progress 3

  Refresh-Path
  $cur = 0; Mark 0 'active'
  if (-not (Have 'node')) {
    if ($test) { throw 'Node.js is missing (test).' }
    Say 'Installing Node.js. Windows may ask you to allow it.'
    Install-Node
  }
  Mark 0 'done'; Progress 18

  # the app is inside this file: nothing is downloaded from GitHub
  $cur = 1; Mark 1 'active'; Say 'Unpacking the app...'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $root = [IO.Path]::GetFullPath($dir).TrimEnd('\') + '\'
  $update = Test-Path (Join-Path $dir 'package.json')   # on an update the data, the settings and the build stay as they are
  $files = @()
  $z = [IO.Compression.ZipFile]::OpenRead($zip)
  try {
    foreach ($e in $z.Entries) {
      if ($e.FullName.EndsWith('/')) { continue }
      $rel = $e.FullName
      $to = [IO.Path]::GetFullPath((Join-Path $dir ($rel -replace '/', '\')))
      if (-not $to.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw 'The setup file is damaged. Ask for a new copy of it.' }
      $files += $rel
      if ($update -and ($rel -match $kept)) { continue }
      New-Item -ItemType Directory -Force -Path (Split-Path $to) | Out-Null
      [IO.Compression.ZipFileExtensions]::ExtractToFile($e, $to, $true)
    }
  } finally { $z.Dispose() }
  Mark 1 'done'; Progress 30

  $cur = 2; Mark 2 'active'; Say 'Installing the app parts. This takes a few minutes.'
  $c = Run-Wait 'cmd.exe' ('/c npm install --no-audit --no-fund >> "' + $log + '" 2>&1') $dir
  if ($c -ne 0) { throw 'The app parts could not be installed. Check the internet connection, then try again.' }
  Mark 2 'done'; Progress 65
  $cur = 3; Mark 3 'active'; Say 'Building the app. This takes a few minutes.'
  $c = Run-Wait 'cmd.exe' ('/c npx next build >> "' + $log + '" 2>&1') $dir
  if ($c -ne 0) { throw 'The app could not be built.' }
  Mark 3 'done'; Progress 88

  # the settings: a secret of this computer and the Google keys; nobody types anything
  $cur = 4; Mark 4 'active'; Say 'Saving the settings...'
  $g = Get-Content $keys -Raw | ConvertFrom-Json
  if (-not $g.id -or -not $g.secret) { throw 'This setup file has no Google keys. Ask for a new copy of it.' }
  $envFile = Join-Path $dir '.env.local'
  $secret = ''
  if (Test-Path $envFile) { foreach ($l in Get-Content $envFile) { if ($l -match '^ASO_SESSION_SECRET=(.+)$') { $secret = $Matches[1] } } }
  if (-not $secret) { $secret = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')) }
  $text = "ASO_LOCAL=1`r`nASO_SESSION_SECRET=$secret`r`nGOOGLE_CLIENT_ID=$($g.id)`r`nGOOGLE_CLIENT_SECRET=$($g.secret)`r`nMETA_APP_ID=`r`nMETA_APP_SECRET=`r`n"
  [IO.File]::WriteAllText($envFile, $text, (New-Object Text.UTF8Encoding($false)))
  # this install is updated from Google Drive by the app itself (the same marker the updater writes), never by git
  $b = if (Test-Path $info) { Get-Content $info -Raw | ConvertFrom-Json } else { $null }
  New-Item -ItemType Directory -Force -Path (Join-Path $dir '.aso') | Out-Null
  $relInfo = [ordered]@{ version = [string]$b.version; sha = [string]$b.sha; date = [string]$b.date; files = @($files) }
  [IO.File]::WriteAllText((Join-Path $dir '.aso\release.json'), ($relInfo | ConvertTo-Json -Compress -Depth 4), (New-Object Text.UTF8Encoding($false)))
  Mark 4 'done'; Progress 94

  $cur = 5; Mark 5 'active'
  if (-not $test) {
    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'ASO Companion.lnk'))
    $lnk.TargetPath = 'wscript.exe'
    $lnk.Arguments = '"' + (Join-Path $dir 'ASO Companion.vbs') + '"'
    $lnk.WorkingDirectory = $dir
    $lnk.IconLocation = (Join-Path $dir 'public\aso-logo.ico')
    $lnk.Description = 'ASO Companion'
    $lnk.Save()
  }
  Mark 5 'done'; Progress 100
  Set-Content -Path (Join-Path $env:TEMP 'aso-setup-result.txt') -Value 'OK'
  Emit ("##DONE|" + $dir)
} catch {
  if ($cur -ge 0) { Mark $cur 'fail' }
  Add-Content -Path $log -Value ('FAILED: ' + $_.Exception.Message)
  Set-Content -Path (Join-Path $env:TEMP 'aso-setup-result.txt') -Value ('FAIL ' + $_.Exception.Message)
  Emit ("##FAIL|" + $_.Exception.Message)
}
