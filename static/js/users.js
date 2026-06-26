const users = {
    async renderUsers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const existingSearch = document.getElementById('user-search')?.value || '';
            const existingRole = document.getElementById('user-role-filter')?.value || '';
            let endpoint = '/api/users?limit=200';
            if (existingSearch) endpoint += '&search=' + encodeURIComponent(existingSearch);
            if (existingRole) endpoint += '&role=' + encodeURIComponent(existingRole);
            const res = await window.api.call(endpoint);
            const allUsers = res.data || [];
            const user = window.auth.getUser();
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Visible Users</div><div class="stat-card-value">${allUsers.length}</div></div>
                <div class="stat-card"><div class="stat-card-label">Active</div><div class="stat-card-value">${allUsers.filter(u => u.status === 'active').length}</div></div>
                <div class="stat-card"><div class="stat-card-label">Suspended/Blocked</div><div class="stat-card-value">${allUsers.filter(u => ['suspended','blocked'].includes(u.status)).length}</div></div>
                <div class="stat-card"><div class="stat-card-label">Pending</div><div class="stat-card-value">${allUsers.filter(u => ['pending','pending_approval'].includes(u.status)).length}</div></div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div class="card-title">User Control Center</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.users.showAddModal()">Add Account</button>
                </div>
                <div class="filter-bar filter-bar-labeled">
                    <div class="filter-field filter-field-wide">
                        <label for="user-search">Search</label>
                        <input type="text" id="user-search" class="search-input" placeholder="Username or email" value="${window.ui.escapeHtml(existingSearch)}" onkeydown="if(event.key==='Enter') window.users.renderUsers(document.getElementById('page-content'))">
                    </div>
                    <div class="filter-field">
                        <label for="user-role-filter">Role</label>
                        <select id="user-role-filter" class="filter-select" onchange="window.users.renderUsers(document.getElementById('page-content'))">
                            <option value="">All Roles</option>
                            ${['admin','manager','reseller','sub_reseller','test_user'].map(r => `<option value="${r}" ${existingRole===r?'selected':''}>${window.ROLE_LABELS[r] || r}</option>`).join('')}
                        </select>
                    </div>
                    <button class="fly-btn fly-btn-sm" onclick="window.users.renderUsers(document.getElementById('page-content'))">Apply</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Balance</th><th>Children</th><th>Last Login</th><th>Actions</th></tr></thead>
                        <tbody>${allUsers.map(u => this.renderUserRow(u)).join('') || '<tr class="empty-row"><td colspan="7">No users found</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
            <div class="card" style="margin-top:16px">
                <div class="card-header"><div class="card-title">Hierarchy Map</div></div>
                <div class="card-body"><div class="hierarchy-container">${this.renderHierarchyNode(user, allUsers)}</div></div>
            </div>`;
        } catch (err) { container.innerHTML = '<p>Error: ' + err.message + '</p>'; }
    },

    renderUserRow(u) {
        const role = window.auth.getUser()?.role || '';
        const canStatus = ['admin','manager'].includes(role) && u.id !== window.auth.getUser()?.id;
        const statusClass = u.status === 'active' ? 'badge-success' : ['pending','pending_approval'].includes(u.status) ? 'badge-warning' : 'badge-danger';
        return `<tr>
            <td><strong>${window.ui.escapeHtml(u.username)}</strong><div style="font-size:11px;color:var(--text-secondary)">${window.ui.escapeHtml(u.email || '-')}</div></td>
            <td><span class="badge ${window.ROLE_COLORS[u.role] || 'badge-secondary'}">${window.ROLE_LABELS[u.role] || u.role}</span></td>
            <td><span class="badge ${statusClass}">${window.ui.escapeHtml(u.status || '-')}</span></td>
            <td>$${Number(u.balance || 0).toFixed(2)}</td>
            <td>${u._count?.children || 0}</td>
            <td style="font-size:11px">${u.last_login ? window.ui.formatDate(u.last_login) : 'Never'}</td>
            <td class="actions-cell">
                <button class="action-btn" title="Inspect" onclick="window.users.showProfileModal('${u.id}')">${ICONS.eye}</button>
                <button class="action-btn" title="Activity" onclick="window.users.showActivityModal('${u.id}', '${window.ui.escapeHtml(u.username).replace(/'/g, "\'")}')">${ICONS.report}</button>
                <button class="action-btn" title="Logs" onclick="window.users.showLogsModal('${u.id}', '${window.ui.escapeHtml(u.username).replace(/'/g, "\'")}')">${ICONS.terminal}</button>
                <button class="action-btn" title="Edit" onclick="window.users.showEditModal('${u.id}')">${ICONS.edit}</button>
                ${canStatus ? this.renderStatusButtons(u) : ''}
            </td>
        </tr>`;
    },

    renderStatusButtons(u) {
        const buttons = [];
        if (u.status !== 'active') buttons.push(`<button class="action-btn" onclick="window.users.changeStatus('${u.id}', 'active')">Activate</button>`);
        if (u.status !== 'suspended') buttons.push(`<button class="action-btn" onclick="window.users.changeStatus('${u.id}', 'suspended')">Suspend</button>`);
        if (u.status !== 'blocked') buttons.push(`<button class="action-btn delete" onclick="window.users.changeStatus('${u.id}', 'blocked')">Revoke</button>`);
        return buttons.join('');
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
                <div class="node-actions" style="display:flex;gap:4px">
                    <button class="action-btn" title="View Profile" onclick="window.users.showProfileModal('${u.id}')">${ICONS.eye}</button>
                    ${window.auth.getUser().role === 'admin' || window.auth.getUser().role === 'manager' ? `<button class="action-btn" title="View Logs" onclick="window.users.showLogsModal('${u.id}', '${u.username}')">${ICONS.terminal}</button>` : ''}
                    <button class="action-btn" title="Edit" onclick="window.users.showEditModal('${u.id}')">${ICONS.edit}</button>
                </div>
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
            <div class="form-row"><div class="form-group"><label>Username *</label><input type="text" id="u-username" class="fly-input"></div><div class="form-group"><label>Password *</label><input type="password" id="u-password" class="fly-input"></div></div>
            <div class="form-row"><div class="form-group"><label>Email</label><input type="email" id="u-email" class="fly-input"></div><div class="form-group"><label>Full Name</label><input type="text" id="u-fullname" class="fly-input"></div></div>
            <div class="form-row"><div class="form-group"><label>Role</label><select id="u-role" class="fly-input" onchange="window.users.toggleAllocFields()">${options}</select></div><div class="form-group"><label>Balance ($)</label><input type="number" id="u-balance" class="fly-input" value="0" min="0" step="0.01"></div></div>
            <div id="u-alloc-fields" style="display:none">
                <div class="form-row">
                    <div class="form-group"><label>Self-Alloc Limit</label><input type="number" id="u-self-limit" class="fly-input" value="100" min="0"></div>
                    <div class="form-group"><label>Enable Limit</label><select id="u-self-enabled" class="fly-input"><option value="0">Disabled</option><option value="1">Enabled</option></select></div>
                </div>
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.save()">Create Account</button>');
        setTimeout(() => window.users.toggleAllocFields(), 50);
    },

    toggleAllocFields() {
        const role = document.getElementById('u-role')?.value;
        const fields = document.getElementById('u-alloc-fields');
        if (fields) fields.style.display = ['reseller','sub_reseller'].includes(role) ? 'block' : 'none';
    },

    async save() {
        const username = document.getElementById('u-username')?.value?.trim();
        const password = document.getElementById('u-password')?.value;
        if (!username || !password) { window.ui.showToast('Username and password are required', 'error'); return; }
        const role = document.getElementById('u-role').value;
        const payload = { username, password, email: document.getElementById('u-email')?.value || '', fullName: document.getElementById('u-fullname')?.value || '', role, balance: Number(document.getElementById('u-balance')?.value || 0) };
        if (['reseller','sub_reseller'].includes(role)) {
            payload.self_allocation_limit = parseInt(document.getElementById('u-self-limit')?.value || '100');
            payload.self_allocation_limit_enabled = parseInt(document.getElementById('u-self-enabled')?.value || '0');
        }
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
            const canControl = ['admin','manager'].includes(user.role);
            
            window.ui.showModal('Edit User: ' + u.username, `
                <div class="form-group"><label>Email</label><input type="email" id="e-email" class="fly-input" value="${u.email || ''}"></div>
                <div class="form-group"><label>Full Name</label><input type="text" id="e-fullname" class="fly-input" value="${u.full_name || ''}"></div>
                ${canControl ? `
                    <div class="form-row">
                        ${isAdmin ? `<div class="form-group"><label>Role</label><select id="e-role" class="fly-input">
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
                            <option value="reseller" ${u.role === 'reseller' ? 'selected' : ''}>Reseller</option>
                            <option value="sub_reseller" ${u.role === 'sub_reseller' ? 'selected' : ''}>Client</option>
                            <option value="test_user" ${u.role === 'test_user' ? 'selected' : ''}>Test User</option>
                        </select></div>` : ''}
                        ${isAdmin ? `<div class="form-group"><label>Balance</label><input type="number" id="e-balance" class="fly-input" value="${u.balance || 0}" step="0.01"></div>` : ''}
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

    async showProfileModal(id) {
        try {
            const u = await window.api.call('/api/users/' + id);
            window.ui.showModal('Profile: ' + u.username, `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
                    <div><strong>Email:</strong> ${u.email || 'N/A'}</div>
                    <div><strong>Full Name:</strong> ${u.full_name || 'N/A'}</div>
                    <div><strong>Phone:</strong> ${u.phone || 'N/A'}</div>
                    <div><strong>Country:</strong> ${u.country || 'N/A'}</div>
                    <div><strong>Role:</strong> <span class="badge ${window.ROLE_COLORS[u.role] || 'badge-secondary'}">${window.ROLE_LABELS[u.role] || u.role}</span></div>
                    <div><strong>Status:</strong> <span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></div>
                    <div><strong>Balance:</strong> $${(u.balance || 0).toFixed(2)}</div>
                    <div><strong>Credit Limit:</strong> $${(u.credit_limit || 0).toFixed(2)}</div>
                    <div><strong>Last Login:</strong> ${u.last_login ? window.ui.formatDate(u.last_login) : 'Never'}</div>
                    <div><strong>Created:</strong> ${window.ui.formatDate(u.created_at)}</div>
                </div>
                ${window.auth.getUser().role === 'admin' ? `
                    <div style="margin-top:12px;padding:12px;background:#f8fafc;border:1px solid var(--border);border-radius:8px;">
                        <strong>API Token:</strong> <code style="word-break:break-all;font-size:11px">${u.api_token || 'None'}</code>
                    </div>
                ` : ''}
            `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Close</button>');
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    async showLogsModal(id, username) {
        try {
            const res = await window.api.call('/api/users/' + id + '/logs');
            const logs = res.data || [];
            window.ui.showModal('Activity Logs: ' + username, `
                <div style="max-height:400px;overflow-y:auto;font-size:12px;">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Action</th><th>IP</th><th>Details</th></tr></thead>
                        <tbody>
                            ${logs.map(l => `<tr>
                                <td>${window.ui.formatDate(l.created_at)}</td>
                                <td>${l.action}</td>
                                <td>${l.ip_address || '-'}</td>
                                <td>${l.detail || '-'}</td>
                            </tr>`).join('')}
                            ${logs.length === 0 ? '<tr><td colspan="4" style="text-align:center">No logs found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Close</button>', 'max-width:800px');
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    async saveEdit(id) {
        const payload = { email: document.getElementById('e-email').value.trim(), fullName: document.getElementById('e-fullname').value.trim() };
        const pwd = document.getElementById('e-password').value;
        if (pwd) payload.password = pwd;
        
        const user = window.auth.getUser();
        if (['admin','manager'].includes(user.role)) {
            if (user.role === 'admin') {
                payload.role = document.getElementById('e-role').value;
                payload.balance = parseFloat(document.getElementById('e-balance').value) || 0;
            }
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

    async changeStatus(id, status) {
        const labels = { active: 'activate', suspended: 'suspend', blocked: 'revoke' };
        if (!confirm(`Confirm ${labels[status] || status} for this account?`)) return;
        try {
            await window.api.call(`/api/users/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
            window.ui.showToast('User status updated', 'success');
            this.renderUsers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async showActivityModal(id, username) {
        window.ui.showModal('User Activity: ' + username, '<div class="loading-spinner"><div class="spinner"></div></div>', '', 'large');
        try {
            const data = await window.api.call('/api/users/' + id + '/activity');
            const body = document.querySelector('.modal-body');
            if (!body) return;
            const st = data.stats || {};
            body.innerHTML = `
                <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">
                    <div class="stat-card"><div class="stat-card-label">Total SMS</div><div class="stat-card-value">${st.smsTotal || 0}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Today SMS</div><div class="stat-card-value">${st.smsToday || 0}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Numbers</div><div class="stat-card-value">${st.numbersAssigned || 0}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Payout</div><div class="stat-card-value">$${Number(st.totalPayout || 0).toFixed(2)}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Pending Payouts</div><div class="stat-card-value">$${Number(st.pendingPayouts || 0).toFixed(2)}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Open Tickets</div><div class="stat-card-value">${st.openTickets || 0}</div></div>
                </div>
                <h4 style="margin:8px 0">Assigned Numbers</h4>
                <div class="table-wrapper" style="max-height:220px;overflow:auto"><table class="fly-table"><thead><tr><th>Number</th><th>Range</th><th>Status</th><th>Assigned</th></tr></thead><tbody>
                    ${(data.numbers || []).map(n => `<tr><td><code>${window.ui.escapeHtml(n.number)}</code></td><td>${window.ui.escapeHtml(n.range_name || '-')}</td><td>${window.ui.escapeHtml(n.status || '-')}</td><td>${n.assigned_at ? window.ui.formatDate(n.assigned_at) : '-'}</td></tr>`).join('') || '<tr class="empty-row"><td colspan="4">No assigned numbers</td></tr>'}
                </tbody></table></div>
                <h4 style="margin:16px 0 8px">Recent SMS</h4>
                <div class="table-wrapper" style="max-height:220px;overflow:auto"><table class="fly-table"><thead><tr><th>Time</th><th>Number</th><th>Service</th><th>Message</th></tr></thead><tbody>
                    ${(data.recentSms || []).map(s => `<tr><td>${window.ui.formatDate(s.received_at)}</td><td><code>${window.ui.escapeHtml(s.number)}</code></td><td>${window.ui.escapeHtml(s.service || '-')}</td><td class="message-text">${window.ui.escapeHtml(s.message || '')}</td></tr>`).join('') || '<tr class="empty-row"><td colspan="4">No SMS records</td></tr>'}
                </tbody></table></div>`;
        } catch (e) { const body = document.querySelector('.modal-body'); if (body) body.innerHTML = `<p>${e.message}</p>`; }
    },

    async renderRegRequests(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users/registration-requests');
            const requests = res.data || [];
            container.innerHTML = `
            <div class="card professional-card">
                <div class="card-header professional-header">
                    <div>
                        <div class="card-title">Registration Requests</div>
                        <div class="professional-subtitle">Review applicant details, payment reference, and proof documents before approving access.</div>
                    </div>
                    <span class="badge badge-warning">${requests.length} Pending</span>
                </div>
                <div class="professional-list">
                    ${requests.map(r => `
                        <div class="review-card">
                            <div class="review-card-top">
                                <div>
                                    <div class="review-title">${window.ui.escapeHtml(r.username || '-')}</div>
                                    <div class="review-meta">Requested ${window.ui.formatDate(r.created_at)}</div>
                                </div>
                                <div class="review-actions">
                                    ${r.proof_filename ? `<button class="fly-btn fly-btn-sm fly-btn-secondary" onclick="window.users.openProof(${window.ui.jsArg(r.proof_filename)})">${ICONS.eye} View Proof</button>` : '<span class="badge badge-secondary">No Proof</span>'}
                                    <button class="fly-btn fly-btn-sm" onclick="window.users.approveReg('${r.id}')">${ICONS.check} Approve</button>
                                    <button class="fly-btn fly-btn-sm fly-btn-danger" onclick="window.users.rejectReg('${r.id}')">${ICONS.x} Reject</button>
                                </div>
                            </div>
                            <div class="review-grid">
                                <div><span>Email</span><strong>${window.ui.escapeHtml(r.email || 'N/A')}</strong></div>
                                <div><span>Full Name</span><strong>${window.ui.escapeHtml(r.full_name || 'N/A')}</strong></div>
                                <div><span>Phone</span><strong>${window.ui.escapeHtml(r.phone || 'N/A')}</strong></div>
                                <div><span>Country</span><strong>${window.ui.escapeHtml(r.country || 'N/A')}</strong></div>
                                <div><span>Account Type</span><strong>${window.ui.escapeHtml(r.profession || 'N/A')}</strong></div>
                                <div><span>Teams ID</span><strong>${window.ui.escapeHtml(r.teams_id || 'N/A')}</strong></div>
                                <div><span>Payment Method</span><strong>${window.ui.escapeHtml(r.payment_method || 'N/A')}</strong></div>
                                <div><span>Payment Reference</span><strong>${window.ui.escapeHtml(r.payment_detail || r.binance_uid || r.usdt_address || 'N/A')}</strong></div>
                            </div>
                        </div>
                    `).join('')}
                    ${requests.length === 0 ? '<div class="empty-state"><h3>No Pending Requests</h3><p>All registration requests have been processed.</p></div>' : ''}
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.ui.escapeHtml(e.message)}</p></div>`;
        }
    },

    async openProof(filename) {
        try {
            const token = window.api.getToken();
            const res = await fetch('/api/auth/proof/' + encodeURIComponent(filename), {
                headers: token ? { Authorization: 'Bearer ' + token } : {}
            });
            if (!res.ok) {
                let msg = 'Unable to open proof document';
                try { const j = await res.json(); msg = j.detail || msg; } catch {}
                throw new Error(msg);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) { window.ui.showToast(e.message, 'error'); }
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
            <div class="card"><div class="card-header"><div class="card-title">Infrastructure Audit Trails</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Detail</th></tr></thead><tbody>${res.data.map(l => `<tr><td>${window.ui.formatDate(l.created_at)}</td><td>${window.ui.escapeHtml(l.actor_username || '-')}</td><td>${window.ui.escapeHtml(l.action || '-')}</td><td>${window.ui.escapeHtml(l.resource || '-')}</td><td>${window.ui.escapeHtml(l.detail || '-')}</td></tr>`).join('') || '<tr><td colspan="5">No logs</td></tr>'}</tbody></table></div></div>`;
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
