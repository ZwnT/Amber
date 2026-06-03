/**
 * Copyright 2025 ZwnT
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
