# ASO Companion: the small loading box shown while the app starts. Closes by itself when the app is ready.
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$logo = [System.Drawing.Image]::FromFile((Join-Path $here 'public\aso-logo.png'))
$W = 340; $H = 300

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size($W, $H)
$form.ShowInTaskbar = $false
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(14, 18, 36)
$form.DoubleBuffered = $true

function Round-Path($w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc(0, 0, $d, $d, 180, 90)
  $p.AddArc($w - $d, 0, $d, $d, 270, 90)
  $p.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
  $p.AddArc(0, $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}
$form.Region = New-Object System.Drawing.Region((Round-Path $W $H 22))

$script:t = 0.0
$form.add_Paint({
  param($s, $e)
  $g = $e.Graphics
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.TextRenderingHint = 'ClearTypeGridFit'
  # soft glow behind the logo
  $glow = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glow.AddEllipse(($W / 2) - 110, 10, 220, 220)
  $pg = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
  $pg.CenterColor = [System.Drawing.Color]::FromArgb(70, 70, 90, 200)
  $pg.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 70, 90, 200))
  $g.FillPath($pg, $glow)
  # logo with a slow breathing size
  $k = 1.0 + 0.035 * [Math]::Sin($script:t * 2.2)
  $sz = 104 * $k
  $g.DrawImage($logo, [single](($W - $sz) / 2), [single](42 + (104 - $sz) / 2), [single]$sz, [single]$sz)
  # name
  $f1 = New-Object System.Drawing.Font('Segoe UI Semibold', 15)
  $f2 = New-Object System.Drawing.Font('Segoe UI', 9)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $g.DrawString('ASO Companion', $f1, [System.Drawing.Brushes]::White, [single]($W / 2), 170, $sf)
  $g.DrawString('Getting ready...', $f2, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 160, 190))), [single]($W / 2), 200, $sf)
  # loading bar
  $bx = 70; $bw = $W - 140; $by = 242; $bh = 5
  $track = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
  $g.FillPath($track, (Rect-Path $bx $by $bw $bh))
  $seg = $bw * 0.38
  $pos = (($script:t * 0.55) % 1.0) * ($bw + $seg) - $seg
  $x0 = [Math]::Max(0, $pos); $x1 = [Math]::Min($bw, $pos + $seg)
  if ($x1 -gt $x0) {
    $r = New-Object System.Drawing.RectangleF([single]($bx + $x0), [single]$by, [single]($x1 - $x0), [single]$bh)
    $lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($r, [System.Drawing.Color]::FromArgb(110, 130, 255), [System.Drawing.Color]::FromArgb(150, 210, 255), 0.0)
    $g.FillPath($lg, (Rect-Path ($bx + $x0) $by ($x1 - $x0) $bh))
  }
})

function Rect-Path($x, $y, $w, $h) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $h
  if ($w -lt $d) { $p.AddRectangle((New-Object System.Drawing.RectangleF([single]$x, [single]$y, [single]$w, [single]$h))); return $p }
  $p.AddArc([single]$x, [single]$y, [single]$d, [single]$d, 90, 180)
  $p.AddArc([single]($x + $w - $d), [single]$y, [single]$d, [single]$d, 270, 180)
  $p.CloseFigure()
  return $p
}

function Server-Up {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $iar = $c.BeginConnect('127.0.0.1', 3000, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(150) -and $c.Connected
    $c.Close()
    return $ok
  } catch { return $false }
}

$started = Get-Date
$script:n = 0
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 33
$timer.add_Tick({
  $script:t += 0.033
  $script:n++
  $form.Invalidate()
  if ($script:n % 30 -eq 0) {
    $age = ((Get-Date) - $started).TotalSeconds
    if ((Server-Up) -or (Test-Path (Join-Path $here 'aso-failed.txt')) -or $age -gt 1800) {
      $timer.Stop(); $form.Close()
    }
  }
})
$timer.Start()
[System.Windows.Forms.Application]::Run($form)
