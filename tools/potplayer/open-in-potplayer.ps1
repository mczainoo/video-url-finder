<#
  Registered as the handler for the custom "potplayer://" protocol (see
  register-potplayer-protocol.reg). Windows invokes this script with the
  full clicked URI as the first argument, e.g.:
    potplayer://https://example.com/video.mp4?token=abc

  It strips the "potplayer://" prefix and hands the remaining video URL
  straight to PotPlayer, which streams it directly instead of waiting for
  a browser download - this is the "fast play" path.
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Uri
)

$videoUrl = $Uri -replace '^potplayer:(//)?', ''

$candidates = @(
    "$env:ProgramFiles\DAUM\PotPlayer\PotPlayerMini64.exe",
    "${env:ProgramFiles(x86)}\DAUM\PotPlayer\PotPlayerMini64.exe",
    "$env:ProgramFiles\DAUM\PotPlayer\PotPlayerMini.exe",
    "${env:ProgramFiles(x86)}\DAUM\PotPlayer\PotPlayerMini.exe",
    "$env:LOCALAPPDATA\PotPlayer\PotPlayerMini64.exe"
)

$potPlayer = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $potPlayer) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "Couldn't find PotPlayerMini64.exe in the usual install locations.`n`nEdit `$candidates in open-in-potplayer.ps1 to point at your install.",
        "Video URL Finder",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    exit 1
}

Start-Process -FilePath $potPlayer -ArgumentList "`"$videoUrl`""
