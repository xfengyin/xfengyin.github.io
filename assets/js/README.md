# 技能图表 JavaScript 文件

## 文件说明

### skills-chart.js
技能雷达图组件，使用 Chart.js 展示技术技能水平。

## 功能特性

1. **响应式设计** - 自动适应不同屏幕尺寸
2. **交互式图表** - 支持点击查看技能详情
3. **平滑动画** - 优雅的过渡效果
4. **数据驱动** - 从 YAML 配置文件动态加载数据
5. **错误处理** - 完善的错误处理和回退机制

## 使用方法

### 1. 引入依赖
在 HTML 文件中引入 Chart.js 和 skills-chart.js：

```html
<!-- 引入 Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- 引入技能图表脚本 -->
<script src="/assets/js/skills-chart.js"></script>
```

### 2. 添加 HTML 结构
在页面中添加必要的 HTML 元素：

```html
<!-- 技能数据容器（隐藏） -->
<script type="application/json" id="skillsData">
{
    "skills": [
        { "name": "Python", "level": 85, "color": "#3776AB" },
        { "name": "JavaScript", "level": 80, "color": "#F7DF1E" },
        // ... 更多技能
    ]
}
</script>

<!-- 图表容器 -->
<div class="chart-container">
    <canvas id="skillsChart"></canvas>
</div>
```

### 3. 配置技能数据
在 `_data/skills.yml` 中配置技能数据：

```yaml
skills:
  - name: "Python"
    level: 85
    color: "#3776AB"
    description: "Web开发、数据分析"
    category: "编程语言"
    
  - name: "JavaScript"
    level: 80
    color: "#F7DF1E"
    description: "前端开发、Node.js"
    category: "编程语言"
```

### 4. 样式定制
添加必要的 CSS 样式：

```css
.chart-container {
    width: 100%;
    max-width: 800px;
    height: 500px;
    margin: 0 auto;
}

.chart-error {
    text-align: center;
    padding: 40px;
    color: #ef4444;
    background: #fef2f2;
    border-radius: 8px;
}
```

## 数据格式

技能数据支持以下字段：

```javascript
{
    name: "技能名称",      // 必填，字符串
    level: 85,            // 必填，0-100的数字
    color: "#3776AB",     // 可选，十六进制颜色
    description: "描述",   // 可选，字符串
    category: "分类",      // 可选，字符串
    experience: "3年"     // 可选，字符串
}
```

## 配置选项

图表支持以下配置选项：

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| responsive | boolean | true | 是否响应式 |
| maintainAspectRatio | boolean | true | 保持宽高比 |
| animation.duration | number | 2000 | 动画时长(ms) |
| scales.r.suggestedMax | number | 100 | 最大值 |
| scales.r.suggestedMin | number | 0 | 最小值 |

## 事件处理

### 点击事件
点击雷达图上的技能点会触发高亮效果，可以在控制台查看点击的技能信息。

### 响应式调整
窗口大小改变时，图表会自动调整大小。

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- iOS Safari 11+
- Android Chrome 60+

## 故障排除

### 图表不显示
1. 检查 Chart.js 是否正确加载
2. 检查 skillsData 元素是否存在且格式正确
3. 检查控制台是否有错误信息

### 数据加载失败
1. 检查 YAML 文件格式是否正确
2. 确保数据转换脚本正常工作
3. 检查网络请求状态

### 样式问题
1. 检查容器元素尺寸是否正确
2. 确认 CSS 样式已正确加载
3. 检查响应式断点设置

## 开发说明

### 文件结构
```
assets/js/
├── skills-chart.js      # 主图表脚本
└── README.md           # 说明文档
```

### 依赖项
- Chart.js 3.x 或更高版本
- 现代浏览器支持 ES6+

### 构建说明
无需构建，直接使用即可。

## 版本历史

### v1.0.0 (2024-01-15)
- 初始版本发布
- 基本雷达图功能
- 响应式设计
- 点击交互支持

## 许可证

MIT License