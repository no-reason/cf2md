# Codeforces Markdown Copy

一个 Chrome 浏览器插件，可以一键将 Codeforces 题目转换为 Markdown 格式并复制到剪贴板。

## 功能特性

- ✅ 一键复制 Codeforces 题目为 Markdown 格式
- ✅ 支持数学公式（LaTeX）
- ✅ 支持样例输入输出
- ✅ 支持表格、列表、图片等格式
- ✅ 优雅的悬浮按钮和复制提示
- ✅ 支持 Contest、Problemset 和 Gym 题目页面

## 安装方法

### 方式 1：开发者模式安装（推荐）

1. 下载或克隆此仓库到本地
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 在右上角启用「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `cf-markdown-copy` 文件夹
6. 安装完成！

### 方式 2：打包为 .crx 文件安装

1. 在 `chrome://extensions/` 页面点击「打包扩展程序」
2. 选择 `cf-markdown-copy` 文件夹
3. 生成 `.crx` 文件后拖拽到浏览器中安装

## 使用方法

1. 访问任意 Codeforces 题目页面，例如：
   - `https://codeforces.com/contest/1234/problem/A`
   - `https://codeforces.com/problemset/problem/1234/A`
   - `https://codeforces.com/gym/101234/problem/A`

2. 页面右上角会出现「📋 复制 Markdown」按钮

3. 点击按钮，题目内容会自动转换为 Markdown 并复制到剪贴板

4. 在任意支持 Markdown 的编辑器中粘贴（如 Typora、Obsidian、VS Code、Notion 等）

## Markdown 输出示例

生成的 Markdown 包含以下内容：

```markdown
# A. 题目标题

**时间限制**：2 seconds | **内存限制**：256 megabytes | **输入**：standard input | **输出**：standard output

题目描述内容...

## 输入

输入格式说明...

## 输出

输出格式说明...

## 样例

<details>
<summary>样例 1</summary>

**输入：**
\```
3 5
\```

**输出：**
\```
8
\```

</details>

## 提示

提示内容...
```

## 支持的格式

- **文本格式**：粗体、斜体、下划线、删除线、行内代码
- **数学公式**：自动提取 LaTeX 公式（`$...$` 格式）
- **代码块**：样例输入输出使用代码块包裹
- **列表**：有序列表和无序列表
- **表格**：Markdown 表格格式
- **图片**：自动转换为 `![alt](src)` 格式
- **链接**：自动转换为 `[text](url)` 格式

## 技术栈

- 纯原生 JavaScript（无外部依赖）
- Chrome Extension Manifest V3
- HTML → Markdown 转换器
- Clipboard API

## 开发

```bash
# 生成图标（可选）
cd cf-markdown-copy
node generate-icons.js

# 在 Chrome 中加载插件进行测试
# 访问 chrome://extensions/
# 启用开发者模式
# 点击「加载已解压的扩展程序」
# 选择 cf-markdown-copy 文件夹
```

## 文件结构

```
cf-markdown-copy/
├── manifest.json          # 插件配置文件
├── content.js             # 核心逻辑：DOM 解析 + Markdown 转换
├── content.css            # 按钮和提示样式
├── icons/                 # 插件图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── generate-icons.js      # 图标生成脚本（开发用）
└── README.md              # 说明文档
```

## 注意事项

- 插件仅在 Codeforces 题目页面上激活
- 需要浏览器支持 Clipboard API（现代浏览器均支持）
- 数学公式保留原始 LaTeX 标记，需要在支持 LaTeX 的编辑器中查看
- 某些复杂嵌套的 HTML 结构可能需要手动调整

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**作者**：no-reason  
**版本**：1.0.0  
**更新时间**：2026-07-24
