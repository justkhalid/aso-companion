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
$blue = [System.Drawing.Color]::FromArgb(26, 86, 255)
$ink = [System.Drawing.Color]::FromArgb(22, 28, 52)
$mute = [System.Drawing.Color]::FromArgb(110, 118, 146)
$line = [System.Drawing.Color]::FromArgb(222, 226, 238)
$tick = [string][char]0x2713; $dot = [string][char]0x25CF; $ring = [string][char]0x25CB; $cross = [string][char]0x2715

function Round($c, [int]$r) {
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $w = $c.Width; $h = $c.Height
  $gp.AddArc(0, 0, $r, $r, 180, 90); $gp.AddArc($w - $r, 0, $r, $r, 270, 90)
  $gp.AddArc($w - $r, $h - $r, $r, $r, 0, 90); $gp.AddArc(0, $h - $r, $r, $r, 90, 90)
  $gp.CloseFigure()
  $c.Region = New-Object System.Drawing.Region($gp)
}
function Label($text, $x, $y, $w, $h, $font, $color) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $text; $l.Location = New-Object System.Drawing.Point($x, $y); $l.Size = New-Object System.Drawing.Size($w, $h)
  $l.Font = $font; $l.ForeColor = $color; $l.BackColor = [System.Drawing.Color]::Transparent
  return $l
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'ASO Companion setup'
$form.ClientSize = New-Object System.Drawing.Size(560, 640)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

# the blue band at the top, the same blue as the app
$head = New-Object System.Windows.Forms.Panel
$head.Location = New-Object System.Drawing.Point(0, 0); $head.Size = New-Object System.Drawing.Size(560, 116)
$head.Add_Paint({
  param($sender, $e)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $sender.Width, $sender.Height)
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(14, 64, 214), [System.Drawing.Color]::FromArgb(42, 156, 240), 20.0)
  $e.Graphics.FillRectangle($br, $rect)
  $br.Dispose()
})
$form.Controls.Add($head)
$t1 = Label 'ASO Companion' 30 24 500 44 (New-Object System.Drawing.Font('Georgia', 24, [System.Drawing.FontStyle]::Bold)) ([System.Drawing.Color]::White)
$head.Controls.Add($t1)
$t2 = Label 'American Space Oujda  -  setup on this computer' 32 74 500 24 (New-Object System.Drawing.Font('Segoe UI', 10)) ([System.Drawing.Color]::FromArgb(214, 230, 255))
$head.Controls.Add($t2)

$sub = Label 'Paste the GitHub token and press Install. Everything else is done for you, in about 5 to 10 minutes.' 30 134 500 44 (New-Object System.Drawing.Font('Segoe UI', 10)) $mute
$form.Controls.Add($sub)

$lab = Label 'GITHUB TOKEN' 30 186 300 20 (New-Object System.Drawing.Font('Segoe UI Semibold', 8.5)) $mute
$form.Controls.Add($lab)

$box = New-Object System.Windows.Forms.Panel
$box.Location = New-Object System.Drawing.Point(30, 208); $box.Size = New-Object System.Drawing.Size(500, 42); $box.BackColor = $line
$form.Controls.Add($box); Round $box 12
$inner = New-Object System.Windows.Forms.Panel
$inner.Location = New-Object System.Drawing.Point(1, 1); $inner.Size = New-Object System.Drawing.Size(498, 40); $inner.BackColor = [System.Drawing.Color]::White
$box.Controls.Add($inner); Round $inner 11
$tok = New-Object System.Windows.Forms.TextBox
$tok.BorderStyle = 'None'; $tok.Font = New-Object System.Drawing.Font('Segoe UI', 11); $tok.ForeColor = $ink
$tok.Location = New-Object System.Drawing.Point(14, 9); $tok.Size = New-Object System.Drawing.Size(470, 24)
$inner.Controls.Add($tok)

