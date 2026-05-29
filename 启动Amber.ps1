# Amber 启动脚本
$nodePath = "$env:USERPROFILE\node22\node-v22.16.0-win-x64"
$mainUi   = "$PSScriptRoot\Amber\main_ui"
$engine   = "$PSScriptRoot\Amber\amber-engine"
$electron = "$mainUi\node_modules\electron\dist\electron.exe"

# 注入正确的 Node.js 22，并清除会干扰 Electron 的环境变量
$env:PATH = "$nodePath;$env:PATH"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

Write-Host "=== Amber 启动器 ===" -ForegroundColor Cyan

# 1. 启动 Python 后端（后台）
Write-Host "启动后端引擎..." -ForegroundColor Yellow
$backend = Start-Process python -ArgumentList "$engine\main.py" `
    -WorkingDirectory $engine -PassThru -WindowStyle Minimized
Write-Host "  后端 PID: $($backend.Id)"

# 2. 稍等后端就绪
Start-Sleep -Seconds 2

# 3. 启动 Next.js 开发服务器（后台）
Write-Host "启动前端开发服务器..." -ForegroundColor Yellow
$nextjs = Start-Process "$nodePath\node.exe" -ArgumentList "$nodePath\node_modules\npm\bin\npm-cli.js", "run", "dev" `
    -WorkingDirectory $mainUi -PassThru -WindowStyle Minimized
Write-Host "  Next.js PID: $($nextjs.Id)"

# 4. 等 Next.js 启动（通常需要 5-8 秒）
Write-Host "等待前端就绪（8秒）..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# 5. 直接启动 Electron（移除 ELECTRON_RUN_AS_NODE 后直接调用二进制）
Write-Host "启动 Electron 桌面窗口..." -ForegroundColor Green
Set-Location $mainUi
& $electron $mainUi

# 6. Electron 退出后清理
Write-Host "正在关闭后台进程..." -ForegroundColor Red
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $nextjs.Id  -Force -ErrorAction SilentlyContinue
Write-Host "Amber 已退出。"
