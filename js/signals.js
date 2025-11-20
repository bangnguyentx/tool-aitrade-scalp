// Signal Manager - Quản lý hiển thị và tương tác tín hiệu
const SignalManager = {
    currentPage: 'signals',
    refreshInterval: null,
    
    // Khởi tạo
    init() {
        console.log('Initializing Signal Manager...');
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup refresh
        this.setupRefresh();
        
        // Load initial data
        this.loadSignalsPage();
        
        // Auto refresh mỗi 30 giây
        this.refreshInterval = setInterval(() => {
            if (this.currentPage === 'signals') {
                this.refreshSignals();
            } else if (this.currentPage === 'statistics') {
                this.loadStatisticsPage();
            }
        }, 30000);
    },
    
    // Setup navigation
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const page = item.getAttribute('data-page');
                this.navigateToPage(page);
                
                // Close sidebar on mobile
                if (window.innerWidth < 1024) {
                    sidebar.classList.remove('active');
                }
            });
        });
        
        // Menu toggle for mobile
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    },
    
    // Navigate to page
    navigateToPage(page) {
        this.currentPage = page;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
        
        // Show page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}Page`)?.classList.add('active');
        
        // Load page data
        if (page === 'signals') {
            this.loadSignalsPage();
        } else if (page === 'statistics') {
            this.loadStatisticsPage();
        } else if (page === 'permissions') {
            this.loadPermissionsPage();
        }
    },
    
    // Setup refresh button
    setupRefresh() {
        const refreshBtn = document.getElementById('refreshSignals');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshSignals();
                
                // Animate button
                refreshBtn.style.transform = 'rotate(360deg)';
                setTimeout(() => {
                    refreshBtn.style.transform = 'rotate(0deg)';
                }, 500);
            });
        }
    },
    
    // Load signals page
    async loadSignalsPage() {
        await this.refreshSignals();
        await this.updateSummaryCards();
    },
    
    // Refresh signals
    async refreshSignals() {
        const activeSignals = await StorageManager.getActiveSignals() || [];
        const completedSignals = await StorageManager.getCompletedSignalsToday() || [];
        
        this.renderActiveSignals(activeSignals);
        this.renderCompletedSignals(completedSignals);
    },
    
    // Render active signals
    renderActiveSignals(signals) {
        const tbody = document.getElementById('activeSignalsBody');
        if (!tbody) return;
        
        if (signals.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="10">Đang chờ tín hiệu...</td></tr>';
            return;
        }
        
        tbody.innerHTML = signals.map(signal => {
            const statusBadge = this.getStatusBadge(signal);
            const createdTime = new Date(signal.createdAt).toLocaleString('vi-VN');
            
            return `
                <tr class="table-row-enter">
                    <td>${createdTime}</td>
                    <td><strong>${signal.coin}</strong></td>
                    <td><span class="direction-badge ${signal.direction.toLowerCase()}">${signal.direction}</span></td>
                    <td>${signal.entry}</td>
                    <td>${signal.tp}</td>
                    <td>${signal.sl}</td>
                    <td>${signal.rr}:1</td>
                    <td>${signal.reason}</td>
                    <td>${statusBadge}</td>
                    ${window.AuthManager && window.AuthManager.isAdmin() ? `
                        <td class="admin-only">
                            <button class="action-btn delete" onclick="SignalManager.deleteSignal('${signal.id}')">
                                Xóa
                            </button>
                        </td>
                    ` : ''}
                </tr>
            `;
        }).join('');
    },
    
    // Render completed signals
    renderCompletedSignals(signals) {
        const tbody = document.getElementById('completedSignalsBody');
        if (!tbody) return;
        
        if (signals.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="8">Chưa có tín hiệu nào hoàn thành</td></tr>';
            return;
        }
        
        tbody.innerHTML = signals.map(signal => {
            const completedTime = new Date(signal.completedAt).toLocaleString('vi-VN');
            const resultBadge = signal.result === 'win' 
                ? '<span class="status-badge win">Thắng</span>' 
                : '<span class="status-badge lose">Thua</span>';
            
            const profitColor = signal.profit >= 0 ? 'color: var(--success)' : 'color: var(--danger)';
            
            return `
                <tr class="table-row-enter">
                    <td>${completedTime}</td>
                    <td><strong>${signal.coin}</strong></td>
                    <td><span class="direction-badge ${signal.direction.toLowerCase()}">${signal.direction}</span></td>
                    <td>${signal.entry}</td>
                    <td>${signal.exitPrice}</td>
                    <td>${signal.rr}:1</td>
                    <td style="${profitColor}"><strong>${signal.profit > 0 ? '+' : ''}${signal.profit}%</strong></td>
                    <td>${resultBadge}</td>
                </tr>
            `;
        }).join('');
    },
    
    // Get status badge
    getStatusBadge(signal) {
        if (signal.hitEntry) {
            return '<span class="status-badge hit-entry">Đã Entry</span>';
        } else {
            return '<span class="status-badge pending">Chờ Entry</span>';
        }
    },
    
    // Update summary cards
    async updateSummaryCards() {
        const stats = await StorageManager.getTodayStats();
        
        document.getElementById('totalSignalsToday').textContent = stats.total;
        document.getElementById('winSignalsToday').textContent = stats.wins;
        document.getElementById('loseSignalsToday').textContent = stats.losses;
        
        const profitEl = document.getElementById('profitToday');
        profitEl.textContent = `${stats.profit > 0 ? '+' : ''}${stats.profit}%`;
        profitEl.style.color = stats.profit >= 0 ? 'var(--success)' : 'var(--danger)';
    },
    
    // Delete signal (Admin only)
    async deleteSignal(signalId) {
        if (!window.AuthManager || !window.AuthManager.isAdmin()) {
            alert('Chỉ admin mới có quyền xóa tín hiệu');
            return;
        }
        
        if (!confirm('Bạn có chắc muốn xóa tín hiệu này?')) {
            return;
        }
        
        try {
            await StorageManager.removeSignal(signalId);
            await StorageManager.removeTrackedCoin(signalId);
            await this.refreshSignals();
            
            this.showNotification('Đã xóa tín hiệu', 'success');
        } catch (error) {
            console.error('Error deleting signal:', error);
            this.showNotification('Không thể xóa tín hiệu', 'error');
        }
    },
    
    // Load statistics page
    async loadStatisticsPage() {
        const period = document.querySelector('.filter-btn.active')?.getAttribute('data-period') || 'day';
        
        let stats;
        if (period === 'day') {
            stats = await StorageManager.getTodayStats();
        } else if (period === 'week') {
            stats = await StorageManager.getWeekStats();
        }
        
        this.renderStatistics(stats);
        await this.renderWeeklySummary();
        
        // Setup period filter
        this.setupPeriodFilter();
    },
    
    // Render statistics
    renderStatistics(stats) {
        document.getElementById('statTotalSignals').textContent = stats.total;
        document.getElementById('statWinRate').textContent = `${stats.winRate}%`;
        
        const avgProfit = stats.total > 0 ? (stats.profit / stats.total).toFixed(2) : 0;
        const avgProfitEl = document.getElementById('statAvgProfit');
        avgProfitEl.textContent = `${avgProfit > 0 ? '+' : ''}${avgProfit}%`;
        avgProfitEl.style.color = avgProfit >= 0 ? 'var(--success)' : 'var(--danger)';
        
        const avgRR = stats.total > 0 ? '1.5:1' : '0:1'; // Simplified
        document.getElementById('statAvgRR').textContent = avgRR;
    },
    
    // Render weekly summary
    async renderWeeklySummary() {
        const tbody = document.getElementById('weeklySummaryBody');
        if (!tbody) return;
        
        const summaries = await StorageManager.getDailySummaries() || [];
        const lastWeek = summaries.slice(-7);
        
        if (lastWeek.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Chưa có dữ liệu</td></tr>';
            return;
        }
        
        tbody.innerHTML = lastWeek.map(summary => {
            const profitColor = summary.profit >= 0 ? 'color: var(--success)' : 'color: var(--danger)';
            
            return `
                <tr>
                    <td>${summary.date}</td>
                    <td>${summary.totalSignals}</td>
                    <td style="color: var(--success)">${summary.wins}</td>
                    <td style="color: var(--danger)">${summary.losses}</td>
                    <td>${summary.winRate}%</td>
                    <td style="${profitColor}"><strong>${summary.profit > 0 ? '+' : ''}${summary.profit}%</strong></td>
                </tr>
            `;
        }).join('');
    },
    
    // Setup period filter
    setupPeriodFilter() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.loadStatisticsPage();
            });
        });
    },
    
    // Load permissions page
    loadPermissionsPage() {
        if (window.AdminManager) {
            window.AdminManager.loadPermissionsPage();
        }
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} notification-enter`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            font-weight: 600;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('notification-exit');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Export
if (typeof window !== 'undefined') {
    window.SignalManager = SignalManager;
}
