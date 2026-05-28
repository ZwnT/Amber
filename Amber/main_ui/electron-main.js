const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let pythonProcess = null;

// 彻底禁用全局原生菜单栏
Menu.setApplicationMenu(null);

function startBackend() {
  if (app.isPackaged) {
    // 生产环境：拉起编译后的二进制文件
    const backendPath = path.join(process.resourcesPath, 'amber_core', 'amber_core.exe');
    console.log(`[Electron] Starting packaged backend: ${backendPath}`);
    pythonProcess = spawn(backendPath, [], {
      shell: true,
      stdio: 'inherit'
    });
  } else {
    // 开发环境下启动 Python 后端
    const pythonPath = 'python'; 
    const scriptPath = path.join(__dirname, '..', 'amber-engine', 'main.py');
    pythonProcess = spawn(pythonPath, [scriptPath], {
      shell: true,
      stdio: 'inherit'
    });
  }

  // 监听进程退出，防止意外闪崩
  pythonProcess.on('exit', (code) => {
    console.log(`[Electron] Backend process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // 开启无边框模式，彻底去掉原生标题栏
    transparent: false, 
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false, // 提高安全性，关闭直接 node 注入
      contextIsolation: true, // 启用上下文隔离
      preload: path.join(__dirname, 'preload.js'), // 注入预加载脚本
      webSecurity: false
    },
    icon: path.join(__dirname, 'public', 'logo.png')
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 窗口控制逻辑 IPC 监听
ipcMain.on('window-min', () => mainWindow.minimize());
ipcMain.on('window-max', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => app.quit());

// 软件启动时的生命起点
app.whenReady().then(() => {
  startBackend();
  createWindow();
});
  
  // 生命周期彻底死锁：关闭窗口时刚性杀死 Python 后端进程
function killBackend() {
  if (pythonProcess) {
    console.log('[Electron] Killing backend process...');
    if (process.platform === 'win32') {
      // Windows 平台下，spawn 使用 shell: true 会产生进程树，需要用 taskkill 刚性物理切除
      exec(`taskkill /pid ${pythonProcess.pid} /T /F`, (err) => {
        if (err) {
          console.error('[Electron] Failed to kill backend via taskkill:', err);
          // 兜底：如果 taskkill 失败，尝试按名称强制切除
          exec('taskkill /f /t /im amber_core.exe');
        }
      });
    } else {
      pythonProcess.kill();
    }
    pythonProcess = null;
  }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    killBackend();
    app.quit();
  }
});

app.on('before-quit', () => {
  killBackend();
});
