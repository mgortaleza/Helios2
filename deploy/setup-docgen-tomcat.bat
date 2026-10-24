@echo off
REM ============================================================================
REM Provision 5th Tomcat 11 Instance (C:\tomcat11-docgen) on Port 8088
REM for HeliosDocgen Dedicated PDF Generation Engine on APPTST
REM ============================================================================
setlocal

set "SOURCE_TOMCAT=C:\tomcat11"
set "DOCGEN_TOMCAT=C:\tomcat11-docgen"

if not exist "%SOURCE_TOMCAT%\bin" (
    echo [ERROR] Source Tomcat 11 not found at %SOURCE_TOMCAT%
    pause
    exit /b 1
)

echo Creating isolated Tomcat 11 instance for HeliosDocgen at %DOCGEN_TOMCAT%...
mkdir "%DOCGEN_TOMCAT%\bin" 2>nul
mkdir "%DOCGEN_TOMCAT%\conf" 2>nul
mkdir "%DOCGEN_TOMCAT%\logs" 2>nul
mkdir "%DOCGEN_TOMCAT%\temp" 2>nul
mkdir "%DOCGEN_TOMCAT%\webapps" 2>nul
mkdir "%DOCGEN_TOMCAT%\work" 2>nul

REM 1. Copy binary files and libraries
xcopy "%SOURCE_TOMCAT%\bin\*" "%DOCGEN_TOMCAT%\bin\" /E /I /Y >nul
xcopy "%SOURCE_TOMCAT%\lib\*" "%DOCGEN_TOMCAT%\lib\" /E /I /Y >nul
xcopy "%SOURCE_TOMCAT%\conf\*" "%DOCGEN_TOMCAT%\conf\" /E /I /Y >nul
echo Copied bin, lib, and conf from %SOURCE_TOMCAT%

REM 2. Rename GUI service manager tools
if exist "%DOCGEN_TOMCAT%\bin\tomcat11.exe" (
    copy /Y "%DOCGEN_TOMCAT%\bin\tomcat11.exe" "%DOCGEN_TOMCAT%\bin\Tomcat11Docgen.exe" >nul
)
if exist "%DOCGEN_TOMCAT%\bin\tomcat11w.exe" (
    copy /Y "%DOCGEN_TOMCAT%\bin\tomcat11w.exe" "%DOCGEN_TOMCAT%\bin\Tomcat11Docgenw.exe" >nul
)

REM 3. Deploy dedicated server-docgen.xml (Shutdown: 8009, HTTP: 8088)
if exist "%~dp0server-docgen.xml" (
    copy /Y "%~dp0server-docgen.xml" "%DOCGEN_TOMCAT%\conf\server.xml" >nul
    echo Deployed server-docgen.xml to %DOCGEN_TOMCAT%\conf\server.xml
)

echo.
echo ============================================================================
echo Tomcat 11 Docgen Instance Ready at: %DOCGEN_TOMCAT%
echo   - HTTP Port     : 8088
echo   - Shutdown Port : 8009
echo   - Deploy WAR to : %DOCGEN_TOMCAT%\webapps\helios-docgen.war
echo   - Next Step     : Run install-docgen-service.bat as Administrator
echo ============================================================================
endlocal

