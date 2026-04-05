/**
 * Skills Chart - Chart.js Radar Chart
 * Displays skills in a radar chart visualization
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all skill charts
    initSkillCharts();
});

/**
 * Initialize skill charts
 */
function initSkillCharts() {
    // Main programming languages radar chart
    const programmingChart = document.getElementById('programming-skills-chart');
    if (programmingChart) {
        createRadarChart(programmingChart, {
            label: 'Programming Languages',
            labels: ['Python', 'JavaScript', 'Rust', 'Go', 'C/C++', 'TypeScript'],
            data: [95, 85, 80, 70, 80, 85],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)'
        });
    }
    
    // Frontend skills radar chart
    const frontendChart = document.getElementById('frontend-skills-chart');
    if (frontendChart) {
        createRadarChart(frontendChart, {
            label: 'Frontend Skills',
            labels: ['HTML/CSS', 'React', 'Vue.js', 'JavaScript', 'TypeScript', 'Responsive Design'],
            data: [95, 85, 75, 85, 85, 90],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)'
        });
    }
    
    // Backend skills radar chart
    const backendChart = document.getElementById('backend-skills-chart');
    if (backendChart) {
        createRadarChart(backendChart, {
            label: 'Backend Skills',
            labels: ['Python', 'Django', 'FastAPI', 'Node.js', 'PostgreSQL', 'Redis'],
            data: [95, 90, 85, 80, 80, 75],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)'
        });
    }
    
    // DevOps skills radar chart
    const devopsChart = document.getElementById('devops-skills-chart');
    if (devopsChart) {
        createRadarChart(devopsChart, {
            label: 'DevOps Skills',
            labels: ['Docker', 'Kubernetes', 'Git', 'Linux', 'CI/CD', 'Cloud Services'],
            data: [85, 70, 95, 85, 80, 75],
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)'
        });
    }
    
    // Embedded skills radar chart
    const embeddedChart = document.getElementById('embedded-skills-chart');
    if (embeddedChart) {
        createRadarChart(embeddedChart, {
            label: 'Embedded Skills',
            labels: ['Embedded C', 'Arduino', 'Raspberry Pi', 'IoT', 'Real-time Systems', 'PCB Design'],
            data: [85, 75, 80, 75, 80, 70],
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)'
        });
    }
    
    // Data Science skills radar chart
    const dataScienceChart = document.getElementById('datascience-skills-chart');
    if (dataScienceChart) {
        createRadarChart(dataScienceChart, {
            label: 'Data Science Skills',
            labels: ['Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'Data Visualization', 'Statistics'],
            data: [90, 85, 80, 70, 85, 80],
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)'
        });
    }
    
    // Soft skills radar chart
    const softSkillsChart = document.getElementById('soft-skills-chart');
    if (softSkillsChart) {
        createRadarChart(softSkillsChart, {
            label: 'Soft Skills',
            labels: ['Problem Solving', 'Team Leadership', 'Communication', 'Agile', 'Collaboration', 'Mentoring'],
            data: [95, 85, 90, 85, 90, 85],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)'
        });
    }
    
    // Combined comprehensive radar chart
    const comprehensiveChart = document.getElementById('comprehensive-skills-chart');
    if (comprehensiveChart) {
        createComprehensiveChart(comprehensiveChart);
    }
}

/**
 * Create a radar chart
 */
