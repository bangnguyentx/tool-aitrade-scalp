// Authentication Manager - Quản lý đăng nhập và quyền hạn
const AuthManager = {
    currentUser: null,
    
    // Khởi tạo
    async init() {
        // Kiểm tra session hiện tại
        const savedSession = sessionStorage.getItem('quantum_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                const validation = await StorageManager.validateKey(session.key);
                
                if (validation.valid) {
                    this.currentUser = {
                        key: session.key,
                        isAdmin: validation.isAdmin,
                        loginTime: session.loginTime
                    };
                    
                    this.showMainApp();
                    return;
                }
            } catch (error) {
                console.error('Session restore error:', error);
            }
        }
        
        // Nếu không có session hợp lệ, hiện màn hình đăng nhập
        this.showAuthScreen();
    },
    
    // Hiển thị màn hình đăng nhập
    showAuthScreen() {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Tạo particles
        this.createParticles();
        
        // Xử lý đăng nhập
        this.setupLoginHandlers();
    },
    
    // Hiển thị ứng dụng chính
    showMainApp() {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'grid';
        
        // Cập nhật UI dựa trên quyền
        this.updateUIForRole();
        
        // Khởi động các module khác
        if (window.SignalManager) {
            SignalManager.init();
        }
        if (window.AnalysisEngine) {
            AnalysisEngine.start();
        }
    },
    
    // Tạo particles cho màn hình đăng nhập
    createParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            container.appendChild(particle);
        }
    },
    
    // Xử lý đăng nhập
    setupLoginHandlers() {
        const keyInput = document.getElementById('keyInput');
        const loginBtn = document.getElementById('loginBtn');
        
        if (!keyInput || !loginBtn) return;
        
        // Xóa handlers cũ
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
        
        // Thêm handler mới
        newLoginBtn.addEventListener('click', () => this.handleLogin());
        
        keyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        // Focus vào input
        keyInput.focus();
    },
    
    // Xử lý đăng nhập
    async handleLogin() {
        const keyInput = document.getElementById('keyInput');
        const key = keyInput.value.trim();
        
        if (!key) {
            this.showError('Vui lòng nhập key');
            return;
        }
        
        // Hiển thị loading
        const loginBtn = document.querySelector('.btn-login');
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<span class="loading-spinner"></span> Đang xác thực...';
        loginBtn.disabled = true;
        
        try {
            // Validate key
            const validation = await StorageManager.validateKey(key);
            
            if (!validation.valid) {
                this.showError(validation.message);
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                this.shakeInput(keyInput);
                return;
            }
            
            // Lưu session
            this.currentUser = {
                key: key,
                isAdmin: validation.isAdmin,
                loginTime: Date.now()
            };
            
            sessionStorage.setItem('quantum_session', JSON.stringify(this.currentUser));
            
            // Hiển thị thành công
            this.showSuccess('Đăng nhập thành công!');
            
            // Chuyển sang màn hình chính sau 1 giây
            setTimeout(() => {
                this.showMainApp();
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Có lỗi xảy ra, vui lòng thử lại');
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    },
    
    // Đăng xuất
    logout() {
        sessionStorage.removeItem('quantum_session');
        this.currentUser = null;
        
        // Dừng analysis engine
        if (window.AnalysisEngine) {
            AnalysisEngine.stop();
        }
        
        // Reload trang
        window.location.reload();
    },
    
    // Cập nhật UI dựa trên quyền
    updateUIForRole() {
        const isAdmin = this.currentUser && this.currentUser.isAdmin;
        
        // Hiển thị role
        const userRoleEl = document.getElementById('userRole');
        if (userRoleEl) {
            userRoleEl.textContent = isAdmin ? 'Admin' : 'User';
            userRoleEl.style.color = isAdmin ? '#06d6a0' : '#667eea';
        }
        
        // Hiển thị/ẩn các phần tử admin-only
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
    },
    
    // Kiểm tra quyền admin
    isAdmin() {
        return this.currentUser && this.currentUser.isAdmin;
    },
    
    // Hiển thị thông báo lỗi
    showError(message) {
        const existingError = document.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }
        
        const errorEl = document.createElement('div');
        errorEl.className = 'auth-error animate-shake';
        errorEl.style.cssText = `
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            padding: 12px 20px;
            border-radius: 10px;
            margin-top: 15px;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(239, 68, 68, 0.3);
        `;
        errorEl.textContent = message;
        
        const authForm = document.querySelector('.auth-form');
        authForm.appendChild(errorEl);
        
        setTimeout(() => {
            errorEl.remove();
        }, 3000);
    },
    
    // Hiển thị thông báo thành công
    showSuccess(message) {
        const existingSuccess = document.querySelector('.auth-success');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        const successEl = document.createElement('div');
        successEl.className = 'auth-success animate-scale-in';
        successEl.style.cssText = `
            color: #06d6a0;
            background: rgba(6, 214, 160, 0.1);
            padding: 12px 20px;
            border-radius: 10px;
            margin-top: 15px;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(6, 214, 160, 0.3);
        `;
        successEl.textContent = message;
        
        const authForm = document.querySelector('.auth-form');
        authForm.appendChild(successEl);
    },
    
    // Shake animation cho input
    shakeInput(input) {
        input.classList.add('animate-shake');
        setTimeout(() => {
            input.classList.remove('animate-shake');
        }, 500);
    }
};

// Setup logout button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
                AuthManager.logout();
            }
        });
    }
});

// Khởi tạo khi load trang
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
    
    // Đợi storage init xong rồi mới init auth
    setTimeout(() => {
        AuthManager.init();
    }, 100);
}
