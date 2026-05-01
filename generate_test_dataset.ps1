[CmdletBinding()]
param(
    [ValidateSet("Full", "Sample")]
    [string]$Profile = "Full",

    [string]$OutputRoot = ".\generated_regulatory_files",

    [ValidatePattern("^\d{6}$")]
    [string]$Period = (Get-Date).AddMonths(-1).ToString("yyyyMM"),

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$InvariantCulture = [System.Globalization.CultureInfo]::InvariantCulture

function Resolve-SafeOutputRoot {
    param(
        [string]$PathValue
    )

    $basePath = if ([System.IO.Path]::IsPathRooted($PathValue)) {
        $PathValue
    } else {
        Join-Path -Path (Get-Location) -ChildPath $PathValue
    }

    return [System.IO.Path]::GetFullPath($basePath)
}

function Reset-Directory {
    param(
        [string]$TargetPath
    )

    if (Test-Path -LiteralPath $TargetPath) {
        Remove-Item -LiteralPath $TargetPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
}

function Get-StatusForIndex {
    param(
        [int]$Index
    )

    switch ($Index % 10) {
        0 { return "AR3" }
        1 { return "AR1" }
        default { return "xml" }
    }
}

function Get-ClientTypeForIndex {
    param(
        [int]$Index
    )

    $bucket = $Index % 20
    if ($bucket -lt 14) { return "B2BD" }
    if ($bucket -lt 17) { return "B2BI" }
    return "B2G"
}

function Get-PaymentTypeForIndex {
    param(
        [int]$Index
    )

    $bucket = $Index % 18
    if ($bucket -eq 0) { return "REJET" }
    if ($bucket -eq 1) { return "PERTE" }
    if ($bucket -eq 2) { return "CORRECTION" }
    return "PAIEMENT"
}

function Get-Distribution {
    param(
        [int]$Total,
        [int]$BucketCount
    )

    $baseValue = [math]::Floor($Total / $BucketCount)
    $remainder = $Total % $BucketCount
    $distribution = New-Object int[] $BucketCount

    for ($i = 0; $i -lt $BucketCount; $i++) {
        $distribution[$i] = $baseValue + $(if ($i -lt $remainder) { 1 } else { 0 })
    }

    return $distribution
}

function New-Utf8File {
    param(
        [string]$Path,
        [string]$Content
    )

    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Format-DecimalInvariant {
    param(
        [decimal]$Value
    )

    return $Value.ToString("0.00", $InvariantCulture)
}

function New-EntityCodes {
    param(
        [string]$Prefix,
        [int]$Count
    )

    $codes = New-Object System.Collections.Generic.List[string]
    for ($i = 1; $i -le $Count; $i++) {
        $codes.Add(("{0}_{1:000}" -f $Prefix, $i))
    }
    return $codes.ToArray()
}

function New-VtisXml {
    param(
        [string]$Recipient,
        [string]$Entity,
        [string]$PeriodLabel,
        [decimal]$Rub1,
        [decimal]$Rub2,
        [decimal]$Rub3,
        [decimal]$B2bi,
        [decimal]$B2bd,
        [decimal]$B2g,
        [decimal]$GapAmount,
        [string]$TrainId,
        [string]$CrmensRef
    )

    $totalTtc = $Rub1 + $Rub2 + $Rub3
    return @"
<?xml version="1.0" encoding="UTF-8"?>
<vtis xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://localhost:8080/api/v1/schemas/VTIS/v1.0"
      version="1.0">
  <issuer>$Recipient</issuer>
  <entity>$Entity</entity>
  <period>$PeriodLabel</period>
  <trainId>$TrainId</trainId>
  <crmensRef>$CrmensRef</crmensRef>
  <rub1>$(Format-DecimalInvariant -Value $Rub1)</rub1>
  <rub2>$(Format-DecimalInvariant -Value $Rub2)</rub2>
  <rub3>$(Format-DecimalInvariant -Value $Rub3)</rub3>
  <b2bi>$(Format-DecimalInvariant -Value $B2bi)</b2bi>
  <b2bd>$(Format-DecimalInvariant -Value $B2bd)</b2bd>
  <b2g>$(Format-DecimalInvariant -Value $B2g)</b2g>
  <gapAmount>$(Format-DecimalInvariant -Value $GapAmount)</gapAmount>
  <totalTtc>$(Format-DecimalInvariant -Value $totalTtc)</totalTtc>
</vtis>
"@
}

function New-FtisXml {
    param(
        [string]$Recipient,
        [string]$Entity,
        [string]$PeriodLabel,
        [string]$ClientType,
        [string[]]$InvoiceXml
    )

    $invoiceBlock = ($InvoiceXml -join [Environment]::NewLine)
    return @"
<?xml version="1.0" encoding="UTF-8"?>
<ftis xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://localhost:8080/api/v1/schemas/FTIS/v1.0"
      version="1.0">
  <issuer>$Recipient</issuer>
  <entity>$Entity</entity>
  <period>$PeriodLabel</period>
  <clientType>$ClientType</clientType>
$invoiceBlock
</ftis>
"@
}

function New-PtisXml {
    param(
        [string]$Recipient,
        [string]$Entity,
        [string]$PeriodLabel,
        [string[]]$PaymentXml,
        [bool]$IsLastMonthlyFlow
    )

    $paymentBlock = ($PaymentXml -join [Environment]::NewLine)
    $lastFlowFlag = if ($IsLastMonthlyFlow) { "true" } else { "false" }
    return @"
<?xml version="1.0" encoding="UTF-8"?>
<ptis xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://localhost:8080/api/v1/schemas/PTIS/v1.0"
      version="1.0">
  <issuer>$Recipient</issuer>
  <entity>$Entity</entity>
  <period>$PeriodLabel</period>
  <lastMonthlyFlow>$lastFlowFlag</lastMonthlyFlow>
$paymentBlock
</ptis>
"@
}

function New-ZipWithEntry {
    param(
        [string]$ZipPath,
        [string]$EntryName,
        [string]$Content
    )

    $utf8 = [System.Text.UTF8Encoding]::new($false)
    $stream = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    try {
        $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
        try {
            $entry = $archive.CreateEntry($EntryName)
            $entryStream = $entry.Open()
            try {
                $writer = New-Object System.IO.StreamWriter($entryStream, $utf8)
                try {
                    $writer.Write($Content)
                }
                finally {
                    $writer.Dispose()
                }
            }
            finally {
                $entryStream.Dispose()
            }
        }
        finally {
            $archive.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

$recipientDefinitions = @(
    [pscustomobject]@{
        Name = "Indigo"
        Prefix = "IND"
        VtisCount = 11
        FtisCount = 6600
        PtisCount = 6600
        Entities = New-EntityCodes -Prefix "INDIGO_EJ" -Count 150
    }
    [pscustomobject]@{
        Name = "REPA"
        Prefix = "REP"
        VtisCount = 11
        FtisCount = 1100
        PtisCount = 1100
        Entities = New-EntityCodes -Prefix "REPA_EJ" -Count 25
    }
    [pscustomobject]@{
        Name = "REORA"
        Prefix = "REO"
        VtisCount = 11
        FtisCount = 132
        PtisCount = 132
        Entities = New-EntityCodes -Prefix "REORA_EJ" -Count 10
    }
)

if ($Profile -eq "Sample") {
    foreach ($definition in $recipientDefinitions) {
        $definition.VtisCount = 3
        $definition.FtisCount = [Math]::Min($definition.FtisCount, 18)
        $definition.PtisCount = [Math]::Min($definition.PtisCount, 18)
    }
}

$resolvedOutputRoot = Resolve-SafeOutputRoot -PathValue $OutputRoot
if ((Test-Path -LiteralPath $resolvedOutputRoot) -and -not $Force) {
    throw "Le répertoire cible existe déjà: $resolvedOutputRoot. Relancez avec -Force pour le régénérer."
}

Reset-Directory -TargetPath $resolvedOutputRoot

$periodLabel = "{0}-{1}" -f $Period.Substring(0, 4), $Period.Substring(4, 2)
$manifestRows = New-Object System.Collections.Generic.List[object]

foreach ($recipient in $recipientDefinitions) {
    $entityDistributionFtis = Get-Distribution -Total $recipient.FtisCount -BucketCount $recipient.Entities.Count
    $entityDistributionPtis = Get-Distribution -Total $recipient.PtisCount -BucketCount $recipient.Entities.Count
    $invoiceCatalog = New-Object 'System.Collections.Generic.Dictionary[string,System.Collections.Generic.List[object]]'

    for ($entityIndex = 0; $entityIndex -lt $recipient.Entities.Count; $entityIndex++) {
        $entity = $recipient.Entities[$entityIndex]
        $entityRoot = Join-Path $resolvedOutputRoot $recipient.Name
        $entityRoot = Join-Path $entityRoot $entity

        foreach ($docType in @("VTIS", "FTIS", "PTIS")) {
            New-Item -ItemType Directory -Path (Join-Path $entityRoot $docType) -Force | Out-Null
        }

        $invoiceCatalog[$entity] = New-Object 'System.Collections.Generic.List[object]'

        if ($entityIndex -lt $recipient.VtisCount) {
            $rub1 = [decimal](120000 + ($entityIndex * 1850) + ($recipient.Name.Length * 270))
            $rub2 = [decimal](4500 + ($entityIndex * 145))
            $rub3 = [decimal](7800 + ($entityIndex * 190))
            $total = $rub1 + $rub2 + $rub3
            $b2bd = [decimal]([math]::Round([double]($total * [decimal]0.76), 2))
            $b2bi = [decimal]([math]::Round([double]($total * [decimal]0.16), 2))
            $b2g = [decimal]($total - $b2bd - $b2bi)
            $gapAmount = [decimal](($entityIndex % 3) * 12.50)
            $vtisXml = New-VtisXml `
                -Recipient $recipient.Name `
                -Entity $entity `
                -PeriodLabel $periodLabel `
                -Rub1 $rub1 `
                -Rub2 $rub2 `
                -Rub3 $rub3 `
                -B2bd $b2bd `
                -B2bi $b2bi `
                -B2g $b2g `
                -GapAmount $gapAmount `
                -TrainId ("TRAIN-{0}-{1:00}" -f $Period, ($entityIndex + 1)) `
                -CrmensRef ("CRMENS-{0}-{1:00}" -f $Period, ($entityIndex + 1))

            $vtisStatus = Get-StatusForIndex -Index $entityIndex
            $vtisFile = Join-Path (Join-Path $entityRoot "VTIS") ("doc_{0}_VTIS_{1:000}.xml.{2}" -f $Period, ($entityIndex + 1), $vtisStatus)
            New-Utf8File -Path $vtisFile -Content $vtisXml
            $manifestRows.Add([pscustomobject]@{ Recipient = $recipient.Name; Entity = $entity; Type = "VTIS"; File = [System.IO.Path]::GetFileName($vtisFile); Status = $vtisStatus })
        }

        $ftisCountForEntity = $entityDistributionFtis[$entityIndex]
        for ($ftisIndex = 1; $ftisIndex -le $ftisCountForEntity; $ftisIndex++) {
            $globalIndex = ($entityIndex * 100000) + $ftisIndex
            $clientType = Get-ClientTypeForIndex -Index $globalIndex
            $status = Get-StatusForIndex -Index $globalIndex
            $invoiceCount = 2 + ($globalIndex % 3)
            $invoiceXml = New-Object System.Collections.Generic.List[string]

            for ($invoiceIndex = 1; $invoiceIndex -le $invoiceCount; $invoiceIndex++) {
                $invoiceId = "{0}-{1:00}-{2}-{3:0000}-{4:00}" -f $recipient.Prefix, ($entityIndex + 1), $clientType, $ftisIndex, $invoiceIndex
                $amount = [decimal](95 + (($globalIndex + $invoiceIndex) % 70) * 13 + ($entityIndex * 7))
                $crmensRef = "CRMENS-{0}-{1:00}" -f $Period, ($entityIndex + 1)
                $invoiceCatalog[$entity].Add([pscustomobject]@{
                    InvoiceId = $invoiceId
                    Amount = $amount
                    ClientType = $clientType
                    CrmensRef = $crmensRef
                })
                $invoiceXml.Add("  <invoice><id>$invoiceId</id><amountTtc>$(Format-DecimalInvariant -Value $amount)</amountTtc><crmensRef>$crmensRef</crmensRef></invoice>")
            }

            $ftisXml = New-FtisXml -Recipient $recipient.Name -Entity $entity -PeriodLabel $periodLabel -ClientType $clientType -InvoiceXml $invoiceXml
            $ftisDir = Join-Path $entityRoot "FTIS"
            $ftisFile = Join-Path $ftisDir ("doc_{0}_FTIS_{1}_{2:0000}.zip.{3}" -f $Period, $clientType, $ftisIndex, $status)
            New-ZipWithEntry -ZipPath $ftisFile -EntryName ("ftis_{0}_{1:0000}.xml" -f $clientType, $ftisIndex) -Content $ftisXml
            $manifestRows.Add([pscustomobject]@{ Recipient = $recipient.Name; Entity = $entity; Type = "FTIS"; File = [System.IO.Path]::GetFileName($ftisFile); Status = $status })
        }

        $ptisCountForEntity = $entityDistributionPtis[$entityIndex]
        $entityInvoices = $invoiceCatalog[$entity]
        for ($ptisIndex = 1; $ptisIndex -le $ptisCountForEntity; $ptisIndex++) {
            $globalIndex = ($entityIndex * 100000) + $ptisIndex
            $status = Get-StatusForIndex -Index ($globalIndex + 3)
            $paymentCount = 1 + ($globalIndex % 2)
            $paymentXml = New-Object System.Collections.Generic.List[string]

            for ($paymentIndex = 0; $paymentIndex -lt $paymentCount; $paymentIndex++) {
                $catalogIndex = ($ptisIndex + $paymentIndex - 1) % $entityInvoices.Count
                $invoice = $entityInvoices[$catalogIndex]
                $paymentType = Get-PaymentTypeForIndex -Index ($globalIndex + $paymentIndex)
                $ratio = switch ($paymentType) {
                    "REJET" { [decimal]1.00 }
                    "PERTE" { [decimal]0.35 }
                    "CORRECTION" { [decimal]-0.10 }
                    default { [decimal]1.00 }
                }
                $amount = [decimal]([math]::Round([double]($invoice.Amount * $ratio), 2))
                $paymentXml.Add("  <payment><invoiceId>$($invoice.InvoiceId)</invoiceId><amount>$(Format-DecimalInvariant -Value $amount)</amount><type>$paymentType</type></payment>")
            }

            $isLastMonthlyFlow = $ptisIndex -eq $ptisCountForEntity
            $ptisXml = New-PtisXml -Recipient $recipient.Name -Entity $entity -PeriodLabel $periodLabel -PaymentXml $paymentXml -IsLastMonthlyFlow:$isLastMonthlyFlow
            $ptisDir = Join-Path $entityRoot "PTIS"
            $ptisFile = Join-Path $ptisDir ("doc_{0}_PTIS_{1:0000}.xml.{2}" -f $Period, $ptisIndex, $status)
            New-Utf8File -Path $ptisFile -Content $ptisXml
            $manifestRows.Add([pscustomobject]@{ Recipient = $recipient.Name; Entity = $entity; Type = "PTIS"; File = [System.IO.Path]::GetFileName($ptisFile); Status = $status })
        }
    }
}

$manifestPath = Join-Path $resolvedOutputRoot "manifest.csv"
$manifestRows |
    Select-Object Recipient, Entity, Type, Status, File |
    Export-Csv -Path $manifestPath -NoTypeInformation -Encoding UTF8

$summary = $manifestRows |
    Group-Object Recipient, Type |
    Sort-Object Name |
    ForEach-Object {
        $parts = $_.Name -split ", "
        [pscustomobject]@{
            Recipient = $parts[0]
            Type = $parts[1]
            Count = $_.Count
        }
    }

Write-Host ""
Write-Host "Jeu d'essai généré dans: $resolvedOutputRoot"
Write-Host "Période: $periodLabel"
Write-Host "Profil: $Profile"
Write-Host ""
$summary | Format-Table -AutoSize
Write-Host ""
Write-Host "Manifest: $manifestPath"
