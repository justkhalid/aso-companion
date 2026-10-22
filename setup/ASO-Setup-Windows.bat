@echo off
rem ASO Companion setup for Windows. Double-click this file. If Windows shows a blue "protected your PC" box: More info, then Run anyway.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$s=[IO.File]::ReadAllText('%~f0'); $i=$s.LastIndexOf('#'+'#PS1'+'#'+'#'); Invoke-Expression $s.Substring($i+7)"
exit /b
##PS1##
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$repo = 'justkhalid/aso-companion'
$dir = Join-Path $env:USERPROFILE 'aso-companion'
$log = Join-Path $env:TEMP 'aso-setup.log'
Set-Content -Path $log -Value ("ASO Companion setup " + (Get-Date))

# ---------- the window ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = 'ASO Companion setup'
$form.ClientSize = New-Object System.Drawing.Size(540, 470)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'ASO Companion'
$title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 18)
$title.Location = New-Object System.Drawing.Point(24, 18); $title.Size = New-Object System.Drawing.Size(490, 36)
$form.Controls.Add($title)

$sub = New-Object System.Windows.Forms.Label
$sub.Text = 'Paste the GitHub token, press Install, and wait. Everything else is done for you. It takes about 5 to 10 minutes.'
$sub.Location = New-Object System.Drawing.Point(26, 58); $sub.Size = New-Object System.Drawing.Size(490, 44)
$sub.ForeColor = [System.Drawing.Color]::FromArgb(90, 98, 128)
$form.Controls.Add($sub)

$lab = New-Object System.Windows.Forms.Label
$lab.Text = 'GitHub token'
$lab.Location = New-Object System.Drawing.Point(26, 110); $lab.Size = New-Object System.Drawing.Size(200, 22)
$form.Controls.Add($lab)

$tok = New-Object System.Windows.Forms.TextBox
$tok.Location = New-Object System.Drawing.Point(26, 134); $tok.Size = New-Object System.Drawing.Size(488, 28)
$form.Controls.Add($tok)

$btn = New-Object System.Windows.Forms.Button
$btn.Text = 'Install'
$btn.Location = New-Object System.Drawing.Point(26, 176); $btn.Size = New-Object System.Drawing.Size(488, 40)
$btn.BackColor = [System.Drawing.Color]::FromArgb(26, 86, 255); $btn.ForeColor = [System.Drawing.Color]::White
$btn.FlatStyle = 'Flat'; $btn.FlatAppearance.BorderSize = 0
$btn.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 11)
$form.Controls.Add($btn)

$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(26, 230); $bar.Size = New-Object System.Drawing.Size(488, 8)
$bar.Style = 'Continuous'; $bar.Value = 0
$form.Controls.Add($bar)

$steps = New-Object System.Windows.Forms.TextBox
$steps.Multiline = $true; $steps.ReadOnly = $true; $steps.ScrollBars = 'Vertical'
$steps.Location = New-Object System.Drawing.Point(26, 250); $steps.Size = New-Object System.Drawing.Size(488, 196)
$steps.BackColor = [System.Drawing.Color]::FromArgb(246, 247, 252); $steps.BorderStyle = 'None'
$form.Controls.Add($steps)

function Say([string]$t) {
  $steps.AppendText($t + "`r`n")
  Add-Content -Path $log -Value $t
  [System.Windows.Forms.Application]::DoEvents()
}
function Progress([int]$v) { $bar.Value = [Math]::Min(100, $v); [System.Windows.Forms.Application]::DoEvents() }

