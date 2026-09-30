#define AppName "Ismini Agent"
#define AppVersion "6.0.4"

[Setup]
AppName={#AppName}
AppVersion={#AppVersion}
WizardStyle=modern
DefaultDirName={%USERPROFILE}\Ismini
DefaultGroupName=Ismini
PrivilegesRequired=lowest
OutputBaseFilename=ismini-installer-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
SetupIconFile=icons\ismini-installer.ico
UninstallDisplayName={#AppName}
CreateUninstallRegKey=yes

[Files]
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "web.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "agent.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "sessions.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "memory.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "image-input.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
Source: "stop-ismini.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "2.jpeg"; DestDir: "{app}"; Flags: ignoreversion
Source: "ismini.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "ismini.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "launch-hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "launch.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall.bat"; DestDir: "{app}"; Flags: ignoreversion
; Node.js is NOT bundled. ismini requires Node.js on the system PATH.
; (LM Studio ships its own Node.js — ismini uses that or the user's system Node.)
Source: "web\*"; DestDir: "{app}\web"; Flags: recursesubdirs ignoreversion
Source: "tools\*"; DestDir: "{app}\tools"; Flags: recursesubdirs ignoreversion

Source: "icons\*"; DestDir: "{app}\icons"; Flags: recursesubdirs ignoreversion
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "CHANGELOG.md"; DestDir: "{app}"; Flags: ignoreversion

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-ismini.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "StopIsmini"

[UninstallDelete]
Type: files; Name: "{app}\sessions.json"
Type: files; Name: "{app}\sessions.json.tmp"
Type: files; Name: "{app}\sessions.json.corrupt-*"
Type: files; Name: "{app}\memory.json"
Type: files; Name: "{app}\memory.json.tmp"
Type: files; Name: "{app}\memory.json.corrupt-*"

[Icons]
Name: "{userdesktop}\Ismini Agent"; Filename: "{app}\ismini.bat"; IconFilename: "{app}\icons\ismini48.ico"
Name: "{group}\Ismini Agent"; Filename: "{app}\ismini.bat"
Name: "{group}\Uninstall Ismini"; Filename: "{uninstallexe}"
Name: "{group}\README"; Filename: "{app}\README.md"
Name: "{group}\Changelog"; Filename: "{app}\CHANGELOG.md"

[Registry]
Root: HKCU; Subkey: "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#AppName}"; Flags: uninsdeletekey

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  StopScript, PowerShell: String;
  ResultCode: Integer;
begin
  Result := '';
  StopScript := ExpandConstant('{app}\stop-ismini.ps1');
  if FileExists(StopScript) then
  begin
    PowerShell := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
    if not Exec(PowerShell, '-NoProfile -ExecutionPolicy Bypass -File "' + StopScript + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      Result := 'Could not start the Ismini shutdown helper. Close Ismini and try again.'
    else if ResultCode <> 0 then
      Result := 'Could not stop the running Ismini server. Close Ismini and try again.';
  end;
end;
