/**
 * 代码块一键复制功能
 * 为所有代码块添加复制按钮
 */

class CodeCopy {
    constructor() {
        this.copyButtons = new Map();
        this.init();
    }

    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCodeBlocks());
        } else {
            this.setupCodeBlocks();
        }
    }

    setupCodeBlocks() {
        // 选择所有代码块
        const codeBlocks = document.querySelectorAll('pre code, .highlight pre, .code-block');
        
        if (codeBlocks.length === 0) {
            console.log('未找到代码块');
            return;
        }

        console.log(`找到 ${codeBlocks.length} 个代码块，正在添加复制按钮...`);

        codeBlocks.forEach((codeBlock, index) => {
            // 找到包含代码块的pre元素
            const preElement = codeBlock.closest('pre') || codeBlock.parentElement;
            
            // 如果已经添加过复制按钮，跳过
            if (preElement.querySelector('.code-copy-button')) {
                return;
            }

            // 创建复制按钮
            const copyButton = this.createCopyButton();
            preElement.appendChild(copyButton);

            // 存储代码内容和按钮的映射
            const codeContent = this.getCodeContent(codeBlock);
            this.copyButtons.set(copyButton, {
                code: codeContent,
                originalText: copyButton.innerHTML,
                preElement: preElement,
                codeBlock: codeBlock
            });

            // 添加点击事件
            copyButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(copyButton);
            });

            // 添加悬停效果
            this.setupHoverEffects(preElement, copyButton);
        });

        // 监听代码块语言变化
        this.observeCodeBlocks();
    }

    createCopyButton() {
        const button = document.createElement('button');
        button.className = 'code-copy-button';
        button.setAttribute('aria-label', '复制代码');
        button.setAttribute('title', '复制代码');
        button.innerHTML = `
            <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span class="copy-text">复制</span>
        `;
        return button;
    }

    getCodeContent(codeBlock) {
        // 处理不同的代码块格式
        let codeContent = '';
        
        // 如果是pre内的code元素
        if (codeBlock.tagName === 'CODE' && codeBlock.parentElement.tagName === 'PRE') {
            codeContent = codeBlock.textContent || '';
        } 
        // 如果是highlight类的pre元素
        else if (codeBlock.classList.contains('highlight') || codeBlock.classList.contains('code-block')) {
            codeContent = codeBlock.textContent || '';
        }
        // 其他情况
        else {
            codeContent = codeBlock.textContent || '';
        }

        // 清理多余的空格和换行
        codeContent = codeContent.trim();
        
        // 处理行号（如果存在）
        if (codeBlock.querySelector('.lineno')) {
            const lines = codeContent.split('\n');
            const cleanedLines = lines.map(line => {
                // 移除行号
                return line.replace(/^\s*\d+\s*/, '');
            });
            codeContent = cleanedLines.join('\n').trim();
        }

        return codeContent;
    }

    async copyToClipboard(button) {
        const buttonData = this.copyButtons.get(button);
        if (!buttonData) return;

        const { code, originalText } = buttonData;
        
        try {
            // 使用现代 Clipboard API
            await navigator.clipboard.writeText(code);
            
            // 显示成功状态
            this.showSuccess(button);
            
            // 3秒后恢复原始状态
            setTimeout(() => {
                this.resetButton(button, originalText);
            }, 3000);

            console.log('代码复制成功:', code.substring(0, 50) + '...');
        } catch (err) {
            console.error('复制失败:', err);
            this.showError(button);
            
            // 回退到传统方法
            this.fallbackCopy(code, button, originalText);
        }
    }

    showSuccess(button) {
        const copyIcon = button.querySelector('.copy-icon');
        const checkIcon = button.querySelector('.check-icon');
        const copyText = button.querySelector('.copy-text');
        
        if (copyIcon) copyIcon.style.display = 'none';
        if (checkIcon) checkIcon.style.display = 'block';
        if (copyText) copyText.textContent = '已复制';
        
        button.classList.add('copied');
        button.setAttribute('aria-label', '已复制');
    }

    showError(button) {
        const copyText = button.querySelector('.copy-text');
        if (copyText) copyText.textContent = '复制失败';
        
        button.classList.add('error');
        button.setAttribute('aria-label', '复制失败');
    }

    resetButton(button, originalText) {
        const copyIcon = button.querySelector('.copy-icon');
        const checkIcon = button.querySelector('.check-icon');
        const copyText = button.querySelector('.copy-text');
        
        if (copyIcon) copyIcon.style.display = 'block';
        if (checkIcon) checkIcon.style.display = 'none';
        if (copyText) copyText.textContent = '复制';
        
        button.classList.remove('copied', 'error');
        button.setAttribute('aria-label', '复制代码');
    }

    fallbackCopy(text, button, originalText) {
        // 创建临时textarea元素
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        
        try {
            // 选择文本
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
            
            // 执行复制命令
            const successful = document.execCommand('copy');
            
            if (successful) {
                this.showSuccess(button);
                setTimeout(() => {
                    this.resetButton(button, originalText);
                }, 3000);
            } else {
                this.showError(button);
                setTimeout(() => {
                    this.resetButton(button, originalText);
                }, 2000);
            }
        } catch (err) {
            console.error('回退复制方法失败:', err);
            this.showError(button);
            setTimeout(() => {
                this.resetButton(button, originalText);
            }, 2000);
        } finally {
            // 清理
            document.body.removeChild(textarea);
        }
    }

    setupHoverEffects(preElement, copyButton) {
        // 鼠标进入代码块时显示复制按钮
        preElement.addEventListener('mouseenter', () => {
            copyButton.classList.add('visible');
        });

        preElement.addEventListener('mouseleave', () => {
            // 如果不是复制成功状态，隐藏按钮
            if (!copyButton.classList.contains('copied')) {
                copyButton.classList.remove('visible');
            }
        });

        // 触摸设备支持
        preElement.addEventListener('touchstart', () => {
            copyButton.classList.add('visible');
        });
    }

    observeCodeBlocks() {
        // 使用MutationObserver监听动态添加的代码块
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查新增节点是否包含代码块
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches('pre code, .highlight pre, .code-block') ||
                                node.querySelector('pre code, .highlight pre, .code-block')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });

            if (shouldUpdate) {
                // 延迟执行，确保DOM完全更新
                setTimeout(() => this.setupCodeBlocks(), 100);
            }
        });

        // 观察整个文档
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 手动添加复制按钮到指定元素
    addToElement(element) {
        if (!element) return;
        
        const codeContent = this.getCodeContent(element);
        const copyButton = this.createCopyButton();
        
        // 找到合适的位置插入按钮
        const container = element.closest('pre') || element;
        container.appendChild(copyButton);
        
        // 存储映射
        this.copyButtons.set(copyButton, {
            code: codeContent,
            originalText: copyButton.innerHTML,
            preElement: container,
            codeBlock: element
        });
        
        // 添加事件
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(copyButton);
        });
        
        this.setupHoverEffects(container, copyButton);
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.codeCopy = new CodeCopy();
});

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CodeCopy;
}