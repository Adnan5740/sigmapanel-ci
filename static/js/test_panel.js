const testPanel = {

    async renderTestNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers/test-panel');
            const data = res.data || [];

            if (!data.length) {
                container.innerHTML = `
                <div class="card">
                    <div class="card-header"><div class="card-title">${ICONS.phone} Your Test Numbers</div></div>
                    <div class="empty-state">
                        <h3>No test numbers assigned</h3>
                        <p>Contact your administrator to get test numbers assigned to your account.</p>
                    </div>
                </div>`;
                return;
            }

            // Group by range
            const grouped = {};
            data.forEach(n => {
                const key = n.range_name || 'No Range';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(n);
            });

            container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:20px">
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-card-label">Total Numbers</div><div class="stat-card-value">${data.length}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Ranges</div><div class="stat-card-value">${Object.keys(grouped).length}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Total SMS Received</div><div class="stat-card-value" style="color:var(--success)">${data.reduce((s,n)=>s+(n.total_sms||0),0)}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Active Services</div><div class="stat-card-value">${[...new Set(data.map(n=>n.service).filter(Boolean))].length}</div></div>
                </div>
                ${Object.keys(grouped).map(range => `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.layers} ${window.ui.escapeHtml(range)}</div>
                        <span class="badge badge-secondary">${grouped[range].length} number${grouped[range].length>1?'s':''}</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="fly-table">
                            <thead><tr>
                                <th>Number</th>
                                <th>Country</th>
                                <th>Last Service</th>
                                <th>Total SMS</th>
                                <th>Last SMS</th>
                                <th>Status</th>
                            </tr></thead>
                            <tbody>
                                ${grouped[range].map(n => `
                                <tr>
                                    <td><code style="font-size:13px">${window.ui.escapeHtml(n.number)}</code></td>
                                    <td>${window.ui.escapeHtml(n.country_name || '—')}</td>
                                    <td>${n.service ? '<span class="badge badge-primary">'+window.ui.escapeHtml(n.service)+'</span>' : '<span style="color:var(--text-secondary)">—</span>'}</td>
                                    <td><strong>${n.total_sms || 0}</strong></td>
                                    <td style="font-size:11px;color:var(--text-secondary)">${n.last_sms_at ? window.ui.formatDate(n.last_sms_at) : '—'}</td>
                                    <td><span class="badge badge-warning">TEST</span></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`).join('')}
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error loading test numbers</h3><p>${e.message}</p><button class="fly-btn" onclick="window.testPanel.renderTestNumbers(document.getElementById('page-content'))">Retry</button></div>`;
        }
    },

    async renderTestReports(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?scope=test&limit=100');
            const rows = data.data || [];
            const total = data.pagination?.total || rows.length;

            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${ICONS.sms} Test SMS Reports</div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <span class="badge badge-secondary">${total} total</span>
                        <button class="fly-btn fly-btn-sm" onclick="window.testPanel.renderTestReports(document.getElementById('page-content'))">${ICONS.refresh || '↻'} Refresh</button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr>
                            <th>Time</th>
                            <th>Number</th>
                            <th>Sender / Service</th>
                            <th>OTP</th>
                            <th>Message</th>
                        </tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(s => `
                            <tr>
                                <td style="font-size:11px;white-space:nowrap;color:var(--text-secondary)">${window.ui.formatDate(s.received_at)}</td>
                                <td><code>${window.ui.escapeHtml(s.number)}</code></td>
                                <td>
                                    ${s.service ? '<span class="badge badge-primary">'+window.ui.escapeHtml(s.service)+'</span>' : ''}
                                    ${s.sender && s.sender !== s.service ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">'+window.ui.escapeHtml(s.sender)+'</div>' : ''}
                                </td>
                                <td>${s.otp ? '<span class="otp-code" style="color:var(--success);font-weight:800;font-size:15px">'+s.otp+'</span>' : '<span style="color:var(--text-secondary)">—</span>'}</td>
                                <td style="max-width:300px;font-size:12px">${window.ui.escapeHtml(s.message || '')}</td>
                            </tr>`).join('')
                            : '<tr class="empty-row"><td colspan="5">No SMS received yet on test numbers</td></tr>'}
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
                <div class="card-title">${ICONS.bell} Live OTP Feed</div>
                <span class="badge badge-success" style="animation:badgePop .3s ease">● LIVE</span>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Number</th><th>Service</th><th>OTP</th><th>Message</th></tr></thead>
                    <tbody id="test-live-body">
                        <tr class="empty-row"><td colspan="5">Listening for incoming SMS…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.startLiveFeed();
    },

    startLiveFeed() {
        this.stopLiveFeed();
        let lastId = null;
        this._feedInterval = setInterval(async () => {
            const body = document.getElementById('test-live-body');
            if (!body) { this.stopLiveFeed(); return; }
            try {
                const res = await window.api.call('/api/sms?scope=test&limit=20');
                const rows = res.data || [];
                if (!rows.length) return;
                // Highlight new rows
                const topId = rows[0]?.id;
                const isNew = lastId && topId !== lastId;
                lastId = topId;
                body.innerHTML = rows.map((s, i) => `
                <tr style="${isNew && i === 0 ? 'background:rgba(16,185,129,.08);' : ''}">
                    <td style="font-size:11px;white-space:nowrap;color:var(--text-secondary)">${window.ui.formatDate(s.received_at)}</td>
                    <td><code>${window.ui.escapeHtml(s.number)}</code></td>
                    <td>${s.service ? '<span class="badge badge-primary">'+window.ui.escapeHtml(s.service)+'</span>' : '<span style="color:var(--text-secondary)">—</span>'}</td>
                    <td>${s.otp ? '<span class="otp-code" style="color:var(--success);font-weight:800;font-size:15px">'+s.otp+'</span>' : '<span style="color:var(--text-secondary)">—</span>'}</td>
                    <td style="font-size:12px;max-width:250px;overflow:hidden;text-overflow:ellipsis">${window.ui.escapeHtml(s.message || '')}</td>
                </tr>`).join('');
            } catch (e) {}
        }, 4000);
    },

    stopLiveFeed() {
        if (this._feedInterval) { clearInterval(this._feedInterval); this._feedInterval = null; }
    },

    async renderTrafficStats(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const smsRes = await window.api.call('/api/sms?scope=test&limit=500').catch(() => ({ data: [] }));
            const rows = smsRes.data || [];
            const today = new Date().toISOString().slice(0, 10);
            const todayCount = rows.filter(s => s.received_at?.startsWith(today)).length;
            const withOtp = rows.filter(s => s.otp).length;

            // Count by service
            const svcMap = {};
            rows.forEach(s => { if (s.service) svcMap[s.service] = (svcMap[s.service] || 0) + 1; });
            const services = Object.entries(svcMap).sort((a, b) => b[1] - a[1]);

            // Count by number
            const numMap = {};
            rows.forEach(s => { numMap[s.number] = (numMap[s.number] || 0) + 1; });
            const topNumbers = Object.entries(numMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

            container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:20px">
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-card-label">Total Test SMS</div><div class="stat-card-value">${rows.length}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Today</div><div class="stat-card-value" style="color:var(--primary)">${todayCount}</div></div>
                    <div class="stat-card"><div class="stat-card-label">OTP Detected</div><div class="stat-card-value" style="color:var(--success)">${withOtp}</div></div>
                    <div class="stat-card"><div class="stat-card-label">Unique Services</div><div class="stat-card-value">${services.length}</div></div>
                </div>

                <div class="card">
                    <div class="card-header"><div class="card-title">${ICONS.chart} Services Breakdown</div></div>
                    <div class="card-body" style="padding:16px">
                        ${services.length ? services.map(([svc, count]) => {
                            const pct = rows.length ? Math.round(count / rows.length * 100) : 0;
                            return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                                <div style="width:130px;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window.ui.escapeHtml(svc)}</div>
                                <div style="flex:1;height:8px;background:#e2e8f0;border-radius:10px;overflow:hidden">
                                    <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:10px;transition:width .5s ease"></div>
                                </div>
                                <div style="font-size:12px;color:var(--text-secondary);width:60px;text-align:right">${count} (${pct}%)</div>
                            </div>`;
                        }).join('') : '<p style="color:var(--text-secondary)">No SMS data yet</p>'}
                    </div>
                </div>

                ${topNumbers.length ? `
                <div class="card">
                    <div class="card-header"><div class="card-title">${ICONS.phone} Top Numbers by Activity</div></div>
                    <div class="table-wrapper">
                        <table class="fly-table">
                            <thead><tr><th>Number</th><th>SMS Count</th></tr></thead>
                            <tbody>
                                ${topNumbers.map(([num, cnt]) => `
                                <tr>
                                    <td><code>${window.ui.escapeHtml(num)}</code></td>
                                    <td><strong>${cnt}</strong></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>` : ''}
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    }
};
window.testPanel = testPanel;
