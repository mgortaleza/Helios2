$ErrorActionPreference = "Stop"

Write-Host "=== 1. Staging Java Sources to APPTST ==="
$stagingDir = "\\10.1.10.56\c$\deploy\build_staging"
if (Test-Path "$stagingDir\helios2_src") { Remove-Item "$stagingDir\helios2_src" -Recurse -Force }
if (Test-Path "$stagingDir\admin_src") { Remove-Item "$stagingDir\admin_src" -Recurse -Force }
if (Test-Path "$stagingDir\doc_src") { Remove-Item "$stagingDir\doc_src" -Recurse -Force }
if (Test-Path "$stagingDir\docgen_src") { Remove-Item "$stagingDir\docgen_src" -Recurse -Force }
New-Item -ItemType Directory -Path "$stagingDir\helios2_src" -Force | Out-Null
New-Item -ItemType Directory -Path "$stagingDir\admin_src" -Force | Out-Null
New-Item -ItemType Directory -Path "$stagingDir\doc_src" -Force | Out-Null
New-Item -ItemType Directory -Path "$stagingDir\docgen_src" -Force | Out-Null

Copy-Item -Path "c:\DEV\helios2\src\main\java\*" -Destination "$stagingDir\helios2_src" -Recurse -Force
Copy-Item -Path "c:\DEV\helios2\helios-admin\src\main\java\*" -Destination "$stagingDir\admin_src" -Recurse -Force
Copy-Item -Path "c:\DEV\helios2\helios-document\src\main\java\*" -Destination "$stagingDir\doc_src" -Recurse -Force
Copy-Item -Path "c:\DEV\helios2\helios-docgen\src\main\java\*" -Destination "$stagingDir\docgen_src" -Recurse -Force

Write-Host "Updating application.properties on target Tomcat instances..."
Copy-Item -Path "c:\DEV\helios2\src\main\resources\application.properties" -Destination "\\10.1.10.56\c$\Tomcat11\webapps\helios2\WEB-INF\classes\application.properties" -Force
Copy-Item -Path "c:\DEV\helios2\helios-admin\src\main\resources\application.properties" -Destination "\\10.1.10.56\c$\tomcat11-admin\webapps\helios-admin\WEB-INF\classes\application.properties" -Force
Copy-Item -Path "c:\DEV\helios2\helios-document\src\main\resources\application.properties" -Destination "\\10.1.10.56\c$\Tomcat11-Document\webapps\helios-document\WEB-INF\classes\application.properties" -Force

