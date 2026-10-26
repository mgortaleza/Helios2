$ErrorActionPreference = "Stop"

Write-Host "=== 1. Staging Java Sources to APPTST ==="
$stagingDir = "\\10.1.10.56\c$\deploy\build_staging"
if (Test-Path "$stagingDir\helios2_src") { Remove-Item "$stagingDir\helios2_src" -Recurse -Force }
if (Test-Path "$stagingDir\admin_src") { Remove-Item "$stagingDir\admin_src" -Recurse -Force }
New-Item -ItemType Directory -Path "$stagingDir\helios2_src" -Force | Out-Null
New-Item -ItemType Directory -Path "$stagingDir\admin_src" -Force | Out-Null

Copy-Item -Path "c:\DEV\helios2\src\main\java\*" -Destination "$stagingDir\helios2_src" -Recurse -Force
Copy-Item -Path "c:\DEV\helios2\helios-admin\src\main\java\*" -Destination "$stagingDir\admin_src" -Recurse -Force

Write-Host "=== 2. Compiling on APPTST via Invoke-Command ==="
Invoke-Command -ComputerName apptst.ad.ortaleza.com -ScriptBlock {
    $ErrorActionPreference = "Stop"
    $javac = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\javac.exe"
    $servlet = "C:\Tomcat11\lib\servlet-api.jar"
    
    # 2a. Compile helios2
    $h2Classes = "C:\deploy\build_staging\helios2_classes"
    if (Test-Path $h2Classes) { Remove-Item $h2Classes -Recurse -Force }
    New-Item -ItemType Directory -Path $h2Classes -Force | Out-Null
    
    $h2Files = Get-ChildItem -Path "C:\deploy\build_staging\helios2_src" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
    $h2Cp = "C:\Tomcat11\webapps\helios2\WEB-INF\lib\*;$servlet"
    
    Write-Host "Compiling $($h2Files.Count) Java files for helios2..."
    & $javac -parameters -cp $h2Cp -d $h2Classes $h2Files
    if ($LASTEXITCODE -ne 0) { throw "helios2 compilation failed" }
    Write-Host "helios2 compiled successfully."

    # 2b. Compile helios-admin
    $adminClasses = "C:\deploy\build_staging\admin_classes"
    if (Test-Path $adminClasses) { Remove-Item $adminClasses -Recurse -Force }
    New-Item -ItemType Directory -Path $adminClasses -Force | Out-Null

    $adminFiles = Get-ChildItem -Path "C:\deploy\build_staging\admin_src" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
    $adminCp = "C:\tomcat11-admin\webapps\helios-admin\WEB-INF\lib\*;$servlet"

    Write-Host "Compiling $($adminFiles.Count) Java files for helios-admin..."
    & $javac -parameters -cp $adminCp -d $adminClasses $adminFiles
    if ($LASTEXITCODE -ne 0) { throw "helios-admin compilation failed" }
    Write-Host "helios-admin compiled successfully."

    # 2c. Deploy classes
    Write-Host "Deploying classes to Tomcat11 webapps..."
    Copy-Item -Path "$h2Classes\*" -Destination "C:\Tomcat11\webapps\helios2\WEB-INF\classes\" -Recurse -Force
    Copy-Item -Path "$adminClasses\*" -Destination "C:\tomcat11-admin\webapps\helios-admin\WEB-INF\classes\" -Recurse -Force

    # 2d. Restart services
    Write-Host "Restarting Tomcat11..."
    Restart-Service Tomcat11 -Force
    Write-Host "Restarting Tomcat11Admin..."
    Restart-Service Tomcat11Admin -Force
    Write-Host "Tomcat services restarted."
}

Write-Host "=== 3. Deploying Frontend Bundles ==="
Copy-Item -Path "c:\DEV\helios2\frontend\dist\*" -Destination "\\10.1.10.56\c$\nginx\html\helios2\" -Recurse -Force
Write-Host "Main frontend bundle deployed to \\10.1.10.56\c$\nginx\html\helios2\"
Copy-Item -Path "c:\DEV\helios2\helios-admin\frontend\dist\*" -Destination "\\10.1.10.56\c$\nginx\html\helios-admin\" -Recurse -Force
Write-Host "Admin frontend bundle deployed to \\10.1.10.56\c$\nginx\html\helios-admin\"

Write-Host "=== 4. Deployment Complete! ==="
