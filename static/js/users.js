const users = {
    async renderUsers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users?limit=100');
            const allUsers = res.data || [];
            const user = window.auth.getUser();
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">User Management & Hierarchy</div><button class="fly-btn fly-btn-sm" onclick="window.users.showAddModal()">Add Account</button></div>
                <div class="card-body"><div class="hierarchy-container">${this.renderHierarchyNode(user, allUsers)}</div></div>
            </div>`;
        } catch (err) { container.innerHTML = '<p>Error: ' + err.message + '</p>'; }
    },

    renderHierarchyNode(u, allUsers, depth = 0) {
        const children = allUsers.filter(child => child.parent_id === u.id);
        const isSelf = u.id === window.auth.getUser().id;
        return `
        <div class="hierarchy-node" style="margin-left: ${depth * 20}px; border-left: 2px solid var(--border); padding: 12px 0 12px 16px">
            <div class="hierarchy-user-card" style="display:flex; align-items:center; gap:12px; background:var(--bg-card); border:1px solid var(--border); padding:10px 16px; border-radius:8px">
                <div class="avatar" style="width:32px; height:32px; background:var(--primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px">${(u.username || 'U').charAt(0).toUpperCase()}</div>
                <div style="flex:1">
                    <div style="display:flex; align-items:center; gap:8px"><span style="font-weight:700">${u.username}</span> <span class="badge ${window.ROLE_COLORS[u.role] || 'badge-secondary'}">${window.ROLE_LABELS[u.role] || u.role}</span> ${isSelf ? '<span class="badge badge-success">YOU</span>' : ''}</div>
                    <div style="font-size:11px; color:var(--text-secondary)">Balance: $${(u.balance || 0).toFixed(2)} | Status: ${u.status}</div>
                </div>
                <div class="node-actions"><button class="action-btn" onclick="window.users.showEditModal('${u.id}')">${ICONS.edit}</button></div>
            </div>
            <div class="hierarchy-children">${children.map(child => this.renderHierarchyNode(child, allUsers, depth + 1)).join('')}</div>
        </div>`;
    },

    showAddModal() {
        const role = window.auth.getUser().role;
        let options = '';
        if (role === 'admin') options = '<option value="admin">Admin</option><option value="manager">Manager</option><option value="reseller">Reseller</option><option value="sub_reseller">Client</option><option value="test_user">Test User</option>';
        else if (role === 'manager') options = '<option value="reseller">Reseller</option><option value="sub_reseller">Client</option>';
        else if (role === 'reseller') options = '<option value="sub_reseller">Client</option>';

        window.ui.showModal('Create New Account', `
            <div class="form-row"><div class="form-group"><label>Username</label><input type="text" id="u-username" class="fly-input"></div><div class="form-group"><label>Password</label><input type="password" id="u-password" class="fly-input"></div></div>
            <div class="form-row"><div class="form-group"><label>Email</label><input type="email" id="u-email" class="fly-input"></div><div class="form-group"><label>Role</label><select id="u-role" class="fly-input">${options}</select></div></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.save()">Create</button>');
    },

    async save() {
        const payload = { username: document.getElementById('u-username').value, password: document.getElementById('u-password').value, email: document.getElementById('u-email').value, role: document.getElementById('u-role').value };
        try {
            await window.api.call('/api/users', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('User created', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    showEditModal(id) {
        window.api.call('/api/users').then(res => {
            const u = res.data.find(x => x.id === id);
            if (!u) { window.ui.showToast('User not found', 'error'); return; }
            const user = window.auth.getUser();
            const isAdmin = user.role === 'admin';
            
            window.ui.showModal('Edit User: ' + u.username, `
                <div class="form-group"><label>Email</label><input type="email" id="e-email" class="fly-input" value="${u.email || ''}"></div>
                <div class="form-group"><label>Full Name</label><input type="text" id="e-fullname" class="fly-input" value="${u.full_name || ''}"></div>
                ${isAdmin ? `
                    <div class="form-row">
                        <div class="form-group"><label>Balance</label><input type="number" id="e-balance" class="fly-input" value="${u.balance || 0}" step="0.01"></div>
                        <div class="form-group"><label>Status</label><select id="e-status" class="fly-input"><option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option><option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option></select></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Self Allocation Limit</label><input type="number" id="e-self-limit" class="fly-input" value="${u.self_allocation_limit || 100}" min="0"></div>
                        <div class="form-group"><label>Enable Limit</label><select id="e-self-enabled" class="fly-input"><option value="0" ${!u.self_allocation_limit_enabled ? 'selected' : ''}>Disabled</option><option value="1" ${u.self_allocation_limit_enabled ? 'selected' : ''}>Enabled</option></select></div>
                    </div>
                ` : ''}
                <div class="form-group"><label>New Password (leave empty to keep)</label><input type="password" id="e-password" class="fly-input"></div>
            `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.saveEdit(\''+id+'\')">Save</button>');
        });
    },

    async saveEdit(id) {
        const payload = { email: document.getElementById('e-email').value.trim(), fullName: document.getElementById('e-fullname').value.trim() };
        const pwd = document.getElementById('e-password').value;
        if (pwd) payload.password = pwd;
        
        const user = window.auth.getUser();
        if (user.role === 'admin') {
            payload.balance = parseFloat(document.getElementById('e-balance').value) || 0;
            payload.status = document.getElementById('e-status').value;
            payload.self_allocation_limit = parseInt(document.getElementById('e-self-limit').value) || 100;
            payload.self_allocation_limit_enabled = parseInt(document.getElementById('e-self-enabled').value) || 0;
        }
        
        try {
            await window.api.call(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            window.ui.showToast('Updated', 'success');
            window.ui.closeModal();
            this.renderUsers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderRegRequests(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users/registration-requests');
            const requests = res.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Registration Approval Queue (${requests.length} pending)</div></div>
                <div style="display:grid;gap:16px;padding:20px">
                    ${requests.map(r => `
                        <div style="border:1px solid var(--border);border-radius:12px;padding:20px;background:white">
                            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
                                <div>
                                    <h3 style="margin:0 0 8px 0;font-size:18px">${r.username}</h3>
                                    <span class="badge badge-warning">Pending Approval</span>
                                </div>
                                <div style="display:flex;gap:8px">
                                    <button class="fly-btn fly-btn-sm" onclick="window.users.approveReg('${r.id}')">✓ Approve</button>
                                    <button class="fly-btn fly-btn-sm fly-btn-danger" onclick="window.users.rejectReg('${r.id}')">✗ Reject</button>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
                                <div><strong>Email:</strong> ${r.email || 'N/A'}</div>
                                <div><strong>Full Name:</strong> ${r.full_name || 'N/A'}</div>
                                <div><strong>Phone:</strong> ${r.phone || 'N/A'}</div>
                                <div><strong>Country:</strong> ${r.country || 'N/A'}</div>
                                <div><strong>Account Type:</strong> ${r.profession || 'N/A'}</div>
                                <div><strong>Teams ID:</strong> ${r.teams_id || 'N/A'}</div>
                                <div><strong>Payment Method:</strong> ${r.payment_method || 'N/A'}</div>
                                <div><strong>Payment ID:</strong> ${r.binance_uid || r.usdt_address || 'N/A'}</div>
                            </div>
                            ${r.proof_filename ? `
                                <div style="margin-top:12px">
                                    <strong>Proof Document:</strong>
                                    <a href="/api/auth/proof/${r.proof_filename}" target="_blank" class="fly-btn fly-btn-sm fly-btn-secondary" style="margin-left:8px">
                                        ${ICONS.download} View Proof
                                    </a>
                                </div>
                            ` : ''}
                            <div style="margin-top:12px;font-size:11px;color:var(--text-secondary)">
                                Requested: ${window.ui.formatDate(r.created_at)}
                            </div>
                        </div>
                    `).join('')}
                    ${requests.length === 0 ? '<div class="empty-state"><h3>No Pending Requests</h3><p>All registration requests have been processed</p></div>' : ''}
                </div>
            </div>`;
        } catch (e) { 
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`; 
        }
    },

    async approveReg(id) {
        try { await window.api.call(`/api/users/registration-requests/${id}/approve`, { method: 'POST' }); window.ui.showToast('Approved', 'success'); this.renderRegRequests(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async rejectReg(id) {
        try { await window.api.call(`/api/users/registration-requests/${id}/reject`, { method: 'POST' }); window.ui.showToast('Rejected', 'info'); this.renderRegRequests(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderBalances(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users?limit=100');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Balance Management</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Current Balance</th><th>Actions</th></tr></thead>
                        <tbody>${res.data.map(u => `<tr><td><strong>${u.username}</strong></td><td>$${u.balance.toFixed(2)}</td><td><button class="action-btn" onclick="window.users.showAdjustModal('${u.id}', '${u.username}')">Adjust</button></td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {}
    },

    showAdjustModal(id, name) {
        window.ui.showModal('Adjust Balance: ' + name, `
            <div class="form-group"><label>Amount (Negative to deduct)</label><input type="number" id="adj-amount" class="fly-input" value="0" step="0.01"></div>
            <div class="form-group"><label>Note</label><input type="text" id="adj-note" class="fly-input" placeholder="Manual adjustment"></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.doAdjust(\'' + id + '\')">Apply</button>');
    },

    async doAdjust(id) {
        const payload = { userId: id, amount: parseFloat(document.getElementById('adj-amount').value), note: document.getElementById('adj-note').value };
        try { await window.api.call('/api/transactions/balance-adjust', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Balance updated', 'success'); window.ui.closeModal(); this.renderBalances(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderAuditLogs(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/dashboard/audit-logs');
            container.innerHTML = `
            <div class="card"><div class="card-header"><div class="card-title">Infrastructure Audit Trails</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>User</th><th>Action</th></tr></thead><tbody>${res.data.map(l => `<tr><td>${window.ui.formatDate(l.created_at)}</td><td>${l.actor}</td><td>${l.action}</td></tr>`).join('') || '<tr><td colspan="3">No logs</td></tr>'}</tbody></table></div></div>`;
        } catch (e) {}
    },

    async renderRBAC(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Permissions & Module Access Control</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Feature</th><th>Admin</th><th>Manager</th><th>Reseller</th><th>Client</th></tr></thead>
                    <tbody>
                        <tr><td>Add Providers</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Bulk Allocate</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Self Allocation</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td></tr>
                        <tr><td>View All SMS</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }
};
window.users = users;
