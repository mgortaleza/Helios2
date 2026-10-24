$ErrorActionPreference = "Stop"

$servletJar = "C:\Users\mark.AD\.m2\repository\jakarta\servlet\jakarta.servlet-api\6.0.0\jakarta.servlet-api-6.0.0.jar"
$mvelJar = "C:\Users\mark.AD\.m2\repository\org\mvel\mvel2\2.5.2.Final\mvel2-2.5.2.Final.jar"
$javac = "C:\Program Files\Java\jdk-21.0.10\bin\javac.exe"
$jar = "C:\Program Files\Java\jdk-21.0.10\bin\jar.exe"

$libPath = "\\10.1.10.56\c$\tomcat11-rating\webapps\helios-rating\WEB-INF\lib"
# Ensure mvel2 is in lib
Copy-Item $mvelJar "$libPath\mvel2-2.5.2.Final.jar" -Force

$jars = ((Get-ChildItem -Path "$libPath\*.jar" | Select-Object -ExpandProperty FullName) + $servletJar) -join ";"
$javaFiles = Get-ChildItem -Path "c:\DEV\Helios2\helios-rating\src\main\java" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName

$buildClasses = "c:\DEV\Helios2\helios-rating\build_classes"
if (Test-Path $buildClasses) { Remove-Item $buildClasses -Recurse -Force }
New-Item -ItemType Directory -Path $buildClasses | Out-Null

Write-Host "Compiling $($javaFiles.Count) Java files for helios-rating..."
& $javac -cp $jars -d $buildClasses $javaFiles
Write-Host "helios-rating compilation successful!"

# Deploy classes directly to Tomcat11Rating webapp
Copy-Item -Path "$buildClasses\*" -Destination "\\10.1.10.56\c$\tomcat11-rating\webapps\helios-rating\WEB-INF\classes\" -Recurse -Force

Write-Host "Restarting Tomcat11Rating..."
sc.exe \\10.1.10.56 stop Tomcat11Rating
Start-Sleep -Seconds 3
sc.exe \\10.1.10.56 start Tomcat11Rating
Start-Sleep -Seconds 4
sc.exe \\10.1.10.56 query Tomcat11Rating
Write-Host "Tomcat11Rating updated successfully!"

