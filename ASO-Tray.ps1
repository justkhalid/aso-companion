# ASO Companion: the icon next to the clock. Right-click it to open or quit the app. Started by "ASO Companion.vbs".
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'Global\ASOCompanionTray', [ref]$created)
if (-not $created) { exit }
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = 'http://localhost:3000/admin'

function Open-App {
  $key = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\'
  $edge = (Get-ItemProperty ($key + 'msedge.exe')).'(default)'
  $chrome = (Get-ItemProperty ($key + 'chrome.exe')).'(default)'
  if ($edge) { Start-Process $edge "--app=$url" }
  elseif ($chrome) { Start-Process $chrome "--app=$url" }
  else { Start-Process $url }
}

$ni = New-Object System.Windows.Forms.NotifyIcon
$ni.Icon = New-Object System.Drawing.Icon((Join-Path $here 'public\aso-logo.ico'))
$ni.Text = 'ASO Companion'
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$open = $menu.Items.Add('Open ASO Companion')
$open.add_Click({ Open-App })
$quit = $menu.Items.Add('Quit ASO Companion')
$quit.add_Click({
  $ni.Visible = $false
  try { Invoke-WebRequest -Method Post -Uri 'http://localhost:3000/api/quit' -UseBasicParsing -TimeoutSec 5 | Out-Null } catch {}
  Get-Process -Name 'ASO Companion' | Stop-Process -Force
  [System.Windows.Forms.Application]::Exit()
})
$ni.ContextMenuStrip = $menu
$ni.add_DoubleClick({ Open-App })
$ni.Visible = $true

# the icon goes away by itself once the app is gone (a rebuild after an update can take a few minutes, so it waits)
$script:misses = 0
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 15000
$timer.add_Tick({
  try { Invoke-WebRequest -Uri 'http://localhost:3000/api/session' -UseBasicParsing -TimeoutSec 4 | Out-Null; $script:misses = 0 }
  catch { $script:misses++; if ($script:misses -ge 40) { $ni.Visible = $false; [System.Windows.Forms.Application]::Exit() } }
})
$timer.Start()
[System.Windows.Forms.Application]::Run()
$ni.Dispose()
