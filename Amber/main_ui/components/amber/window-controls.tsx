"use client"

import { Minus, Square, X } from "lucide-react"

export function WindowControls() {
  const handleAction = (action: string) => {
    // 使用通过 preload.js 安全暴露的 electronAPI
    const api = (window as any).electronAPI;
    
    if (api) {
      if (action === 'window-min') api.windowMin();
      if (action === 'window-max') api.windowMax();
      if (action === 'window-close') api.windowClose();
    } else {
      console.log(`Window action: ${action} (Not in Electron environment)`);
    }
  };

  return (
    <div className="flex items-center h-full px-2">
      <div className="flex items-center gap-0.5">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
          title="最小化"
          onClick={() => handleAction('window-min')}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
          title="最大化"
          onClick={() => handleAction('window-max')}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          className="w-10 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive hover:text-white transition-all duration-200"
          title="关闭"
          onClick={() => handleAction('window-close')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
