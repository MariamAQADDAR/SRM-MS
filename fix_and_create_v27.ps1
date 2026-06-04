$srcPath  = "c:\Users\HP\Desktop\project\import_medicines.sql"
$destPath = "c:\Users\HP\Desktop\project\srm-mutuelle-backend\src\main\resources\db\migration\V27__seed_medicaments_lord.sql"

$bytes   = [System.IO.File]::ReadAllBytes($srcPath)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)

# Fix mojibake: these are UTF-8 bytes incorrectly decoded as Latin-1 then re-encoded
# Each pair: broken -> correct
$content = $content -replace 'G\x{00C3}\x{00A9}n\x{00C3}\x{00A9}rique', 'Generique'
$content = $content -replace '\x{00C3}\x{00A9}', 'e'
$content = $content -replace '\x{00C3}\x{00A8}', 'e'
$content = $content -replace '\x{00C3}\x{00A0}', 'a'
$content = $content -replace '\x{00C3}\x{00A2}', 'a'
$content = $content -replace '\x{00C3}\x{00A7}', 'c'
$content = $content -replace '\x{00C3}\x{00AE}', 'i'
$content = $content -replace '\x{00C3}\x{00B4}', 'o'
$content = $content -replace '\x{00C3}\x{00BB}', 'u'
$content = $content -replace '\x{00C3}\x{00B9}', 'u'
$content = $content -replace '\x{00C3}\x{00AA}', 'e'
$content = $content -replace '\x{00C3}\x{00AB}', 'e'
$content = $content -replace '\x{00C3}\x{00AF}', 'i'
$content = $content -replace '\x{00C3}\x{00BC}', 'u'
$content = $content -replace '\x{00C3}\x{00B6}', 'o'
$content = $content -replace '\x{00C3}\x{0089}', 'E'
$content = $content -replace '\x{00C3}\x{008A}', 'E'
$content = $content -replace '\x{00C3}\x{0080}', 'A'
$content = $content -replace '\x{00C3}\x{0087}', 'C'

# Simple string replacements for common patterns still visible
$content = $content -replace 'Ã©', 'e'
$content = $content -replace 'Ã¨', 'e'
$content = $content -replace 'Ã ', 'a'
$content = $content -replace 'Ã¢', 'a'
$content = $content -replace 'Ã§', 'c'
$content = $content -replace 'Ã®', 'i'
$content = $content -replace 'Ã´', 'o'
$content = $content -replace 'Ã»', 'u'
$content = $content -replace 'Ã¹', 'u'
$content = $content -replace 'Ãª', 'e'
$content = $content -replace 'Ã«', 'e'
$content = $content -replace 'Ã¯', 'i'
$content = $content -replace 'Ã¼', 'u'
$content = $content -replace 'Ã¶', 'o'
$content = $content -replace 'Ã‰', 'E'
$content = $content -replace 'ÃŠ', 'E'
$content = $content -replace 'Ã€', 'A'
$content = $content -replace 'Ã‡', 'C'
$content = $content -replace 'GÃ©nÃ©rique', 'Generique'

# Replace generic/princeps correctly with proper accents in ASCII-safe way
$content = $content -replace "'Generique'", "'Generique'"

$header  = "-- V27 : Import referentiel medicaments marocain USER_COS.MEDICAMENT`r`n"
$header += "-- Source: lord_db.xlsx - $(Get-Date -Format 'yyyy-MM-dd')`r`n"
$header += "-- ~5700 medicaments avec EAN13, classe therapeutique, forme, presentation`r`n`r`n"
$final   = $header + $content

[System.IO.File]::WriteAllText($destPath, $final, (New-Object System.Text.UTF8Encoding $false))

$lines = ($final -split "`n").Count
Write-Host "V27 cree: $destPath ($lines lignes)"

$remaining = ([regex]::Matches($final, 'Ã')).Count
if ($remaining -gt 0) {
    Write-Host "ATTENTION: $remaining occurrences de artefacts restants"
} else {
    Write-Host "Encodage OK"
}
