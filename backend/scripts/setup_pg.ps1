# Sets up a local, user-space PostgreSQL 16 cluster (no admin rights needed).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup_pg.ps1
$ErrorActionPreference = "Stop"

$zip      = "C:\Users\prith\AppData\Local\Temp\opencode\pg16.zip"
$pgRoot   = "C:\Users\prith\pgsql-16"
$dataDir  = "$pgRoot\data"
$port     = 5432
$dbUser   = "postgres"
$dbPass   = "postgres"

if (-not (Test-Path "$pgRoot\bin\psql.exe")) {
    Write-Output "[pg] extracting binaries to $pgRoot ..."
    $stage = "$env:TEMP\pg_extract"
    if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
    if (Test-Path $pgRoot) { Remove-Item $pgRoot -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $stage -Force
    # archive contains a single top-level folder -> move its contents up
    $inner = Get-ChildItem $stage -Directory | Select-Object -First 1
    if ($inner) { Move-Item $inner.FullName $pgRoot } else { Move-Item $stage $pgRoot }
    Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}

$initdb = "$pgRoot\bin\initdb.exe"
$pgctl  = "$pgRoot\bin\pg_ctl.exe"
$psql   = "$pgRoot\bin\psql.exe"

if (-not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Output "[pg] initialising cluster at $dataDir ..."
    $pwfile = "$env:TEMP\pgpw.txt"
    Set-Content -Path $pwfile -Value $dbPass -NoNewline
    & $initdb -U $dbUser -D $dataDir -A password --pwfile=$pwfile -E UTF8
    Remove-Item $pwfile
}

Write-Output "[pg] starting server on port $port ..."
& $pgctl -D $dataDir -l "$pgRoot\pg.log" -o "-p $port -c listen_addresses=localhost" start | Out-Null
Start-Sleep -Seconds 2

# create the application database if missing
$exists = & $psql -U $dbUser -p $port -tAc "SELECT 1 FROM pg_database WHERE datname='apaar_setu'"
if ($exists -ne "1") {
    Write-Output "[pg] creating database apaar_setu ..."
    & $psql -U $dbUser -p $port -c "CREATE DATABASE apaar_setu"
}

& $psql -U $dbUser -p $port -tAc "SELECT version()"
Write-Output "[pg] ready: postgresql://$dbUser`:$dbPass@localhost:$port/apaar_setu"
