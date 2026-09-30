$ErrorActionPreference = 'Stop'
$app = [regex]::Escape($PSScriptRoot.TrimEnd('\', '/'))

function Get-IsminiProcesses {
    @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object { $_.CommandLine -match 'web\.js' -and $_.CommandLine -match $app })
}

$processes = Get-IsminiProcesses
foreach ($process in $processes) {
    & taskkill.exe /T /F /PID $process.ProcessId *> $null
    if ($LASTEXITCODE -ne 0 -and (Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue)) {
        throw "Could not stop Ismini process $($process.ProcessId)."
    }
}

$deadline = [DateTime]::UtcNow.AddSeconds(8)
do {
    $remaining = Get-IsminiProcesses
    if ($remaining.Count -eq 0) { exit 0 }
    Start-Sleep -Milliseconds 200
} while ([DateTime]::UtcNow -lt $deadline)

throw "Ismini is still running from $PSScriptRoot; close it and try again."