$btn = New-Object System.Windows.Forms.Button
$btn.Text = 'Install'
$btn.Location = New-Object System.Drawing.Point(30, 266); $btn.Size = New-Object System.Drawing.Size(500, 48)
$btn.BackColor = $blue; $btn.ForeColor = [System.Drawing.Color]::White
$btn.FlatStyle = 'Flat'; $btn.FlatAppearance.BorderSize = 0
$btn.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(14, 64, 214)
$btn.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 12)
$btn.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btn); Round $btn 14

# the progress bar: a thin track with a blue fill
$track = New-Object System.Windows.Forms.Panel
$track.Location = New-Object System.Drawing.Point(30, 334); $track.Size = New-Object System.Drawing.Size(500, 6); $track.BackColor = [System.Drawing.Color]::FromArgb(232, 236, 246)
$form.Controls.Add($track); Round $track 6
$fill = New-Object System.Windows.Forms.Panel
$fill.Location = New-Object System.Drawing.Point(0, 0); $fill.Size = New-Object System.Drawing.Size(1, 6); $fill.BackColor = $blue
$track.Controls.Add($fill)

# the stages, one line each
$names = @('Check the token', 'Install Node.js', 'Install Git', 'Download the app', 'Install the app parts', 'Build the app', 'Put the icon on the Desktop')
$marks = @(); $texts = @()
for ($i = 0; $i -lt $names.Count; $i++) {
  $y = 360 + $i * 31
  $m = Label $ring 30 $y 26 26 (New-Object System.Drawing.Font('Segoe UI Symbol', 11)) ([System.Drawing.Color]::FromArgb(176, 183, 206))
  $x = Label $names[$i] 60 ($y + 1) 460 26 (New-Object System.Drawing.Font('Segoe UI', 10.5)) $mute
  $form.Controls.Add($m); $form.Controls.Add($x)
  $marks += $m; $texts += $x
}
$script:cur = -1
function Mark([int]$i, [string]$state) {
  $m = $marks[$i]; $x = $texts[$i]
  if ($state -eq 'active') { $script:cur = $i; $m.Text = $dot; $m.ForeColor = $blue; $x.ForeColor = $ink; $x.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 10.5) }
  elseif ($state -eq 'done') { $m.Text = $tick; $m.ForeColor = [System.Drawing.Color]::FromArgb(22, 163, 74); $x.ForeColor = $ink; $x.Font = New-Object System.Drawing.Font('Segoe UI', 10.5) }
  else { $m.Text = $cross; $m.ForeColor = [System.Drawing.Color]::FromArgb(220, 38, 38); $x.ForeColor = [System.Drawing.Color]::FromArgb(220, 38, 38) }
  [System.Windows.Forms.Application]::DoEvents()
}

# one line under the stages: what is happening now, or what went wrong
$steps = Label '' 30 586 500 48 (New-Object System.Drawing.Font('Segoe UI', 9.5)) $mute

$form.Controls.Add($steps)

