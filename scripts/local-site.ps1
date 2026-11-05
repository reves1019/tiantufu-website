param([ValidateSet('start', 'stop')][string]$Action = 'start', [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stateRoot = Join-Path $projectRoot '.local-server'
$pidFile = Join-Path $stateRoot 'server.json'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$siteUrl = 'http://127.0.0.1:5173/'

function Get-OwnedServer {
    if (-not (Test-Path -LiteralPath $pidFile)) { return $null }
    $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$saved.processId)"
    if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine.Contains($vitePath) -and $process.CreationDate.ToUniversalTime().ToString('o') -eq $saved.createdAt) {
        return $process
    }
    return $null
}

$owned = Get-OwnedServer
if ($Action -eq 'stop') {
    if ($owned) {
        Stop-Process -Id $owned.ProcessId
        Write-Host 'Tiantufu local server stopped. Browser edits are preserved.'
    } else { Write-Host 'No server owned by this project is running.' }
    if (Test-Path -LiteralPath $pidFile) { Remove-Item -LiteralPath $pidFile }
    exit 0
}

if (-not $owned) {
    if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Dependencies are missing. Install them with pnpm install --frozen-lockfile first.' }
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodePath = $nodeCommand.Source }
    else { $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js was not found. Install Node.js 24 or restore the Codex runtime.' }
    New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
    $server = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $vitePath + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateRoot 'stdout.log') -RedirectStandardError (Join-Path $stateRoot 'stderr.log') -PassThru
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($server.Id)"
    if (-not $process) { throw 'The server exited before startup. Check .local-server logs.' }
    @{ processId = $server.Id; createdAt = $process.CreationDate.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 500
        $server.Refresh()
        if ($server.HasExited) { throw 'The server could not start. Port 5173 may be occupied. Check .local-server/stderr.log; no other process was stopped.' }
        try {
            $response = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200 -and $response.Content.Contains('/src/main.tsx')) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) { throw 'Startup timed out. Inspect .local-server logs and retry.' }
}
Write-Host "Tiantufu local editor: $siteUrl"
if (-not $NoBrowser) { Start-Process $siteUrl }