function createRadarChart(canvas, config) {
    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.label,
                data: config.data,
                backgroundColor: config.backgroundColor,
                borderColor: config.borderColor,
                borderWidth: 2,
                pointBackgroundColor: config.borderColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: config.borderColor,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    ticks: {
                        stepSize: 20,
                        display: true,
                        backdropColor: 'transparent',
                        color: '#666',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    padding: 10
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    return chart;
}

/**
 * Create comprehensive chart with multiple datasets
 */
function createComprehensiveChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Python', 'JavaScript', 'Rust', 'Go', 'React', 'Django', 'Docker', 'Git'],
            datasets: [
                {
                    label: 'Current Skills',
                    data: [95, 85, 80, 70, 85, 90, 85, 95],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                },
                {
                    label: 'Target Skills',
                    data: [95, 90, 85, 80, 90, 90, 90, 95],
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    ticks: {
                        stepSize: 20,
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
    
    return chart;
}

/**
 * Create skill progress bars
 */
function initSkillProgressBars() {
    const skillBars = document.querySelectorAll('.skill-progress-bar');
    
    skillBars.forEach(bar => {
        const progress = bar.getAttribute('data-progress') || 0;
        const progressBar = bar.querySelector('.progress-fill');
        
        if (progressBar) {
            // Animate progress bar on scroll
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        progressBar.style.width = progress + '%';
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(bar);
        }
    });
}

/**
 * Create skill comparison chart
 */
function createSkillComparisonChart(canvas, skills) {
    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: skills.map(s => s.name),
            datasets: [{
                label: 'Skill Level',
                data: skills.map(s => s.level),
                backgroundColor: skills.map(s => getSkillColor(s.category)),
                borderColor: skills.map(s => getSkillColor(s.category, true)),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Level: ${context.raw}%`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    return chart;
}

/**
 * Get color based on skill category
 */
function getSkillColor(category, isBorder = false) {
    const colors = {
        programming: isBorder ? 'rgba(54, 162, 235, 1)' : 'rgba(54, 162, 235, 0.6)',
        frontend: isBorder ? 'rgba(255, 99, 132, 1)' : 'rgba(255, 99, 132, 0.6)',
        backend: isBorder ? 'rgba(75, 192, 192, 1)' : 'rgba(75, 192, 192, 0.6)',
        devops: isBorder ? 'rgba(153, 102, 255, 1)' : 'rgba(153, 102, 255, 0.6)',
        embedded: isBorder ? 'rgba(255, 159, 64, 1)' : 'rgba(255, 159, 64, 0.6)',
        data: isBorder ? 'rgba(255, 206, 86, 1)' : 'rgba(255, 206, 86, 0.6)',
        ml: isBorder ? 'rgba(231, 76, 60, 1)' : 'rgba(231, 76, 60, 0.6)',
        soft: isBorder ? 'rgba(46, 204, 113, 1)' : 'rgba(46, 204, 113, 0.6)'
    };
    
    return colors[category] || (isBorder ? 'rgba(128, 128, 128, 1)' : 'rgba(128, 128, 128, 0.6)');
}

/**
 * Create animated skill level indicator
 */
function createSkillLevelIndicator(elementId, level) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const levelMap = {
        1: { label: 'Beginner', color: '#e74c3c' },
        2: { label: 'Elementary', color: '#f39c12' },
        3: { label: 'Intermediate', color: '#f1c40f' },
        4: { label: 'Advanced', color: '#2ecc71' },
        5: { label: 'Expert', color: '#3498db' }
    };
    
    const levelInfo = levelMap[level] || levelMap[1];
    
    // Create indicator HTML
    element.innerHTML = `
        <div class="skill-indicator">
            <div class="skill-level">${levelInfo.label}</div>
            <div class="skill-dots">
                ${[1, 2, 3, 4, 5].map(i => `
                    <span class="dot ${i <= level ? 'active' : ''}" 
                          style="${i <= level ? `background-color: ${levelInfo.color}` : ''}">
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Interactive skill filter
 */
function initSkillFilter() {
    const filterButtons = document.querySelectorAll('.skill-filter-btn');
    const skillCards = document.querySelectorAll('.skill-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter skills
            skillCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                if (category === 'all' || cardCategory === category) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

/**
 * Load Chart.js if not already loaded
 */
function loadChartJS() {
    if (typeof Chart !== 'undefined') {
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Initialize everything when Chart.js is ready
 */
async function initializeSkillsVisualization() {
    try {
        await loadChartJS();
        initSkillCharts();
        initSkillProgressBars();
        initSkillFilter();
        console.log('Skills visualization initialized successfully');
    } catch (error) {
        console.error('Failed to initialize skills visualization:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSkillsVisualization);
} else {
    initializeSkillsVisualization();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSkillCharts,
        createRadarChart,
        createComprehensiveChart,
        createSkillComparisonChart,
        initializeSkillsVisualization
    };
}