function Say([string]$t) {
  if ($t.Trim()) { $steps.Text = $t.Trim() }
  Add-Content -Path $log -Value $t
  [System.Windows.Forms.Application]::DoEvents()
}
function Progress([int]$v) {
  $w = [int](500 * [Math]::Min(100, $v) / 100)
  if ($w -lt 6) { $w = 6 }
  $fill.Width = $w; Round $fill 6
  [System.Windows.Forms.Application]::DoEvents()
}

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
  for ($k = 0; $k -lt $marks.Count; $k++) { $marks[$k].Text = $ring; $marks[$k].ForeColor = [System.Drawing.Color]::FromArgb(176, 183, 206); $texts[$k].ForeColor = $mute; $texts[$k].Font = New-Object System.Drawing.Font('Segoe UI', 10.5) }
  $script:cur = -1; Progress 0; $steps.Text = ''
  try {
    if (-not $token) { throw 'Paste the GitHub token first.' }
    Progress 3
    Mark 0 'active'; Say 'Checking the token...'
    try {
      [void](Invoke-RestMethod "https://api.github.com/repos/$repo" -Headers @{ Authorization = "Bearer $token"; 'User-Agent' = 'aso-setup' })
    } catch { throw 'GitHub did not accept this token. Check that it is copied completely.' }
    Mark 0 'done'; Say 'Token accepted.'; Progress 8

    Refresh-Path
    Mark 1 'active'
    if (-not (Have 'node')) { Say 'Installing Node.js. Windows may ask you to allow it.'; Install-Node }
    Mark 1 'done'; Progress 25
    Mark 2 'active'
    if (-not (Have 'git')) { Say 'Installing Git. Windows may ask you to allow it.'; Install-Git }
    Mark 2 'done'; Progress 38

    $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
    $auth = "-c credential.helper= -c `"http.https://github.com/.extraheader=AUTHORIZATION: basic $b64`""
    Mark 3 'active'
    if (Test-Path (Join-Path $dir '.git')) {
      Say 'Updating the app...'
      $c = Run-Wait 'git' "$auth pull --ff-only origin main" $dir
    } else {
      Say 'Downloading the app...'
      $c = Run-Wait 'git' "$auth clone https://github.com/$repo.git `"$dir`"" $env:USERPROFILE
    }
    if ($c -ne 0) { throw 'The app could not be downloaded. Check that the token is allowed to read the repository.' }
    Mark 3 'done'; Progress 50

    $envFile = Join-Path $dir '.env.local'
    if (-not (Test-Path $envFile)) {
      $secret = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
      $text = "ASO_LOCAL=1`r`nASO_SESSION_SECRET=$secret`r`nGITHUB_PAT=$token`r`nGITHUB_REPO=$repo`r`nGITHUB_BRANCH=main`r`nMETA_APP_ID=`r`nMETA_APP_SECRET=`r`n"
      [IO.File]::WriteAllText($envFile, $text, (New-Object Text.UTF8Encoding($false)))
      Say 'Settings file written.'
    }

    Mark 4 'active'; Say 'Installing the app parts. This takes a few minutes.'
    $c = Run-Wait 'cmd.exe' ('/c npm install --no-audit --no-fund >> "' + $log + '" 2>&1') $dir
    if ($c -ne 0) { throw 'The app parts could not be installed. The reason is in the file aso-setup.log in your Temp folder.' }
    Mark 4 'done'; Progress 75
    Mark 5 'active'; Say 'Building the app. This takes a few minutes.'
    $c = Run-Wait 'cmd.exe' ('/c npx next build >> "' + $log + '" 2>&1') $dir
    if ($c -ne 0) { throw 'The app could not be built. The reason is in the file aso-setup.log in your Temp folder.' }
    $head = (& git -C $dir rev-parse HEAD).Trim()
    [IO.File]::WriteAllText((Join-Path $dir '.next\aso-built.txt'), $head + "`r`n")
    Mark 5 'done'; Progress 92
    Mark 6 'active'

    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'ASO Companion.lnk'))
    $lnk.TargetPath = 'wscript.exe'
    $lnk.Arguments = '"' + (Join-Path $dir 'ASO Companion.vbs') + '"'
    $lnk.WorkingDirectory = $dir
    $lnk.IconLocation = (Join-Path $dir 'public\aso-logo.ico')
    $lnk.Description = 'ASO Companion'
    $lnk.Save()
    Mark 6 'done'; Progress 100
    Say 'All done. ASO Companion opens now.'
    Start-Process 'wscript.exe' ('"' + (Join-Path $dir 'ASO Companion.vbs') + '"')
    Start-Sleep -Seconds 3
    $form.Close()
  } catch {
    if ($script:cur -ge 0) { Mark $script:cur 'fail' }
    Say ('Something went wrong: ' + $_.Exception.Message)
    $btn.Text = 'Try again'; $btn.Enabled = $true; $tok.Enabled = $true
  }
})

[void]$form.ShowDialog()
