param(
    [string]$AppDir = "$(Get-Location)"
)

$url = "https://nodejs.org/dist/latest/win-x64/node.exe"
$output = Join-Path $AppDir "node.exe"

Write-Host "Downloading node.exe to: $output"

try {
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "Node.js downloaded successfully"
    exit 0
} catch {
    Write-Host "Node.js download failed: $_"
    exit 1
}
