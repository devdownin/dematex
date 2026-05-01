# Configuration
$BaseDir = ".\regulatory_files"
$Recipients = @("REC_001", "REC_002")
$Entities = @("ENT_ALPHA", "ENT_BETA")
$DocTypes = @("VTIS", "FTIS", "PTIS", "REFERENTIEL")

Write-Host "Creating directory structure in $BaseDir..."

foreach ($rec in $Recipients) {
    foreach ($ent in $Entities) {
        foreach ($type in $DocTypes) {
            $Path = Join-Path $BaseDir (Join-Path $rec (Join-Path $ent $type))
            New-Item -ItemType Directory -Force -Path $Path | Out-Null

            # Create sample files with .xml extension
            New-Item -ItemType File -Path (Join-Path $Path "doc_202401_$($type)_001.xml") -Force | Out-Null
            New-Item -ItemType File -Path (Join-Path $Path "doc_202401_$($type)_002.xml") -Force | Out-Null

            # Create some already processed files with .AR3 extension
            New-Item -ItemType File -Path (Join-Path $Path "doc_202312_$($type)_processed.AR3") -Force | Out-Null

            Write-Host "Created: $Path"
        }
    }
}

Write-Host "Structure created successfully."
Get-ChildItem -Path $BaseDir -Recurse
