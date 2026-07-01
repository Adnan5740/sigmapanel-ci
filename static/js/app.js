/**
 * SIGMAPANEL Main Entry Point - Enterprise Structure
 */

window.ROLE_LABELS = { admin: 'Admin', manager: 'Manager', reseller: 'Reseller', sub_reseller: 'Client', test_user: 'Test Account' };
window.ROLE_COLORS = { admin: 'badge-danger', manager: 'badge-warning', reseller: 'badge-primary', sub_reseller: 'badge-secondary', test_user: 'badge-success' };

const TEST_NAV = [
    {
        group: 'SMS Module',
        roles: ['test_user'],
        items: [
            { key: 'test-numbers', label: 'SMS Test Numbers', icon: ICONS.phone, roles: ['test_user'] },
            { key: 'test-reports', label: 'SMS Test Reports', icon: ICONS.report, roles: ['test_user'] },
            { key: 'test-live-feed', label: 'Live OTP Feed', icon: ICONS.bell, roles: ['test_user'] },
            { key: 'test-traffic-stats', label: 'Traffic Stats', icon: ICONS.chart, roles: ['test_user'] },
        ]
    }
];

const NAV_STRUCTURE = [
    {
        group: 'NUMBERS GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'my-numbers', label: 'My Numbers', icon: ICONS.phone, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'self-allocation', label: 'Self Allocation', icon: ICONS.layers, roles: ['reseller', 'sub_reseller'] },
            { key: 'client-allocation', label: 'Client Allocation', icon: ICONS.users, roles: ['reseller'] },
            { key: 'bulk-allocation', label: 'Bulk Allocation', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'allocation-history', label: 'Allocation History', icon: ICONS.report, roles: ['admin', 'manager'] },
            { key: 'sms-ranges', label: 'SMS Ranges', icon: ICONS.layers, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'sms-rate-card', label: 'SMS Rate Card', icon: ICONS.profit, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'search-access', label: 'Search Access', icon: ICONS.search, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-access', label: 'Live Access', icon: ICONS.eye, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'upload-numbers', label: 'Upload Numbers', icon: ICONS.upload, roles: ['admin', 'manager'] },
            { key: 'blacklist-management', label: 'Blacklist Management', icon: ICONS.ban, roles: ['admin', 'manager'] },
            { key: 'bulk-tools', label: 'Revoke Numbers', icon: ICONS.transfer, roles: ['admin', 'manager', 'reseller'] },
            { key: 'test-numbers-admin', label: 'Test Numbers', icon: ICONS.terminal, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'SMS GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'my-sms', label: 'My SMS', icon: ICONS.sms, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'profit-stats', label: 'Profit Stats', icon: ICONS.profit, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-otp-feed', label: 'Live OTP Feed', icon: ICONS.bell, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'sms-analytics', label: 'SMS Analytics', icon: ICONS.chart, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'search-sms', label: 'Search SMS', icon: ICONS.search, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'delivery-logs', label: 'Delivery Logs', icon: ICONS.report, roles: ['admin', 'manager'] },
            { key: 'failed-sms', label: 'Failed SMS', icon: ICONS.x, roles: ['admin', 'manager'] },
            { key: 'live-traffic', label: 'Live Traffic', icon: ICONS.activity, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'SMPP SERVER',
        roles: ['admin'],
        items: [
            { key: 'smpp-server-dash', label: 'Dashboard', icon: ICONS.dashboard, roles: ['admin'] },
            { key: 'smpp-server-accounts', label: 'SMPP Accounts', icon: ICONS.users, roles: ['admin'] },
            { key: 'smpp-server-sessions', label: 'SMPP Sessions', icon: ICONS.eye, roles: ['admin'] },
            { key: 'smpp-server-connected', label: 'Connected Clients', icon: ICONS.transfer, roles: ['admin'] },
            { key: 'smpp-server-dlr', label: 'DLR Monitor', icon: ICONS.report, roles: ['admin'] },
            { key: 'smpp-server-throughput', label: 'Throughput Monitor', icon: ICONS.chart, roles: ['admin'] },
            { key: 'smpp-server-security', label: 'Security Center', icon: ICONS.shield, roles: ['admin'] },
            { key: 'smpp-server-logs', label: 'Connection Logs', icon: ICONS.report, roles: ['admin'] },
        ]
    },
    {
        group: 'REQUESTS GROUP',
        roles: ['admin', 'manager'],
        items: [
            { key: 'registration-requests', label: 'Registration Requests', icon: ICONS.users, roles: ['admin', 'manager'] },
            { key: 'payout-requests', label: 'Payout Requests', icon: ICONS.wallet, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'MANAGEMENT GROUP',
        roles: ['admin', 'manager', 'reseller'],
        items: [
            { key: 'users', label: 'Users', icon: ICONS.users, roles: ['admin', 'manager', 'reseller'] },
            { key: 'account-balances', label: 'Account Balances', icon: ICONS.wallet, roles: ['admin', 'manager', 'reseller'] },
            { key: 'audit-logs', label: 'Audit Logs', icon: ICONS.shield, roles: ['admin'] },
            { key: 'permissions', label: 'Permissions', icon: ICONS.key, roles: ['admin'] },
        ]
    },
    {
        group: 'HTTP PROVIDERS',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'http-overview',       label: 'Overview & Setup',    icon: ICONS.report,   roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'http-standard',       label: 'Standard Webhook',    icon: ICONS.webhook,  roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'http-postback',       label: 'Custom Postback',     icon: ICONS.transfer, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'http-field-mapping',  label: 'Field Mapping Guide', icon: ICONS.layers,   roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'http-test',           label: 'Test Endpoint',       icon: ICONS.terminal, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'API GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'api-tokens',      label: 'API Tokens',     icon: ICONS.key,      roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'api-playground',  label: 'API Playground', icon: ICONS.terminal, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-test',       label: 'Live Test',      icon: ICONS.send,     roles: ['admin', 'manager'] },
            { key: 'webhook-config',  label: 'Webhook Config', icon: ICONS.webhook,  roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'documentation',   label: 'Documentation',  icon: ICONS.report,   roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
        ]
    },
    {
        group: 'COMMUNICATION',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'news', label: 'News & Announcements', icon: ICONS.bell, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'support', label: 'Support Tickets', icon: ICONS.help, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
        ]
    },
    {
        group: 'ACCOUNT',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'my-profile', label: 'My Profile', icon: ICONS.user, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'my-payouts', label: 'My Payouts', icon: ICONS.wallet, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
        ]
    },
    {
        group: 'SECURITY CENTER',
        roles: ['admin'],
        items: [
            { key: 'firewall-dashboard', label: 'Firewall Dashboard', icon: ICONS.shield, roles: ['admin'] },
            { key: 'firewall-blocked-ips', label: 'Blocked IPs', icon: ICONS.ban, roles: ['admin'] },
            { key: 'firewall-events', label: 'Firewall Events', icon: ICONS.report, roles: ['admin'] },
            { key: 'firewall-rate-limits', label: 'Rate Limits', icon: ICONS.lock, roles: ['admin'] },
        ]
    },
    {
        group: 'SETTINGS GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'general-settings', label: 'General Settings', icon: ICONS.settings, roles: ['admin', 'manager'] },
            { key: 'security-settings', label: 'Security', icon: ICONS.lock, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'smpp-settings', label: 'SMPP Settings', icon: ICONS.smpp, roles: ['admin'] },
            { key: 'backup-restore', label: 'Backup & Restore', icon: ICONS.backup, roles: ['admin'] },
        ]
    }
];

