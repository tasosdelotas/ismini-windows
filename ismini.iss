#define AppName "Ismini Agent"
#define AppVersion "3.0.0"

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
SetupIconFile=icons\isminix256.ico
UninstallDisplayName={#AppName}
CreateUninstallRegKey=yes

[Files]
Source: "web.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "agent.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "sessions.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "ismini.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "launch-hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "launch.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "https://nodejs.org/dist/latest/win-x64/node.exe"; DestName: "node.exe"; DestDir: "{app}"; ExternalSize: 20000000; Flags: download external ignoreversion
Source: "web\*"; DestDir: "{app}\web"; Flags: recursesubdirs ignoreversion
Source: "tools\*"; DestDir: "{app}\tools"; Flags: recursesubdirs ignoreversion

Source: "icons\*"; DestDir: "{app}\icons"; Flags: recursesubdirs ignoreversion
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\Ismini Agent"; Filename: "{app}\ismini.bat"; IconFilename: "{app}\icons\ismini48.ico"
Name: "{group}\Ismini Agent"; Filename: "{app}\ismini.bat"
Name: "{group}\Uninstall Ismini"; Filename: "{uninstallexe}"
Name: "{group}\README"; Filename: "{app}\README.md"

[Registry]
Root: HKCU; Subkey: "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#AppName}"; Flags: uninsdeletekey
