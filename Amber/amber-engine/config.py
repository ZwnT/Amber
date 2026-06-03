# Copyright 2025 ZwnT
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys

# 物理路径加固：适配 PyInstaller 打包环境与开发环境
if getattr(sys, 'frozen', False):
    # 打包后的路径：.exe 所在的物理文件夹
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # 开发环境路径：当前脚本所在的物理文件夹
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")

# 确保数据目录存在（物理自动补全）
os.makedirs(DATA_DIR, exist_ok=True)

# SQLite 数据库配置
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'amber_memory.db')}"
