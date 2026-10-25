@echo off
REM ============================================================================
REM Installs C:\tomcat11-admin as a Windows Service (Service Name: Tomcat11Admin)
REM Fixes Windows Service-Specific Error 4 ("The system cannot open the file")
REM by granting folder permissions and setting LocalSystem + exact JVM DLL path.
REM Must be run from an Administrator Command Prompt
REM ============================================================================
setlocal

set "ADMIN_TOMCAT=C:\tomcat11-admin"
set "SERVICE_NAME=Tomcat11Admin"

if not exist "%ADMIN_TOMCAT%\conf\server.xml" (
    echo [ERROR] %ADMIN_TOMCAT%\conf\server.xml not found.
    pause
    exit /b 1
)

REM Ensure logs, temp, and work directories exist and LocalService/Users have Modify permissions
mkdir "%ADMIN_TOMCAT%\logs" 2>nul
mkdir "%ADMIN_TOMCAT%\temp" 2>nul
mkdir "%ADMIN_TOMCAT%\work" 2>nul
icacls "%ADMIN_TOMCAT%" /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T /Q >nul 2>&1

REM Remove existing service if present
"%ADMIN_TOMCAT%\bin\tomcat11.exe" //DS//%SERVICE_NAME% >nul 2>&1

REM Detect Jvm DLL path from existing Tomcat11 service registry
set "JVM_DLL=auto"
for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\WOW6432Node\Apache Software Foundation\Procrun 2.0\Tomcat11\Parameters\Java" /v Jvm 2^>nul') do set "JVM_DLL=%%B"
if "%JVM_DLL%"=="auto" (
    for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\Apache Software Foundation\Procrun 2.0\Tomcat11\Parameters\Java" /v Jvm 2^>nul') do set "JVM_DLL=%%B"
)

echo Detected JVM DLL: %JVM_DLL%

if exist "%ADMIN_TOMCAT%\bin\service.bat" (
    set "CATALINA_HOME=%ADMIN_TOMCAT%"
    set "CATALINA_BASE=%ADMIN_TOMCAT%"
    call "%ADMIN_TOMCAT%\bin\service.bat" install %SERVICE_NAME%
) else (
    "%ADMIN_TOMCAT%\bin\tomcat11.exe" //IS//%SERVICE_NAME% ^
        --DisplayName="Apache Tomcat 11.0 %SERVICE_NAME%" ^
        --Description="Apache Tomcat 11.0 Server - HeliosAdmin Control Plane (Port 8082)" ^
        --Install="%ADMIN_TOMCAT%\bin\tomcat11.exe" ^
        --Jvm="%JVM_DLL%" ^
        --StartMode=jvm ^
        --StopMode=jvm ^
        --StartPath="%ADMIN_TOMCAT%" ^
        --StopPath="%ADMIN_TOMCAT%" ^
        --StartClass=org.apache.catalina.startup.Bootstrap ^
        --StopClass=org.apache.catalina.startup.Bootstrap ^
        --StartParams=start ^
        --StopParams=stop ^
        --Classpath="%ADMIN_TOMCAT%\bin\bootstrap.jar;%ADMIN_TOMCAT%\bin\tomcat-juli.jar" ^
        --LogPath="%ADMIN_TOMCAT%\logs" ^
        --StdOutput=auto ^
        --StdError=auto ^
        --Startup=auto
)

REM Update service to use LocalSystem (avoids "system cannot open file" on logs/conf),
REM set exact JVM DLL from Tomcat11, and include bin path for SQL Server Auth DLL
"%ADMIN_TOMCAT%\bin\tomcat11.exe" //US//%SERVICE_NAME% ^
    --Jvm="%JVM_DLL%" ^
    --StartPath="%ADMIN_TOMCAT%" ^
    --StopPath="%ADMIN_TOMCAT%" ^
    --LogPath="%ADMIN_TOMCAT%\logs" ^
    --Classpath="%ADMIN_TOMCAT%\bin\bootstrap.jar;%ADMIN_TOMCAT%\bin\tomcat-juli.jar" ^
    --JvmOptions="-Dcatalina.home=%ADMIN_TOMCAT%;-Dcatalina.base=%ADMIN_TOMCAT%;-Djava.io.tmpdir=%ADMIN_TOMCAT%\temp;-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager;-Djava.util.logging.config.file=%ADMIN_TOMCAT%\conf\logging.properties;-Djava.library.path=%ADMIN_TOMCAT%\bin;C:\tomcat11\bin" ^
    ++JvmOptions="--add-opens=java.base/java.lang=ALL-UNNAMED;--add-opens=java.base/java.io=ALL-UNNAMED;--add-opens=java.base/java.util=ALL-UNNAMED;--add-opens=java.base/java.util.concurrent=ALL-UNNAMED;--add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED" ^
    --Startup=auto

sc.exe config %SERVICE_NAME% obj= "LocalSystem" >nul 2>&1

echo.
echo ============================================================================
echo Service "%SERVICE_NAME%" configured!
echo Starting service...
net start %SERVICE_NAME%
echo ============================================================================
pause
endlocal
