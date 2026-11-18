# Run as Administrator to allow Antigravity and agy CLI through Windows Firewall

$agyPath = "C:\Users\mark.ADS\.gemini\bin\agy.exe"
$codePath = "C:\Users\mark.ADS\AppData\Local\Programs\Microsoft VS Code\Code.exe"

Write-Host "Configuring Windows Defender Firewall rules for Antigravity..." -ForegroundColor Cyan

# 1. Antigravity CLI (agy.exe) Inbound
if (Test-Path $agyPath) {
    Remove-NetFirewallRule -DisplayName "Antigravity CLI (agy Inbound)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Antigravity CLI (agy Inbound)" `
        -Direction Inbound `
        -Program $agyPath `
        -Action Allow `
        -Profile Any `
        -Description "Allow inbound network traffic for Google Antigravity CLI daemon" | Out-Null
    Write-Host "[OK] Inbound rule created for agy.exe" -ForegroundColor Green

    Remove-NetFirewallRule -DisplayName "Antigravity CLI (agy Outbound)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Antigravity CLI (agy Outbound)" `
        -Direction Outbound `
        -Program $agyPath `
        -Action Allow `
        -Profile Any `
        -Description "Allow outbound network traffic for Google Antigravity CLI daemon" | Out-Null
    Write-Host "[OK] Outbound rule created for agy.exe" -ForegroundColor Green
}

# 2. VS Code (Code.exe) Inbound & Outbound
if (Test-Path $codePath) {
    Remove-NetFirewallRule -DisplayName "VS Code (Antigravity Inbound)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "VS Code (Antigravity Inbound)" `
        -Direction Inbound `
        -Program $codePath `
        -Action Allow `
        -Profile Any `
        -Description "Allow inbound network traffic for VS Code with Antigravity" | Out-Null
    Write-Host "[OK] Inbound rule created for Code.exe" -ForegroundColor Green
}

Write-Host "Windows Defender Firewall configuration complete!" -ForegroundColor Cyan
Start-Sleep -Seconds 3
