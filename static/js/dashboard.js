/* ═══════════════════════════════════════════════════════
   DASHBOARD  —  Powerful role-aware dashboard v2
   ═══════════════════════════════════════════════════════ */
const dashboard = {
    _charts: [],

    _destroyCharts() {
        this._charts.forEach(c => { try { c.destroy(); } catch(e){} });
        this._charts = [];
    },

    _animateCount(el, target) {
        if (!el || isNaN(target)) return;
        const isFloat = !Number.isInteger(target);
        const dur = 900, start = performance.now();
        const tick = now => {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const val = target * ease;
            el.textContent = isFloat ? '$' + val.toFixed(2) : Math.round(val).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },

    _pct(val) {
        if (val === null || val === undefined) return '';
        const up = val >= 0;
        const arrow = up ? '▲' : '▼';
        const cls = up ? 'color:#10b981' : 'color:#ef4444';
        return `<span style="font-size:11px;font-weight:700;${cls}">${arrow} ${Math.abs(val)}%</span> <span style="font-size:10px;color:var(--text-muted)">vs yesterday</span>`;
    },

    _badge(type, text) {
        return `<span class="badge badge-${type}">${text}</span>`;
    },

    _nav(page) {
        return `onclick="window.router.navigateTo('${page}')"`;
    },


    /* ── Skeleton loader ── */
    _skeleton() {
        return `
        <div class="db-kpi-grid">
            ${Array(6).fill(`<div class="db-kpi-card"><div class="skeleton-row" style="width:55%;margin-bottom:12px"></div><div class="skeleton-row" style="width:38%;height:28px"></div><div class="skeleton-row" style="width:45%;margin-top:8px"></div></div>`).join('')}
        </div>
        <div class="db-mid-grid">
            <div class="card db-chart-card"><div class="skeleton-row" style="margin:18px;width:40%"></div><div style="height:200px;margin:16px;background:rgba(0,0,0,.04);border-radius:8px"></div></div>
            <div class="card db-chart-card"><div class="skeleton-row" style="margin:18px;width:40%"></div><div style="height:200px;margin:16px;background:rgba(0,0,0,.04);border-radius:8px"></div></div>
        </div>
        <div class="db-bot-grid">
            <div class="card" style="height:220px"><div class="skeleton-row" style="margin:18px;width:30%"></div></div>
            <div class="card" style="height:220px"><div class="skeleton-row" style="margin:18px;width:30%"></div></div>
        </div>`;
    },

    /* ── KPI card builder ── */
    _kpi(opts) {
        const { cls='', icon, label, value, raw, sub='', change='', action='' } = opts;
        return `
        <div class="db-kpi-card ${cls}" ${action} style="${action?'cursor:pointer':''}">
            <div class="db-kpi-top">
                <div class="db-kpi-icon">${icon}</div>
                <div class="db-kpi-label">${label}</div>
            </div>
            <div class="db-kpi-value" data-count="${raw}">${value}</div>
            ${sub  ? `<div class="db-kpi-sub">${sub}</div>` : ''}
            ${change ? `<div class="db-kpi-change">${change}</div>` : ''}
        </div>`;
    },



    /* ── Alert banner (pending items) ── */
    _alertBanner(d) {
        const items = [];
        if (d.admin.pendingReg)    items.push(`<span ${this._nav('registration-requests')} style="cursor:pointer;text-decoration:underline">${d.admin.pendingReg} pending registration${d.admin.pendingReg>1?'s':''}</span>`);
        if (d.admin.pendingPayout) items.push(`<span ${this._nav('payout-requests')} style="cursor:pointer;text-decoration:underline">${d.admin.pendingPayout} payout request${d.admin.pendingPayout>1?'s':''}</span>`);
        if (d.admin.openTickets)   items.push(`<span ${this._nav('support')} style="cursor:pointer;text-decoration:underline">${d.admin.openTickets} open ticket${d.admin.openTickets>1?'s':''}</span>`);
        if (d.admin.blockedIps)    items.push(`<span ${this._nav('firewall-blocked-ips')} style="cursor:pointer;text-decoration:underline">${d.admin.blockedIps} blocked IP${d.admin.blockedIps>1?'s':''}</span>`);
        if (!items.length) return '';
        return `<div class="db-alert-banner">${ICONS.alertCircle} <strong>Action needed:</strong> ${items.join(' &nbsp;·&nbsp; ')}</div>`;
    },

    /* ── Quick actions bar ── */
    _quickActions(role) {
        const all = [
            { label: 'My Numbers',     icon: ICONS.phone,    page: 'my-numbers',      roles: ['admin','manager','reseller','sub_reseller'] },
            { label: 'My SMS',         icon: ICONS.sms,      page: 'my-sms',          roles: ['admin','manager','reseller','sub_reseller'] },
            { label: 'Live OTP Feed',  icon: ICONS.bell,     page: 'live-otp-feed',   roles: ['admin','manager','reseller','sub_reseller'] },
            { label: 'Profit Stats',   icon: ICONS.profit,   page: 'profit-stats',    roles: ['admin','manager','reseller','sub_reseller'] },
            { label: 'Upload Numbers', icon: ICONS.upload,   page: 'upload-numbers',  roles: ['admin','manager'] },
            { label: 'Bulk Alloc',     icon: ICONS.layers,   page: 'bulk-allocation', roles: ['admin','manager'] },
            { label: 'Users',          icon: ICONS.users,    page: 'users',           roles: ['admin','manager','reseller'] },
            { label: 'Payout Req',     icon: ICONS.wallet,   page: 'payout-requests', roles: ['admin','manager'] },
            { label: 'Live Traffic',   icon: ICONS.activity, page: 'live-traffic',    roles: ['admin','manager'] },
            { label: 'SMPP Server',    icon: ICONS.smpp,     page: 'smpp-server-dash',roles: ['admin'] },
            { label: 'Security',       icon: ICONS.shield,   page: 'firewall-dashboard',roles: ['admin'] },
            { label: 'Self Alloc',     icon: ICONS.layers,   page: 'self-allocation', roles: ['reseller','sub_reseller'] },
            { label: 'My Payouts',     icon: ICONS.wallet,   page: 'my-payouts',      roles: ['admin','manager','reseller','sub_reseller'] },
            { label: 'Search SMS',     icon: ICONS.search,   page: 'search-sms',      roles: ['admin','manager','reseller','sub_reseller'] },
        ];
        const btns = all.filter(a => a.roles.includes(role))
            .map(a => `<button class="db-quick-btn" ${this._nav(a.page)}><span class="db-quick-icon">${a.icon}</span><span>${a.label}</span></button>`).join('');
        return `<div class="db-quick-bar">${btns}</div>`;
    },



    /* ── Build KPI grid ── */
    _buildKpis(d) {
        const role = d.role;
        let html = '';

        html += this._kpi({ cls:'db-kpi--sms', icon: ICONS.sms, label: "Today's SMS",
            value: d.sms.today.toLocaleString(), raw: d.sms.today,
            sub: `${d.sms.week.toLocaleString()} this week &nbsp;·&nbsp; ${d.sms.todayOtps.toLocaleString()} OTPs`,
            change: this._pct(d.sms.changePercent), action: this._nav('my-sms') });

        html += this._kpi({ cls:'db-kpi--profit', icon: ICONS.profit, label: "Today's Profit",
            value: '$' + d.profit.today.toFixed(2), raw: d.profit.today,
            sub: `$${d.profit.week.toFixed(2)} this week`,
            change: this._pct(d.profit.changePercent), action: this._nav('profit-stats') });

        html += this._kpi({ cls:'db-kpi--month', icon: ICONS.trendUp, label: 'Month Profit',
            value: '$' + d.profit.month.toFixed(2), raw: d.profit.month,
            sub: `Prev month $${d.profit.prevMonth.toFixed(2)}`,
            change: this._pct(d.profit.monthVsPrev) });

        html += this._kpi({ cls:'db-kpi--numbers', icon: ICONS.phone, label: 'Total Numbers',
            value: d.numbers.total.toLocaleString(), raw: d.numbers.total,
            sub: `${d.numbers.active} active &nbsp;·&nbsp; ${d.numbers.idle} idle`,
            action: this._nav('my-numbers') });

        if (d.users.total > 0) {
            html += this._kpi({ cls:'db-kpi--users', icon: ICONS.users, label: 'Users',
                value: d.users.total.toLocaleString(), raw: d.users.total,
                sub: `${d.users.active} active &nbsp;·&nbsp; +${d.users.newToday} today`,
                action: this._nav('users') });
        }

        if (d.admin.totalProviders !== null) {
            html += this._kpi({ cls:'db-kpi--providers', icon: ICONS.server, label: 'Active Providers',
                value: d.admin.totalProviders, raw: d.admin.totalProviders,
                sub: d.admin.totalRanges !== null ? `${d.admin.totalRanges} active ranges` : '' });
        }

        if (d.admin.smppSessions !== null) {
            html += this._kpi({ cls:'db-kpi--smpp', icon: ICONS.smpp, label: 'SMPP Sessions',
                value: d.admin.smppSessions, raw: d.admin.smppSessions,
                sub: `${d.admin.smppRemote ?? 0} remote connected`,
                action: this._nav('smpp-server-dash') });
        }

        if (d.admin.securityEventsToday !== null) {
            html += this._kpi({ cls:'db-kpi--security', icon: ICONS.shield, label: 'Security Events Today',
                value: d.admin.securityEventsToday, raw: d.admin.securityEventsToday,
                sub: d.admin.blockedIps ? `${d.admin.blockedIps} IPs blocked` : 'No blocked IPs',
                action: this._nav('firewall-dashboard') });
        }

        if (['reseller','sub_reseller'].includes(role)) {
            html += this._kpi({ cls:'db-kpi--balance', icon: ICONS.wallet, label: 'Account Balance',
                value: '$' + d.balance.toFixed(2), raw: d.balance,
                sub: `$${d.profit.total.toFixed(2)} total earned`,
                action: this._nav('my-payouts') });
        }

        html += this._kpi({ cls:'db-kpi--otps', icon: ICONS.report, label: 'OTPs This Week',
            value: d.sms.weekOtps.toLocaleString(), raw: d.sms.weekOtps,
            sub: `${d.sms.month.toLocaleString()} SMS this month` });

        return `<div class="db-kpi-grid">${html}</div>`;
    },



    /* ── Build recent SMS table ── */
    _buildRecentSms(rows) {
        if (!rows.length) return `<div class="empty-state" style="padding:24px"><p>No SMS yet</p></div>`;
        return `<div class="table-wrapper">
        <table class="fly-table">
            <thead><tr><th>Number</th><th>Service</th><th>OTP</th><th>Message</th><th>Time</th></tr></thead>
            <tbody>${rows.map(s => `<tr>
                <td><code>${window.ui.escapeHtml(s.number)}</code></td>
                <td>${s.service ? `<span class="badge badge-primary">${window.ui.escapeHtml(s.service)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td>${s.otp ? `<span class="otp-code">${window.ui.escapeHtml(s.otp)}</span>` : '—'}</td>
                <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    },

    /* ── Build top services ── */
    _buildTopServices(services) {
        if (!services.length) return `<div class="empty-state" style="padding:24px"><p>No data</p></div>`;
        const max = services[0].cnt || 1;
        return `<div class="db-service-list">${services.map((s, i) => `
        <div class="db-service-row">
            <div class="db-service-rank">${i + 1}</div>
            <div class="db-service-info">
                <div class="db-service-name">${window.ui.escapeHtml(s.service)}</div>
                <div class="db-service-bar-wrap">
                    <div class="db-service-bar" style="width:${Math.round(s.cnt/max*100)}%"></div>
                </div>
            </div>
            <div class="db-service-stats">
                <span class="badge badge-primary">${s.cnt.toLocaleString()}</span>
                <span style="font-size:11px;color:var(--text-muted)">$${parseFloat(s.profit).toFixed(4)}</span>
            </div>
        </div>`).join('')}</div>`;
    },

    /* ── Build top numbers ── */
    _buildTopNumbers(numbers) {
        if (!numbers.length) return `<div class="empty-state" style="padding:24px"><p>No data</p></div>`;
        return `<div class="table-wrapper"><table class="fly-table fly-table-compact">
            <thead><tr><th>#</th><th>Number</th><th>SMS (week)</th><th>Profit</th></tr></thead>
            <tbody>${numbers.map((n, i) => `<tr>
                <td style="color:var(--text-muted);font-size:11px">${i + 1}</td>
                <td><code>${window.ui.escapeHtml(n.number)}</code></td>
                <td><span class="badge badge-info">${n.cnt.toLocaleString()}</span></td>
                <td><span class="badge badge-success">$${parseFloat(n.profit).toFixed(4)}</span></td>
            </tr>`).join('')}
            </tbody></table></div>`;
    },



    /* ── Build audit log ── */
    _buildAuditLog(rows) {
        if (!rows.length) return `<div class="empty-state" style="padding:24px"><p>No activity yet</p></div>`;
        const actionColor = a => {
            if (/creat|add|alloc/i.test(a)) return 'badge-success';
            if (/delet|revok|remov/i.test(a)) return 'badge-danger';
            if (/update|edit|modif/i.test(a)) return 'badge-warning';
            return 'badge-secondary';
        };
        return `<div class="db-audit-list">${rows.map(r => `
        <div class="db-audit-row">
            <div class="db-audit-icon">${ICONS.activity}</div>
            <div class="db-audit-body">
                <div class="db-audit-action">
                    <span class="badge ${actionColor(r.action)}">${window.ui.escapeHtml(r.action)}</span>
                    <span style="font-size:12px;color:var(--text-primary);margin-left:6px">${window.ui.escapeHtml(r.resource || '')}</span>
                </div>
                <div class="db-audit-meta">
                    <span style="font-weight:600">${window.ui.escapeHtml(r.actor_username)}</span>
                    <span style="color:var(--text-muted)">${r.detail ? '· ' + window.ui.escapeHtml(String(r.detail).substring(0,60)) : ''}</span>
                </div>
            </div>
            <div class="db-audit-time">${window.ui.formatDate(r.created_at)}</div>
        </div>`).join('')}</div>`;
    },

    /* ── Build pending payouts ── */
    _buildPendingPayouts(rows) {
        if (!rows.length) return `<div class="empty-state" style="padding:16px"><p>No pending requests</p></div>`;
        return `<div class="table-wrapper"><table class="fly-table fly-table-compact">
            <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Time</th><th></th></tr></thead>
            <tbody>${rows.map(r => `<tr>
                <td><strong>${window.ui.escapeHtml(r.username)}</strong></td>
                <td><span class="badge badge-success">$${parseFloat(r.amount).toFixed(2)}</span></td>
                <td>${window.ui.escapeHtml(r.method || '—')}</td>
                <td style="font-size:11px;color:var(--text-muted)">${window.ui.formatDate(r.created_at)}</td>
                <td><button class="action-btn" ${this._nav('payout-requests')}>${ICONS.eye} View</button></td>
            </tr>`).join('')}
            </tbody></table></div>`;
    },



    /* ══════════════════════════════════════════
       MAIN RENDER
    ══════════════════════════════════════════ */
    async render(container) {
        this._destroyCharts();
        container.innerHTML = this._skeleton();

        try {
            const d = await window.api.call('/api/dashboard/summary');
            const role = d.role;

            /* ── Admin/Manager alert banner ── */
            const alertHtml = (role === 'admin' || role === 'manager') ? this._alertBanner(d) : '';

            /* ── KPI grid ── */
            const kpiHtml = this._buildKpis(d);

            /* ── Quick actions ── */
            const qaHtml = this._quickActions(role);

            /* ── Charts row ── */
            const chartsHtml = `
            <div class="db-mid-grid">
                <div class="card db-chart-card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.activity} Hourly SMS — Today</div>
                    </div>
                    <div class="db-chart-body"><canvas id="db-chart-hourly"></canvas></div>
                </div>
                <div class="card db-chart-card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.chart} 14-Day SMS &amp; Profit</div>
                    </div>
                    <div class="db-chart-body"><canvas id="db-chart-daily"></canvas></div>
                </div>
            </div>`;

            /* ── Top services + top numbers ── */
            const mid2Html = `
            <div class="db-mid-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.bell} Top Services (This Week)</div>
                        <button class="fly-btn fly-btn-sm fly-btn-secondary" ${this._nav('sms-analytics')}>${ICONS.chart} Full Analytics</button>
                    </div>
                    <div style="padding:12px 4px">${this._buildTopServices(d.topServices)}</div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.phone} Top Numbers (This Week)</div>
                        <button class="fly-btn fly-btn-sm fly-btn-secondary" ${this._nav('my-numbers')}>${ICONS.phone} All Numbers</button>
                    </div>
                    ${this._buildTopNumbers(d.topNumbers)}
                </div>
            </div>`;

            /* ── Bottom row: recent SMS + audit/payouts ── */
            const rightPanel = (role === 'admin' || role === 'manager')
                ? `<div class="card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.wallet} Pending Payouts</div>
                        <button class="fly-btn fly-btn-sm fly-btn-secondary" ${this._nav('payout-requests')}>${ICONS.eye} View All</button>
                    </div>
                    ${this._buildPendingPayouts(d.pendingPayoutsList)}
                    <div class="card-header" style="margin-top:4px;border-top:1px solid var(--border)">
                        <div class="card-title">${ICONS.activity} Recent Activity</div>
                        <button class="fly-btn fly-btn-sm fly-btn-secondary" ${this._nav('audit-logs')}>${ICONS.report} All Logs</button>
                    </div>
                    ${this._buildAuditLog(d.recentAudit)}
                  </div>`
                : `<div class="card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.activity} Recent Activity</div>
                    </div>
                    ${this._buildAuditLog(d.recentAudit)}
                  </div>`;

            const botHtml = `
            <div class="db-bot-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${ICONS.sms} Recent SMS</div>
                        <button class="fly-btn fly-btn-sm fly-btn-secondary" ${this._nav('my-sms')}>${ICONS.sms} All SMS</button>
                    </div>
                    ${this._buildRecentSms(d.recentSms)}
                </div>
                ${rightPanel}
            </div>`;

            container.innerHTML = alertHtml + kpiHtml + qaHtml + chartsHtml + mid2Html + botHtml;

            /* animate counters */
            container.querySelectorAll('[data-count]').forEach(el => {
                this._animateCount(el, parseFloat(el.dataset.count));
            });

            /* render charts */
            await this._renderCharts(d.charts);

        } catch (err) {
            container.innerHTML = `<div class="empty-state">
                <h3>Error loading dashboard</h3>
                <p>${window.ui.escapeHtml(err.message)}</p>
                <button class="fly-btn" onclick="window.dashboard.render(document.getElementById('page-content'))">
                    ${ICONS.activity} Retry
                </button>
            </div>`;
        }
    },



    /* ══════════════════════════════════════════
       CHARTS
    ══════════════════════════════════════════ */
    async _renderCharts(charts) {
        await window.loadChart();

        /* Hourly SMS today */
        const hCtx = document.getElementById('db-chart-hourly')?.getContext('2d');
        if (hCtx && charts.hourly.length) {
            const ch = new Chart(hCtx, {
                type: 'bar',
                data: {
                    labels: charts.hourly.map(h => h.hour),
                    datasets: [{
                        label: 'SMS', data: charts.hourly.map(h => h.count),
                        backgroundColor: 'rgba(99,102,241,0.7)',
                        borderRadius: 5, borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 12 } },
                        y: { beginAtZero: true, grid: { color: 'rgba(226,232,240,.5)' }, ticks: { font: { size: 10 } } }
                    },
                    animation: { duration: 700, easing: 'easeOutQuart' }
                }
            });
            this._charts.push(ch);
        }

        /* 14-day dual-axis SMS + Profit */
        const dCtx = document.getElementById('db-chart-daily')?.getContext('2d');
        if (dCtx && charts.daily.length) {
            const cd = new Chart(dCtx, {
                type: 'line',
                data: {
                    labels: charts.daily.map(d => d.date),
                    datasets: [
                        {
                            label: 'SMS', data: charts.daily.map(d => d.sms),
                            borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.07)',
                            fill: true, tension: 0.4, pointRadius: 3,
                            pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 2,
                            yAxisID: 'ySms',
                        },
                        {
                            label: 'Profit $', data: charts.daily.map(d => d.profit),
                            borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)',
                            fill: true, tension: 0.4, pointRadius: 3,
                            pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointBorderWidth: 2,
                            yAxisID: 'yProfit',
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 10 } },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 7 } },
                        ySms:    { position: 'left',  beginAtZero: true, grid: { color: 'rgba(226,232,240,.5)' }, ticks: { font: { size: 10 } } },
                        yProfit: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { font: { size: 10 }, callback: v => '$'+v } }
                    },
                    animation: { duration: 900, easing: 'easeOutQuart' }
                }
            });
            this._charts.push(cd);
        }
    }
};

window.dashboard = dashboard;
