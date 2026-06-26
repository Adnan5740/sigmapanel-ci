const security = {
    async renderDashboard(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [stats, events] = await Promise.all([
                window.api.call('/api/security/stats'),
                window.api.call('/api/security/events?limit=8')
            ]);
            const threatClass = stats.threat_score === 'HIGH' ? 'badge-danger' : stats.threat_score === 'MEDIUM' ? 'badge-warning' : 'badge-success';
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Threat Level</div><div class="stat-card-value"><span class="badge ${threatClass}">${stats.threat_score}</span></div></div>
                <div class="stat-card"><div class="stat-card-label">Blocked IPs</div><div class="stat-card-value">${stats.blocked_ips || 0}</div></div>
                <div class="stat-card"><div class="stat-card-label">24h Events</div><div class="stat-card-value">${stats.recent_events || 0}</div></div>
                <div class="stat-card"><div class="stat-card-label">Scanner Blocks</div><div class="stat-card-value">${stats.scanner_blocks || 0}</div></div>
                <div class="stat-card"><div class="stat-card-label">Rate Limited</div><div class="stat-card-value">${stats.rate_limited || 0}</div></div>
                <div class="stat-card"><div class="stat-card-label">High/Critical</div><div class="stat-card-value">${stats.critical_events || 0}</div></div>
            </div>
            <div class="card" style="margin-top:18px">
                <div class="card-header"><div class="card-title">Recent Firewall Activity</div><button class="fly-btn fly-btn-sm" onclick="window.security.renderDashboard(document.getElementById('page-content'))">Refresh</button></div>
                <div class="table-wrapper">
                    <table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Event</th><th>Severity</th><th>Action</th><th>Detail</th></tr></thead>
                    <tbody>${this._eventRows(events.data || [])}</tbody></table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="card"><div class="card-body">${window.ui.escapeHtml(e.message || 'Unable to load security dashboard')}</div></div>`;
        }
    },

    async renderBlockedIPs(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/security/blocked-ips');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">IP Firewall Blacklist</div><button class="fly-btn fly-btn-sm" onclick="window.security.showAdd()">${ICONS.plus} Block IP</button></div>
                <div class="table-wrapper">
                    <table class="fly-table"><thead><tr><th>IP</th><th>Reason</th><th>Expires</th><th>Added</th><th>Action</th></tr></thead><tbody>
                        ${(res.data || []).map(i => `<tr><td><code>${window.ui.escapeHtml(i.ip_address)}</code></td><td>${window.ui.escapeHtml(i.reason || '-')}</td><td>${window.ui.formatDate(i.expires_at)}</td><td>${window.ui.formatDate(i.created_at)}</td><td><button class="action-btn delete" onclick="window.security.unblock('${window.ui.escapeHtml(i.ip_address)}')">Unblock</button></td></tr>`).join('') || '<tr class="empty-row"><td colspan="5">No blocked IPs</td></tr>'}
                    </tbody></table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="card"><div class="card-body">${window.ui.escapeHtml(e.message || 'Unable to load blocked IPs')}</div></div>`;
        }
    },

    showAdd() {
        window.ui.showModal('Block IP Address', `
            <div class="form-group"><label>IP Address</label><input type="text" id="sec-ip" class="fly-input" placeholder="203.0.113.10"></div>
            <div class="form-row"><div class="form-group"><label>Days</label><input type="number" id="sec-days" class="fly-input" value="30" min="1" max="365"></div><div class="form-group"><label>Reason</label><input type="text" id="sec-reason" class="fly-input" value="Manual block"></div></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.security.block()">Block IP</button>');
    },

    async block() {
        const ip = document.getElementById('sec-ip')?.value.trim();
        const days = Number(document.getElementById('sec-days')?.value || 30);
        const reason = document.getElementById('sec-reason')?.value.trim() || 'Manual block';
        if (!ip) { window.ui.showToast('IP address is required', 'error'); return; }
        try {
            await window.api.call('/api/security/block-ip', { method: 'POST', body: JSON.stringify({ ip, days, reason }) });
            window.ui.closeModal();
            window.ui.showToast('IP blocked', 'success');
            this.renderBlockedIPs(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async unblock(ip) {
        try {
            await window.api.call('/api/security/unblock-ip/' + encodeURIComponent(ip), { method: 'POST' });
            window.ui.showToast('IP restored', 'success');
            this.renderBlockedIPs(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderThreatLogs(container) { return this.renderEvents(container, 'Threat Intelligence'); },
    async renderFirewallEvents(container) { return this.renderEvents(container, 'Firewall Events'); },
    async renderSuspiciousSessions(container) { return this.renderEvents(container, 'Suspicious Activity'); },

    async renderRateLimits(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/security/stats');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Rate Limiting Policy</div></div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card"><div class="stat-card-label">Login / Signup</div><div class="stat-card-value">12<span style="font-size:12px">/min</span></div></div>
                        <div class="stat-card"><div class="stat-card-label">API</div><div class="stat-card-value">180<span style="font-size:12px">/min</span></div></div>
                        <div class="stat-card"><div class="stat-card-label">Panel Pages</div><div class="stat-card-value">100<span style="font-size:12px">/min</span></div></div>
                        <div class="stat-card"><div class="stat-card-label">24h Throttles</div><div class="stat-card-value">${stats.rate_limited || 0}</div></div>
                    </div>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="card"><div class="card-body">${window.ui.escapeHtml(e.message || 'Unable to load rate limits')}</div></div>`; }
    },

    async renderEvents(container, title = 'Firewall Events') {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/security/events?limit=100');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">${title}</div><button class="fly-btn fly-btn-sm" onclick="window.security.renderEvents(document.getElementById('page-content'), '${title.replace(/'/g, "\'")}')">Refresh</button></div>
                <div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Event</th><th>Severity</th><th>Action</th><th>Detail</th></tr></thead><tbody>${this._eventRows(res.data || [])}</tbody></table></div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="card"><div class="card-body">${window.ui.escapeHtml(e.message || 'Unable to load events')}</div></div>`; }
    },

    _eventRows(rows) {
        return rows.map(e => {
            const sev = String(e.severity || 'info').toLowerCase();
            const cls = sev === 'critical' || sev === 'high' ? 'badge-danger' : sev === 'warning' ? 'badge-warning' : 'badge-secondary';
            return `<tr><td>${window.ui.formatDate(e.created_at)}</td><td><code>${window.ui.escapeHtml(e.ip_address || '-')}</code></td><td>${window.ui.escapeHtml(e.event_type || '-')}</td><td><span class="badge ${cls}">${window.ui.escapeHtml(e.severity || 'info')}</span></td><td>${window.ui.escapeHtml(e.action_taken || '-')}</td><td>${window.ui.escapeHtml(e.detail || '-')}</td></tr>`;
        }).join('') || '<tr class="empty-row"><td colspan="6">No security events found</td></tr>';
    },

    renderVerification() {
        document.getElementById('app').innerHTML = `
        <div class="security-verification">
            <div class="security-verification-box">
                <div class="security-verification-mark">${ICONS.shield}</div>
                <h2>Verifying Connection Security</h2>
                <p>Please wait while we secure your session...</p>
            </div>
        </div>`;
        setTimeout(() => window.auth.renderLogin(), 900);
    }
};
window.security = security;
