const smpp = {
    async renderDashboard(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/smpp-interconnect/stats');
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Server Sessions</div><div class="stat-card-value">${stats.active_sessions}</div></div>
                <div class="stat-card"><div class="stat-card-label">Remote Enabled</div><div class="stat-card-value">${stats.remote_enabled || 0}/${stats.remote_total || 0}</div></div>
                <div class="stat-card"><div class="stat-card-label">SMS Received Today</div><div class="stat-card-value">${stats.sms_received}</div></div>
                <div class="stat-card"><div class="stat-card-label">DLRs Processed</div><div class="stat-card-value">${stats.dlrs_processed}</div></div>
                <div class="stat-card"><div class="stat-card-label">Failed Binds</div><div class="stat-card-value">${stats.failed_binds}</div></div>
                <div class="stat-card"><div class="stat-card-label">Throughput</div><div class="stat-card-value">${stats.throughput}<span style="font-size:12px">/s</span></div></div>
            </div>
            <div class="card" style="margin-top:24px">
                <div class="card-header"><div class="card-title">Real-Time Throughput Monitor</div></div>
                <div style="padding:24px; height:300px"><canvas id="smpp-tp-chart"></canvas></div>
            </div>`;
            this.renderThroughputChart();
        } catch (e) { container.innerHTML = '<p>Error loading SMPP stats</p>'; }
    },

    renderThroughputChart() {
        setTimeout(() => {
            const ctx = document.getElementById('smpp-tp-chart')?.getContext('2d');
            if (ctx) new Chart(ctx, { type: 'line', data: { labels: ['-50s','-40s','-30s','-20s','-10s','Now'], datasets: [{ label: 'msg/s', data: [0.1, 0.4, 0.3, 0.45, 0.42, 0.45], borderColor: '#735DFF', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } });
        }, 100);
    },

    async renderServerAccounts(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/smpp-interconnect/accounts');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">SMPP Server Provider Accounts</div><button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddAccount()">Create Account</button></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>System ID</th><th>Company</th><th>Limit</th><th>IPs</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>${res.data.map(a => `
                            <tr>
                                <td><strong>${a.system_id}</strong></td>
                                <td>${a.company || '-'}</td>
                                <td>${a.throughput_limit} msg/s</td>
                                <td><code>${a.ip_whitelist || 'Any'}</code></td>
                                <td><span class="badge ${a.status==='active'?'badge-success':'badge-danger'}">${a.status}</span></td>
                                <td><button class="action-btn delete" onclick="window.smpp.deleteAccount('${a.id}')">${ICONS.trash}</button></td>
                            </tr>`).join('') || '<tr><td colspan="6">No accounts configured</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = '<p>Error loading accounts</p>'; }
    },

    showAddAccount() {
        window.ui.showModal('SMPP Setup', `
            <div style="display:flex;gap:10px;margin-bottom:20px;border-bottom:2px solid var(--border);padding-bottom:10px">
                <button id="tab-provider" class="fly-btn fly-btn-sm" onclick="window.smpp.switchTab('provider')" style="font-weight:600;border-bottom:3px solid var(--primary)">${ICONS.smpp} Provider Connection</button>
                <button id="tab-account" class="fly-btn fly-btn-sm" onclick="window.smpp.switchTab('account')" style="border-bottom:3px solid transparent;color:var(--text-secondary)">${ICONS.user} Account Setup</button>
            </div>
            
            <div id="provider-form" style="display:none">
                <div style="margin-bottom:16px;padding:12px;background:rgba(59,130,246,0.08);border-radius:6px;font-size:12px;color:var(--text-secondary)">
                    <strong>Connect to External SMPP Provider:</strong> Configure connection details to an external SMS/SMPP provider server. We will connect to their server to send SMS.
                </div>
                <div class="form-row"><div class="form-group"><label>Host/IP *</label><input type="text" id="p-host" class="fly-input" placeholder="smtp.provider.com"></div><div class="form-group"><label>Port *</label><input type="number" id="p-port" class="fly-input" value="2775"></div></div>
                <div class="form-row"><div class="form-group"><label>System ID *</label><input type="text" id="p-sid" class="fly-input"></div><div class="form-group"><label>Password *</label><input type="password" id="p-pass" class="fly-input"></div></div>
                <div class="form-row"><div class="form-group"><label>Company</label><input type="text" id="p-comp" class="fly-input"></div><div class="form-group"><label>Limit (msg/s)</label><input type="number" id="p-lim" class="fly-input" value="10" min="1"></div></div>
                <div class="form-group"><label>IP Whitelist (optional)</label><input type="text" id="p-ips" class="fly-input" placeholder="provider.com,10.0.0.0/8"></div>
            </div>
            
            <div id="account-form" style="display:block">
                <div style="margin-bottom:16px;padding:12px;background:rgba(59,130,246,0.08);border-radius:6px;font-size:12px;color:var(--text-secondary)">
                    <strong>Create SMPP Account:</strong> Create client credentials for clients connecting to our SMPP server. No Host/Port needed.
                </div>
                <div class="form-row"><div class="form-group"><label>System ID *</label><input type="text" id="a-sid" class="fly-input"></div><div class="form-group"><label>Password *</label><input type="password" id="a-pass" class="fly-input"></div></div>
                <div class="form-row"><div class="form-group"><label>Company</label><input type="text" id="a-comp" class="fly-input"></div><div class="form-group"><label>Limit (msg/s)</label><input type="number" id="a-lim" class="fly-input" value="10" min="1"></div></div>
                <div class="form-group"><label>IP Whitelist (optional, comma separated)</label><input type="text" id="a-ips" class="fly-input" placeholder="0.0.0.0"></div>
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" id="save-btn" onclick="window.smpp.saveAccountType()">Save Account</button>');
        window.smpp.currentTab = 'provider';
        window.smpp.switchTab('provider');
    },
    
    currentTab: 'provider',
    
    switchTab(tab) {
        window.smpp.currentTab = tab;
        const providerForm = document.getElementById('provider-form');
        const accountForm = document.getElementById('account-form');
        const tabProvider = document.getElementById('tab-provider');
        const tabAccount = document.getElementById('tab-account');
        
        if (tab === 'provider') {
            providerForm.style.display = 'block';
            accountForm.style.display = 'none';
            tabProvider.style.borderBottomColor = 'var(--primary)';
            tabProvider.style.color = '#000';
            tabAccount.style.borderBottomColor = 'transparent';
            tabAccount.style.color = 'var(--text-secondary)';
            const btn = document.getElementById('save-btn');
            if (btn) btn.innerHTML = `${ICONS.smpp} Save Connection`;
        } else {
            providerForm.style.display = 'none';
            accountForm.style.display = 'block';
            tabProvider.style.borderBottomColor = 'transparent';
            tabProvider.style.color = 'var(--text-secondary)';
            tabAccount.style.borderBottomColor = 'var(--primary)';
            tabAccount.style.color = '#000';
            const btn = document.getElementById('save-btn');
            if (btn) btn.innerHTML = `${ICONS.user} Save Account`;
        }
    },
    
    async saveAccountType() {
        try {
            if (window.smpp.currentTab === 'provider') {
                await window.smpp.saveProviderConnection();
            } else {
                await window.smpp.saveAccount();
            }
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },
    
    async saveProviderConnection() {
        const host = document.getElementById('p-host').value.trim();
        const port = parseInt(document.getElementById('p-port').value);
        const system_id = document.getElementById('p-sid').value.trim();
        const password = document.getElementById('p-pass').value;
        const company = document.getElementById('p-comp').value.trim();
        const throughput_limit = parseInt(document.getElementById('p-lim').value);
        const ip_whitelist = document.getElementById('p-ips').value.trim();
        
        if (!host) throw new Error('Host/IP is required for provider connection');
        if (!port || port < 1 || port > 65535) throw new Error('Valid port is required (1-65535)');
        if (!system_id) throw new Error('System ID is required');
        if (!password) throw new Error('Password is required');
        
        const payload = { host, port, system_id, password, company: company || null, throughput_limit: isNaN(throughput_limit) ? 10 : throughput_limit, ip_whitelist: ip_whitelist || null, connection_type: 'provider_connection' };
        
        try {
            await window.api.call('/api/smpp-interconnect/servers', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Provider connection configured', 'success');
            window.ui.closeModal();
            this.renderServerAccounts(document.getElementById('page-content'));
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    async saveAccount() {
        const payload = { system_id: document.getElementById('a-sid').value, password: document.getElementById('a-pass').value, company: document.getElementById('a-comp').value, throughput_limit: parseInt(document.getElementById('a-lim').value), ip_whitelist: document.getElementById('a-ips').value };
        try { await window.api.call('/api/smpp-interconnect/accounts', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Account added', 'success'); window.ui.closeModal(); this.renderServerAccounts(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async deleteAccount(id) {
        if (confirm('Delete this SMPP account?')) {
            try { await window.api.call('/api/smpp-interconnect/accounts/' + id, { method: 'DELETE' }); window.ui.showToast('SMPP account deleted', 'success'); this.renderServerAccounts(document.getElementById('page-content')); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    },

    async renderServerSessions(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Live SMPP Sessions</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>IP Address</th><th>System ID</th><th>Bind</th><th>Connected At</th><th>Last Activity</th></tr></thead>
                    <tbody id="srv-sessions-body"><tr><td colspan="5">Scanning sessions...</td></tr></tbody>
                </table>
            </div>
        </div>`;
        this.loadSessions();
    },

    async loadSessions() {
        const body = document.getElementById('srv-sessions-body');
        if (!body) return;
        try {
            const res = await window.api.call('/api/smpp-interconnect/server-sessions');
            if (res.data && res.data.length) {
                body.innerHTML = res.data.map(s => `<tr><td><code>${s.ip_address}</code></td><td><strong>${s.system_id}</strong></td><td>${s.bind_type}</td><td>${window.ui.formatDate(s.connected_at)}</td><td>${window.ui.formatDate(s.last_activity)}</td></tr>`).join('');
            } else {
                // No active sessions — show recent log entries instead
                const logs = await window.api.call('/api/smpp-interconnect/logs?limit=10').catch(() => ({ data: [] }));
                const logRows = (logs.data || []).slice(0,5).map(l =>
                    `<tr style="opacity:.7"><td><code>${window.ui.escapeHtml(l.ip_address||'—')}</code></td><td><strong>${window.ui.escapeHtml(l.system_id||'—')}</strong></td><td>${window.ui.escapeHtml(l.event_type||'—')}</td><td>${window.ui.formatDate(l.created_at)}</td><td>${window.ui.escapeHtml(l.detail||'')}</td></tr>`
                ).join('');
                body.innerHTML = logRows || '<tr><td colspan="5" style="color:var(--text-secondary)">No active sessions. Recent connections shown above when available.</td></tr>';
            }
        } catch (e) {}
    },

    async renderServerLogs(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">SMPP Server Connection Logs</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Event</th><th>Detail</th></tr></thead><tbody id="srv-logs-body"></tbody></table></div></div>';
        try {
            const res = await window.api.call('/api/smpp-interconnect/server-logs');
            document.getElementById('srv-logs-body').innerHTML = res.data.map(l => `<tr><td>${window.ui.formatDate(l.created_at)}</td><td><code>${l.ip_address}</code></td><td><span class="badge badge-secondary">${l.event_type}</span></td><td>${l.detail}</td></tr>`).join('') || '<tr><td colspan="4">No logs found</td></tr>';
        } catch (e) {}
    },

    async renderServerDlr(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">SMPP Server DLR Monitor</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Target</th><th>Service</th><th>Status</th></tr></thead><tbody id="srv-dlr-body"></tbody></table></div></div>';
        try {
            const res = await window.api.call('/api/smpp-interconnect/dlr-logs');
            document.getElementById('srv-dlr-body').innerHTML = res.data.map(d => `<tr><td>${window.ui.formatDate(d.received_at)}</td><td>${d.number}</td><td>${d.service}</td><td><span class="badge badge-success">DELIVERED</span></td></tr>`).join('') || '<tr><td colspan="4">No DLRs found</td></tr>';
        } catch (e) {}
    },

    async renderServerSecurity(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">SMPP Server Security Center</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Threat</th><th>Action</th></tr></thead><tbody id="srv-sec-body"></tbody></table></div></div>';
        try {
            const res = await window.api.call('/api/security/events?limit=50');
            document.getElementById('srv-sec-body').innerHTML = res.data.map(e => `<tr><td>${window.ui.formatDate(e.created_at)}</td><td><code>${e.ip_address}</code></td><td>${e.event_type}</td><td>${e.action_taken}</td></tr>`).join('') || '<tr><td colspan="4">No security events</td></tr>';
        } catch (e) {}
    },

    async renderThroughput(container) { this.renderDashboard(container); }
};
window.smpp = smpp;
