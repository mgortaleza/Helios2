@echo off
REM ============================================================================
REM Provision 3rd Tomcat 11 Instance (C:\tomcat11-rating) on Port 8084
REM for HeliosRating Rules & Rating Engine on APPTST
REM ============================================================================
setlocal

set "SOURCE_TOMCAT=C:\tomcat11"
set "RATING_TOMCAT=C:\tomcat11-rating"

if not exist "%SOURCE_TOMCAT%\bin" (
    echo [ERROR] Source Tomcat 11 not found at %SOURCE_TOMCAT%
    pause
    exit /b 1
)

echo Creating isolated Tomcat 11 instance for HeliosRating at %RATING_TOMCAT%...
mkdir "%RATING_TOMCAT%\bin" 2>nul
mkdir "%RATING_TOMCAT%\conf" 2>nul
mkdir "%RATING_TOMCAT%\logs" 2>nul
mkdir "%RATING_TOMCAT%\temp" 2>nul
mkdir "%RATING_TOMCAT%\webapps" 2>nul
mkdir "%RATING_TOMCAT%\work" 2>nul

REM 1. Copy binary files and libraries
xcopy "%SOURCE_TOMCAT%\bin\*" "%RATING_TOMCAT%\bin\" /E /I /Y >nul
xcopy "%SOURCE_TOMCAT%\lib\*" "%RATING_TOMCAT%\lib\" /E /I /Y >nul
xcopy "%SOURCE_TOMCAT%\conf\*" "%RATING_TOMCAT%\conf\" /E /I /Y >nul
echo Copied bin, lib, and conf from %SOURCE_TOMCAT%

REM 2. Rename GUI service manager tools
if exist "%RATING_TOMCAT%\bin\tomcat11.exe" (
    copy /Y "%RATING_TOMCAT%\bin\tomcat11.exe" "%RATING_TOMCAT%\bin\Tomcat11Rating.exe" >nul
)
if exist "%RATING_TOMCAT%\bin\tomcat11w.exe" (
    copy /Y "%RATING_TOMCAT%\bin\tomcat11w.exe" "%RATING_TOMCAT%\bin\Tomcat11Ratingw.exe" >nul
)

REM 3. Deploy dedicated server-rating.xml (Shutdown: 8007, HTTP: 8084)
if exist "%~dp0server-rating.xml" (
    copy /Y "%~dp0server-rating.xml" "%RATING_TOMCAT%\conf\server.xml" >nul
    echo Deployed server-rating.xml to %RATING_TOMCAT%\conf\server.xml
) else (
    REM In-line fallback port update if server-rating.xml not in same folder
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = '%RATING_TOMCAT%\conf\server.xml'; $q = [char]34; $x = [System.IO.File]::ReadAllText($p); $x = $x.Replace('port=' + $q + '8005' + $q, 'port=' + $q + '8007' + $q).Replace('port=' + $q + '8080' + $q, 'port=' + $q + '8084' + $q); [System.IO.File]::WriteAllText($p, $x, (New-Object System.Text.UTF8Encoding($false)))"
    echo Configured ports in %RATING_TOMCAT%\conf\server.xml
)

REM 4. Create setenv.bat for local/manual run
(
    echo set "CATALINA_HOME=%RATING_TOMCAT%"
    echo set "CATALINA_BASE=%RATING_TOMCAT%"
    echo set "JAVA_OPTS=%%JAVA_OPTS%% -Djava.library.path=%RATING_TOMCAT%\bin;%SOURCE_TOMCAT%\bin"
) > "%RATING_TOMCAT%\bin\setenv.bat"

echo.
echo ============================================================================
echo Tomcat 11 Rating Instance Ready at: %RATING_TOMCAT%
echo   - HTTP Port     : 8084
echo   - Shutdown Port : 8007
echo   - Deploy WAR to : %RATING_TOMCAT%\webapps\helios-rating.war
echo   - Next Step     : Run install-rating-service.bat as Administrator
echo ============================================================================
pause
endlocal

