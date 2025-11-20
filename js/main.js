// Main Application Entry Point
(function() {
    'use strict';
    
    console.log('🚀 Quantum Trading Suite - Initializing...');
    
    // Application state
    const App = {
        initialized: false,
        version: '1.0.0',
        
        // Initialize application
        async init() {
            if (this.initialized) {
                console.log('App already initialized');
                return;
            }
            
            console.log('Starting initialization sequence...');
            
            try {
                // Wait for DOM
                if (document.readyState === 'loading') {
                    await new Promise(resolve => {
                        document.addEventListener('DOMContentLoaded', resolve);
                    });
                }
                
                // Initialize in sequence
                await this.initStorage();
                await this.initAuth();
                
                this.initialized = true;
                console.log('✅ Application initialized successfully');
                
            } catch (error) {
                console.error('❌ Initialization failed:', error);
                this.showCriticalError(error);
            }
        },
        
        // Initialize storage
        async initStorage() {
            console.log('Initializing storage...');
            
            if (!window.storage) {
                console.warn('Persistent storage not available, using fallback');
                this.createStorageFallback();
            }
            
            if (window.StorageManager) {
                await window.StorageManager.init();
            }
        },
        
        // Initialize authentication
        async initAuth() {
            console.log('Initializing authentication...');
            
            if (window.AuthManager) {
                await window.AuthManager.init();
            }
        },
        
        // Create storage fallback if persistent storage not available
        createStorageFallback() {
            const memoryStorage = {};
            
            window.storage = {
                async get(key) {
                    if (memoryStorage[key]) {
                        return { key, value: memoryStorage[key], shared: true };
                    }
                    throw new Error('Key not found');
                },
                
                async set(key, value, shared) {
                    memoryStorage[key] = value;
                    return { key, value, shared };
                },
                
                async delete(key) {
                    delete memoryStorage[key];
                    return { key, deleted: true };
                },
                
                async list(prefix) {
                    const keys = Object.keys(memoryStorage)
                        .filter(k => !prefix || k.startsWith(prefix));
                    return { keys, shared: true };
                }
            };
            
            console.log('Storage fallback created');
        },
        
        // Show critical error
        showCriticalError(error) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ef4444;
                color: white;
                padding: 30px 40px;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                z-index: 999999;
                max-width: 500px;
                text-align: center;
            `;
            
            errorDiv.innerHTML = `
                <h2 style="margin-bottom: 15px; font-size: 24px;">Lỗi Khởi Động</h2>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #ef4444;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                ">Tải Lại Trang</button>
            `;
            
            document.body.appendChild(errorDiv);
        }
    };
    
    // Make App global
    window.QuantumApp = App;
    
    // Auto-initialize when script loads
    App.init();
    
    // Performance monitoring
    if (window.performance) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log(`📊 Page load time: ${pageLoadTime}ms`);
            }, 0);
        });
    }
    
    // Error handling
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
    });
    
    // Visibility change handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('App hidden');
        } else {
            console.log('App visible, refreshing data...');
            if (window.SignalManager && window.SignalManager.currentPage === 'signals') {
                window.SignalManager.refreshSignals();
            }
        }
    });
    
    // Prevent accidental page leave
    window.addEventListener('beforeunload', (event) => {
        if (window.AnalysisEngine && window.AnalysisEngine.isRunning) {
            const message = 'Hệ thống đang chạy, bạn có chắc muốn thoát?';
            event.returnValue = message;
            return message;
        }
    });
    
    // Console art
    console.log(`
    ╔═══════════════════════════════════════╗
    ║   QUANTUM TRADING SUITE v${App.version}      ║
    ║   AI-Powered Signal Analysis          ║
    ║   © Bằng Nguyễn                       ║
    ╚═══════════════════════════════════════╝
    `);
    
    // Debug mode
    if (localStorage.getItem('debug') === 'true') {
        console.log('Debug mode enabled');
        window.debug = {
            storage: window.StorageManager,
            auth: window.AuthManager,
            analysis: window.AnalysisEngine,
            signals: window.SignalManager,
            admin: window.AdminManager,
            
            // Helper functions
            async getActiveSignals() {
                return await window.StorageManager.getActiveSignals();
            },
            
            async getStats() {
                return await window.StorageManager.getTodayStats();
            },
            
            async clearAllData() {
                if (confirm('Clear all data?')) {
                    await window.StorageManager.saveActiveSignals([]);
                    await window.StorageManager.saveCompletedSignals([]);
                    await window.StorageManager.saveTrackedCoins([]);
                    console.log('Data cleared');
                }
            },
            
            startEngine() {
                if (window.AnalysisEngine) {
                    window.AnalysisEngine.start();
                }
            },
            
            stopEngine() {
                if (window.AnalysisEngine) {
                    window.AnalysisEngine.stop();
                }
            },
            
            async scanNow() {
                if (window.AnalysisEngine) {
                    await window.AnalysisEngine.scanAllCoins();
                }
            },
            
            async checkTracked() {
                if (window.AnalysisEngine) {
                    await window.AnalysisEngine.checkTrackedCoins();
                }
            }
        };
        
        console.log('Debug tools available in window.debug');
    }
    
})();

// Service Worker Registration (for PWA support in future)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Not implemented yet, can be added later
        console.log('Service Worker support detected');
    });
}

// Helper: Format number
window.formatNumber = function(num, decimals = 2) {
    if (typeof num !== 'number') {
        num = parseFloat(num);
    }
    return num.toFixed(decimals);
};

// Helper: Format date
window.formatDate = function(timestamp) {
    return new Date(timestamp).toLocaleString('vi-VN');
};

// Helper: Copy to clipboard
window.copyToClipboard = function(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
};

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StorageManager,
        AuthManager,
        AnalysisEngine,
        SignalManager,
        AdminManager
    };
}
