---
layout: page
title: 关于
icon: fas fa-info-circle
order: 5
---

> **荣耀存于心，而非留于形。**

## 👨‍💻 关于我

你好，我是 **xFeng**，一名热爱技术的硬件产品经理。

从硬件电路设计到跨平台软件开发，从嵌入式系统到云原生架构——我享受在不同技术领域间穿梭探索的过程。技术对我而言不仅是工具，更是理解世界、创造价值的途径。

---

## 🎯 我的理念

### 硬件与软件的融合

> "软硬结合"不是选择，而是必然。

作为一名硬件产品经理，我深知：
- 优秀的硬件需要优雅的软件来呈现
- 流畅的软件体验离不开扎实的硬件支撑
- 真正的产品创新发生在软硬边界处

### 开源与分享

> "知识的价值在于传播。"

我坚信开源精神，所有个人项目都开源在GitHub上。这个博客记录我的学习历程、项目经验和技术思考，希望能帮助到有缘的读者。

---

## 🛠️ 技术栈

### 硬件领域

| 技能 | 熟练度 | 说明 |
|------|--------|------|
| **嵌入式开发** | ⭐⭐⭐⭐⭐ | ESP32, STM32, Arduino |
| **硬件测试** | ⭐⭐⭐⭐⭐ | 信号完整性、电源测试、可靠性 |
| **电路设计** | ⭐⭐⭐⭐☆ | Altium Designer, 多层PCB |
| **供应链管理** | ⭐⭐⭐⭐☆ | 供应商评估、BOM优化、成本控制 |

### 软件领域

| 技能 | 熟练度 | 说明 |
|------|--------|------|
| **Rust** | ⭐⭐⭐⭐☆ | 系统编程、Tauri跨平台应用 |
| **Go** | ⭐⭐⭐⭐☆ | 微服务、后端开发 |
| **Python** | ⭐⭐⭐⭐⭐ | 框架设计、AI Agent、自动化 |
| **TypeScript** | ⭐⭐⭐⭐☆ | React、Node.js |
| **前端开发** | ⭐⭐⭐⭐☆ | React、Tailwind CSS、UI设计 |

---

## 🚀 开源项目

### [XingJu 星聚](https://github.com/xfengyin/XingJu)

**跨平台聚合应用**

一个支持音乐/视频/小说/漫画多源搜索的桌面应用，采用赛博朋克风格设计。

- **技术栈**: Rust + Tauri v2 + React + TypeScript
- **核心特性**:
  - 多平台聚合搜索
  - 赛博朋克UI设计
  - 图片懒加载与性能优化
  - 完整的测试框架

```rust
// 核心技术：Rust + Tauri 跨平台架构
pub struct XingJuApp {
    config: AppConfig,
    search_engine: SearchEngine,
    ui_state: UIState,
}
```

### [Kongming 孔明](https://github.com/xfengyin/kongming)

**Go微服务架构框架**

命名源自三国时期智慧化身诸葛亮，体现东方智慧与现代架构的结合。

- **技术栈**: Go + Gin + gRPC + Etcd
- **核心模块**:
  - 八卦 Bagua - 服务治理中心
  - 主公 Lord - 配置管理中心
  - 武将 Generals - 服务实例管理
  - 虎符 TigerSeal - 认证授权中心
  - 信使 Courier - 消息队列系统

```go
// 核心技术：微服务注册与发现
func (r *ServiceRegistry) Register(instance *ServiceInstance) error {
    key := fmt.Sprintf("%s:%s", instance.Name, instance.ID)
    r.services[key] = instance
    return nil
}
```

### [Zen](https://github.com/xfengyin/zen)

**Python模块化执行框架**

借鉴禅宗思想，追求简单、优雅、高效的模块化执行。

- **技术栈**: Python 3.10+
- **核心特性**:
  - 声明式任务定义
  - 自动依赖解析
  - 并行执行优化
  - 完整执行追踪

```python
# 核心技术：依赖图与并行执行
zen = Zen()
zen.add_tasks([fetch_task, clean_task, transform_task, save_task])
result = zen.execute()  # 自动并行化
```

---

## 📝 博客内容

这个博客主要分享：

### 技术文章
- **项目实战经验**: XingJu、Kongming、Zen的开发历程
- **架构设计思考**: 微服务、模块化、AI Agent
- **技术学习笔记**: Rust、Go、Python的学习过程

### 硬件内容
- **电路设计技巧**: 信号完整性、电源设计、EMC
- **测试方法**: 硬件测试流程、设备使用、数据分析
- **项目管理**: 从原型到量产的全流程管理

### 个人成长
- **技术选型思考**: 如何为项目选择合适的技术栈
- **问题解决记录**: 踩过的坑和解决方案
- **行业观察**: 硬件与软件行业的发展趋势

---

## 📊 博客统计

| 指标 | 数据 |
|------|------|
| **文章数量** | 10+ 篇 |
| **技术分类** | 6 个 |
| **开源项目** | 3 个 |
| **持续更新** | 2024年7月至今 |

---

## 📫 联系我

- **GitHub**: [@xfengyin](https://github.com/xfengyin)
- **邮箱**: xfengyin@example.com
- **博客**: [xfengyin.github.io](https://xfengyin.github.io)

欢迎通过以下方式与我交流：
- 🐛 在GitHub项目上提交Issue
- 💡 分享技术见解和建议
- 🤝 探讨合作机会

---

## 🙏 感谢

感谢以下开源项目让本博客成为可能：

- [Jekyll](https://jekyllrb.com/) - 静态站点生成器
- [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) - 博客主题
- [GitHub Pages](https://pages.github.com/) - 免费托管服务

---

> 感谢访问我的博客，希望能给你带来一些启发！

*最后更新：2026年4月*