function init() {
  try {
    window.router.addRoute('dashboard', (c) => window.dashboard.render(c));

    // Numbers
    window.router.addRoute('my-numbers', (c) => window.numbers.renderMyNumbers(c));
    window.router.addRoute('self-allocation', (c) => window.numbers.renderSelfAllocation(c));
    window.router.addRoute('client-allocation', (c) => window.numbers.renderClientAllocation(c));
    window.router.addRoute('bulk-allocation', (c) => window.numbers.renderBulkAllocation(c));
    window.router.addRoute('allocation-history', (c) => window.numbers.renderAllocationHistory(c));
    window.router.addRoute('sms-ranges', (c) => window.ranges.renderRanges(c));
    window.router.addRoute('sms-rate-card', (c) => window.numbers.renderRateCard(c));
    window.router.addRoute('search-access', (c) => window.searchAccess.render(c));
    window.router.addRoute('live-access', (c) => window.numbers.renderLiveAccess(c));
    window.router.addRoute('upload-numbers', (c) => window.numbers.renderUpload(c));
    window.router.addRoute('blacklist-management', (c) => window.numbers.renderBlacklist(c));
    window.router.addRoute('bulk-tools', (c) => window.numbers.renderBulkTools(c));

    // SMS
    window.router.addRoute('my-sms', (c) => { window.sms.stopLiveFeed(); window.sms.renderMySms(c); });
    window.router.addRoute('profit-stats', (c) => { window.sms.stopLiveFeed(); window.sms.renderProfitStats(c); });
    window.router.addRoute('live-otp-feed', (c) => { window.sms.renderLiveOtpFeed(c); });
    window.router.addRoute('sms-analytics', (c) => { window.sms.stopLiveFeed(); window.sms.renderAnalytics(c); });
    window.router.addRoute('search-sms', (c) => { window.sms.stopLiveFeed(); window.sms.renderSearchSms(c); });
    window.router.addRoute('delivery-logs', (c) => { window.sms.stopLiveFeed(); window.sms.renderDeliveryLogs(c); });
    window.router.addRoute('failed-sms', (c) => { window.sms.stopLiveFeed(); window.sms.renderFailedSms(c); });
    window.router.addRoute('live-traffic', (c) => { window.sms.renderLiveTraffic(c); });

    // SMPP Server
    window.router.addRoute('smpp-server-dash', (c) => window.smpp.renderDashboard(c));
    window.router.addRoute('smpp-server-accounts', (c) => window.smpp.renderServerAccounts(c));
    window.router.addRoute('smpp-server-sessions', (c) => window.smpp.renderServerSessions(c));
    window.router.addRoute('smpp-server-connected', (c) => window.smpp.renderServerSessions(c));
    window.router.addRoute('smpp-server-logs', (c) => window.smpp.renderServerLogs(c));
    window.router.addRoute('smpp-server-dlr', (c) => window.smpp.renderServerDlr(c));
    window.router.addRoute('smpp-server-throughput', (c) => window.smpp.renderThroughput(c));
    window.router.addRoute('smpp-server-security', (c) => window.smpp.renderServerSecurity(c));

    // Management
    window.router.addRoute('users', (c) => window.users.renderUsers(c));
    window.router.addRoute('account-balances', (c) => window.users.renderBalances(c));
    window.router.addRoute('audit-logs', (c) => window.users.renderAuditLogs(c));
    window.router.addRoute('permissions', (c) => window.users.renderRBAC(c));

    // Requests
    window.router.addRoute('registration-requests', (c) => window.users.renderRegRequests(c));
    window.router.addRoute('payout-requests', (c) => window.payments.renderPayoutRequests(c));

    // HTTP Providers
    window.router.addRoute('http-overview',      (c) => window.settings.renderHttpOverview(c));
    window.router.addRoute('http-standard',      (c) => window.settings.renderHttpStandard(c));
    window.router.addRoute('http-postback',      (c) => window.settings.renderHttpPostback(c));
    window.router.addRoute('http-field-mapping', (c) => window.settings.renderHttpFieldMapping(c));
    window.router.addRoute('http-test',          (c) => window.settings.renderHttpTest(c));

    // API
    window.router.addRoute('api-playground', (c) => window.apiManagement.renderPlayground(c));
    window.router.addRoute('api-tokens', (c) => window.apiManagement.renderTokens(c));
    window.router.addRoute('documentation', (c) => window.settings.renderDocumentation(c));
    window.router.addRoute('live-test', (c) => window.apiManagement.renderLiveTest(c));
    window.router.addRoute('webhook-config', (c) => window.settings.renderWebhookConfig(c));

    // Security Center
    window.router.addRoute('firewall-dashboard', (c) => window.security.renderDashboard(c));
    window.router.addRoute('firewall-blocked-ips', (c) => window.security.renderBlockedIPs(c));
    window.router.addRoute('firewall-events', (c) => window.security.renderFirewallEvents(c));
    window.router.addRoute('firewall-rate-limits', (c) => window.security.renderRateLimits(c));

    // Settings
    window.router.addRoute('general-settings', (c) => window.settings.renderGeneral(c));
    window.router.addRoute('security-settings', (c) => window.settings.renderSecurity(c));
    window.router.addRoute('smpp-settings', (c) => window.settings.renderSmppSettings(c));
    window.router.addRoute('backup-restore', (c) => window.settings.renderBackupRestore(c));

    // Account
    window.router.addRoute('my-profile', (c) => window.profile.renderProfile(c));
    window.router.addRoute('my-payouts', (c) => window.payouts.renderMyPayouts(c));

    // Communication
    window.router.addRoute('news', (c) => window.notifications.renderNews(c));
    window.router.addRoute('support', (c) => window.notifications.renderSupport(c));

    // Test Panel
    window.router.addRoute('test-numbers', (c) => window.testPanel.renderTestNumbers(c));
    window.router.addRoute('test-numbers-admin', (c) => window.numbers.renderTestNumbers(c));
    window.router.addRoute('test-reports', (c) => window.testPanel.renderTestReports(c));
    window.router.addRoute('test-live-feed', (c) => window.testPanel.renderLiveFeed(c));
    window.router.addRoute('test-traffic-stats', (c) => window.testPanel.renderTrafficStats(c));

    // Fallback
    [...NAV_STRUCTURE, ...TEST_NAV].forEach(group => {
        group.items.forEach(item => {
            if (!window.router.routes[item.key]) {
                window.router.addRoute(item.key, (c) => {
                    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">${item.label}</div></div><div class="card-body"><div class="empty-state"><h3>No data available</h3><p>The ${item.label} module is awaiting infrastructure data.</p></div></div></div>`;
                });
            }
        });
    });

    if (window.auth.isLoggedIn()) { window.router.init(); }
    else { const path = window.location.pathname; if (path === '/signup') window.auth.renderSignup(); else window.security.renderVerification(); }
  } catch (err) { console.error('SIGMAPANEL init error:', err); }
}

