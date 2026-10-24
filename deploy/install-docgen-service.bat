@echo off
REM ============================================================================
REM Installs C:\tomcat11-docgen as a Windows Service (Service Name: Tomcat11Docgen)
REM HTTP Port: 8088 | Shutdown Port: 8009
REM Dedicated to Aspose.PDF document generation
REM Must be run from an Administrator Command Prompt
REM ============================================================================
setlocal

set "DOCGEN_TOMCAT=C:\tomcat11-docgen"
set "SERVICE_NAME=Tomcat11Docgen"

if not exist "%DOCGEN_TOMCAT%\conf\server.xml" (
    echo [ERROR] %DOCGEN_TOMCAT%\conf\server.xml not found.
    echo Please run setup-docgen-tomcat.bat first.
    pause
    exit /b 1
)

mkdir "%DOCGEN_TOMCAT%\logs" 2>nul
mkdir "%DOCGEN_TOMCAT%\temp" 2>nul
mkdir "%DOCGEN_TOMCAT%\work" 2>nul
icacls "%DOCGEN_TOMCAT%" /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T /Q >nul 2>&1

cd /d "%DOCGEN_TOMCAT%\bin"
set "CATALINA_HOME=%DOCGEN_TOMCAT%"
set "CATALINA_BASE=%DOCGEN_TOMCAT%"
call service.bat install %SERVICE_NAME%

"%DOCGEN_TOMCAT%\bin\tomcat11.exe" //US//%SERVICE_NAME% ^
    --JvmOptions="-Dcatalina.home=%DOCGEN_TOMCAT%;-Dcatalina.base=%DOCGEN_TOMCAT%;-Djava.io.tmpdir=%DOCGEN_TOMCAT%\temp;-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager;-Djava.util.logging.config.file=%DOCGEN_TOMCAT%\conf\logging.properties;-Djava.library.path=%DOCGEN_TOMCAT%\bin" ^
    ++JvmOptions="--add-opens=java.base/java.lang=ALL-UNNAMED;--add-opens=java.base/java.io=ALL-UNNAMED;--add-opens=java.base/java.util=ALL-UNNAMED;--add-opens=java.base/java.util.concurrent=ALL-UNNAMED;--add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED;--enable-native-access=ALL-UNNAMED" ^
    --JvmMs=512 ^
    --JvmMx=2048 ^
    --Startup=auto

sc.exe config %SERVICE_NAME% obj= "LocalSystem" >nul 2>&1

echo.
echo ============================================================================
echo Windows Service "%SERVICE_NAME%" installed!
echo   - Service GUI : %DOCGEN_TOMCAT%\bin\Tomcat11Docgenw.exe
echo   - Start       : net start %SERVICE_NAME%
echo   - Port        : 8088
echo ============================================================================
endlocal
