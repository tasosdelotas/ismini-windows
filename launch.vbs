' launch.vbs — desktop launcher: runs ismini completely hidden (no terminal window)
' Point your desktop shortcut to THIS file instead of ismini.bat
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c """ & scriptDir & "\ismini.bat""", 0, False
