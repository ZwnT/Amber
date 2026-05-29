"""Amber one-click launcher."""
import os
import sys
import time
import subprocess
import urllib.request
import urllib.error

ROOT    = os.path.dirname(os.path.abspath(__file__))
AMBER   = os.path.join(ROOT, "Amber")
ENGINE  = os.path.join(AMBER, "amber-engine")
UI      = os.path.join(AMBER, "main_ui")
NODE    = os.path.join(os.environ["USERPROFILE"], "node22", "node-v22.16.0-win-x64")
NPM     = os.path.join(NODE, "npm.cmd")
ELECTRON = os.path.join(UI, "node_modules", "electron", "dist", "electron.exe")

env = os.environ.copy()
env["PATH"] = NODE + os.pathsep + env.get("PATH", "")
env.pop("ELECTRON_RUN_AS_NODE", None)


def wait_http(url: str, label: str, timeout: int = 60) -> bool:
    print(f"  等待 {label} ...", end="", flush=True)
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            print(" ✓")
            return True
        except Exception:
            print(".", end="", flush=True)
            time.sleep(2)
    print(" 超时！")
    return False


def main():
    print("\n================================")
    print("   Amber 数字生命引擎  启动中")
    print("================================\n")

    # 1. Backend
    print("[1/3] 启动后端 (port 8000)...")
    backend = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=ENGINE, env=env,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )
    if not wait_http("http://127.0.0.1:8000/api/health", "后端"):
        print("后端启动失败。")
        input("按 Enter 退出...")
        sys.exit(1)

    # 2. Next.js
    print("[2/3] 启动前端 (port 3000)...")
    nextjs = subprocess.Popen(
        [NPM, "run", "dev"],
        cwd=UI, env=env,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )
    if not wait_http("http://localhost:3000", "前端", timeout=90):
        print("前端启动失败。")
        backend.terminate()
        input("按 Enter 退出...")
        sys.exit(1)

    # 3. Electron
    print("[3/3] 启动 Electron 桌面窗口...")
    app = subprocess.Popen([ELECTRON, UI], cwd=UI, env=env)
    print(f"\n✓ Amber 已启动 (PID: {app.pid})")
    print("  关闭 Electron 窗口后将自动清理后台进程。\n")

    app.wait()

    print("正在关闭后台服务...")
    backend.terminate()
    nextjs.terminate()
    time.sleep(1)
    print("Amber 已退出。")


if __name__ == "__main__":
    main()
