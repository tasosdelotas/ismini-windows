$app = [regex]::Escape($PSScriptRoot)

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'web\.js' -and $_.CommandLine -match $app } |
    ForEach-Object {
        & taskkill.exe /T /F /PID $_.ProcessId *> $null
    }
