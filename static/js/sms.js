const sms = {
    // Mask OTP codes in messages for live display
    _maskOTP(message, otp) {
        if (!otp) return window.ui.escapeHtml(message);
        const escaped = window.ui.escapeHtml(message);
        // Replace the OTP with masked version
        const otpStr = String(otp);
        const masked = otpStr.replace(/\d/g, 'X');
        return escaped.replace(new RegExp(otpStr, 'g'), masked);
    },

    async renderMySms(container, page = 1) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const existingFrom = document.getElementById('sms-date-from')?.value || '';
            const existingTo = document.getElementById('sms-date-to')?.value || '';
            const existingSearch = document.getElementById('sms-search')?.value || '';
            let endpoint = '/api/sms?limit=20&page=' + page;
            if (existingSearch) endpoint += '&search=' + encodeURIComponent(existingSearch);
            if (existingFrom) endpoint += '&from=' + encodeURIComponent(existingFrom);
            if (existingTo) endpoint += '&to=' + encodeURIComponent(existingTo);
            const data = await window.api.call(endpoint);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">My Received SMS Messages</div></div>
                <div class="filter-bar filter-bar-labeled">
                    <div class="filter-field filter-field-wide">
                        <label for="sms-search">Search</label>
                        <input type="text" class="search-input" id="sms-search" placeholder="Message, sender, or number" value="${window.ui.escapeHtml(existingSearch)}" onkeydown="if(event.key==='Enter') window.sms.renderMySms(document.getElementById('page-content'), 1)">
                    </div>
                    <div class="filter-field">
                        <label for="sms-date-from">From</label>
                        <input type="date" class="filter-select" id="sms-date-from" value="${existingFrom}" onchange="window.sms.renderMySms(document.getElementById('page-content'), 1)">
                    </div>
                    <div class="filter-field">
                        <label for="sms-date-to">To</label>
                        <input type="date" class="filter-select" id="sms-date-to" value="${existingTo}" onchange="window.sms.renderMySms(document.getElementById('page-content'), 1)">
                    </div>
                    <button class="fly-btn fly-btn-sm filter-action-btn" onclick="window.sms.renderMySms(document.getElementById('page-content'), 1)">Apply</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Source</th><th>Range/Term</th><th>App</th><th>OTP</th><th>Payout</th><th>Message</th><th>CLI Type</th></tr></thead>
                        <tbody id="my-sms-body">
                            ${rows.map(s => {
                                const rangeDisplay = window.ui.formatRangeTermination(s);
                                return `
                                <tr>
                                    <td style="font-size:11px; white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                                    <td><code style="font-size:12px">${s.number}</code></td>
                                    <td><span class="badge badge-info">${rangeDisplay}</span></td>
                                    <td><span class="badge badge-primary">${s.service || '-'}</span></td>
                                    <td>${s.otp ? `<span class="otp-code" style="font-weight:700">${s.otp}</span>` : '-'}</td>
                                    <td>${window.ui.formatPayout(s.profit)}</td>
                                    <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                    <td><span class="badge ${s.is_alphanumeric_cli ? 'badge-warning' : 'badge-secondary'}">${s.is_alphanumeric_cli ? 'Alpha' : 'Numeric'}</span></td>
                                </tr>
                            `}).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="8">No SMS messages found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                ${window.ui.renderPagination(data.pagination, (p) => this.renderMySms(container, p))}
            </div>
            ${rows.length > 0 ? (() => {
                // Build payout summary per number
                const map = {};
                rows.forEach(s => {
                    if (!map[s.number]) map[s.number] = { number: s.number, range: s.range_name || '-', count: 0, total: 0 };
                    map[s.number].count++;
                    map[s.number].total += Number(s.profit || 0);
                });
                const summary = Object.values(map).sort((a,b) => b.total - a.total);
                return `<div class="card" style="margin-top:16px">
                    <div class="card-header"><div class="card-title">Payout Summary (This Page)</div></div>
                    <div class="table-wrapper"><table class="fly-table">
                        <thead><tr><th>Number</th><th>Range</th><th>SMS Count</th><th>Total Payout</th></tr></thead>
                        <tbody>${summary.map(s => `<tr>
                            <td><code style="font-size:12px">${window.ui.escapeHtml(s.number)}</code></td>
                            <td><span class="badge badge-info">${window.ui.escapeHtml(s.range)}</span></td>
                            <td><span class="badge badge-secondary">${s.count}</span></td>
                            <td><strong style="color:${s.total>0?'var(--success)':'var(--text-secondary)'}">$${s.total.toFixed(4)}</strong></td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                </div>`;
            })() : ''}`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async renderProfitStats(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [stats, rates, payoutStats] = await Promise.all([
                window.api.call('/api/dashboard/stats'),
                window.api.call('/api/settings/payout-rates').catch(() => ({ weekly: 0.85, monthly: 0.75 })),
                window.api.call('/api/sms/payout-stats')
            ]);
            const rangeRows = payoutStats.data || [];
            const totalPayout = Number(payoutStats.total || 0);

            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Today's Profit</div><div class="stat-card-value">$${Number(stats.todayProfit||0).toFixed(2)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Monthly Profit</div><div class="stat-card-value">$${Number(stats.monthProfit||0).toFixed(2)}</div></div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Payout by Range (All Time)</div>
                    <span class="badge badge-success">Total: $${totalPayout.toFixed(4)}</span>
                </div>
                <div class="table-wrapper"><table class="fly-table">
                    <thead><tr><th>Range</th><th>SMS Count</th><th>Total Payout</th><th>Avg/SMS</th></tr></thead>
                    <tbody>${rangeRows.map(r => `<tr>
                        <td><span class="badge badge-info">${window.ui.escapeHtml(r.range_name || 'Unassigned')}</span></td>
                        <td><span class="badge badge-secondary">${r.sms_count}</span></td>
                        <td><strong style="color:${r.total_payout > 0 ? 'var(--success)' : 'var(--text-secondary)'}">$${Number(r.total_payout).toFixed(4)}</strong></td>
                        <td style="color:var(--text-secondary)">$${r.sms_count > 0 ? (Number(r.total_payout)/r.sms_count).toFixed(4) : '0.0000'}</td>
                    </tr>`).join('') || '<tr class="empty-row"><td colspan="4">No SMS data yet</td></tr>'}
                    </tbody>
                </table></div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    renderProfitChart(stats) {
        window.loadChart().then(() => {
            const ctx = document.getElementById('profit-distribution-chart')?.getContext('2d');
            if (!ctx) return;
            new Chart(ctx, { type: 'bar', data: { labels: ['Current Month'], datasets: [{ label: 'Net Profit ($)', data: [stats.monthProfit], backgroundColor: '#735DFF', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 300 }, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
        });
    },
    async renderLiveOtpFeed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Real-Time OTP Infrastructure Feed</div>
                <div class="badge badge-success" style="animation: pulse 2s ease-in-out infinite">● LIVE</div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Timestamp</th><th>Recipient</th><th>Range/Termination</th><th>Service</th><th>OTP (Masked)</th><th>Message Content</th></tr></thead>
                    <tbody id="live-otp-body">
                        <tr class="empty-row"><td colspan="6">Waiting for live OTP data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.startLiveFeed();
    },

    startLiveFeed() {
        const body = document.getElementById('live-otp-body');
        if (!body) return;
        this.stopLiveFeed();

        this._feedInterval = setInterval(async () => {
            if (!document.getElementById('live-otp-body')) {
                this.stopLiveFeed();
                return;
            }
            try {
                const data = await window.api.call('/api/sms?limit=15');
                if (data.data && data.data.length) {
                    body.innerHTML = data.data.map(s => {
                        const maskedMsg = this._maskOTP(s.message, s.otp);
                        const rangeDisplay = window.ui.formatRangeTermination(s);
                        return `
                        <tr style="animation: fadeInUp 0.3s ease">
                            <td style="font-size:11px;white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                            <td><code style="font-size:12px">${s.number}</code></td>
                            <td><span class="badge badge-secondary">${rangeDisplay}</span></td>
                            <td><span class="badge badge-primary">${s.service || 'Unknown'}</span></td>
                            <td>${s.otp ? `<span class="otp-code" style="font-family:monospace;font-weight:700;color:var(--danger)">${s.otp.replace(/\d/g, 'X')}</span>` : '-'}</td>
                            <td class="message-text" style="max-width:300px">${maskedMsg}</td>
                        </tr>
                    `}).join('');
                } else {
                    body.innerHTML = '<tr class="empty-row"><td colspan="6">Listening for infrastructure traffic... No OTPs found yet.</td></tr>';
                }
            } catch (e) {
                console.error('Live feed poll failed', e);
            }
        }, 8000);
    },

    stopLiveFeed() {
        if (this._feedInterval) clearInterval(this._feedInterval);
    },

    async renderAnalytics(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const analytics = await window.api.call('/api/dashboard/analytics');
            const status = analytics.status_counts || {};
            const success = Number((analytics.success_rates || {}).global || 0) * 100;
            const services = analytics.by_service || [];
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Delivery Success</div><div class="stat-card-value">${success.toFixed(1)}%</div></div>
                <div class="stat-card"><div class="stat-card-label">Delivered SMS</div><div class="stat-card-value">${Number(status.delivered || 0)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Received Only</div><div class="stat-card-value">${Number(status.receivedOnly || 0)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Failed Events</div><div class="stat-card-value">${Number(status.failed || 0)}</div></div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">SMS Traffic Analytics</div></div>
                <div class="card-body" style="padding:24px">
                    <div style="height:320px"><canvas id="traffic-analytics-chart"></canvas></div>
                </div>
            </div>
            <div class="card" style="margin-top:16px">
                <div class="card-header"><div class="card-title">Service Detection Results</div></div>
                <div class="table-wrapper"><table class="fly-table">
                    <thead><tr><th>Service</th><th>SMS Count</th></tr></thead>
                    <tbody>${services.map(s => `<tr><td>${window.ui.escapeHtml(s.service || 'Unknown')}</td><td><span class="badge badge-secondary">${s.count}</span></td></tr>`).join('') || '<tr class="empty-row"><td colspan="2">No service data available</td></tr>'}</tbody>
                </table></div>
            </div>`;
            await this.loadAnalyticsChart(analytics);
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Unable to load analytics</h3><p>${e.message}</p></div>`;
        }
    },

    async loadAnalyticsChart(analytics) {
        await window.loadChart();
        const ctx = document.getElementById('traffic-analytics-chart')?.getContext('2d');
        if (!ctx) return;
        const smsRows = analytics.sms_over_time || [];
        const profitRows = analytics.profit_over_time || [];
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: smsRows.map(r => r.date),
                datasets: [
                    { label: 'SMS Volume', data: smsRows.map(r => r.count), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.3, fill: true },
                    { label: 'Payout', data: profitRows.map(r => Number(r.profit || 0)), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', tension: 0.3, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } }
            }
        });
    },

    async renderSearchSms(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Advanced SMS Search</div></div>
            <div class="card-body" style="padding:24px">
                <div class="form-row">
                    <div class="form-group"><label>Recipient (To)</label><input type="text" id="s-to" class="fly-input" placeholder="+1..."></div>
                    <div class="form-group"><label>Sender (From)</label><input type="text" id="s-from" class="fly-input" placeholder="Google"></div>
                </div>
                <div class="form-group"><label>Message Keywords</label><input type="text" id="s-msg" class="fly-input" placeholder="OTP, verify, etc."></div>
                <button class="fly-btn" onclick="window.sms.doSearch()">Search Infrastructure</button>
            </div>
            <div class="table-wrapper" id="search-results-area" style="display:none">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>From</th><th>To</th><th>Message</th></tr></thead>
                    <tbody id="search-results-body"></tbody>
                </table>
            </div>
        </div>`;
    },

    async doSearch() {
        const to = document.getElementById('s-to').value;
        const from = document.getElementById('s-from').value;
        const msg = document.getElementById('s-msg').value;
        const area = document.getElementById('search-results-area');
        const body = document.getElementById('search-results-body');

        try {
            const params = '/api/sms?number=' + encodeURIComponent(to) + '&search=' + encodeURIComponent(msg) + (from ? '&sender=' + encodeURIComponent(from) : '');
            const data = await window.api.call(params);
            area.style.display = 'block';
            body.innerHTML = data.data.map(s => `
                <tr>
                    <td>${window.ui.formatDate(s.received_at)}</td>
                    <td>${s.sender || s.number}</td>
                    <td>${s.number}</td>
                    <td>${s.message}</td>
                </tr>
            `).join('') || '<tr><td colspan="4">No results found</td></tr>';
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async renderDeliveryLogs(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms/delivery-logs');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Delivery Receipts & DLR Logs</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Number</th><th>Service</th><th>OTP</th><th>Status</th></tr></thead>
                        <tbody>
                            ${rows.map(s => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                                    <td><code>${s.number}</code></td>
                                    <td><span class="badge badge-secondary">${s.service || '-'}</span></td>
                                    <td><strong>${s.otp || '-'}</strong></td>
                                    <td><span class="badge badge-success">DELIVERED</span></td>
                                </tr>
                            `).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="5">No DLR records found in history</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Unable to load delivery logs</h3><p>${e.message}</p></div>`; }
    },

    async renderFailedSms(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms/failed');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Failed SMS & Error Logs</div>
                    <span class="badge badge-secondary">${rows.length} entries</span>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Type</th><th>Reason / Details</th><th>IP</th></tr></thead>
                        <tbody>
                            ${rows.map(s => {
                                const detail = s.details || s.message || '';
                                // Parse "Missing required field(s): X. Received keys: Y" into readable format
                                const missingMatch = detail.match(/Missing required field\(s\): ([^.]+)/);
                                const keysMatch = detail.match(/Received keys: (.+)$/);
                                let displayDetail = window.ui.escapeHtml(detail || '-');
                                if (missingMatch) {
                                    displayDetail = `<span style="color:var(--danger);font-weight:600">Missing: ${window.ui.escapeHtml(missingMatch[1])}</span>`;
                                    if (keysMatch) displayDetail += ` <span style="color:var(--text-secondary);font-size:11px">| Received: ${window.ui.escapeHtml(keysMatch[1])}</span>`;
                                }
                                return `
                                <tr>
                                    <td style="font-size:11px;white-space:nowrap">${window.ui.formatDate(s.created_at)}</td>
                                    <td><span class="badge badge-danger">${window.ui.escapeHtml(s.event_type || 'SMS_FAILED')}</span></td>
                                    <td class="message-text" style="max-width:400px">${displayDetail}</td>
                                    <td><code style="font-size:11px">${window.ui.escapeHtml(s.ip_address || '-')}</code></td>
                                </tr>`;
                            }).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="4">No failures logged — system is running cleanly</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Unable to load failed SMS</h3><p>${e.message}</p></div>`; }
    },

    async renderLiveTraffic(container, minutes = 5) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [liveData, statsData] = await Promise.all([
                window.api.call(`/api/sms/live-traffic?minutes=${minutes}`),
                window.api.call(`/api/sms/traffic-stats?minutes=${minutes}`)
            ]);
            
            const rows = liveData.data || [];
            const stats = statsData.data || [];
            
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Live SMS Traffic (Admin/Manager)</div>
                    <div class="card-tools">
                        <select class="filter-select" style="width:120px" onchange="window.sms.renderLiveTraffic(document.getElementById('page-content'), parseInt(this.value))">
                            <option value="1">Last 1 min</option>
                            <option value="5" selected>Last 5 min</option>
                            <option value="15">Last 15 min</option>
                            <option value="30">Last 30 min</option>
                            <option value="60">Last 1 hour</option>
                        </select>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>User</th><th>Number</th><th>Sender</th><th>Range</th><th>Service</th><th>OTP</th><th>Payout</th><th>Message</th></tr></thead>
                        <tbody>
                            ${rows.map(s => {
                                const rangeDisplay = window.ui.formatRangeTermination(s);
                                return `
                                <tr>
                                    <td style="font-size:10px; white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                                    <td><span class="badge badge-primary">${window.ui.escapeHtml(s.username || s.assigned_to || '-')}</span></td>
                                    <td><code style="font-size:11px">${s.number}</code></td>
                                    <td><code style="font-size:11px">${window.ui.escapeHtml(s.sender || '-')}</code></td>
                                    <td><span class="badge badge-info">${rangeDisplay}</span></td>
                                    <td><span class="badge badge-secondary">${s.service || '-'}</span></td>
                                    <td>${s.otp ? `<strong>${s.otp}</strong>` : '-'}</td>
                                    <td>${window.ui.formatPayout(s.profit)}</td>
                                    <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                </tr>
                            `}).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="9">No SMS traffic in the last ${minutes} minutes</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                <div style="padding:12px; background:var(--bg-secondary); border-radius:4px; margin-top:12px">
                    <strong>Traffic Summary (${minutes} min):</strong> ${rows.length} SMS | Total Payout: <strong>$${(rows.reduce((s,r) => s + Number(r.profit||0), 0)).toFixed(4)}</strong>
                </div>
            </div>
            <div class="card" style="margin-top:16px">
                <div class="card-header"><div class="card-title">Traffic by User</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Username</th><th>SMS Count</th><th>OTP Count</th><th>Unique Numbers</th><th>Total Payout</th></tr></thead>
                        <tbody>
                            ${stats.map(s => `
                                <tr>
                                    <td><span class="badge badge-primary">${window.ui.escapeHtml(s.username || '-')}</span></td>
                                    <td><strong>${s.sms_count}</strong></td>
                                    <td>${s.otp_count}</td>
                                    <td>${s.unique_numbers}</td>
                                    <td><strong style="color:var(--success)">$${Number(s.total_payout||0).toFixed(4)}</strong></td>
                                </tr>
                            `).join('')}
                            ${stats.length === 0 ? '<tr class="empty-row"><td colspan="5">No users with traffic</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error loading live traffic</h3><p>${err.message}</p></div>`;
        }
    }
};

window.sms = sms;
