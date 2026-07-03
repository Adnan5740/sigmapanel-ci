const testPanel = {
    async renderTestNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers/test-panel');
            const data = res.data || [];
            const grouped = data.reduce((acc, n) => {
                const key = n.range_name || 'Unassigned';
                if (!acc[key]) acc[key] = [];
                acc[key].push(n);
                return acc;
            }, {});

            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Your Test Numbers</div></div>
                <div class="card-body">
                    ${Object.keys(grouped).length ? Object.keys(grouped).map(range => `
                        <div style="margin-bottom:24px">
                            <h4 style="background:var(--bg-page);padding:10px 16px;border-radius:8px;border-left:4px solid var(--primary);margin-bottom:12px">${window.ui.escapeHtml(range)}</h4>
                            <div class="table-wrapper"><table class="fly-table fly-table-compact">
                                <thead><tr><th>Number</th><th>Country</th><th>Last Service</th><th>Total SMS</th><th>Status</th></tr></thead>
                                <tbody>
                                    ${grouped[range].map(n => `
                                        <tr>
                                            <td><code>${window.ui.escapeHtml(n.number)}</code></td>
                                            <td>${window.ui.escapeHtml(n.country_name || '—')}</td>
                                            <td>${n.service ? '<span class="badge badge-primary">' + window.ui.escapeHtml(n.service) + '</span>' : '<span class="badge badge-secondary">—</span>'}</td>
                                            <td>${n.total_sms || 0}</td>
                                            <td><span class="badge badge-warning">TEST</span></td>
                                        </tr>`).join('')}
                                </tbody>
                            </table></div>
                        </div>`).join('')
                    : '<div class="empty-state"><h3>No test numbers assigned</h3><p>Contact your administrator to get test numbers assigned to your account.</p></div>'}
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    async renderTestReports(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?scope=test&limit=50');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Test SMS Reports</div>
                    <span class="badge badge-secondary">${rows.length} records</span>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Number</th><th>Service</th><th>OTP</th><th>Message</th></tr></thead>
                        <tbody>
                            ${rows.map(s => `
                                <tr>
                                    <td style="font-size:11px;white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                                    <td><code>${window.ui.escapeHtml(s.number)}</code></td>
                                    <td>${s.service ? '<span class="badge badge-primary">' + window.ui.escapeHtml(window.ui.maskService(s.service)) + '</span>' : '—'}</td>
                                    <td>${s.otp ? '<span class="otp-code">' + s.otp + '</span>' : '—'}</td>
                                    <td class="message-text" style="max-width:280px;overflow:hidden;text-overflow:ellipsis">${window.ui.escapeHtml(s.message)}</td>
                                </tr>`).join('') || '<tr class="empty-row"><td colspan="5">No SMS received yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    async renderLiveFeed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Live OTP Feed</div>
                <div class="badge badge-success" style="animation:badgePop .3s ease">● LIVE</div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Number</th><th>Service</th><th>OTP</th></tr></thead>
                    <tbody id="test-live-body"><tr class="empty-row"><td colspan="4">Listening for SMS…</td></tr></tbody>
                </table>
            </div>
        </div>`;
        this.startLiveFeed();
    },

    startLiveFeed() {
        this.stopLiveFeed();
        this._feedInterval = setInterval(async () => {
            const body = document.getElementById('test-live-body');
            if (!body) { this.stopLiveFeed(); return; }
            try {
                const res = await window.api.call('/api/sms?scope=test&limit=20');
                const rows = res.data || [];
                if (rows.length) {
                    body.innerHTML = rows.map(s => `
                        <tr>
                            <td style="font-size:11px;white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                            <td><code>${window.ui.escapeHtml(s.number)}</code></td>
                            <td>${s.service ? '<span class="badge badge-primary">' + window.ui.escapeHtml(window.ui.maskService(s.service)) + '</span>' : '—'}</td>
                            <td>${s.otp ? '<span class="otp-code" style="color:var(--success);font-weight:700">' + s.otp + '</span>' : '<span style="color:var(--text-secondary)">—</span>'}</td>
                        </tr>`).join('');
                }
            } catch (e) {}
        }, 4000);
    },

    stopLiveFeed() {
        if (this._feedInterval) { clearInterval(this._feedInterval); this._feedInterval = null; }
    },

    async renderTrafficStats(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [statsRes, smsRes] = await Promise.all([
                window.api.call('/api/dashboard/stats').catch(() => ({})),
                window.api.call('/api/sms?scope=test&limit=200').catch(() => ({ data: [] }))
            ]);
            const rows = smsRes.data || [];
            const today = rows.filter(s => s.received_at && s.received_at.startsWith(new Date().toISOString().slice(0,10))).length;
            const withOtp = rows.filter(s => s.otp).length;
            const services = [...new Set(rows.map(s => s.service).filter(Boolean))];

            container.innerHTML = `
            <div class="stats-grid" style="margin-bottom:20px">
                <div class="stat-card"><div class="stat-card-label">Total Test SMS</div><div class="stat-card-value">${rows.length}</div></div>
                <div class="stat-card"><div class="stat-card-label">Today</div><div class="stat-card-value">${today}</div></div>
                <div class="stat-card"><div class="stat-card-label">OTP Detected</div><div class="stat-card-value" style="color:var(--success)">${withOtp}</div></div>
                <div class="stat-card"><div class="stat-card-label">Unique Services</div><div class="stat-card-value">${services.length}</div></div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Services Breakdown</div></div>
                <div class="card-body" style="padding:16px">
                    ${services.length ? services.map(svc => {
                        const count = rows.filter(s => s.service === svc).length;
                        const pct = rows.length ? Math.round(count/rows.length*100) : 0;
                        return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                            <div style="width:120px;font-size:13px;font-weight:600">${window.ui.escapeHtml(svc)}</div>
                            <div style="flex:1;height:8px;background:#e2e8f0;border-radius:10px;overflow:hidden">
                                <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:10px"></div>
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);width:50px">${count} (${pct}%)</div>
                        </div>`;
                    }).join('') : '<p style="color:var(--text-secondary)">No SMS data yet</p>'}
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    }
};
window.testPanel = testPanel;
