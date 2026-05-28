"use client"

export function TitleBar() {
  return (
    <div className="h-8 bg-sidebar border-b border-sidebar-border flex items-center px-3 select-none">
      {/* macOS Window Controls */}
      <div className="flex items-center gap-2">
        <button
          className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-90 transition-all"
          title="关闭"
        />
        <button
          className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-90 transition-all"
          title="最小化"
        />
        <button
          className="w-3 h-3 rounded-full bg-[#27CA40] hover:brightness-90 transition-all"
          title="最大化"
        />
      </div>

      {/* App Title - Centered */}
      <div className="flex-1 flex justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          Amber
        </span>
      </div>

      {/* Spacer for symmetry */}
      <div className="w-14" />
    </div>
  )
}
