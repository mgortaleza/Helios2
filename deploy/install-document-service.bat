@echo off
REM ============================================================================
REM Installs C:\tomcat11-document as a Windows Service (Service Name: Tomcat11Document)
REM HTTP Port: 8086 | Shutdown Port: 8008
REM Must be run from an Administrator Command Prompt
REM ============================================================================
setlocal

set "DOC_TOMCAT=C:\tomcat11-document"
set "SERVICE_NAME=Tomcat11Document"

if not exist "%DOC_TOMCAT%\conf\server.xml" (
    echo [ERROR] %DOC_TOMCAT%\conf\server.xml not found.
    echo Please run setup-document-tomcat.bat first.
    pause
    exit /b 1
)

mkdir "%DOC_TOMCAT%\logs" 2>nul
mkdir "%DOC_TOMCAT%\temp" 2>nul
mkdir "%DOC_TOMCAT%\work" 2>nul
icacls "%DOC_TOMCAT%" /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T /Q >nul 2>&1

cd /d "%DOC_TOMCAT%\bin"
set "CATALINA_HOME=%DOC_TOMCAT%"
set "CATALINA_BASE=%DOC_TOMCAT%"
call service.bat install %SERVICE_NAME%

"%DOC_TOMCAT%\bin\tomcat11.exe" //US//%SERVICE_NAME% ^
    --JvmOptions="-Dcatalina.home=%DOC_TOMCAT%;-Dcatalina.base=%DOC_TOMCAT%;-Djava.io.tmpdir=%DOC_TOMCAT%\temp;-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager;-Djava.util.logging.config.file=%DOC_TOMCAT%\conf\logging.properties;-Djava.library.path=%DOC_TOMCAT%\bin" ^
    ++JvmOptions="--add-opens=java.base/java.lang=ALL-UNNAMED;--add-opens=java.base/java.io=ALL-UNNAMED;--add-opens=java.base/java.util=ALL-UNNAMED;--add-opens=java.base/java.util.concurrent=ALL-UNNAMED;--add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED;--enable-native-access=ALL-UNNAMED" ^
    --Startup=auto

sc.exe config %SERVICE_NAME% obj= "LocalSystem" >nul 2>&1

echo.
echo ============================================================================
echo Windows Service "%SERVICE_NAME%" installed!
echo   - Service GUI : %DOC_TOMCAT%\bin\Tomcat11Documentw.exe
echo   - Start       : net start %SERVICE_NAME%
echo   - Port        : 8086
echo ============================================================================
endlocal
