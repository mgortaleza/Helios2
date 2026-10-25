# ============================================================================
# PowerShell Script to Provision a 2nd Tomcat 11 Instance (CATALINA_BASE)
# on Port 8082 for HeliosAdmin on the same machine (APPTST)
# Base Tomcat 11 Installation: C:\tomcat11
# ============================================================================
param(
    [string]$CatalinaHome = "C:\tomcat11",
    [string]$AdminCatalinaBase = "C:\tomcat11-admin"
)

if (-not (Test-Path $CatalinaHome)) {
    Write-Error "Tomcat 11 home directory not found at $CatalinaHome"
    exit 1
}

Write-Host "Creating isolated Tomcat 11 CATALINA_BASE for HeliosAdmin at $AdminCatalinaBase..."
New-Item -ItemType Directory -Force -Path `
    "$AdminCatalinaBase\bin", `
    "$AdminCatalinaBase\conf", `
    "$AdminCatalinaBase\logs", `
    "$AdminCatalinaBase\temp", `
    "$AdminCatalinaBase\webapps", `
    "$AdminCatalinaBase\work" | Out-Null

# 1. Copy configuration files from C:\tomcat11\conf
Copy-Item -Path "$CatalinaHome\conf\*" -Destination "$AdminCatalinaBase\conf\" -Recurse -Force

# 2. Copy native SQL Server Windows Auth DLL (mssql-jdbc_auth-*.dll) if present in C:\tomcat11\bin
Get-ChildItem -Path "$CatalinaHome\bin" -Filter "mssql-jdbc_auth*.dll" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$AdminCatalinaBase\bin\" -Force
    Write-Host "Copied SQL Server Integrated Auth DLL: $($_.Name)"
}

# 3. Update server.xml ports: Shutdown 8005 -> 8006, HTTP 8080 -> 8082
$serverXmlPath = "$AdminCatalinaBase\conf\server.xml"
if (Test-Path $serverXmlPath) {
    $xml = Get-Content $serverXmlPath -Raw
    $xml = $xml -replace 'port="8005"', 'port="8006"'
    $xml = $xml -replace 'port="8080"', 'port="8082"'
    Set-Content -Path $serverXmlPath -Value $xml -Encoding UTF8
    Write-Host "Updated $serverXmlPath (Shutdown port: 8006, HTTP port: 8082)"
}

# 4. Create setenv.bat in CATALINA_BASE\bin so native DLL path is automatically included
$setenvContent = @"
set "CATALINA_HOME=$CatalinaHome"
set "CATALINA_BASE=$AdminCatalinaBase"
set "JAVA_OPTS=%JAVA_OPTS% -Djava.library.path=$CatalinaHome\bin;$AdminCatalinaBase\bin"
"@
Set-Content -Path "$AdminCatalinaBase\bin\setenv.bat" -Value $setenvContent -Encoding ASCII

# 5. Create helper start/stop scripts in C:\tomcat11-admin\bin
$startScript = @"
@echo off
set "CATALINA_HOME=$CatalinaHome"
set "CATALINA_BASE=$AdminCatalinaBase"
call "$CatalinaHome\bin\startup.bat"
"@
Set-Content -Path "$AdminCatalinaBase\bin\startup-admin.bat" -Value $startScript -Encoding ASCII

$stopScript = @"
@echo off
set "CATALINA_HOME=$CatalinaHome"
set "CATALINA_BASE=$AdminCatalinaBase"
call "$CatalinaHome\bin\shutdown.bat"
"@
Set-Content -Path "$AdminCatalinaBase\bin\shutdown-admin.bat" -Value $stopScript -Encoding ASCII

Write-Host ""
Write-Host "============================================================================"
Write-Host "Tomcat 11 Admin Instance Ready at: $AdminCatalinaBase"
Write-Host "  - CATALINA_HOME : $CatalinaHome"
Write-Host "  - CATALINA_BASE : $AdminCatalinaBase"
Write-Host "  - HTTP Port     : 8082"
Write-Host "  - Shutdown Port : 8006"
Write-Host "  - Deploy WAR to : $AdminCatalinaBase\webapps\helios-admin.war"
Write-Host "  - Start Command : $AdminCatalinaBase\bin\startup-admin.bat"
Write-Host "  - Stop Command  : $AdminCatalinaBase\bin\shutdown-admin.bat"
Write-Host "============================================================================"

$stopScript = @"
@echo off
set "CATALINA_HOME=$CatalinaHome"
set "CATALINA_BASE=$AdminCatalinaBase"
call "$CatalinaHome\bin\shutdown.bat"
"@
Set-Content -Path "$AdminCatalinaBase\bin\shutdown-admin.bat" -Value $stopScript -Encoding ASCII

Write-Host ""
Write-Host "============================================================================"
Write-Host "Tomcat 11 Admin Instance Ready at: $AdminCatalinaBase"
Write-Host "  - CATALINA_HOME : $CatalinaHome"
Write-Host "  - CATALINA_BASE : $AdminCatalinaBase"
Write-Host "  - HTTP Port     : 8082"
Write-Host "  - Shutdown Port : 8006"
Write-Host "  - Deploy WAR to : $AdminCatalinaBase\webapps\helios-admin.war"
Write-Host "  - Start Command : $AdminCatalinaBase\bin\startup-admin.bat"
Write-Host "  - Stop Command  : $AdminCatalinaBase\bin\shutdown-admin.bat"
Write-Host "============================================================================"

