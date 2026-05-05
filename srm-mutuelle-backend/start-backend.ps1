$envFile = ".\.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#")) {
      $pair = $_ -split "=", 2
      if ($pair.Length -eq 2) {
        [System.Environment]::SetEnvironmentVariable($pair[0].Trim(), $pair[1].Trim(), "Process")
      }
    }
  }
}

.\mvnw.cmd spring-boot:run
