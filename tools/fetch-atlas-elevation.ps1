# Cache overview-scale Mapzen/AWS Terrarium terrain for the playable map bounds.
# Source and attribution: https://registry.opendata.aws/terrain-tiles/
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$terrainRoot = Join-Path $root 'map-lab/terrain'
$levels = @(
    @{ Zoom = 4; XMin = 7; XMax = 10; YMin = 4; YMax = 7 },
    @{ Zoom = 5; XMin = 14; XMax = 21; YMin = 9; YMax = 14 }
)
$downloaded = 0
foreach ($level in $levels) {
    for ($x = $level.XMin; $x -le $level.XMax; $x++) {
        for ($y = $level.YMin; $y -le $level.YMax; $y++) {
            $dir = Join-Path $terrainRoot "$($level.Zoom)/$x"
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            $target = Join-Path $dir "$y.png"
            if (-not (Test-Path -LiteralPath $target)) {
                $uri = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/$($level.Zoom)/$x/$y.png"
                Invoke-WebRequest -Uri $uri -OutFile $target -TimeoutSec 30
                $downloaded++
            }
            $bytes = [IO.File]::ReadAllBytes($target)
            if ($bytes.Length -lt 100 -or [Convert]::ToHexString($bytes,0,8) -ne '89504E470D0A1A0A') {
                throw "Invalid terrain tile: $target"
            }
        }
    }
    Write-Output "Verified terrain zoom $($level.Zoom)."
}
Write-Output "Downloaded $downloaded tiles; verified 64."
