# Run this script to create the scope3_portal database
# Usage: .\setup-db.ps1
# It will prompt for your MySQL root password.

$mysql = "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"

Write-Host "Creating scope3_portal database..." -ForegroundColor Cyan

$sql = @"
CREATE DATABASE IF NOT EXISTS scope3_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES LIKE 'scope3_portal';
"@

& $mysql -u root -p -e $sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database created successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to create database. Check your password and try again." -ForegroundColor Red
}