# runs a program, keeps the window alive while it works, returns the exit code
function Run-Wait([string]$file, [string]$argLine, [string]$workDir, [switch]$admin) {
  $out = [IO.Path]::GetTempFileName(); $err = [IO.Path]::GetTempFileName()
  $a = @{ FilePath = $file; ArgumentList = $argLine; PassThru = $true }
  if ($workDir) { $a.WorkingDirectory = $workDir }
  if ($admin) { $a.Verb = 'RunAs' } else { $a.WindowStyle = 'Hidden'; $a.RedirectStandardOutput = $out; $a.RedirectStandardError = $err }
  $p = Start-Process @a
  while (-not $p.HasExited) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 120 }
  if (-not $admin) {
    $o = (Get-Content $out -Raw -ErrorAction SilentlyContinue) + (Get-Content $err -Raw -ErrorAction SilentlyContinue)
    $o = ($o -replace '(?i)basic [A-Za-z0-9+/=]{20,}', 'basic ***')
    Add-Content -Path $log -Value $o
    Remove-Item $out, $err -ErrorAction SilentlyContinue
  }
  return $p.ExitCode
}
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
function Have([string]$c) { return [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Winget-Ok { return (Have 'winget') }

function Install-Node {
  if (Winget-Ok) {
    $c = Run-Wait 'winget' 'install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements' '' 
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
function Install-Git {
  if (Winget-Ok) {
    [void](Run-Wait 'winget' 'install -e --id Git.Git --silent --accept-package-agreements --accept-source-agreements' '')
    Refresh-Path
    if (Have 'git') { return }
  }
  $rel = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{ 'User-Agent' = 'aso-setup' }
  $a = $rel.assets | Where-Object { $_.name -match '64-bit\.exe$' -and $_.name -notmatch 'busybox|portable' } | Select-Object -First 1
  $exe = Join-Path $env:TEMP 'aso-git.exe'
  Invoke-WebRequest $a.browser_download_url -OutFile $exe
  [void](Run-Wait $exe '/VERYSILENT /NORESTART' '' -admin)
  Refresh-Path
  if (-not (Have 'git')) {
    foreach ($p in @('C:\Program Files\Git\cmd', "$env:LOCALAPPDATA\Programs\Git\cmd")) { if (Test-Path "$p\git.exe") { $env:Path += ';' + $p } }
  }
  if (-not (Have 'git')) { throw 'Git could not be installed.' }
}

$btn.Add_Click({
  $btn.Enabled = $false; $tok.Enabled = $false
  $token = $tok.Text.Trim()
  try {
    if (-not $token) { throw 'Paste the GitHub token first.' }
    Progress 3
    Say 'Checking the token...'
    try {
      [void](Invoke-RestMethod "https://api.github.com/repos/$repo" -Headers @{ Authorization = "Bearer $token"; 'User-Agent' = 'aso-setup' })
    } catch { throw 'GitHub did not accept this token. Check that it is copied completely.' }
    Say '  token accepted'; Progress 8

    Refresh-Path
    if (-not (Have 'node')) { Say 'Installing Node.js (Windows may ask you to allow it)...'; Install-Node }
    Say '  Node.js is ready'; Progress 25
    if (-not (Have 'git')) { Say 'Installing Git (Windows may ask you to allow it)...'; Install-Git }
    Say '  Git is ready'; Progress 38

    $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
    $auth = "-c credential.helper= -c `"http.https://github.com/.extraheader=AUTHORIZATION: basic $b64`""
    if (Test-Path (Join-Path $dir '.git')) {
      Say 'Updating the app...'
      $c = Run-Wait 'git' "$auth pull --ff-only origin main" $dir
    } else {
      Say 'Downloading the app...'
      $c = Run-Wait 'git' "$auth clone https://github.com/$repo.git `"$dir`"" $env:USERPROFILE
    }
    if ($c -ne 0) { throw 'The app could not be downloaded. Check that the token is allowed to read the repository.' }
    Say '  app downloaded'; Progress 50

    $envFile = Join-Path $dir '.env.local'
    if (-not (Test-Path $envFile)) {
      $secret = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
      $text = "ASO_LOCAL=1`r`nASO_SESSION_SECRET=$secret`r`nGITHUB_PAT=$token`r`nGITHUB_REPO=$repo`r`nGITHUB_BRANCH=main`r`nMETA_APP_ID=`r`nMETA_APP_SECRET=`r`n"
      [IO.File]::WriteAllText($envFile, $text, (New-Object Text.UTF8Encoding($false)))
      Say '  settings file written'
    }

    Say 'Installing the app parts (a few minutes)...'
    $c = Run-Wait 'cmd.exe' ('/c npm install --no-audit --no-fund >> "' + $log + '" 2>&1') $dir
    if ($c -ne 0) { throw 'The app parts could not be installed. The reason is in the file aso-setup.log in your Temp folder.' }
    Say '  parts installed'; Progress 75
    Say 'Building the app (a few minutes)...'
    $c = Run-Wait 'cmd.exe' ('/c npx next build >> "' + $log + '" 2>&1') $dir
    if ($c -ne 0) { throw 'The app could not be built. The reason is in the file aso-setup.log in your Temp folder.' }
    $head = (& git -C $dir rev-parse HEAD).Trim()
    [IO.File]::WriteAllText((Join-Path $dir '.next\aso-built.txt'), $head + "`r`n")
    Say '  app built'; Progress 92

    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'ASO Companion.lnk'))
    $lnk.TargetPath = 'wscript.exe'
    $lnk.Arguments = '"' + (Join-Path $dir 'ASO Companion.vbs') + '"'
    $lnk.WorkingDirectory = $dir
    $lnk.IconLocation = (Join-Path $dir 'public\aso-logo.ico')
    $lnk.Description = 'ASO Companion'
    $lnk.Save()
    Say '  Desktop icon made'; Progress 100
    Say ''
    Say 'All done. ASO Companion opens now.'
    Start-Process 'wscript.exe' ('"' + (Join-Path $dir 'ASO Companion.vbs') + '"')
    Start-Sleep -Seconds 3
    $form.Close()
  } catch {
    Say ''
    Say ('Something went wrong: ' + $_.Exception.Message)
    $btn.Text = 'Try again'; $btn.Enabled = $true; $tok.Enabled = $true
  }
})

[void]$form.ShowDialog()
