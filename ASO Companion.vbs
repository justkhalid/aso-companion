Option Explicit
' ASO Companion: double-click this file (or the desktop icon it makes). No black window.
Dim sh, fso, here, desk, lnk, tries, edge, chrome

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here

Function Up()
  Dim h
  On Error Resume Next
  Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  h.setTimeouts 1500, 1500, 1500, 1500
  h.open "GET", "http://localhost:3000/api/session", False
  h.send
  Up = (Err.Number = 0 And h.Status = 200)
  On Error GoTo 0
End Function

If Not Up() Then
  If sh.Run("cmd /c where node >nul 2>nul", 0, True) <> 0 Then
    MsgBox "Node.js is not installed on this computer." & vbCrLf & "The download page opens now. Install the LTS version, then open ASO Companion again.", 48, "ASO Companion"
    sh.Run "https://nodejs.org/en/download"
    WScript.Quit
  End If

  If Not fso.FileExists(here & "\.env.local") Then
    MsgBox "The settings of this computer are missing. Run the ASO Companion setup file again.", 48, "ASO Companion"
    WScript.Quit
  End If

  If fso.FileExists(here & "\aso-failed.txt") Then fso.DeleteFile here & "\aso-failed.txt"
  sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & here & "\ASO-Splash.ps1""", 0, False
  sh.Run "cmd /c """ & here & "\Run-ASO-Hidden.bat""", 0, False

  tries = 0
  Do While Not Up()
    WScript.Sleep 3000
    tries = tries + 1
    If fso.FileExists(here & "\aso-failed.txt") Then
      MsgBox "The app could not start. The reason is written in the file aso.log in the app folder. Send it to the developer.", 16, "ASO Companion"
      WScript.Quit
    End If
    If tries > 600 Then
      MsgBox "The app is taking too long to start. Check the file aso.log in the app folder.", 16, "ASO Companion"
      WScript.Quit
    End If
  Loop
End If

' the desktop icon, made once
desk = sh.SpecialFolders("Desktop")
If Not fso.FileExists(desk & "\ASO Companion.lnk") Then
  Set lnk = sh.CreateShortcut(desk & "\ASO Companion.lnk")
  lnk.TargetPath = "wscript.exe"
  lnk.Arguments = Chr(34) & here & "\ASO Companion.vbs" & Chr(34)
  lnk.WorkingDirectory = here
  lnk.IconLocation = here & "\public\aso-logo.ico"
  lnk.Description = "ASO Companion"
  lnk.Save
End If

' the icon next to the clock (Open / Quit); a second start does nothing
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & here & "\ASO-Tray.ps1""", 0, False

' open it in its own window (Edge or Chrome without the browser bars), else in the normal browser
edge = ""
chrome = ""
On Error Resume Next
edge = sh.RegRead("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe\")
chrome = sh.RegRead("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
On Error GoTo 0
If edge <> "" Then
  sh.Run """" & edge & """ --app=http://localhost:3000/admin", 1, False
ElseIf chrome <> "" Then
  sh.Run """" & chrome & """ --app=http://localhost:3000/admin", 1, False
Else
  sh.Run "http://localhost:3000/admin"
End If