Write-Host "=== 2. Compiling on APPTST via Invoke-Command ==="
Invoke-Command -ComputerName apptst.ad.ortaleza.com -ScriptBlock {
    $ErrorActionPreference = "Continue"
    $javac = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\javac.exe"
    $servlet = "C:\Tomcat11\lib\servlet-api.jar"
    
    # 2a. Compile helios2
    $h2Classes = "C:\deploy\build_staging\helios2_classes"
    if (Test-Path $h2Classes) { Remove-Item $h2Classes -Recurse -Force }
    New-Item -ItemType Directory -Path $h2Classes -Force | Out-Null
    
    $h2Files = Get-ChildItem -Path "C:\deploy\build_staging\helios2_src" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
    $h2Cp = "C:\Tomcat11\webapps\helios2\WEB-INF\lib\*;$servlet"
    
    Write-Host "Compiling $($h2Files.Count) Java files for helios2..."
    $out1 = & $javac -nowarn -Xlint:none -parameters -cp $h2Cp -d $h2Classes $h2Files 2>&1
    if ($LASTEXITCODE -ne 0) { throw "helios2 compilation failed: $out1" }
    Write-Host "helios2 compiled successfully."

    # 2b. Compile helios-admin
    $adminClasses = "C:\deploy\build_staging\admin_classes"
    if (Test-Path $adminClasses) { Remove-Item $adminClasses -Recurse -Force }
    New-Item -ItemType Directory -Path $adminClasses -Force | Out-Null

    $adminFiles = Get-ChildItem -Path "C:\deploy\build_staging\admin_src" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
    $adminCp = "C:\tomcat11-admin\webapps\helios-admin\WEB-INF\lib\*;$servlet"

    Write-Host "Compiling $($adminFiles.Count) Java files for helios-admin..."
    $out2 = & $javac -nowarn -Xlint:none -parameters -cp $adminCp -d $adminClasses $adminFiles 2>&1
    if ($LASTEXITCODE -ne 0) { throw "helios-admin compilation failed: $out2" }
    Write-Host "helios-admin compiled successfully."

    # 2c. Compile helios-document
    $docClasses = "C:\deploy\build_staging\doc_classes"
    if (Test-Path $docClasses) { Remove-Item $docClasses -Recurse -Force }
    New-Item -ItemType Directory -Path $docClasses -Force | Out-Null

    $docFiles = Get-ChildItem -Path "C:\deploy\build_staging\doc_src" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
    $docCp = "C:\Tomcat11-Document\webapps\helios-document\WEB-INF\lib\*;C:\Tomcat11-Document\lib\*;$servlet"

    Write-Host "Compiling $($docFiles.Count) Java files for helios-document..."
    $out3 = & $javac -nowarn -Xlint:none -parameters -cp $docCp -d $docClasses $docFiles 2>&1
    if ($LASTEXITCODE -ne 0) { throw "helios-document compilation failed: $out3" }
    Write-Host "helios-document compiled successfully."

    # 2d. Compile helios-docgen
    $docgenClasses = "C:\deploy\build_staging\docgen_classes"
    if (Test-Path $docgenClasses) { Remove-Item $docgenClasses -Recurse -Force }
    New-Item -ItemType Directory -Path $docgenClasses -Force | Out-Null

    $docgenFiles = Get-ChildItem -Path "C:\deploy\build_staging\docgen_src" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
    $docgenCp = "C:\tomcat11-docgen\webapps\helios-docgen\WEB-INF\lib\*;C:\tomcat11-docgen\lib\*;$servlet"

    Write-Host "Compiling $($docgenFiles.Count) Java files for helios-docgen..."
    $out4 = & $javac -nowarn -Xlint:none -parameters -cp $docgenCp -d $docgenClasses $docgenFiles 2>&1
    if ($LASTEXITCODE -ne 0) { throw "helios-docgen compilation failed: $out4" }
    Write-Host "helios-docgen compiled successfully."

    # 2e. Deploy classes
    Write-Host "Deploying classes to Tomcat11 webapps..."
    Copy-Item -Path "$h2Classes\*" -Destination "C:\Tomcat11\webapps\helios2\WEB-INF\classes\" -Recurse -Force
    Copy-Item -Path "$adminClasses\*" -Destination "C:\tomcat11-admin\webapps\helios-admin\WEB-INF\classes\" -Recurse -Force
    Copy-Item -Path "$docClasses\*" -Destination "C:\Tomcat11-Document\webapps\helios-document\WEB-INF\classes\" -Recurse -Force
    Copy-Item -Path "$docgenClasses\*" -Destination "C:\tomcat11-docgen\webapps\helios-docgen\WEB-INF\classes\" -Recurse -Force

    # 2f. Restart services
    Write-Host "Restarting Tomcat11..."
    Restart-Service Tomcat11 -Force
    Write-Host "Restarting Tomcat11Admin..."
    Restart-Service Tomcat11Admin -Force
    Write-Host "Restarting Tomcat11Document..."
    Restart-Service Tomcat11Document -Force
    Write-Host "Restarting Tomcat11Docgen..."
    Restart-Service Tomcat11Docgen -Force
    Write-Host "Tomcat services restarted."
}

Write-Host "=== 3. Deploying Frontend Bundles ==="
if (Test-Path "c:\DEV\helios2\frontend\dist") {
    Copy-Item -Path "c:\DEV\helios2\frontend\dist\*" -Destination "\\10.1.10.56\c$\nginx\html\helios2\" -Recurse -Force
    Write-Host "Main frontend bundle deployed to \\10.1.10.56\c$\nginx\html\helios2\"
}
if (Test-Path "c:\DEV\helios2\helios-admin\frontend\dist") {
    Copy-Item -Path "c:\DEV\helios2\helios-admin\frontend\dist\*" -Destination "\\10.1.10.56\c$\nginx\html\helios-admin\" -Recurse -Force
    Write-Host "Admin frontend bundle deployed to \\10.1.10.56\c$\nginx\html\helios-admin\"
}

Write-Host "=== 4. Deployment Complete! ==="
