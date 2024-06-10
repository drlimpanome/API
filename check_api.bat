@echo off
set APPDIR=C:\positivonacional
set URL=http://localhost:3000/

PowerShell -Command "& {$response = Invoke-WebRequest -Uri '%URL%' -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue; if (-not $response -or $response.StatusCode -ne 200) {Write-Output 'API is not running or Nginx is not responding, starting Node.js...'; cd '%APPDIR%'; Start-Process 'node' -ArgumentList 'index.js';} else {Write-Output 'API and Nginx are running fine.';}}"
