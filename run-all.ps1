$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

echo "Starting Smart Grade Entry Database..."
Set-Location $rootDir
docker-compose up -d

echo "Starting Backend..."
Start-Process powershell -WorkingDirectory "$rootDir\backend" -ArgumentList "-NoExit", "-Command", "npm run start:dev"

echo "Starting Frontend..."
Start-Process powershell -WorkingDirectory "$rootDir\frontend" -ArgumentList "-NoExit", "-Command", "npm run dev"
