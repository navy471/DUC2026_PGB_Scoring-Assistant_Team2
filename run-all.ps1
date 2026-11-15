$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

# Database ដំណើរការលើ Cloud (Supabase) មិនចាំបាច់បើក Docker ទៀតទេ
# Set-Location $rootDir
# docker-compose up -d

# Check if npm is available in PATH
$hasNpm = [bool](Get-Command npm -ErrorAction SilentlyContinue)

if ($hasNpm) {
    $backendCmd = "npm run start:dev"
    $frontendCmd = "npm run dev"
} else {
    Write-Host "[INFO] 'npm' command not found in PATH. Using local node_modules binaries..." -ForegroundColor Yellow
    $backendCmd = ".\node_modules\.bin\nest.cmd start --watch"
    $frontendCmd = ".\node_modules\.bin\vite.cmd"
}

echo "Starting Backend on Port 3001..."
Start-Process powershell -WorkingDirectory "$rootDir\backend" -ArgumentList "-NoExit", "-Command", $backendCmd

echo "Starting Frontend on Port 5173..."
Start-Process powershell -WorkingDirectory "$rootDir\frontend" -ArgumentList "-NoExit", "-Command", $frontendCmd
