const profile = {
    async renderProfile(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const cachedUser = window.auth.getUser() || {};
            const userData = await window.api.call('/api/users/me');
            const user = { ...cachedUser, ...userData };
            
            container.innerHTML = `
            <div class="profile-layout">
                <!-- Profile Card -->
                <div class="card">
                    <div style="padding:24px;text-align:center">
                        <div style="position:relative;width:120px;height:120px;margin:0 auto 16px">
                            <img id="profile-avatar" src="${userData.avatar_url || '/static/img/default-avatar.png'}" 
                                 style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:4px solid var(--primary)"
                                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Crect fill=%27%236366f1%27 width=%27120%27 height=%27120%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-size=%2748%27 fill=%27white%27 font-family=%27Arial%27%3E${(user.username||'U').charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E'">
                            <label for="avatar-upload" style="position:absolute;bottom:0;right:0;width:36px;height:36px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
                                ${ICONS.camera || '📷'}
                            </label>
                            <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="window.profile.uploadAvatar(this)">
                        </div>
                        <h3 style="margin:0 0 4px 0;font-size:18px">${window.ui.escapeHtml(user.full_name || user.fullName || user.username || '-')}</h3>
                        <span class="badge ${window.ROLE_COLORS[user.role]}">${window.ROLE_LABELS[user.role]}</span>
                        <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px">
                            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                                <span style="color:var(--text-secondary)">Account ID:</span>
                                <code style="font-size:11px">${window.ui.escapeHtml((user.id || '').slice(0,8) || 'N/A')}</code>
                            </div>
                            <div style="display:flex;justify-content:space-between">
                                <span style="color:var(--text-secondary)">Member Since:</span>
                                <strong>${window.ui.formatDate(userData.created_at)}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Profile Details -->
                <div class="profile-details">
                    <!-- Personal Information -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">Personal Information</div>
                            <button class="fly-btn fly-btn-sm" onclick="window.profile.editPersonalInfo()">Edit</button>
                        </div>
                        <div class="card-body" style="padding:24px">
                            <div class="profile-info-grid">
                                <div>
                                    <label style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Full Name</label>
                                    <div style="font-size:14px;font-weight:600;margin-top:4px">${window.ui.escapeHtml(userData.full_name || 'Not set')}</div>
                                </div>
                                <div>
                                    <label style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Username</label>
                                    <div style="font-size:14px;font-weight:600;margin-top:4px">${window.ui.escapeHtml(userData.username || '-')}</div>
                                </div>
                                <div>
                                    <label style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Email</label>
                                    <div style="font-size:14px;font-weight:600;margin-top:4px">${window.ui.escapeHtml(userData.email || 'Not set')}</div>
                                </div>
                                <div>
                                    <label style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Phone</label>
                                    <div style="font-size:14px;font-weight:600;margin-top:4px">${window.ui.escapeHtml(userData.phone || 'Not set')}</div>
                                </div>
                                <div>
                                    <label style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Country</label>
                                    <div style="font-size:14px;font-weight:600;margin-top:4px">${window.ui.escapeHtml(userData.country || 'Not set')}</div>
                                </div>
                                <div>
                                    <label style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Role</label>
                                    <div style="font-size:14px;font-weight:600;margin-top:4px">${window.ui.escapeHtml(window.ROLE_LABELS[userData.role] || userData.role || '-')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Security Settings -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">Security Settings</div>
                        </div>
                        <div class="card-body" style="padding:24px">
                            <div class="profile-setting-row" style="margin-bottom:12px">
                                <div>
                                    <div style="font-weight:600;margin-bottom:4px">Password</div>
                                    <div style="font-size:12px;color:var(--text-secondary)">Last changed: ${userData.password_updated || 'Never'}</div>
                                </div>
                                <button class="fly-btn fly-btn-sm" onclick="window.profile.changePassword()">Change Password</button>
                            </div>
                            <div class="profile-setting-row">
                                <div>
                                    <div style="font-weight:600;margin-bottom:4px">Two-Factor Authentication</div>
                                    <div style="font-size:12px;color:var(--text-secondary)">Add an extra layer of security</div>
                                </div>
                                <span class="badge badge-secondary">Coming Soon</span>
                            </div>
                        </div>
                    </div>

                    <!-- Notification Preferences -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">Notification Preferences</div>
                        </div>
                        <div class="card-body" style="padding:24px">
                            <div style="display:flex;flex-direction:column;gap:12px">
                                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                                    <input type="checkbox" checked>
                                    <span>Email notifications for new SMS</span>
                                </label>
                                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                                    <input type="checkbox" checked>
                                    <span>SMS notifications for critical alerts</span>
                                </label>
                                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                                    <input type="checkbox">
                                    <span>Weekly summary reports</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    editPersonalInfo() {
        const user = window.auth.getUser() || {};
        window.ui.showModal('Edit Personal Information', `
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="edit-fullname" class="fly-input" value="${window.ui.escapeHtml(user.full_name || user.fullName || '')}" placeholder="John Doe">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="edit-email" class="fly-input" value="${window.ui.escapeHtml(user.email || '')}" placeholder="john@example.com">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="edit-phone" class="fly-input" value="${window.ui.escapeHtml(user.phone || '')}" placeholder="+1234567890">
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" id="edit-country" class="fly-input" value="${window.ui.escapeHtml(user.country || '')}" placeholder="United States">
                </div>
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.profile.savePersonalInfo()">Save Changes</button>');
    },

    async savePersonalInfo() {
        const payload = {
            fullName: document.getElementById('edit-fullname').value.trim(),
            email: document.getElementById('edit-email').value.trim(),
            phone: document.getElementById('edit-phone').value.trim(),
            country: document.getElementById('edit-country').value.trim()
        };
        try {
            await window.api.call('/api/users/me', { method: 'PATCH', body: JSON.stringify(payload) });
            const user = window.auth.getUser();
            localStorage.setItem('user', JSON.stringify({...user, ...payload}));
            window.ui.showToast('Profile updated successfully', 'success');
            window.ui.closeModal();
            this.renderProfile(document.getElementById('page-content'));
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    changePassword() {
        window.ui.showModal('Change Password', `
            <div class="form-group">
                <label>Current Password</label>
                <input type="password" id="current-pass" class="fly-input" placeholder="Enter current password">
            </div>
            <div class="form-group">
                <label>New Password</label>
                <input type="password" id="new-pass" class="fly-input" placeholder="Min 6 characters">
            </div>
            <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" id="confirm-pass" class="fly-input" placeholder="Re-enter new password">
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.profile.savePassword()">Update Password</button>');
    },

    async savePassword() {
        const current = document.getElementById('current-pass').value;
        const newPass = document.getElementById('new-pass').value;
        const confirm = document.getElementById('confirm-pass').value;
        
        if (!current || !newPass || !confirm) {
            window.ui.showToast('All fields are required', 'error');
            return;
        }
        if (newPass.length < 6) {
            window.ui.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        if (newPass !== confirm) {
            window.ui.showToast('Passwords do not match', 'error');
            return;
        }
        
        try {
            await window.api.call('/api/users/me/password', { 
                method: 'POST', 
                body: JSON.stringify({ currentPassword: current, newPassword: newPass }) 
            });
            window.ui.showToast('Password updated successfully', 'success');
            window.ui.closeModal();
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    async uploadAvatar(input) {
        const file = input.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            window.ui.showToast('Please select an image file', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            window.ui.showToast('Image size must be less than 5MB', 'error');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await fetch('/api/users/me/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + window.auth.getToken() },
                body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            const avatarUrl = data.avatar_url + '?t=' + Date.now();
            document.getElementById('profile-avatar').src = avatarUrl;
            const stored = window.auth.getUser() || {};
            const merged = { ...stored, avatar_url: data.avatar_url, avatar_ts: Date.now() };
            localStorage.setItem('user', JSON.stringify(merged));
            window.ui.refreshShellUser(merged);
            window.ui.showToast('Profile picture updated', 'success');
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    }
};
window.profile = profile;
