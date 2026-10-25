$ErrorActionPreference = "Stop"

$javac = "\\10.1.10.56\c$\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\javac.exe"
$servletJar = "\\10.1.10.56\c$\Tomcat11\lib\servlet-api.jar"

# 1. Compile helios2
$h2Lib = "\\10.1.10.56\c$\Tomcat11\webapps\helios2\WEB-INF\lib"
$h2Jars = (((Get-ChildItem -Path "$h2Lib\*.jar" | Select-Object -ExpandProperty FullName) + $servletJar) -join ";")
$h2JavaFiles = Get-ChildItem -Path "c:\DEV\helios2\src\main\java" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName

$h2Classes = "c:\DEV\helios2\build_classes_helios2"
if (Test-Path $h2Classes) { Remove-Item $h2Classes -Recurse -Force }
New-Item -ItemType Directory -Path $h2Classes | Out-Null

Write-Host "Compiling $($h2JavaFiles.Count) Java files for helios2..."
& $javac -cp $h2Jars -d $h2Classes $h2JavaFiles
if ($LASTEXITCODE -ne 0) { throw "Compilation failed for helios2!" }
Write-Host "helios2 compilation SUCCESS!"

# 2. Compile helios-admin
$adminLib = "\\10.1.10.56\c$\tomcat11-admin\webapps\helios-admin\WEB-INF\lib"
$adminJars = (((Get-ChildItem -Path "$adminLib\*.jar" | Select-Object -ExpandProperty FullName) + $servletJar) -join ";")
$adminJavaFiles = Get-ChildItem -Path "c:\DEV\helios2\helios-admin\src\main\java" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName

$adminClasses = "c:\DEV\helios2\build_classes_admin"
if (Test-Path $adminClasses) { Remove-Item $adminClasses -Recurse -Force }
New-Item -ItemType Directory -Path $adminClasses | Out-Null

Write-Host "Compiling $($adminJavaFiles.Count) Java files for helios-admin..."
& $javac -cp $adminJars -d $adminClasses $adminJavaFiles
if ($LASTEXITCODE -ne 0) { throw "Compilation failed for helios-admin!" }
Write-Host "helios-admin compilation SUCCESS!"

# Deploy to Tomcat11
Write-Host "Deploying classes to helios2..."
Copy-Item -Path "$h2Classes\*" -Destination "\\10.1.10.56\c$\Tomcat11\webapps\helios2\WEB-INF\classes\" -Recurse -Force

Write-Host "Deploying classes to helios-admin..."
Copy-Item -Path "$adminClasses\*" -Destination "\\10.1.10.56\c$\tomcat11-admin\webapps\helios-admin\WEB-INF\classes\" -Recurse -Force

# Restart Tomcats
Write-Host "Restarting Tomcat11..."
sc.exe \\10.1.10.56 stop Tomcat11
Start-Sleep -Seconds 3
sc.exe \\10.1.10.56 start Tomcat11

Write-Host "Restarting Tomcat11Admin..."
sc.exe \\10.1.10.56 stop Tomcat11Admin
Start-Sleep -Seconds 3
sc.exe \\10.1.10.56 start Tomcat11Admin

Start-Sleep -Seconds 4
Write-Host "Backend deploy complete!"
