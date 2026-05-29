# Amber 一键启动器
$nodePath = "$env:USERPROFILE\node22\node-v22.16.0-win-x64"
$root     = $PSScriptRoot
$mainUi   = "$root\Amber\main_ui"
$engine   = "$root\Amber\amber-engine"
$electron = "$mainUi\node_modules\electron\dist\electron.exe"

$env:PATH = "$nodePath;$env:PATH"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

function Wait-Http($url, $label, $timeoutSec = 60) {
    Write-Host "  等待 $label 就绪..." -NoNewline
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -lt 400) { Write-Host " 就绪 ✓" -ForegroundColor Green; return $true }
        } catch {}
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    Write-Host " 超时！" -ForegroundColor Red
    return $false
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "   Amber 数字生命引擎  启动中" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# 1. 启动 Python 后端
Write-Host "[1/3] 启动后端引擎 (port 8000)..." -ForegroundColor Yellow
$backend = Start-Process python -ArgumentList "$engine\main.py" `
    -WorkingDirectory $engine -PassThru -WindowStyle Minimized
if (-not (Wait-Http "http://127.0.0.1:8000/api/health" "后端")) {
    Write-Host "后端启动失败，请检查 Python 环境。" -ForegroundColor Red
    pause; exit 1
}

# 2. 启动 Next.js 前端
Write-Host "[2/3] 启动前端服务 (port 3000)..." -ForegroundColor Yellow
$nextjs = Start-Process "$nodePath\node.exe" `
    -ArgumentList "$nodePath\node_modules\npm\bin\npm-cli.js", "run", "dev" `
    -WorkingDirectory $mainUi -PassThru -WindowStyle Minimized
if (-not (Wait-Http "http://localhost:3000" "前端")) {
    Write-Host "前端启动失败，请检查 Node.js 环境。" -ForegroundColor Red
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    pause; exit 1
}

# 3. 启动 Electron
Write-Host "[3/3] 启动 Electron 桌面窗口..." -ForegroundColor Yellow
Set-Location $mainUi
$app = Start-Process -FilePath $electron -ArgumentList $mainUi `
    -WorkingDirectory $mainUi -PassThru -WindowStyle Normal
Write-Host ""
Write-Host "✓ Amber 已启动 (PID: $($app.Id))" -ForegroundColor Green
Write-Host "  关闭 Electron 窗口后，本脚本自动清理后台进程。"
Write-Host ""

# 等待 Electron 退出
$app.WaitForExit()

# 清理
Write-Host "正在关闭后台服务..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $nextjs.Id  -Force -ErrorAction SilentlyContinue
taskkill /f /im node.exe 2>$null | Out-Null
Write-Host "Amber 已退出。" -ForegroundColor Cyan
Start-Sleep -Seconds 1
