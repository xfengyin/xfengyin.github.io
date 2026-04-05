/**
 * xfengyin.github.io 主交互脚本
 * 包含平滑滚动、导航栏效果等交互功能
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('xfengyin.github.io 主脚本加载完成');
    
    // 初始化所有功能
    initSmoothScroll();
    initNavbarShadow();
    initMobileMenu();
    initBackToTop();
    initActiveNavLinks();
    initThemeToggle();
    
    // 页面加载完成后的初始化
    window.addEventListener('load', function() {
        console.log('页面完全加载完成');
    });
});

/**
 * 平滑滚动功能
 */
function initSmoothScroll() {
    // 为所有内部链接添加平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // 计算偏移量（考虑固定导航栏）
                const navbarHeight = document.querySelector('nav')?.offsetHeight || 80;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // 更新URL哈希（不滚动）
                history.pushState(null, null, targetId);
                
                // 如果是移动端菜单，点击后关闭菜单
                if (window.innerWidth < 768) {
                    const mobileMenu = document.querySelector('.mobile-menu');
                    if (mobileMenu && mobileMenu.classList.contains('active')) {
                        toggleMobileMenu();
                    }
                }
            }
        });
    });
}

/**
 * 导航栏滚动阴影效果
 */
function initNavbarShadow() {
    const navbar = document.querySelector('nav');
    if (!navbar) return;
    
    let lastScrollTop = 0;
    const scrollThreshold = 10;
    
    function handleNavbarScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 向下滚动时添加阴影，向上滚动时移除
        if (scrollTop > scrollThreshold) {
            navbar.classList.add('scrolled');
            
            // 根据滚动方向隐藏/显示导航栏
            if (scrollTop > lastScrollTop) {
                // 向下滚动 - 隐藏导航栏
                navbar.classList.add('nav-hidden');
            } else {
                // 向上滚动 - 显示导航栏
                navbar.classList.remove('nav-hidden');
            }
        } else {
            navbar.classList.remove('scrolled');
            navbar.classList.remove('nav-hidden');
        }
        
        lastScrollTop = scrollTop;
    }
    
    // 初始检查
    handleNavbarScroll();
    
    // 添加滚动监听
    window.addEventListener('scroll', handleNavbarScroll);
    
    // 添加防抖优化性能
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleNavbarScroll, 50);
    });
}

/**
 * 移动端菜单功能
 */
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (!menuToggle || !mobileMenu) return;
    
    // 创建菜单切换按钮（如果不存在）
    if (!menuToggle) {
        const nav = document.querySelector('nav');
        if (nav) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'menu-toggle';
            toggleBtn.innerHTML = '<span></span><span></span><span></span>';
            toggleBtn.setAttribute('aria-label', 'Toggle menu');
            nav.appendChild(toggleBtn);
            
            toggleBtn.addEventListener('click', toggleMobileMenu);
        }
    } else {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // 点击菜单外区域关闭菜单
    document.addEventListener('click', function(e) {
        if (mobileMenu.classList.contains('active') && 
            !mobileMenu.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            toggleMobileMenu();
        }
    });
    
    // ESC键关闭菜单
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            toggleMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (!menuToggle || !mobileMenu) return;
    
    menuToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.classList.toggle('menu-open');
    
    // 切换aria-expanded属性
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', !isExpanded);
}

/**
 * 返回顶部按钮
 */
function initBackToTop() {
    // 创建返回顶部按钮
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    backToTopBtn.setAttribute('aria-label', '返回顶部');
    document.body.appendChild(backToTopBtn);
    
    // 显示/隐藏按钮
    function toggleBackToTop() {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }
    
    // 点击返回顶部
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // 初始检查
    toggleBackToTop();
    
    // 监听滚动
    window.addEventListener('scroll', toggleBackToTop);
}

/**
 * 导航链接高亮
 */
function initActiveNavLinks() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    if (sections.length === 0 || navLinks.length === 0) return;
    
    function highlightNavLink() {
        let currentSection = '';
        const scrollPosition = window.scrollY + 100; // 偏移量
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    // 初始检查
    highlightNavLink();
    
    // 监听滚动
    window.addEventListener('scroll', highlightNavLink);
}

/**
 * 主题切换功能
 */
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 创建主题切换按钮（如果不存在）
    if (!themeToggle) {
        const nav = document.querySelector('nav');
        if (nav) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'theme-toggle';
            toggleBtn.innerHTML = `
                <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            `;
            toggleBtn.setAttribute('aria-label', '切换主题');
            nav.appendChild(toggleBtn);
            
            toggleBtn.addEventListener('click', toggleTheme);
        }
    } else {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 检查本地存储的主题偏好
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    } else if (prefersDarkScheme.matches) {
        document.body.classList.add('dark-theme');
    }
    
    // 监听系统主题变化
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            document.body.classList.toggle('dark-theme', e.matches);
        }
    });
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * 工具函数：防抖
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 工具函数：节流
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 导出函数供其他脚本使用（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSmoothScroll,
        initNavbarShadow,
        initMobileMenu,
        initBackToTop,
        initActiveNavLinks,
        initThemeToggle,
        debounce,
        throttle
    };
}