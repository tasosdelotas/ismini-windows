' launch-hidden.vbs — starts ismini server completely hidden (no window at all)
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
logFile = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\ismini.log"

' 0 = hidden window, False = don't wait
WshShell.Run "cmd /c node """ & scriptDir & "\web.js"" > """ & logFile & """ 2>&1", 0, False
