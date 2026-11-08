# Cache Mapzen/AWS Terrarium terrain: full Mediterranean overview and Italy detail.
# Source and attribution: https://registry.opendata.aws/terrain-tiles/
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$terrainRoot = Join-Path $root 'map-lab/terrain'
$levels = @(
    @{ Zoom = 4; XMin = 7; XMax = 10; YMin = 4; YMax = 7 },
    @{ Zoom = 5; XMin = 14; XMax = 21; YMin = 9; YMax = 14 },
    @{ Zoom = 6; XMin = 28; XMax = 42; YMin = 19; YMax = 28 },
    @{ Zoom = 7; XMin = 65; XMax = 71; YMin = 44; YMax = 50 }
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
            if ($bytes.Length -lt 100 -or [Convert]::ToBase64String($bytes[0..7]) -ne 'iVBORw0KGgo=') {
                throw "Invalid terrain tile: $target"
            }
        }
    }
    Write-Output "Verified terrain zoom $($level.Zoom)."
}
Write-Output "Downloaded $downloaded tiles; verified 263."
