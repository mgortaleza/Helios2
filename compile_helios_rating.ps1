$ErrorActionPreference = "Stop"

$servletJar = if (Test-Path "C:\Users\mark.AD\.m2\repository\jakarta\servlet\jakarta.servlet-api\6.0.0\jakarta.servlet-api-6.0.0.jar") {
    "C:\Users\mark.AD\.m2\repository\jakarta\servlet\jakarta.servlet-api\6.0.0\jakarta.servlet-api-6.0.0.jar"
} else {
    "\\10.1.10.56\c$\Tomcat11\lib\servlet-api.jar"
}
$mvelJar = "C:\Users\mark.AD\.m2\repository\org\mvel\mvel2\2.5.2.Final\mvel2-2.5.2.Final.jar"
$jdkHome = if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\javac.exe")) { $env:JAVA_HOME } else { "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-25.0.5.8-hotspot" }
$javac = "$jdkHome\bin\javac.exe"
$jar = "$jdkHome\bin\jar.exe"

$libPath = "\\10.1.10.56\c$\tomcat11-rating\webapps\helios-rating\WEB-INF\lib"
# Ensure mvel2 is in lib
if (Test-Path $mvelJar) {
    Copy-Item $mvelJar "$libPath\mvel2-2.5.2.Final.jar" -Force
}

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

