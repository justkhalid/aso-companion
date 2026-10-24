/* Removes the app from this computer (server only, director's computer only).
   The server cannot delete the folder it runs from, so it writes a small script to the temp folder, starts it detached and exits;
   the script closes what is still running, copies the data to the Desktop if asked, removes the Desktop icon and deletes the folder. */
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** null when the folder is safe to remove, otherwise the reason it is not */
export function checkAppDir(dir: string): string | null {
  const here = (f: string) => existsSync(path.join(dir, f))
  if (!here('package.json') || !here('ASO Companion.vbs') || !here('LOCAL.md')) return 'This folder does not look like the ASO Companion app.'
  const resolved = path.resolve(dir)
  if (resolved === path.parse(resolved).root || resolved === os.homedir() || path.basename(resolved).length < 3) return 'This folder is too broad to remove.'
  return null
}

const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`
const ps = (s: string) => `'${s.replace(/'/g, "''")}'`

export function windowsScript(dir: string, backup: boolean): string {
  return `$ErrorActionPreference = 'SilentlyContinue'
$dir = ${ps(dir)}
Start-Sleep -Seconds 2
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*ASO-Tray.ps1*' -or $_.CommandLine -like '*ASO-Splash.ps1*' -or $_.CommandLine -like '*Run-ASO-Hidden*' -or $_.CommandLine -like '*ASO Companion.vbs*' -or $_.CommandLine -like '*node_modules\\next*' -or ($_.ExecutablePath -and $_.ExecutablePath -like ($dir + '\\*')) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
$desk = [Environment]::GetFolderPath('Desktop')
${backup ? `if (Test-Path (Join-Path $dir 'data')) { Copy-Item (Join-Path $dir 'data') (Join-Path $desk ('ASO Companion data ' + (Get-Date -Format 'yyyy-MM-dd'))) -Recurse -Force }` : ''}
Remove-Item (Join-Path $desk 'ASO Companion.lnk') -Force
Remove-Item (Join-Path $env:USERPROFILE 'Desktop\\ASO Companion.lnk') -Force
for ($i = 0; $i -lt 20; $i++) {
  Remove-Item $dir -Recurse -Force
  if (-not (Test-Path $dir)) { break }
  Start-Sleep -Seconds 2
}
Remove-Item $PSCommandPath -Force
`
}

export function unixScript(dir: string, backup: boolean): string {
  return `#!/bin/sh
DIR=${sq(dir)}
sleep 2
pkill -f "$DIR/" >/dev/null 2>&1
sleep 1
DESK="$HOME/Desktop"
${backup ? `[ -d "$DIR/data" ] && cp -R "$DIR/data" "$DESK/ASO Companion data $(date +%Y-%m-%d)"` : ''}
rm -rf "$DESK/ASO Companion" "$DESK/ASO Companion.app" "$DESK/ASO Companion alias"
i=0
while [ $i -lt 20 ]; do
  rm -rf "$DIR"
  [ -e "$DIR" ] || break
  i=$((i + 1)); sleep 2
done
rm -f "$0"
`
}

/** writes the script and starts it detached; with dry set it only writes it and returns the path */
export function startUninstall(dir: string, backup: boolean, dry = false): { ok: boolean; msg: string; script?: string } {
  const bad = checkAppDir(dir)
  if (bad) return { ok: false, msg: bad }
  const win = process.platform === 'win32'
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'aso-uninstall-')), win ? 'uninstall.ps1' : 'uninstall.sh')
  writeFileSync(file, win ? '﻿' + windowsScript(dir, backup) : unixScript(dir, backup), { mode: 0o700 })
  if (dry) return { ok: true, msg: 'Script written.', script: file }
  const child = win
    ? spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', file], { detached: true, stdio: 'ignore', windowsHide: true, cwd: os.tmpdir() })
    : spawn('/bin/sh', [file], { detached: true, stdio: 'ignore', cwd: os.tmpdir() })
  child.unref()
  return { ok: true, msg: 'Removing the app.' }
}
