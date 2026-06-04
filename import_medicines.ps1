
# Script d'import USER_COS.MEDICAMENT -> table medicines (v2 - avec troncature)
param(
    [string]$xlPath = "d:\marieme\SRM-MS\lord_extract\xl",
    [string]$pgUser = "srm_user",
    [string]$pgPass = "YASSI123ne",
    [string]$pgHost = "localhost",
    [string]$pgDb   = "SRM-MS"
)

Write-Host "Chargement du fichier Excel..." -ForegroundColor Cyan

[xml]$ws = Get-Content "$xlPath\worksheets\sheet1.xml" -Encoding UTF8
[xml]$ss = Get-Content "$xlPath\sharedStrings.xml" -Encoding UTF8

$strings = @()
foreach ($si in $ss.sst.si) {
    $text = $si.t
    if (-not $text -and $si.r) { $text = ($si.r | ForEach-Object { $_.t }) -join '' }
    if ($null -eq $text) { $text = '' }
    $strings += $text
}

function GetCellValue($row, $col) {
    $cell = $row.c | Where-Object { $_.r -eq "$col$($row.r)" }
    if (-not $cell) { return $null }
    $val = $cell.v
    if ($cell.t -eq 's' -and $val -ne $null) { return $strings[[int]$val] }
    return $val
}

function PgEscape($s, $maxLen = 2000) {
    if ($null -eq $s -or $s -eq '') { return 'NULL' }
    $s = ($s -replace "`r`n|`r|`n", ' ' -replace '\s+', ' ').Trim()
    if ($s -eq '') { return 'NULL' }
    if ($s.Length -gt $maxLen) { $s = $s.Substring(0, $maxLen) }
    $s = $s -replace "'", "''"
    return "'$s'"
}

function ParseReimbursed($val) {
    if ($null -eq $val -or $val -eq '') { return 'false' }
    $v = ($val -replace "`r`n|`r|`n", ' ').Trim().ToLower()
    # Accept common indicators for reimbursed
    if ($v -match '^(oui|yes|true|remboursable|r)$') { return 'true' }
    # Accept indicators for non‑reimbursed (NR, non, no, false)
    if ($v -match '^(nr|non|no|false|0)$') { return 'false' }
    # Fallback: if contains the word "remboursable"
    if ($v -like '*remboursable*') { return 'true' }
    return 'false'
}

function ParseType($val) {
    if ($null -eq $val -or $val -eq '') { return "'Princeps'" }
    $v = ($val -replace "`r`n|`r|`n", ' ').Trim()
    # Normalize accents and case
    $vNorm = $v -replace "é", "e" -replace "É", "E"
    $vNorm = $vNorm.ToLower()
    if ($vNorm -match '^(princeps|p)$') { return "'Princeps'" }
    if ($vNorm -match '^(g[én]*|gen|generic|g)$') { return "'Générique'" }
    # Fallback to raw value quoted
    $vEsc = $v -replace "'", "''"
    return "'$vEsc'"
}

$dataRows = $ws.worksheet.sheetData.row | Where-Object { [int]$_.r -ge 2 }
Write-Host "Total lignes de données: $($dataRows.Count)" -ForegroundColor Cyan

$sqlLines = [System.Collections.Generic.List[string]]::new()
$sqlLines.Add("-- Import USER_COS.MEDICAMENT -> medicines")
$sqlLines.Add("-- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$sqlLines.Add("BEGIN;")
$sqlLines.Add("-- Suppression des données démo")
$sqlLines.Add("DELETE FROM medicines WHERE deleted = false AND id < 1000;")
$sqlLines.Add("")

$valueLines = [System.Collections.Generic.List[string]]::new()
$skipped = 0

foreach ($row in $dataRows) {
    # A=ID, B=CODEEAN13, C=NOTE, D=CLASSE_THERAPEUTIQUE, E=FORME
    # F=NOMDELASPECIALITE, G=OBSERVATION, H=PRESENTATION, I=PRINCEPS_OU_GENERIQUE, J=REMBOURSABLE
    $nom    = GetCellValue $row 'F'
    $ean    = GetCellValue $row 'B'
    $classe = GetCellValue $row 'D'
    $forme  = GetCellValue $row 'E'
    $pres   = GetCellValue $row 'H'
    $type   = GetCellValue $row 'I'
    $remb   = GetCellValue $row 'J'
    $note   = GetCellValue $row 'C'
    $obs    = GetCellValue $row 'G'

    # Ignorer lignes d'en-tête dupliquées ou vides
    if ($null -eq $nom -or $nom.Trim() -eq '' -or
        $nom -like 'NOMDELASP*' -or $nom -eq 'NOMDELASPECIALITE') {
        $skipped++
        continue
    }

    $typeVal = ParseType $type
    $rembVal = ParseReimbursed $remb

    $line = "  ($(PgEscape $nom 255), $(PgEscape $ean 32), $(PgEscape $classe 150), $(PgEscape $forme 200), $(PgEscape $pres 250), $typeVal, $rembVal, $(PgEscape $note 500), $(PgEscape $obs 1000), false)"
    $valueLines.Add($line)
}

Write-Host "Lignes valides: $($valueLines.Count) | Ignorées: $skipped" -ForegroundColor Green

# Écrire les INSERT par lots de 500
$batchSize = 500
$total = $valueLines.Count
for ($i = 0; $i -lt $total; $i += $batchSize) {
    $end = [Math]::Min($i + $batchSize, $total) - 1
    $batch = $valueLines[$i..$end]
    $sqlLines.Add("INSERT INTO medicines (name, ean13, therapeutic_class, form, presentation, medicine_type, reimbursed, note, observation, deleted)")
    $sqlLines.Add("VALUES")
    for ($j = 0; $j -lt $batch.Count; $j++) {
        if ($j -lt $batch.Count - 1) { $sqlLines.Add($batch[$j] + ",") }
        else                          { $sqlLines.Add($batch[$j] + ";") }
    }
    $sqlLines.Add("")
}

$sqlLines.Add("COMMIT;")

$sqlPath = "d:\marieme\SRM-MS\import_medicines.sql"
[System.IO.File]::WriteAllLines($sqlPath, $sqlLines, [System.Text.Encoding]::UTF8)
Write-Host "SQL généré: $sqlPath ($($valueLines.Count) lignes)" -ForegroundColor Green

# Exécution
Write-Host "Exécution de l'import en base..." -ForegroundColor Cyan
$env:PGPASSWORD = $pgPass
$result = & psql -U $pgUser -h $pgHost -d $pgDb -f $sqlPath 2>&1
$result | ForEach-Object { Write-Host $_ }

# Vérification
$count = & psql -U $pgUser -h $pgHost -d $pgDb -t -c "SELECT COUNT(*) FROM medicines WHERE deleted = false;" 2>&1
Write-Host "Médicaments en base: $($count.Trim())" -ForegroundColor Green
