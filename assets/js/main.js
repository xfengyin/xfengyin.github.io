/**
 * xfengyin.github.io 主交互脚本
 * 现代化JavaScript架构 - 对标大厂标准
 * 
 * 优化要点：
 * 1. 单例模式确保全局唯一实例
 * 2. 事件委托减少内存占用
 * 3. 节流防抖优化滚动性能
 * 4. 懒加载按需初始化
 * 5. 完善的错误处理和降级策略
 */

(function(global) {
    'use strict';

    /**
     * 主应用类 - 单例模式
     */
    class App {
        constructor() {
            if (App.instance) {
                return App.instance;
            }
            App.instance = this;
            
            this.initialized = false;
            this.config = {
                scrollThrottle: 16,
                navbarHideThreshold: 100,
                backToTopThreshold: 300,
                animationDuration: 300,
                debounceDelay: 50
            };
            
            this.state = {
                isMenuOpen: false,
                isScrolled: false,
                isNavbarHidden: false,
                lastScrollTop: 0,
                theme: 'light'
            };
            
            this.elements = {};
            this.boundHandlers = {};
        }

        /**
         * 初始化应用
         */
        init() {
            if (this.initialized) {
                console.warn('App已初始化，跳过重复初始化');
                return;
            }

            try {
                this.cacheElements();
                this.bindEvents();
                this.initTheme();
                this.initBackToTop();
                this.initScrollReveal();
                this.initPrism();
                this.removeLoadingOverlay();
                
                this.initialized = true;
                console.log('✅ 应用初始化成功');
            } catch (error) {
                console.error('❌ 应用初始化失败:', error);
                this.handleInitError(error);
            }
        }

        /**
         * 缓存DOM元素 - 减少重复查询
         */
        cacheElements() {
            this.elements = {
                navbar: document.querySelector('nav'),
                menuToggle: document.querySelector('.menu-toggle'),
                mobileMenu: document.querySelector('.mobile-menu'),
                themeToggle: document.querySelector('.theme-toggle, #theme-toggle'),
                backToTop: document.getElementById('back-to-top') || document.querySelector('.back-to-top'),
                loadingOverlay: document.getElementById('loading-overlay'),
                sections: document.querySelectorAll('section[id]'),
                navLinks: document.querySelectorAll('nav a[href^="#"]'),
                images: document.querySelectorAll('img[data-src]')
            };
        }

        /**
         * 绑定事件 - 使用事件委托
         */
        bindEvents() {
            const documentEvents = this.createDocumentEvents();
            document.addEventListener('click', documentEvents.click);
            document.addEventListener('keydown', documentEvents.keydown);
            document.addEventListener('DOMContentLoaded', () => this.initLazyLoad());
            
            window.addEventListener('scroll', this.throttle(() => {
                this.handleScroll();
            }, this.config.scrollThrottle), { passive: true });
            
            window.addEventListener('resize', this.debounce(() => {
                this.handleResize();
            }, this.config.debounceDelay));
            
            if (this.elements.themeToggle) {
                this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
            }
        }

        /**
         * 创建文档级别的事件处理器
         */
        createDocumentEvents() {
            return {
                click: (e) => {
                    this.handleAnchorClick(e);
                    this.handleOutsideClick(e);
                },
                keydown: (e) => {
                    if (e.key === 'Escape') {
                        this.closeMobileMenu();
                    }
                }
            };
        }

        /**
         * 处理锚点点击 - 平滑滚动
         */
        handleAnchorClick(e) {
            const anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;

            const targetId = anchor.getAttribute('href');
            if (targetId === '#') {
                e.preventDefault();
                return;
            }

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                this.smoothScrollTo(targetElement);
                this.closeMobileMenu();
                history.pushState(null, null, targetId);
            }
        }

        /**
         * 处理外部点击 - 关闭移动菜单
         */
        handleOutsideClick(e) {
            if (this.state.isMenuOpen &&
                this.elements.mobileMenu &&
                !this.elements.mobileMenu.contains(e.target) &&
                !this.elements.menuToggle.contains(e.target)) {
                this.closeMobileMenu();
            }
        }

        /**
         * 平滑滚动到目标位置
         */
        smoothScrollTo(target) {
            const navbarHeight = this.elements.navbar?.offsetHeight || 48;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }

        /**
         * 处理滚动事件
         */
        handleScroll() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            this.updateNavbarState(scrollTop);
            this.updateBackToTopButton(scrollTop);
            this.highlightNavLink();
            
            this.state.lastScrollTop = scrollTop;
        }

        /**
         * 更新导航栏状态
         */
        updateNavbarState(scrollTop) {
            if (!this.elements.navbar) return;

            if (scrollTop > this.config.navbarHideThreshold) {
                this.elements.navbar.classList.add('scrolled');
                
                if (scrollTop > this.state.lastScrollTop) {
                    this.elements.navbar.classList.add('nav-hidden');
                    this.state.isNavbarHidden = true;
                } else {
                    this.elements.navbar.classList.remove('nav-hidden');
                    this.state.isNavbarHidden = false;
                }
            } else {
                this.elements.navbar.classList.remove('scrolled', 'nav-hidden');
                this.state.isNavbarHidden = false;
            }
        }

        /**
         * 更新返回顶部按钮
         */
        updateBackToTopButton(scrollTop) {
            if (!this.elements.backToTop) return;

            if (scrollTop > this.config.backToTopThreshold) {
                this.elements.backToTop.classList.add('visible');
            } else {
                this.elements.backToTop.classList.remove('visible');
            }
        }

        /**
         * 高亮当前导航链接
         */
        highlightNavLink() {
            if (this.elements.sections.length === 0 || this.elements.navLinks.length === 0) return;

            let currentSection = '';
            const scrollPosition = window.scrollY + 150;

            this.elements.sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    currentSection = section.getAttribute('id');
                }
            });

            this.elements.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        }

        /**
         * 处理窗口大小变化
         */
        handleResize() {
            if (this.state.isMenuOpen && window.innerWidth >= 768) {
                this.closeMobileMenu();
            }
        }

        /**
         * 初始化主题
         */
        initTheme() {
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            this.state.theme = savedTheme || (prefersDark ? 'dark' : 'light');
            this.applyTheme(this.state.theme);

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.state.theme = e.matches ? 'dark' : 'light';
                    this.applyTheme(this.state.theme);
                }
            });
        }

        /**
         * 应用主题
         */
        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            document.body.classList.toggle('dark-theme', theme === 'dark');
            
            localStorage.setItem('theme', theme);
            
            const event = new CustomEvent('themechange', { detail: { theme } });
            document.dispatchEvent(event);
        }

        /**
         * 切换主题
         */
        toggleTheme() {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            this.applyTheme(this.state.theme);
            
            console.log(`主题已切换为: ${this.state.theme === 'dark' ? '🌙 深色模式' : '☀️ 浅色模式'}`);
        }

        /**
         * 初始化返回顶部按钮
         */
        initBackToTop() {
            if (!this.elements.backToTop) return;

            this.elements.backToTop.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        /**
         * 初始化滚动显示动画
         */
        initScrollReveal() {
            const revealElements = document.querySelectorAll('.reveal');
            if (revealElements.length === 0) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            revealElements.forEach(el => observer.observe(el));
        }

        /**
         * 初始化Prism语法高亮
         */
        initPrism() {
            if (typeof Prism !== 'undefined' && Prism.highlightAll) {
                Prism.highlightAll();
            }
        }

        /**
         * 初始化图片懒加载
         */
        initLazyLoad() {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                                img.classList.add('loaded');
                            }
                            observer.unobserve(img);
                        }
                    });
                }, {
                    rootMargin: '50px 0px',
                    threshold: 0.01
                });

                this.elements.images.forEach(img => imageObserver.observe(img));
            } else {
                this.elements.images.forEach(img => {
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                });
            }
        }

        /**
         * 移除加载覆盖层
         */
        removeLoadingOverlay() {
            if (!this.elements.loadingOverlay) return;

            setTimeout(() => {
                this.elements.loadingOverlay.classList.add('loaded');
                setTimeout(() => {
                    this.elements.loadingOverlay.remove();
                    document.body.classList.add('loaded');
                }, 400);
            }, 150);
        }

        /**
         * 切换移动菜单
         */
        toggleMobileMenu() {
            this.state.isMenuOpen = !this.state.isMenuOpen;
            
            if (this.elements.menuToggle) {
                this.elements.menuToggle.classList.toggle('active', this.state.isMenuOpen);
                this.elements.menuToggle.setAttribute('aria-expanded', this.state.isMenuOpen);
            }
            
            if (this.elements.mobileMenu) {
                this.elements.mobileMenu.classList.toggle('active', this.state.isMenuOpen);
                this.elements.mobileMenu.setAttribute('aria-hidden', !this.state.isMenuOpen);
            }
            
            document.body.classList.toggle('menu-open', this.state.isMenuOpen);
        }

        /**
         * 关闭移动菜单
         */
        closeMobileMenu() {
            if (!this.state.isMenuOpen) return;
            
            this.state.isMenuOpen = false;
            
            if (this.elements.menuToggle) {
                this.elements.menuToggle.classList.remove('active');
                this.elements.menuToggle.setAttribute('aria-expanded', 'false');
            }
            
            if (this.elements.mobileMenu) {
                this.elements.mobileMenu.classList.remove('active');
                this.elements.mobileMenu.setAttribute('aria-hidden', 'true');
            }
            
            document.body.classList.remove('menu-open');
        }

        /**
         * 处理初始化错误
         */
        handleInitError(error) {
            const loadingOverlay = this.elements.loadingOverlay;
            if (loadingOverlay) {
                loadingOverlay.classList.add('loaded');
                setTimeout(() => loadingOverlay.remove(), 300);
            }
            
            document.body.classList.add('loaded');
        }

        /**
         * 节流函数
         */
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        /**
         * 防抖函数
         */
        debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    }

    /**
     * 阅读进度条类
     */
    class ReadingProgress {
        constructor() {
            this.element = null;
            this.init();
        }

        init() {
            if (document.querySelector('.reading-progress')) return;

            this.element = document.createElement('div');
            this.element.className = 'reading-progress';
            this.element.innerHTML = '<div class="reading-progress-bar"></div>';
            document.body.appendChild(this.element);

            window.addEventListener('scroll', this.throttle(() => {
                this.update();
            }, 16), { passive: true });

            this.update();
        }

        update() {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            
            const bar = this.element.querySelector('.reading-progress-bar');
            if (bar) {
                bar.style.width = `${Math.min(progress, 100)}%`;
            }
        }

        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    }

    /**
     * 初始化应用
     */
    function initApp() {
        const app = new App();
        app.init();
        
        if (document.querySelector('.post') || document.querySelector('.article')) {
            new ReadingProgress();
        }
        
        global.app = app;
        global.ReadingProgress = ReadingProgress;
        
        return app;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})(typeof window !== 'undefined' ? window : this);
