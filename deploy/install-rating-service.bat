@echo off
REM ============================================================================
REM Installs C:\tomcat11-rating as a Windows Service (Service Name: Tomcat11Rating)
REM HTTP Port: 8084 | Shutdown Port: 8007
REM Fixes Windows Service-Specific Error 4 by granting folder permissions,
REM setting LocalSystem, and copying the exact JVM DLL path from Tomcat11.
REM Must be run from an Administrator Command Prompt
REM ============================================================================
setlocal

set "RATING_TOMCAT=C:\tomcat11-rating"
set "SERVICE_NAME=Tomcat11Rating"

if not exist "%RATING_TOMCAT%\conf\server.xml" (
    echo [ERROR] %RATING_TOMCAT%\conf\server.xml not found.
    echo Please run setup-rating-tomcat.bat first.
    pause
    exit /b 1
)

REM 1. Ensure logs, temp, and work folders exist and grant permissions
mkdir "%RATING_TOMCAT%\logs" 2>nul
mkdir "%RATING_TOMCAT%\temp" 2>nul
mkdir "%RATING_TOMCAT%\work" 2>nul
icacls "%RATING_TOMCAT%" /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T /Q >nul 2>&1

REM 2. Remove existing service if present
"%RATING_TOMCAT%\bin\tomcat11.exe" //DS//%SERVICE_NAME% >nul 2>&1

REM 3. Detect Jvm DLL path from existing Tomcat11 service registry
set "JVM_DLL=auto"
for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\WOW6432Node\Apache Software Foundation\Procrun 2.0\Tomcat11\Parameters\Java" /v Jvm 2^>nul') do set "JVM_DLL=%%B"
if "%JVM_DLL%"=="auto" (
    for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\Apache Software Foundation\Procrun 2.0\Tomcat11\Parameters\Java" /v Jvm 2^>nul') do set "JVM_DLL=%%B"
)

echo Detected JVM DLL: %JVM_DLL%

REM 4. Install Service
if exist "%RATING_TOMCAT%\bin\service.bat" (
    set "CATALINA_HOME=%RATING_TOMCAT%"
    set "CATALINA_BASE=%RATING_TOMCAT%"
    call "%RATING_TOMCAT%\bin\service.bat" install %SERVICE_NAME%
) else (
    "%RATING_TOMCAT%\bin\tomcat11.exe" //IS//%SERVICE_NAME% ^
        --DisplayName="Apache Tomcat 11.0 %SERVICE_NAME%" ^
        --Description="Apache Tomcat 11.0 Server - HeliosRating Rules & Rating Engine (Port 8084)" ^
        --Install="%RATING_TOMCAT%\bin\tomcat11.exe" ^
        --Jvm="%JVM_DLL%" ^
        --StartMode=jvm ^
        --StopMode=jvm ^
        --StartPath="%RATING_TOMCAT%" ^
        --StopPath="%RATING_TOMCAT%" ^
        --StartClass=org.apache.catalina.startup.Bootstrap ^
        --StopClass=org.apache.catalina.startup.Bootstrap ^
        --StartParams=start ^
        --StopParams=stop ^
        --Classpath="%RATING_TOMCAT%\bin\bootstrap.jar;%RATING_TOMCAT%\bin\tomcat-juli.jar" ^
        --LogPath="%RATING_TOMCAT%\logs" ^
        --StdOutput=auto ^
        --StdError=auto ^
        --Startup=auto
)

REM 5. Configure JVM options and LocalSystem account
"%RATING_TOMCAT%\bin\tomcat11.exe" //US//%SERVICE_NAME% ^
    --Jvm="%JVM_DLL%" ^
    --StartPath="%RATING_TOMCAT%" ^
    --StopPath="%RATING_TOMCAT%" ^
    --LogPath="%RATING_TOMCAT%\logs" ^
    --Classpath="%RATING_TOMCAT%\bin\bootstrap.jar;%RATING_TOMCAT%\bin\tomcat-juli.jar" ^
    --JvmOptions="-Dcatalina.home=%RATING_TOMCAT%;-Dcatalina.base=%RATING_TOMCAT%;-Djava.io.tmpdir=%RATING_TOMCAT%\temp;-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager;-Djava.util.logging.config.file=%RATING_TOMCAT%\conf\logging.properties;-Djava.library.path=%RATING_TOMCAT%\bin;C:\tomcat11\bin" ^
    ++JvmOptions="--add-opens=java.base/java.lang=ALL-UNNAMED;--add-opens=java.base/java.io=ALL-UNNAMED;--add-opens=java.base/java.util=ALL-UNNAMED;--add-opens=java.base/java.util.concurrent=ALL-UNNAMED;--add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED" ^
    --Startup=auto

sc.exe config %SERVICE_NAME% obj= "LocalSystem" >nul 2>&1

echo.
echo ============================================================================
echo Windows Service "%SERVICE_NAME%" installed!
echo   - Service GUI : %RATING_TOMCAT%\bin\Tomcat11Ratingw.exe
echo   - Start       : net start %SERVICE_NAME%
echo   - Health Check: http://127.0.0.1:8084/helios-rating/api/v1/diagnostics
echo ============================================================================
pause
endlocal

