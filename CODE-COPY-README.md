# 代码块一键复制功能

## 功能概述

这个功能为网站中的代码块添加一键复制按钮，用户点击按钮即可将代码复制到剪贴板。

## 文件说明

### 主要文件
1. **`assets/js/code-copy.js`** - 核心JavaScript功能
2. **`assets/css/code-copy.css`** - 样式文件

### 测试文件
- `test-code-copy.html` - 功能测试页面

## 使用方法

### 1. 基本集成

在您的HTML文件中添加以下代码：

```html
<!-- 在head中添加CSS -->
<link rel="stylesheet" href="assets/css/code-copy.css">

<!-- 在body结束前添加JS -->
<script src="assets/js/code-copy.js"></script>
```

### 2. 代码块要求

确保您的代码块使用标准格式：
```html
<pre><code class="language-python">
# 您的代码
print("Hello World")
</code></pre>
```

脚本会自动为所有 `<pre><code>` 元素添加复制按钮。

## 功能特性

### ✅ 核心功能
- 自动为所有代码块添加复制按钮
- 支持现代Clipboard API
- 自动回退到传统复制方法
- 复制成功/失败状态反馈

### ✅ 用户体验
- 鼠标悬停显示按钮
- 复制成功视觉反馈（3秒）
- 无障碍访问支持（aria-label）
- 响应式设计

### ✅ 技术特性
- 纯JavaScript实现，无依赖
- 支持动态加载的内容
- 暗色主题适配
- 模块化设计

## API 接口

### 全局函数

```javascript
// 为动态添加的代码块添加复制按钮
window.addCodeCopyButtons();
```

### 模块导出（如果使用模块系统）
```javascript
import { initCodeCopyButtons, addCodeCopyButtons } from './assets/js/code-copy.js';
```

## 自定义样式

### 修改按钮样式
编辑 `assets/css/code-copy.css` 文件：

```css
/* 修改按钮颜色 */
.copy-code-button {
    background-color: #007bff; /* 修改背景色 */
    color: white; /* 修改文字颜色 */
    border-radius: 20px; /* 修改圆角 */
}

/* 修改成功状态 */
.copy-code-button.copied {
    background-color: #28a745;
}
```

### 自定义图标
在 `code-copy.js` 中修改SVG图标：

```javascript
// 修改第25-35行的SVG代码
copyButton.innerHTML = `
    <!-- 您的自定义SVG图标 -->
    <span class="copy-text">复制代码</span>
`;
```

## 浏览器兼容性

- ✅ Chrome 43+
- ✅ Firefox 41+
- ✅ Safari 10+
- ✅ Edge 12+
- ✅ iOS Safari 10+
- ✅ Android Chrome 55+

## 高级用法

### 1. 排除特定代码块
```javascript
// 在code-copy.js中修改选择器
const codeBlocks = document.querySelectorAll('pre code:not(.no-copy)');
```

### 2. 自定义复制文本
```javascript
// 修改第45行的复制逻辑
copyButton.addEventListener('click', function() {
    const customText = codeText + '\n\n// 来自 xfengyin.github.io';
    copyToClipboard(customText, copyButton);
});
```

### 3. 添加复制统计
```javascript
// 在showCopySuccess函数中添加
function showCopySuccess(button) {
    // 发送统计事件
    if (typeof gtag !== 'undefined') {
        gtag('event', 'code_copy', {
            'event_category': 'engagement',
            'event_label': 'code_block'
        });
    }
    // ... 原有代码
}
```

## 故障排除

### 问题1：按钮不显示
- 检查CSS是否加载
- 检查代码块是否为 `<pre><code>` 结构
- 检查JavaScript控制台是否有错误

### 问题2：复制失败
- 检查页面是否使用HTTPS（Clipboard API要求安全上下文）
- 检查浏览器是否支持Clipboard API
- 检查是否有其他脚本冲突

### 问题3：样式问题
- 检查CSS选择器优先级
- 检查是否有其他样式覆盖
- 检查响应式断点设置

## 性能优化

### 懒加载
```html
<!-- 延迟加载脚本 -->
<script src="assets/js/code-copy.js" defer></script>
```

### 条件加载
```javascript
// 只在有代码块的页面加载
if (document.querySelector('pre code')) {
    const script = document.createElement('script');
    script.src = 'assets/js/code-copy.js';
    document.body.appendChild(script);
}
```

## 更新日志

### v1.0.0 (初始版本)
- 基础复制功能
- 现代API支持
- 传统方法回退
- 响应式设计
- 暗色主题适配

## 许可证

MIT License - 自由使用和修改

## 贡献

欢迎提交Issue和Pull Request来改进这个功能。

## 测试

打开 `test-code-copy.html` 文件在浏览器中测试功能。

---

**注意**：这个功能是为静态网站设计的，如果您的网站使用JavaScript框架（如React、Vue等），可能需要适配。