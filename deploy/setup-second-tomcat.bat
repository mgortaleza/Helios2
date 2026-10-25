@echo off
REM ============================================================================
REM Batch Script to Provision a 2nd Tomcat 11 Instance (C:\tomcat11-admin)
REM on Port 8082 for HeliosAdmin on the same machine (APPTST)
REM Works with BOTH Tomcat 11 Windows Service Installer and ZIP distributions
REM ============================================================================
setlocal

set "CATALINA_HOME=C:\tomcat11"
set "ADMIN_BASE=C:\tomcat11-admin"

if not exist "%CATALINA_HOME%\bin" (
    echo [ERROR] Tomcat 11 bin directory not found at %CATALINA_HOME%\bin
    pause
    exit /b 1
)

echo Creating isolated Tomcat 11 instance for HeliosAdmin at %ADMIN_BASE%...
mkdir "%ADMIN_BASE%\bin" 2>nul
mkdir "%ADMIN_BASE%\conf" 2>nul
mkdir "%ADMIN_BASE%\logs" 2>nul
mkdir "%ADMIN_BASE%\temp" 2>nul
mkdir "%ADMIN_BASE%\webapps" 2>nul
mkdir "%ADMIN_BASE%\work" 2>nul

REM 1. Copy bin files (bootstrap.jar, tomcat-juli.jar, tomcat11.exe, DLLs, etc.)
xcopy "%CATALINA_HOME%\bin\*" "%ADMIN_BASE%\bin\" /E /I /Y >nul
echo Copied bin files to %ADMIN_BASE%\bin\

REM Also create Tomcat11Admin.exe and Tomcat11Adminw.exe so the GUI tool works directly
if exist "%ADMIN_BASE%\bin\tomcat11.exe" (
    copy /Y "%ADMIN_BASE%\bin\tomcat11.exe" "%ADMIN_BASE%\bin\Tomcat11Admin.exe" >nul
)
if exist "%ADMIN_BASE%\bin\tomcat11w.exe" (
    copy /Y "%ADMIN_BASE%\bin\tomcat11w.exe" "%ADMIN_BASE%\bin\Tomcat11Adminw.exe" >nul
)

REM 2. Copy configuration files from C:\tomcat11\conf
xcopy "%CATALINA_HOME%\conf\*" "%ADMIN_BASE%\conf\" /E /I /Y >nul
echo Copied conf files to %ADMIN_BASE%\conf\

REM 3. Update server.xml ports: Shutdown 8005 -> 8006, HTTP 8080 -> 8082, AJP 8009 -> 8010
REM Uses single-quoted regex char codes [char]34 to avoid cmd.exe quote escaping bugs
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = '%ADMIN_BASE%\conf\server.xml'; $q = [char]34; $x = [System.IO.File]::ReadAllText($p); $x = $x.Replace('port=' + $q + '8005' + $q, 'port=' + $q + '8006' + $q).Replace('port=' + $q + '8080' + $q, 'port=' + $q + '8082' + $q).Replace('port=' + $q + '8009' + $q, 'port=' + $q + '8010' + $q); [System.IO.File]::WriteAllText($p, $x, (New-Object System.Text.UTF8Encoding($false)))"
echo Updated %ADMIN_BASE%\conf\server.xml (Shutdown: 8006, HTTP: 8082)

REM 4. Create setenv.bat in CATALINA_BASE\bin (used if started via startup.bat)
(
    echo set "CATALINA_HOME=%CATALINA_HOME%"
    echo set "CATALINA_BASE=%ADMIN_BASE%"
    echo set "JAVA_OPTS=%%JAVA_OPTS%% -Djava.library.path=%CATALINA_HOME%\bin;%ADMIN_BASE%\bin"
) > "%ADMIN_BASE%\bin\setenv.bat"

REM 5. Create startup-admin.bat and shutdown-admin.bat if startup.bat exists
if exist "%CATALINA_HOME%\bin\startup.bat" (
    (
        echo @echo off
        echo set "CATALINA_HOME=%CATALINA_HOME%"
        echo set "CATALINA_BASE=%ADMIN_BASE%"
        echo call "%CATALINA_HOME%\bin\startup.bat"
    ) > "%ADMIN_BASE%\bin\startup-admin.bat"

    (
        echo @echo off
        echo set "CATALINA_HOME=%CATALINA_HOME%"
        echo set "CATALINA_BASE=%ADMIN_BASE%"
        echo call "%CATALINA_HOME%\bin\shutdown.bat"
    ) > "%ADMIN_BASE%\bin\shutdown-admin.bat"
)

echo.
echo ============================================================================
echo Tomcat 11 Admin Instance Ready at: %ADMIN_BASE%
echo   - CATALINA_HOME : %CATALINA_HOME%
echo   - CATALINA_BASE : %ADMIN_BASE%
echo   - HTTP Port     : 8082
echo   - Shutdown Port : 8006
echo   - Deploy WAR to : %ADMIN_BASE%\webapps\helios-admin.war
echo   - Next Step     : Run install-admin-service.bat as Administrator
echo ============================================================================
pause
endlocal
