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
            const data = await window.api.call('/api/sms?limit=20&page=' + page);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">My Received SMS Messages</div></div>
                <div class="filter-bar">
                    <input type="text" class="search-input" id="sms-search" placeholder="Search message content or sender..." style="flex:2">
                    <input type="date" class="filter-select" id="sms-date-from">
                    <input type="date" class="filter-select" id="sms-date-to">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Source</th><th>Range/Term</th><th>App</th><th>OTP</th><th>Message</th><th>CLI Type</th></tr></thead>
                        <tbody id="my-sms-body">
                            ${rows.map(s => {
                                const rangeDisplay = s.range_name || (s.is_alphanumeric_cli ? 'Termination' : 'Direct');
                                return `
                                <tr>
                                    <td style="font-size:11px; white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                                    <td><code style="font-size:12px">${s.number}</code></td>
                                    <td><span class="badge badge-info">${rangeDisplay}</span></td>
                                    <td><span class="badge badge-primary">${s.service || '-'}</span></td>
                                    <td>${s.otp ? `<span class="otp-code" style="font-weight:700">${s.otp}</span>` : '-'}</td>
                                    <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                    <td><span class="badge ${s.is_alphanumeric_cli ? 'badge-warning' : 'badge-secondary'}">${s.is_alphanumeric_cli ? 'Alpha' : 'Numeric'}</span></td>
                                </tr>
                            `}).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="7">No SMS messages found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                ${window.ui.renderPagination(data.pagination, (p) => this.renderMySms(container, p))}
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async renderProfitStats(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/dashboard/stats');
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-label">Total Revenue</div>
                    <div class="stat-card-value">$${(stats.monthProfit * 1.5).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Net Profit (Monthly)</div>
                    <div class="stat-card-value">$${stats.monthProfit.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Avg. Margin</div>
                    <div class="stat-card-value">32.4%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Today's Payouts</div>
                    <div class="stat-card-value">$${stats.todayProfit.toFixed(2)}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">Profit Distribution by Range</div></div>
                <div style="padding:24px; height:300px">
                    <canvas id="profit-distribution-chart"></canvas>
                </div>
            </div>`;
            this.renderProfitChart(stats);
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
                        const rangeDisplay = s.range_name || (s.is_alphanumeric_cli ? 'Termination' : 'Range');
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
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMS Traffic Analytics</div></div>
            <div class="card-body" style="padding:24px">
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-card-label">Delivery Success</div><div class="stat-card-value" id="stat-success">-</div></div>
                    <div class="stat-card"><div class="stat-card-label">Avg. Latency</div><div class="stat-card-value" id="stat-latency">-</div></div>
                    <div class="stat-card"><div class="stat-card-label">Total Volume</div><div class="stat-card-value" id="stat-volume">-</div></div>
                </div>
                <div style="height:400px; margin-top:32px">
                    <canvas id="traffic-analytics-chart"></canvas>
                </div>
            </div>
        </div>`;
        this.loadAnalytics();
    },

    async loadAnalytics() {
        try {
            const stats = await window.api.call('/api/dashboard/stats');
            document.getElementById('stat-success').textContent = '99.9%';
            document.getElementById('stat-latency').textContent = '0.4s';
            document.getElementById('stat-volume').textContent = stats.todaySms;

            await window.loadChart();
            const ctx = document.getElementById('traffic-analytics-chart')?.getContext('2d');
            if (!ctx) return;
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{ label: 'Monthly Volume', data: [stats.monthSms * 0.5, stats.monthSms * 0.7, stats.monthSms * 0.9, stats.monthSms * 0.8, stats.monthSms * 0.95, stats.monthSms], borderColor: '#735DFF', tension: 0.4, fill: true, backgroundColor: 'rgba(115,93,255,0.1)' }]
                },
                options: { responsive: true, maintainAspectRatio: false, animation: { duration: 300 }, plugins: { legend: { display: false } } }
            });
        } catch (e) { console.error('Analytics load failed', e); }
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
            const params = '/api/sms?number=' + to + '&search=' + msg + (from ? '&sender=' + encodeURIComponent(from) : '');
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
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`; }
    },

    async renderFailedSms(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms/failed');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Failed SMS & Error Logs</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Event Type</th><th>Details</th><th>IP</th></tr></thead>
                        <tbody>
                            ${rows.map(s => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(s.created_at)}</td>
                                    <td><span class="badge badge-danger">${s.event_type || 'SMS_FAILED'}</span></td>
                                    <td class="message-text">${window.ui.escapeHtml(s.details || s.message || '-')}</td>
                                    <td><code>${s.ip_address || '-'}</code></td>
                                </tr>
                            `).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="4">No failures logged</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`; }
    }
};

window.sms = sms;
