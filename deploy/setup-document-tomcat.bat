@echo off
REM ============================================================================
REM Provision 4th Tomcat 11 Instance (C:\tomcat11-document) on Port 8086
REM for HeliosDocument Aspose.PDF Generation Engine on APPTST
REM ============================================================================
setlocal

set "SOURCE_TOMCAT=C:\tomcat11"
set "DOC_TOMCAT=C:\tomcat11-document"

if not exist "%SOURCE_TOMCAT%\bin" (
    echo [ERROR] Source Tomcat 11 not found at %SOURCE_TOMCAT%
    pause
    exit /b 1
)

echo Creating isolated Tomcat 11 instance for HeliosDocument at %DOC_TOMCAT%...
mkdir "%DOC_TOMCAT%\bin" 2>nul
mkdir "%DOC_TOMCAT%\conf" 2>nul
mkdir "%DOC_TOMCAT%\logs" 2>nul
mkdir "%DOC_TOMCAT%\temp" 2>nul
mkdir "%DOC_TOMCAT%\webapps" 2>nul
mkdir "%DOC_TOMCAT%\work" 2>nul

REM 1. Copy binary files and libraries
xcopy "%SOURCE_TOMCAT%\bin\*" "%DOC_TOMCAT%\bin\" /E /I /Y >nul
xcopy "%SOURCE_TOMCAT%\lib\*" "%DOC_TOMCAT%\lib\" /E /I /Y >nul
xcopy "%SOURCE_TOMCAT%\conf\*" "%DOC_TOMCAT%\conf\" /E /I /Y >nul
echo Copied bin, lib, and conf from %SOURCE_TOMCAT%

REM 2. Rename GUI service manager tools
if exist "%DOC_TOMCAT%\bin\tomcat11.exe" (
    copy /Y "%DOC_TOMCAT%\bin\tomcat11.exe" "%DOC_TOMCAT%\bin\Tomcat11Document.exe" >nul
)
if exist "%DOC_TOMCAT%\bin\tomcat11w.exe" (
    copy /Y "%DOC_TOMCAT%\bin\tomcat11w.exe" "%DOC_TOMCAT%\bin\Tomcat11Documentw.exe" >nul
)

REM 3. Deploy dedicated server-document.xml (Shutdown: 8008, HTTP: 8086)
if exist "%~dp0server-document.xml" (
    copy /Y "%~dp0server-document.xml" "%DOC_TOMCAT%\conf\server.xml" >nul
    echo Deployed server-document.xml to %DOC_TOMCAT%\conf\server.xml
)

echo.
echo ============================================================================
echo Tomcat 11 Document Instance Ready at: %DOC_TOMCAT%
echo   - HTTP Port     : 8086
echo   - Shutdown Port : 8008
echo   - Deploy WAR to : %DOC_TOMCAT%\webapps\helios-document.war
echo   - Next Step     : Run install-document-service.bat as Administrator
echo ============================================================================
endlocal

