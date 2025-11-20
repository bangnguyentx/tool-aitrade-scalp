// Storage Manager - Quản lý dữ liệu với persistent storage
const StorageManager = {
    // Khởi tạo storage
    async init() {
        try {
            // Kiểm tra và khởi tạo dữ liệu mặc định
            const keys = await this.getKeys();
            if (!keys) {
                await this.saveKeys([{
                    code: 'BangAdmin17',
                    type: 'admin',
                    createdAt: Date.now(),
                    expiresAt: null
                }]);
            }

            const signals = await this.getActiveSignals();
            if (!signals) {
                await this.saveActiveSignals([]);
            }

            const completed = await this.getCompletedSignals();
            if (!completed) {
                await this.saveCompletedSignals([]);
            }

            const tracked = await this.getTrackedCoins();
            if (!tracked) {
                await this.saveTrackedCoins([]);
            }

            console.log('Storage initialized successfully');
        } catch (error) {
            console.error('Storage init error:', error);
        }
    },

    // Keys Management
    async getKeys() {
        try {
            const result = localStorage.getItem('access_keys');
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    },

    async saveKeys(keys) {
        try {
            localStorage.setItem('access_keys', JSON.stringify(keys));
            return true;
        } catch (error) {
            console.error('Error saving keys:', error);
            return false;
        }
    },

    async addKey(keyData) {
        const keys = await this.getKeys() || [];
        keys.push({
            code: keyData.code,
            type: keyData.type,
            createdAt: Date.now(),
            expiresAt: keyData.expiresAt,
            createdBy: keyData.createdBy || 'admin'
        });
        await this.saveKeys(keys);
        return true;
    },

    async removeKey(keyCode) {
        const keys = await this.getKeys() || [];
        const filtered = keys.filter(k => k.code !== keyCode);
        await this.saveKeys(filtered);
        return true;
    },

    async validateKey(keyCode) {
        const keys = await this.getKeys() || [];
        const key = keys.find(k => k.code === keyCode);
        
        if (!key) return { valid: false, message: 'Key không tồn tại' };
        
        if (key.expiresAt && Date.now() > key.expiresAt) {
            return { valid: false, message: 'Key đã hết hạn' };
        }
        
        return { 
            valid: true, 
            isAdmin: key.type === 'admin',
            key: key
        };
    },

    // Active Signals Management
    async getActiveSignals() {
        try {
            const result = localStorage.getItem('active_signals');
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    },

    async saveActiveSignals(signals) {
        try {
            localStorage.setItem('active_signals', JSON.stringify(signals));
            return true;
        } catch (error) {
            console.error('Error saving active signals:', error);
            return false;
        }
    },

    async addSignal(signal) {
        const signals = await this.getActiveSignals() || [];
        
        const newSignal = {
            id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            coin: signal.coin,
            direction: signal.direction,
            entry: parseFloat(signal.entry),
            tp: parseFloat(signal.tp),
            sl: parseFloat(signal.sl),
            rr: signal.rr || this.calculateRR(signal.entry, signal.tp, signal.sl, signal.direction),
            reason: signal.reason || 'AI Analysis - Confidence 100%',
            status: 'pending',
            createdAt: Date.now(),
            createdBy: signal.createdBy || 'AI',
            hitEntry: false
        };
        
        signals.push(newSignal);
        await this.saveActiveSignals(signals);
        
        return newSignal;
    },

    async updateSignal(signalId, updates) {
        const signals = await this.getActiveSignals() || [];
        const index = signals.findIndex(s => s.id === signalId);
        
        if (index !== -1) {
            signals[index] = { ...signals[index], ...updates };
            await this.saveActiveSignals(signals);
            return signals[index];
        }
        
        return null;
    },

    async removeSignal(signalId) {
        const signals = await this.getActiveSignals() || [];
        const filtered = signals.filter(s => s.id !== signalId);
        await this.saveActiveSignals(filtered);
        return true;
    },

    async moveSignalToCompleted(signalId, result) {
        const signals = await this.getActiveSignals() || [];
        const signal = signals.find(s => s.id === signalId);
        
        if (!signal) return false;
        
        // Thêm vào completed signals
        const completed = await this.getCompletedSignals() || [];
        completed.push({
            ...signal,
            result: result.status, // 'win' or 'lose'
            exitPrice: result.exitPrice,
            profit: result.profit,
            completedAt: Date.now()
        });
        await this.saveCompletedSignals(completed);
        
        // Xóa khỏi active signals
        await this.removeSignal(signalId);
        
        return true;
    },

    // Completed Signals Management
    async getCompletedSignals() {
        try {
            const result = localStorage.getItem('completed_signals');
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    },

    async saveCompletedSignals(signals) {
        try {
            localStorage.setItem('completed_signals', JSON.stringify(signals));
            return true;
        } catch (error) {
            console.error('Error saving completed signals:', error);
            return false;
        }
    },

    async getCompletedSignalsToday() {
        const signals = await this.getCompletedSignals() || [];
        const todayStart = new Date().setHours(0, 0, 0, 0);
        return signals.filter(s => s.completedAt >= todayStart);
    },

    async getCompletedSignalsThisWeek() {
        const signals = await this.getCompletedSignals() || [];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        return signals.filter(s => s.completedAt >= weekStart.getTime());
    },

    // Tracked Coins Management
    async getTrackedCoins() {
        try {
            const result = localStorage.getItem('tracked_coins');
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    },

    async saveTrackedCoins(coins) {
        try {
            localStorage.setItem('tracked_coins', JSON.stringify(coins));
            return true;
        } catch (error) {
            console.error('Error saving tracked coins:', error);
            return false;
        }
    },

    async addTrackedCoin(signalId, coin) {
        const tracked = await this.getTrackedCoins() || [];
        tracked.push({
            signalId: signalId,
            coin: coin,
            addedAt: Date.now(),
            lastCheck: Date.now()
        });
        await this.saveTrackedCoins(tracked);
        return true;
    },

    async removeTrackedCoin(signalId) {
        const tracked = await this.getTrackedCoins() || [];
        const filtered = tracked.filter(t => t.signalId !== signalId);
        await this.saveTrackedCoins(filtered);
        return true;
    },

    async updateTrackedCoinCheck(signalId) {
        const tracked = await this.getTrackedCoins() || [];
        const coin = tracked.find(t => t.signalId === signalId);
        
        if (coin) {
            coin.lastCheck = Date.now();
            await this.saveTrackedCoins(tracked);
        }
    },

    // Cooldown Management (coins không được phân tích trong 2 tiếng)
    async getCooldownCoins() {
        try {
            const result = localStorage.getItem('cooldown_coins');
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    },

    async saveCooldownCoins(coins) {
        try {
            localStorage.setItem('cooldown_coins', JSON.stringify(coins));
            return true;
        } catch (error) {
            console.error('Error saving cooldown coins:', error);
            return false;
        }
    },

    async addCooldownCoin(coin) {
        const cooldowns = await this.getCooldownCoins() || [];
        const twoHours = 2 * 60 * 60 * 1000;
        
        cooldowns.push({
            coin: coin,
            until: Date.now() + twoHours
        });
        
        await this.saveCooldownCoins(cooldowns);
        return true;
    },

    async isInCooldown(coin) {
        const cooldowns = await this.getCooldownCoins() || [];
        const now = Date.now();
        
        // Lọc bỏ các cooldown đã hết hạn
        const activeCooldowns = cooldowns.filter(c => c.until > now);
        await this.saveCooldownCoins(activeCooldowns);
        
        // Kiểm tra coin có trong cooldown không
        return activeCooldowns.some(c => c.coin === coin);
    },

    // Statistics
    async getTodayStats() {
        const completed = await this.getCompletedSignalsToday();
        
        const total = completed.length;
        const wins = completed.filter(s => s.result === 'win').length;
        const losses = completed.filter(s => s.result === 'lose').length;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;
        
        const totalProfit = completed.reduce((sum, s) => sum + (s.profit || 0), 0);
        
        return {
            total,
            wins,
            losses,
            winRate,
            profit: totalProfit.toFixed(2)
        };
    },

    async getWeekStats() {
        const completed = await this.getCompletedSignalsThisWeek();
        
        const total = completed.length;
        const wins = completed.filter(s => s.result === 'win').length;
        const losses = completed.filter(s => s.result === 'lose').length;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;
        
        const totalProfit = completed.reduce((sum, s) => sum + (s.profit || 0), 0);
        
        return {
            total,
            wins,
            losses,
            winRate,
            profit: totalProfit.toFixed(2)
        };
    },

    // Utility Functions
    calculateRR(entry, tp, sl, direction) {
        const entryNum = parseFloat(entry);
        const tpNum = parseFloat(tp);
        const slNum = parseFloat(sl);
        
        if (direction === 'LONG') {
            const risk = entryNum - slNum;
            const reward = tpNum - entryNum;
            return (reward / risk).toFixed(2);
        } else {
            const risk = slNum - entryNum;
            const reward = entryNum - tpNum;
            return (reward / risk).toFixed(2);
        }
    },

    calculateProfit(entry, exit, direction) {
        const entryNum = parseFloat(entry);
        const exitNum = parseFloat(exit);
        
        if (direction === 'LONG') {
            return ((exitNum - entryNum) / entryNum * 100).toFixed(2);
        } else {
            return ((entryNum - exitNum) / entryNum * 100).toFixed(2);
        }
    },

    // Daily Summary at 23:00
    async generateDailySummary() {
        const stats = await this.getTodayStats();
        const active = await this.getActiveSignals() || [];
        
        const summary = {
            date: new Date().toLocaleDateString('vi-VN'),
            totalSignals: stats.total,
            wins: stats.wins,
            losses: stats.losses,
            winRate: stats.winRate,
            profit: stats.profit,
            activeSignals: active.length,
            generatedAt: Date.now()
        };
        
        // Lưu summary
        try {
            const summaries = await this.getDailySummaries() || [];
            summaries.push(summary);
            
            // Chỉ giữ lại 30 ngày gần nhất
            const last30Days = summaries.slice(-30);
            localStorage.setItem('daily_summaries', JSON.stringify(last30Days));
            
            console.log('Daily summary generated:', summary);
            return summary;
        } catch (error) {
            console.error('Error generating daily summary:', error);
            return null;
        }
    },

    async getDailySummaries() {
        try {
            const result = localStorage.getItem('daily_summaries');
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    }
};

// Khởi tạo storage khi load
if (typeof window !== 'undefined') {
    // Gán StorageManager vào window để có thể truy cập từ các file khác
    window.StorageManager = StorageManager;
    // Gọi init khi DOM đã sẵn sàng
    document.addEventListener('DOMContentLoaded', function() {
        StorageManager.init();
    });
}
