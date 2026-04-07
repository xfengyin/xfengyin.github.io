# 贡献指南

欢迎来到 xFeng's Tech Blog 贡献指南！我们非常欢迎社区成员为这个技术博客做出贡献。

## 🎯 贡献类型

我们欢迎以下类型的贡献：

### 1. 📝 内容贡献
- **技术文章**: 分享硬件、嵌入式、软件开发经验
- **教程指南**: 详细的技术教程和最佳实践
- **项目案例**: 实际项目的开发经验分享
- **翻译贡献**: 将现有文章翻译成其他语言

### 2. 🔧 技术贡献
- **Bug 修复**: 修复博客功能或显示问题
- **功能开发**: 添加新的博客功能
- **性能优化**: 优化博客加载速度和构建性能
- **代码重构**: 改进代码质量和可维护性

### 3. 📚 文档贡献
- **文档完善**: 补充现有文档的不足
- **示例添加**: 添加使用示例和教程
- **翻译校对**: 改进翻译质量

### 4. 🐛 问题报告
- **Bug 报告**: 详细描述遇到的问题
- **功能建议**: 提出改进建议和新功能想法

## 📋 贡献流程

### 第一步：准备工作
1. **Fork 仓库**: 点击右上角的 Fork 按钮
2. **克隆仓库**:
   ```bash
   git clone https://github.com/your-username/xfengyin.github.io.git
   cd xfengyin.github.io
   ```

3. **设置上游**:
   ```bash
   git remote add upstream https://github.com/xfengyin/xfengyin.github.io.git
   ```

### 第二步：开发环境配置
1. **安装 Ruby** (版本 3.2+):
   ```bash
   # macOS
   brew install ruby

   # Ubuntu/Debian
   sudo apt-get install ruby-full
   ```

2. **安装 Bundler**:
   ```bash
   gem install bundler
   ```

3. **安装依赖**:
   ```bash
   bundle install
   ```

4. **启动本地服务器**:
   ```bash
   bundle exec jekyll serve
   # 访问 http://localhost:4000
   ```

### 第三步：创建分支
```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature-name

# 或修复 bug
git checkout -b fix/issue-number-description
```

### 第四步：开发工作

#### 编写技术文章
1. 在 `_posts` 目录创建新文件
2. 文件名格式: `YYYY-MM-DD-title.md`
3. 使用以下 Front Matter 模板:

```markdown
---
layout: post
title: "文章标题"
date: YYYY-MM-DD HH:MM:SS +0800
categories: [技术分类]
tags: [标签1, 标签2]
math: true    # 如果需要数学公式
toc: true     # 如果需要目录
comments: true # 开启评论
---

## 摘要
文章摘要内容...

## 正文内容
...

## 代码示例
```python
def example():
    pass
```

## 总结
...
```

#### 代码贡献指南
1. **遵循代码规范**:
   - Ruby: 遵循 Ruby 社区约定
   - HTML/CSS: 使用语义化标签和BEM命名
   - JavaScript: 使用 ES6+ 语法

2. **测试要求**:
   ```bash
   # 运行测试
   bundle exec jekyll build
   bundle exec jekyll serve
   ```

3. **提交信息规范**:
   ```
   <类型>: <简短描述>

   <详细描述>

   - 变更点1
   - 变更点2

   Closes #<issue编号>
   ```

   **类型说明**:
   - `feat`: 新功能
   - `fix`: Bug修复
   - `docs`: 文档更新
   - `style`: 代码格式
   - `refactor`: 代码重构
   - `test`: 测试相关
   - `chore`: 构建/工具相关

### 第五步：提交代码
```bash
# 添加更改
git add .

# 提交更改
git commit -m "feat: 添加新功能描述"

# 推送到你的仓库
git push origin feature/your-feature-name
```

### 第六步：创建 Pull Request
1. 访问你的 Fork 仓库
2. 点击 "New Pull Request"
3. 选择正确的分支
4. 填写 PR 描述
5. 等待代码审查

## 🧪 测试要求

### 内容测试
- [ ] 文章在本地预览正常
- [ ] 代码示例可运行
- [ ] 图片显示正常
- [ ] 链接有效

### 功能测试
- [ ] 构建过程无错误
- [ ] 响应式布局正常
- [ ] 暗色/亮色模式切换正常
- [ ] 搜索功能正常

### 兼容性测试
- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版
- [ ] 移动端浏览器

## 📝 内容质量标准

### 技术文章要求
1. **准确性**: 技术内容必须准确无误
2. **完整性**: 提供完整的实现步骤
3. **可复现**: 读者可以按照步骤复现
4. **实用性**: 解决实际问题
5. **原创性**: 原创内容或明确标注引用

### 代码质量要求
1. **可读性**: 代码清晰易懂
2. **可维护性**: 易于修改和扩展
3. **性能**: 考虑性能影响
4. **安全性**: 无安全漏洞

## 🏷️ 标签使用指南

### 分类标签
- `hardware`: 硬件相关
- `embedded`: 嵌入式开发
- `rust`: Rust语言
- `go`: Go语言
- `python`: Python语言
- `frontend`: 前端开发
- `backend`: 后端开发
- `devops`: DevOps相关

### 技术标签
- `esp32`: ESP32开发
- `stm32`: STM32开发
- `tauri`: Tauri框架
- `react`: React框架
- `grpc`: gRPC通信
- `microservices`: 微服务架构

## 🔍 代码审查流程

1. **自动检查**: GitHub Actions 运行 CI 检查
2. **人工审查**: 维护者进行代码审查
3. **反馈修改**: 根据反馈进行修改
4. **合并批准**: 至少需要1个维护者批准

### 审查要点
- 代码质量
- 功能完整性
- 测试覆盖
- 文档更新
- 性能影响

## 📊 贡献统计

我们会定期统计和感谢贡献者：
- **月度贡献者**: 每月活跃贡献者
- **年度贡献者**: 年度活跃贡献者
- **特别贡献**: 重大贡献者

## 🎁 奖励机制

### 贡献者权益
- **贡献者徽章**: GitHub 个人资料徽章
- **优先支持**: 技术问题优先解答
- **项目邀请**: 参与内部项目讨论
- **社区认可**: 在博客中特别感谢

### 贡献等级
1. **初级贡献者**: 首次贡献
2. **活跃贡献者**: 3+次贡献
3. **核心贡献者**: 10+次贡献，代码审查权限
4. **维护者**: 项目维护权限

## 🚫 禁止行为

以下行为不被允许：
1. 提交恶意代码
2. 侵犯他人知识产权
3. 发布不当内容
4. 骚扰其他贡献者
5. 破坏项目稳定性

## 📞 获取帮助

### 问题讨论
- **GitHub Issues**: 技术问题讨论
- **Discussions**: 功能建议和一般讨论

### 联系维护者
- **邮箱**: xfengyin@example.com
- **GitHub**: @xfengyin

## 🙏 致谢

感谢所有为项目做出贡献的开发者！你们的努力让这个技术博客变得更好。

---

*最后更新: 2026年4月7日*
*维护者: [xFeng](https://github.com/xfengyin)*