function renderDashboardShell() {
  try {
    const user = window.auth.getUser();
    if (!user) { window.auth.renderLogin(); return; }

    if (!document.querySelector('.dashboard-layout')) {
        const role = user.role || 'sub_reseller';
        const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');
        const navToUse = role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;

        const sidebarNav = navToUse
            .filter(group => !group.roles || group.roles.includes(role))
            .map(group => {
                const items = group.items.filter(item => !item.roles || item.roles.includes(role));
                if (items.length === 0) return '';
                const isCollapsed = collapsedGroups[group.group];
                return `
                <div class="sidebar-group ${isCollapsed ? 'collapsed' : ''}" data-group="${group.group}">
                    <div class="sidebar-group-header"><span>${group.group}</span><span class="group-toggle">${isCollapsed ? ICONS.plus : ICONS.chevronDown}</span></div>
                    <div class="sidebar-group-items">
                        ${items.map(item => `<button class="sidebar-nav-item ${window.router.currentPage === item.key ? 'active' : ''}" data-page="${item.key}"><span class="nav-icon">${item.icon}</span> ${item.label}${item.key === 'live-otp-feed' ? '<span class="sms-live-badge" id="sms-live-badge" style="display:none;margin-left:auto;min-width:18px;height:18px;padding:0 5px;background:#ef4444;color:#fff;border-radius:9px;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;animation:badgePop .3s ease"></span>' : ''}</button>`).join('')}
                    </div>
                </div>`;
            }).join('');

        document.getElementById('app').innerHTML = `
        <div class="dashboard-layout">
            <button class="mobile-menu-btn" id="mobile-menu-btn">${ICONS.menu}</button>
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-logo">
                <div class="ssp-sidebar-logo">
                    <div class="ssp-sidebar-icon">
                        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="6" width="22" height="15" rx="4" stroke="url(#si1)" stroke-width="1.6"/>
                            <path d="M6 22 L4 28 L12 24" stroke="url(#si1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="6" y1="12" x2="18" y2="12" stroke="white" stroke-width="1.3" stroke-opacity="0.5" stroke-linecap="round"/>
                            <line x1="6" y1="16" x2="15" y2="16" stroke="url(#si1)" stroke-width="1.3" stroke-linecap="round"/>
                            <circle cx="20" cy="16" r="1.8" fill="#00FFA3"/>
                            <path d="M25 5 Q30 5 30 11" stroke="#00C6FF" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-opacity="0.6"/>
                            <path d="M27 3 Q32 3 32 12" stroke="#00C6FF" stroke-width="1" fill="none" stroke-linecap="round" stroke-opacity="0.3"/>
                            <circle cx="25" cy="5" r="1.4" fill="#00FFA3"/>
                            <defs>
                                <linearGradient id="si1" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stop-color="#00C6FF"/>
                                    <stop offset="100%" stop-color="#00FFA3"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="ssp-sidebar-text">
                        <div class="ssp-sidebar-wordmark">
                            <span class="ssp-s">SS</span><span class="ssp-p">P</span>
                        </div>
                        <div class="ssp-sidebar-sub">Sigma SMS</div>
                        <div class="ssp-sidebar-tag">A2P SMS Power</div>
                    </div>
                </div>
            </div>
                <nav class="sidebar-nav">${sidebarNav}</nav>
                <div class="sidebar-user">
                    <div class="sidebar-user-info">${window.ui.renderUserAvatar(user, 'sidebar-user-avatar')}<div><div class="sidebar-user-name">${user.full_name || user.fullName || user.username}</div><div class="sidebar-user-role">${window.ROLE_LABELS[user.role] || user.role}</div></div></div>
                    <button class="sidebar-logout" id="logout-btn">${ICONS.logout} Logout</button>
                </div>
            </aside>
            <div class="main-content">
                <header class="top-bar">
                    <h2 class="top-bar-title" id="page-title">Dashboard</h2>
                    <div class="top-bar-actions">
                        <button class="top-bar-logout" id="top-logout-btn" title="Logout">${ICONS.logout}<span>Logout</span></button>
                        <div class="top-bar-user">${window.ui.renderUserAvatar(user, 'top-bar-avatar')}<div class="top-bar-user-name"><div>${user.username}</div><div style="font-size:10px; color:#6B7280">${window.ROLE_LABELS[user.role] || user.role}</div></div></div>
                    </div>
                </header>
                <main class="page-content" id="page-content"></main>
            </div>
        </div><div id="toast-container" class="toast-container"></div><div id="modal-root"></div>`;

        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.sidebar-nav-item');
            if (navBtn) {
                window.router.navigateTo(navBtn.dataset.page);
                document.getElementById('sidebar')?.classList.remove('open');
                document.getElementById('sidebar-overlay')?.classList.remove('open');
                return;
            }
            const groupHeader = e.target.closest('.sidebar-group-header');
            if (groupHeader) {
                const group = groupHeader.parentElement;
                const groupName = group.dataset.group;
                group.classList.toggle('collapsed');
                const isCollapsed = group.classList.contains('collapsed');
                const state = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');
                state[groupName] = isCollapsed;
                localStorage.setItem('collapsedGroups', JSON.stringify(state));
                groupHeader.querySelector('.group-toggle').innerHTML = isCollapsed ? ICONS.plus : ICONS.chevronDown;
                return;
            }
            if (e.target.closest('#logout-btn') || e.target.closest('#top-logout-btn')) window.auth.logout();
            if (e.target.closest('#mobile-menu-btn')) { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('open'); }
            if (e.target.closest('#sidebar-overlay')) { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }
        });
    }

    document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === window.router.currentPage));
    window.api.call('/api/users/me').then((profile) => {
        const merged = { ...user, ...profile, avatar_ts: Date.now() };
        localStorage.setItem('user', JSON.stringify(merged));
        window.ui.refreshShellUser(merged);
    }).catch(() => {});

    const content = document.getElementById('page-content');
    window.router.resolvePage(content);

    // Live SMS badge — polls every 15s, shows unread count on Live OTP Feed nav item
    let _lastSmsCount = null;
    async function _pollSmsBadge() {
        try {
            const res = await window.api.call('/api/dashboard/stats');
            const count = res.sms_today ?? res.smsToday ?? 0;
            const badge = document.getElementById('sms-live-badge');
            if (!badge) return;
            if (_lastSmsCount === null) { _lastSmsCount = count; }
            const newOnes = Math.max(0, count - _lastSmsCount);
            if (newOnes > 0 && window.router.currentPage !== 'live-otp-feed') {
                badge.textContent = newOnes > 99 ? '99+' : newOnes;
                badge.style.display = 'inline-flex';
            } else if (window.router.currentPage === 'live-otp-feed') {
                _lastSmsCount = count;
                badge.style.display = 'none';
            }
        } catch (_) {}
    }
    _pollSmsBadge();
    setInterval(_pollSmsBadge, 15000);

    const currentNav = user.role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;
    const currentItem = currentNav.flatMap(g => g.items).find(i => i.key === window.router.currentPage);
    if (currentItem) document.getElementById('page-title').textContent = currentItem.label;
  } catch (err) { console.error('Shell error:', err); }
}

window.renderDashboardShell = renderDashboardShell;
document.addEventListener('DOMContentLoaded', init);
