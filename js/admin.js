// Admin Manager - Quản lý quyền admin
const AdminManager = {
    modal: null,
    
    // Khởi tạo
    init() {
        if (!window.AuthManager || !window.AuthManager.isAdmin()) {
            return;
        }
        
        console.log('Initializing Admin Manager...');
        
        this.setupModal();
        this.setupManualSignalButton();
    },
    
    // Setup modal
    setupModal() {
        this.modal = document.getElementById('manualSignalModal');
        if (!this.modal) return;
        
        const closeBtn = this.modal.querySelector('.modal-close');
        const cancelBtn = this.modal.querySelector('.modal-cancel');
        const submitBtn = this.modal.querySelector('.modal-submit');
        
        closeBtn?.addEventListener('click', () => this.closeModal());
        cancelBtn?.addEventListener('click', () => this.closeModal());
        submitBtn?.addEventListener('click', () => this.submitManualSignal());
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    },
    
    // Setup manual signal button
    setupManualSignalButton() {
        const btn = document.getElementById('addManualSignal');
        if (btn) {
            btn.addEventListener('click', () => this.openModal());
        }
    },
    
    // Open modal
    openModal() {
        if (!this.modal) return;
        
        this.modal.classList.add('active');
        this.modal.querySelector('.modal-content').classList.add('modal-enter');
        
        // Clear form
        document.getElementById('modalCoin').value = '';
        document.getElementById('modalDirection').value = 'LONG';
        document.getElementById('modalEntry').value = '';
        document.getElementById('modalTP').value = '';
        document.getElementById('modalSL').value = '';
        document.getElementById('modalReason').value = '';
    },
    
    // Close modal
    closeModal() {
        if (!this.modal) return;
        
        const content = this.modal.querySelector('.modal-content');
        content.classList.remove('modal-enter');
        content.classList.add('modal-exit');
        
        setTimeout(() => {
            this.modal.classList.remove('active');
            content.classList.remove('modal-exit');
        }, 200);
    },
    
    // Submit manual signal
    async submitManualSignal() {
        const coin = document.getElementById('modalCoin').value.trim().toUpperCase();
        const direction = document.getElementById('modalDirection').value;
        const entry = document.getElementById('modalEntry').value;
        const tp = document.getElementById('modalTP').value;
        const sl = document.getElementById('modalSL').value;
        const reason = document.getElementById('modalReason').value.trim();
        
        // Validation
        if (!coin || !entry || !tp || !sl) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        if (!coin.includes('USDT')) {
            alert('Coin phải có đuôi USDT (ví dụ: BTCUSDT)');
            return;
        }
        
        const entryNum = parseFloat(entry);
        const tpNum = parseFloat(tp);
        const slNum = parseFloat(sl);
        
        if (isNaN(entryNum) || isNaN(tpNum) || isNaN(slNum)) {
            alert('Giá trị phải là số');
            return;
        }
        
        // Validate logic
        if (direction === 'LONG') {
            if (tpNum <= entryNum) {
                alert('TP phải lớn hơn Entry cho LONG');
                return;
            }
            if (slNum >= entryNum) {
                alert('SL phải nhỏ hơn Entry cho LONG');
                return;
            }
        } else {
            if (tpNum >= entryNum) {
                alert('TP phải nhỏ hơn Entry cho SHORT');
                return;
            }
            if (slNum <= entryNum) {
                alert('SL phải lớn hơn Entry cho SHORT');
                return;
            }
        }
        
        try {
            // Create signal
            const signal = await StorageManager.addSignal({
                coin: coin,
                direction: direction,
                entry: entry,
                tp: tp,
                sl: sl,
                reason: reason || 'Admin Manual Signal',
                createdBy: 'Admin'
            });
            
            // Add to tracked
            await StorageManager.addTrackedCoin(signal.id, coin);
            
            // Close modal
            this.closeModal();
            
            // Refresh signals
            if (window.SignalManager) {
                window.SignalManager.refreshSignals();
            }
            
            // Show success
            this.showNotification('Đã thêm tín hiệu thành công', 'success');
            
        } catch (error) {
            console.error('Error creating manual signal:', error);
            alert('Có lỗi xảy ra khi tạo tín hiệu');
        }
    },
    
    // Load permissions page
    async loadPermissionsPage() {
        await this.renderKeys();
        await this.renderAdmins();
        this.setupKeyCreation();
        this.setupManualSignalForm();
        this.setupAdminManagement();
    },
    
    // Render keys
    async renderKeys() {
        const container = document.getElementById('keysList');
        if (!container) return;
        
        const keys = await StorageManager.getKeys() || [];
        const userKeys = keys.filter(k => k.type !== 'admin');
        
        if (userKeys.length === 0) {
            container.innerHTML = '<p style="color: var(--text-light); text-align: center;">Chưa có key nào</p>';
            return;
        }
        
        container.innerHTML = userKeys.map(key => {
            const expiry = key.expiresAt 
                ? new Date(key.expiresAt).toLocaleDateString('vi-VN')
                : 'Vĩnh viễn';
            
            const typeText = {
                'week': '1 Tuần',
                'month': '1 Tháng',
                '3months': '3 Tháng',
                'forever': 'Vĩnh Viễn'
            };
            
            return `
                <div class="key-item">
                    <div class="key-item-info">
                        <div class="key-item-code">${key.code}</div>
                        <div class="key-item-type">Loại: ${typeText[key.type] || key.type} | Hết hạn: ${expiry}</div>
                    </div>
                    <div class="key-item-actions">
                        <button class="action-btn delete" onclick="AdminManager.deleteKey('${key.code}')">
                            Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Setup key creation
    setupKeyCreation() {
        const btn = document.getElementById('generateKeyBtn');
        if (btn) {
            btn.onclick = () => this.generateKey();
        }
    },
    
    // Generate key
    async generateKey() {
        const type = document.getElementById('keyType').value;
        const customKey = document.getElementById('customKey').value.trim();
        
        let code;
        if (customKey) {
            // Check if key exists
            const keys = await StorageManager.getKeys() || [];
            if (keys.some(k => k.code === customKey)) {
                alert('Key này đã tồn tại');
                return;
            }
            code = customKey;
        } else {
            // Generate random key
            code = `KEY_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        }
        
        // Calculate expiry
        let expiresAt = null;
        const now = Date.now();
        
        if (type === 'week') {
            expiresAt = now + 7 * 24 * 60 * 60 * 1000;
        } else if (type === 'month') {
            expiresAt = now + 30 * 24 * 60 * 60 * 1000;
        } else if (type === '3months') {
            expiresAt = now + 90 * 24 * 60 * 60 * 1000;
        }
        
        try {
            await StorageManager.addKey({
                code: code,
                type: type,
                expiresAt: expiresAt,
                createdBy: 'admin'
            });
            
            // Clear form
            document.getElementById('customKey').value = '';
            
            // Refresh list
            await this.renderKeys();
            
            // Show success
            this.showNotification(`Key đã tạo: ${code}`, 'success');
            
        } catch (error) {
            console.error('Error generating key:', error);
            alert('Có lỗi khi tạo key');
        }
    },
    
    // Delete key
    async deleteKey(code) {
        if (!confirm(`Xóa key: ${code}?`)) {
            return;
        }
        
        try {
            await StorageManager.removeKey(code);
            await this.renderKeys();
            this.showNotification('Đã xóa key', 'success');
        } catch (error) {
            console.error('Error deleting key:', error);
            alert('Có lỗi khi xóa key');
        }
    },
    
    // Setup manual signal form (in permissions page)
    setupManualSignalForm() {
        const btn = document.getElementById('sendManualSignalBtn');
        if (btn) {
            btn.onclick = () => this.sendManualSignalFromForm();
        }
    },
    
    // Send manual signal from permissions page form
    async sendManualSignalFromForm() {
        const coin = document.getElementById('manualCoin').value.trim().toUpperCase();
        const direction = document.getElementById('manualDirection').value;
        const entry = document.getElementById('manualEntry').value;
        const tp = document.getElementById('manualTP').value;
        const sl = document.getElementById('manualSL').value;
        const reason = document.getElementById('manualReason').value.trim();
        
        // Validation (same as modal)
        if (!coin || !entry || !tp || !sl) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        if (!coin.includes('USDT')) {
            alert('Coin phải có đuôi USDT');
            return;
        }
        
        try {
            const signal = await StorageManager.addSignal({
                coin: coin,
                direction: direction,
                entry: entry,
                tp: tp,
                sl: sl,
                reason: reason || 'Admin Manual Signal',
                createdBy: 'Admin'
            });
            
            await StorageManager.addTrackedCoin(signal.id, coin);
            
            // Clear form
            document.getElementById('manualCoin').value = '';
            document.getElementById('manualEntry').value = '';
            document.getElementById('manualTP').value = '';
            document.getElementById('manualSL').value = '';
            document.getElementById('manualReason').value = '';
            
            this.showNotification('Đã gửi tín hiệu', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra');
        }
    },
    
    // Setup admin management
    setupAdminManagement() {
        const btn = document.getElementById('addAdminBtn');
        if (btn) {
            btn.onclick = () => this.addAdmin();
        }
    },
    
    // Render admins
    async renderAdmins() {
        const container = document.getElementById('adminsList');
        if (!container) return;
        
        const keys = await StorageManager.getKeys() || [];
        const adminKeys = keys.filter(k => k.type === 'admin');
        
        container.innerHTML = adminKeys.map(key => {
            const isMaster = key.code === 'BangAdmin17';
            const createdDate = new Date(key.createdAt).toLocaleDateString('vi-VN');
            
            return `
                <div class="admin-item">
                    <div class="admin-item-info">
                        <div class="key-item-code">${key.code}</div>
                        <div class="admin-item-role">${isMaster ? 'Master Admin' : 'Admin'} | Tạo: ${createdDate}</div>
                    </div>
                    ${!isMaster ? `
                        <div class="key-item-actions">
                            <button class="action-btn delete" onclick="AdminManager.removeAdmin('${key.code}')">
                                Xóa
                            </button>
                        </div>
                    ` : '<div style="color: var(--success); font-weight: 600;">Không thể xóa</div>'}
                </div>
            `;
        }).join('');
    },
    
    // Add admin
    async addAdmin() {
        const keyCode = document.getElementById('newAdminKey').value.trim();
        
        if (!keyCode) {
            alert('Vui lòng nhập key admin');
            return;
        }
        
        // Check if already exists
        const keys = await StorageManager.getKeys() || [];
        if (keys.some(k => k.code === keyCode)) {
            alert('Key này đã tồn tại');
            return;
        }
        
        try {
            await StorageManager.addKey({
                code: keyCode,
                type: 'admin',
                expiresAt: null,
                createdBy: 'master_admin'
            });
            
            document.getElementById('newAdminKey').value = '';
            await this.renderAdmins();
            
            this.showNotification('Đã thêm admin', 'success');
            
        } catch (error) {
            console.error('Error adding admin:', error);
            alert('Có lỗi khi thêm admin');
        }
    },
    
    // Remove admin
    async removeAdmin(code) {
        if (code === 'BangAdmin17') {
            alert('Không thể xóa master admin');
            return;
        }
        
        if (!confirm(`Xóa admin: ${code}?`)) {
            return;
        }
        
        try {
            await StorageManager.removeKey(code);
            await this.renderAdmins();
            this.showNotification('Đã xóa admin', 'success');
        } catch (error) {
            console.error('Error removing admin:', error);
            alert('Có lỗi khi xóa admin');
        }
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        if (window.SignalManager) {
            window.SignalManager.showNotification(message, type);
        }
    }
};

// Export
if (typeof window !== 'undefined') {
    window.AdminManager = AdminManager;
}
