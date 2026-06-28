const dashboard = {
    _animateCount(el, target) {
        if (!el || isNaN(target)) return;
        const isFloat = String(target).includes('.');
        const dur = 900, start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = isFloat ? '$' + (target * ease).toFixed(2) : Math.round(target * ease).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },

    async render(container) {
        container.innerHTML = `
        <div class="stats-grid">${Array(6).fill(`<div class="stat-card"><div class="skeleton-row" style="width:55%;margin-bottom:12px"></div><div class="skeleton-row" style="width:38%;height:28px"></div></div>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px">
            <div class="card" style="height:280px"><div class="skeleton-row" style="margin:18px;width:40%"></div></div>
            <div class="card" style="height:280px"><div class="skeleton-row" style="margin:18px;width:40%"></div></div>
        </div>
        <div class="card" style="height:220px"><div class="skeleton-row" style="margin:18px;width:30%"></div></div>`;

        try {
            const [stats, recent] = await Promise.all([
                window.api.call('/api/dashboard/stats'),
                window.api.call('/api/dashboard/recent-sms?limit=10'),
            ]);

            const mkCard = (cls, label, raw, display, icon, sub = '') => `
                <div class="stat-card ${cls}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                        <div>
                            <div class="stat-card-label">${label}</div>
                            <div class="stat-card-value" data-count="${raw}">${display}</div>
                            ${sub ? `<div class="stat-card-change">${sub}</div>` : ''}
                        </div>
                        <div class="stat-icon">${icon}</div>
                    </div>
                </div>`;

            let cards = mkCard('stat-card--sms',     "Today's SMS",    stats.todaySms,         stats.todaySms,                          ICONS.sms)
                      + mkCard('stat-card--numbers', 'Total Numbers',  stats.totalNumbers,     stats.totalNumbers,                      ICONS.phone,  `${stats.activeNumbers} active`)
                      + mkCard('stat-card--profit',  "Today's Profit", stats.todayProfit,      '$' + stats.todayProfit.toFixed(2),      ICONS.profit)
                      + mkCard('stat-card--month',   'Month Profit',   stats.monthProfit,      '$' + stats.monthProfit.toFixed(2),      ICONS.trendUp)
                      + mkCard('',                   'Allocations',    stats.totalAllocations, stats.totalAllocations,                  ICONS.layers);

            if (stats.activeProviders != null)
                cards += mkCard('stat-card--providers', 'Active Providers', stats.activeProviders, stats.activeProviders, ICONS.server);
            if (stats.totalDlrs != null)
                cards += mkCard('', 'DLRs Today', stats.totalDlrs, stats.totalDlrs, ICONS.report);
            if (stats.totalUsers)
                cards += mkCard('', 'Total Users', stats.totalUsers, stats.totalUsers, ICONS.users);

            container.innerHTML = `
            <div class="stats-grid">${cards}</div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px">
                <div class="card">
                    <div class="card-header"><div class="card-title">${ICONS.chart} Weekly SMS Activity</div></div>
                    <div style="padding:16px;height:240px"><canvas id="weekly-sms-chart"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-header"><div class="card-title">${ICONS.bell} Top Services Today</div></div>
                    <div class="service-list">
                        ${stats.todaySmsByService.length
                            ? stats.todaySmsByService.map((s, i) => `<div class="service-chip" style="animation-delay:${i * 40}ms">${window.ui.escapeHtml(s.service || 'Unknown')}<span class="service-chip-count">${s.count}</span></div>`).join('')
                            : '<div class="empty-state" style="min-height:80px"><p>No SMS today</p></div>'}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">${ICONS.sms} Recent SMS</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Service</th><th>OTP</th><th>Message</th><th>Received</th></tr></thead>
                        <tbody>${recent.data.length
                            ? recent.data.map(s => `<tr>
                                <td><code>${s.number}</code></td>
                                <td>${s.service ? `<span class="badge badge-primary">${s.service}</span>` : '<span style="color:#9ca3af">—</span>'}</td>
                                <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '—'}</td>
                                <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                <td style="font-size:12px;color:#6B7280">${window.ui.formatDate(s.received_at)}</td>
                            </tr>`).join('')
                            : '<tr class="empty-row"><td colspan="5">No SMS yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;

            container.querySelectorAll('[data-count]').forEach(el => {
                this._animateCount(el, parseFloat(el.dataset.count));
            });
            this.renderChart(stats.weekSmsByDay);

        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error loading dashboard</h3><p>${err.message}</p><button class="fly-btn" onclick="window.dashboard.render(document.getElementById('page-content'))">Retry</button></div>`;
        }
    },

    async renderChart(data) {
        await window.loadChart();
        const ctx = document.getElementById('weekly-sms-chart')?.getContext('2d');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date.slice(5)),
                datasets: [{
                    label: 'SMS', data: data.map(d => d.count),
                    borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)',
                    fill: true, tension: 0.45, pointRadius: 4,
                    pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutQuart' },
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { beginAtZero: true, grid: { color: 'rgba(226,232,240,.6)' }, ticks: { font: { size: 11 } } }
                }
            }
        });
    }
};
window.dashboard = dashboard;
