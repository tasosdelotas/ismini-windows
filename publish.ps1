$ErrorActionPreference = "Stop"

function Invoke-Git {
    param([string[]]$GitArgs)

    $result = & git -C $repoRoot @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($GitArgs -join ' ')"
    }
    return $result
}

function Stop-Publishing {
    param([string]$Message)

    Write-Host ""
    Write-Host $Message -ForegroundColor Red
    exit 1
}

$repoRoot = $PSScriptRoot
$issPath = Join-Path $repoRoot "ismini.iss"
$packagePath = Join-Path $repoRoot "package.json"

try {
    foreach ($command in @("git", "gh")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is required but was not found on PATH."
        }
    }

    & gh auth status *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub CLI is not signed in. Run: gh auth login"
    }

    $remoteUrl = (Invoke-Git @("remote", "get-url", "origin") | Select-Object -First 1).Trim()
    if ($remoteUrl -notmatch "github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$") {
        throw "Could not identify a GitHub owner/repository from origin: $remoteUrl"
    }
    $repository = $Matches[1]
    $repository = $repository -replace "\.git$", ""

    $branch = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1).Trim()
    if (-not $branch) {
        throw "You are not on a branch. Check out the main branch before publishing."
    }

    $defaultBranchLine = & git -C $repoRoot symbolic-ref --quiet --short refs/remotes/origin/HEAD
    if ($LASTEXITCODE -eq 0) {
        $defaultBranch = ($defaultBranchLine | Select-Object -First 1) -replace "^origin/", ""
    } else {
        $defaultBranch = ""
    }
    if (-not $defaultBranch) {
        $defaultBranch = "main"
    }
    if ($branch -ne $defaultBranch) {
        throw "You are on '$branch'. Switch to '$defaultBranch' before publishing a release."
    }

    $packageText = [System.IO.File]::ReadAllText($packagePath)
    $package = $packageText | ConvertFrom-Json
    $issText = [System.IO.File]::ReadAllText($issPath)
    $issVersionMatch = [regex]::Match($issText, '(?m)^#define AppVersion "([^"]+)"\s*$')
    if (-not $issVersionMatch.Success -or -not $package.version) {
        throw "Could not read the app version from package.json and ismini.iss."
    }
    $currentVersion = [string]$package.version
    if ($issVersionMatch.Groups[1].Value -ne $currentVersion) {
        throw "The version in package.json and ismini.iss do not match."
    }

    Write-Host "Publishing $repository from branch '$branch'."
    Write-Host "Current version: $currentVersion"
    $version = (Read-Host "New version (for example, 4.0.1)").Trim()
    if ($version -notmatch '^\d+\.\d+\.\d+$') {
        throw "Enter a version in major.minor.patch format, such as 4.0.1."
    }
    if ([version]$version -le [version]$currentVersion) {
        throw "The new version must be greater than $currentVersion."
    }

    $tag = "v$version"
    $localTag = & git -C $repoRoot show-ref --verify --quiet "refs/tags/$tag"
    if ($LASTEXITCODE -eq 0) {
        throw "The local tag $tag already exists."
    }
    $remoteTag = & git -C $repoRoot ls-remote --tags origin "refs/tags/$tag" "refs/tags/$tag^{}"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not check GitHub for an existing tag."
    }
    if ($remoteTag) {
        throw "The GitHub tag $tag already exists."
    }

    $iscc = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue
    if ($iscc) {
        $isccPath = $iscc.Source
    } else {
        $innoLocations = @(
            (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
            (Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe")
        )
        $isccPath = $innoLocations | Where-Object { Test-Path $_ } | Select-Object -First 1
    }
    if (-not $isccPath) {
        throw "Inno Setup 6 was not found. Install it, then run this publisher again."
    }

    $packagePattern = '"version"\s*:\s*"' + [regex]::Escape($currentVersion) + '"'
    if (-not [regex]::IsMatch($packageText, $packagePattern)) {
        throw "Could not safely update package.json."
    }
    $packageText = [regex]::Replace($packageText, $packagePattern, '"version": "' + $version + '"', 1)
    $issText = [regex]::Replace(
        $issText,
        '(?m)^#define AppVersion "' + [regex]::Escape($currentVersion) + '"\s*$',
        '#define AppVersion "' + $version + '"',
        1
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($packagePath, $packageText, $utf8NoBom)
    [System.IO.File]::WriteAllText($issPath, $issText, $utf8NoBom)

    Write-Host ""
    Write-Host "Building the Windows installer..."
    Push-Location $repoRoot
    try {
        & $isccPath $issPath
        if ($LASTEXITCODE -ne 0) {
            throw "Inno Setup failed to build the installer."
        }
    } finally {
        Pop-Location
    }

    $installer = Join-Path $repoRoot "Output\ismini-installer-$version.exe"
    if (-not (Test-Path $installer)) {
        throw "The installer was not created at $installer"
    }

    Write-Host ""
    Write-Host "Files that will be committed:"
    Invoke-Git @("status", "--short")
    Write-Host ""
    Write-Host "The installer in Output\ is intentionally not committed; it will be uploaded as a release asset."
    if ((Read-Host "Commit and publish all project changes? Type YES to continue").Trim() -cne "YES") {
        throw "Cancelled. Your source changes and version update have been left in place."
    }

    $commitMessage = (Read-Host "Commit message").Trim()
    if (-not $commitMessage) {
        throw "A commit message is required."
    }

    Invoke-Git @("add", "-A")
    Invoke-Git @("commit", "-m", $commitMessage)
    Invoke-Git @("tag", "-a", $tag, "-m", "Ismini Agent $version")
    Invoke-Git @("push", "origin", "HEAD")
    Invoke-Git @("push", "origin", $tag)

    & gh release create $tag $installer --repo $repository --title "Ismini Agent $version" --generate-notes --verify-tag
    if ($LASTEXITCODE -ne 0) {
        throw "The code and tag were pushed, but GitHub could not finish creating the release. Check the repo's Releases page before retrying."
    }

    Write-Host ""
    Write-Host "Release published successfully: https://github.com/$repository/releases/tag/$tag" -ForegroundColor Green
} catch {
    Stop-Publishing $_.Exception.Message
}
