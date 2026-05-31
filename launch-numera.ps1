# Numera -- Build & Launch in BlueStacks

$PROJECT_DIR = "$PSScriptRoot\android"
$APK_PATH    = "$PROJECT_DIR\app\build\outputs\apk\debug\app-debug.apk"
$PACKAGE     = "com.example.numera"
$ACTIVITY    = "com.example.numera.MainActivity"
$BLUESTACKS  = "C:\Program Files\BlueStacks_nxt\HD-Player.exe"
$ADB         = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$ADB_TARGET  = "localhost:5555"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`n  FAILED: $msg" -ForegroundColor Red; Read-Host "Press Enter to exit"; exit 1 }

# ── 1. Build APK ────────────────────────────────────────────────────────────
Step "Building debug APK..."
Set-Location $PROJECT_DIR
cmd /c "gradlew.bat assembleDebug"
if ($LASTEXITCODE -ne 0) { Fail "Gradle build failed with exit code $LASTEXITCODE" }
if (-not (Test-Path $APK_PATH)) { Fail "APK not found after build: $APK_PATH" }
OK "APK ready"

# ── 2. Start BlueStacks if not running ──────────────────────────────────────
Step "Checking BlueStacks..."
$bs = Get-Process "HD-Player" -ErrorAction SilentlyContinue
if ($bs) {
    OK "BlueStacks already running"
} else {
    Start-Process $BLUESTACKS
    Write-Host "    Waiting 20s for BlueStacks to boot..." -ForegroundColor Yellow
    Start-Sleep -Seconds 20
}

# ── 3. Connect ADB ──────────────────────────────────────────────────────────
Step "Connecting ADB to $ADB_TARGET..."
& $ADB start-server 2>$null

$connected = $false
for ($i = 1; $i -le 12; $i++) {
    & $ADB connect $ADB_TARGET 2>$null | Out-Null
    $deviceList = & $ADB devices 2>$null
    $found = $deviceList | Where-Object { $_ -like "*$ADB_TARGET*device*" }
    if ($found) {
        OK "Device ready"
        $connected = $true
        break
    }
    Write-Host "    Attempt $i/12 -- waiting..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
if (-not $connected) { Fail "Could not connect to BlueStacks ADB after 60s. Make sure ADB is enabled in BlueStacks settings." }

# ── 4. Install APK ──────────────────────────────────────────────────────────
Step "Installing APK..."
$out = & $ADB -s $ADB_TARGET install -r $APK_PATH 2>&1
Write-Host "    $out"
if ($LASTEXITCODE -ne 0 -and ($out -notlike "*Success*")) { Fail "Install failed" }
OK "Installed"

# ── 5. Launch ───────────────────────────────────────────────────────────────
Step "Launching app..."
& $ADB -s $ADB_TARGET shell am start -n "$PACKAGE/$ACTIVITY" 2>&1 | Out-Null
OK "App launched in BlueStacks!"

Write-Host "`nDone. Numera is running.`n" -ForegroundColor Green
Read-Host "Press Enter to close"
