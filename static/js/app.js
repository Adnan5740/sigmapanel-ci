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
                <div class="sidebar-logo" style="padding:12px 14px">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 160" class="sidebar-ssp-logo" role="img" aria-label="SSP">
                  <defs>
                    <filter id="sb-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
                      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0.78 1 0 0  0 0.64 1 0 0  0 0 0 1.1 0" result="c"/>
                      <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="sb-gw" x="-15%" y="-15%" width="130%" height="130%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b"/>
                      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <linearGradient id="sb-ms1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#fff"/><stop offset="40%" stop-color="#e2e4f8"/>
                      <stop offset="70%" stop-color="#fff"/><stop offset="100%" stop-color="#ccd0ee"/>
                    </linearGradient>
                    <linearGradient id="sb-ms2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#eef0ff"/><stop offset="45%" stop-color="#fff"/>
                      <stop offset="100%" stop-color="#c8ccea"/>
                    </linearGradient>
                    <linearGradient id="sb-gp" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#00C6FF"/><stop offset="55%" stop-color="#0072FF"/>
                      <stop offset="100%" stop-color="#00FFA3"/>
                    </linearGradient>
                    <linearGradient id="sb-spd" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#00FFA3" stop-opacity="0.9"/>
                      <stop offset="100%" stop-color="#00C6FF" stop-opacity="0"/>
                    </linearGradient>
                    <linearGradient id="sb-ibg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#16163a"/><stop offset="100%" stop-color="#090922"/>
                    </linearGradient>
                    <linearGradient id="sb-ist" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#00C6FF"/><stop offset="100%" stop-color="#00FFA3"/>
                    </linearGradient>
                    <linearGradient id="sb-tg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#00C6FF" stop-opacity="0.6"/>
                      <stop offset="50%" stop-color="#fff" stop-opacity="0.4"/>
                      <stop offset="100%" stop-color="#00FFA3" stop-opacity="0.6"/>
                    </linearGradient>
                    <linearGradient id="sb-sh" x1="0%" y1="0%" x2="35%" y2="100%">
                      <stop offset="0%" stop-color="#fff" stop-opacity="0.5"/>
                      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <g transform="translate(10,18)">
                    <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#sb-ibg)"/>
                    <rect x="4" y="4" width="56" height="56" rx="14" fill="none" stroke="url(#sb-ist)" stroke-width="1.2" stroke-opacity="0.45"/>
                    <rect x="11" y="13" width="38" height="24" rx="6" fill="none" stroke="url(#sb-ist)" stroke-width="1.7"/>
                    <path d="M19 37 L15 47 L27 40 Z" fill="url(#sb-ist)" opacity="0.65"/>
                    <line x1="16" y1="21" x2="40" y2="21" stroke="white" stroke-width="1.4" stroke-opacity="0.4" stroke-linecap="round"/>
                    <line x1="16" y1="27" x2="36" y2="27" stroke="url(#sb-ist)" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
                    <circle cx="41" cy="27" r="2.2" fill="#00FFA3" opacity="0.9"/>
                    <path d="M42 9 Q50 9 50 17" stroke="#00C6FF" stroke-width="1.2" fill="none" stroke-opacity="0.5" stroke-linecap="round"/>
                    <circle cx="42" cy="9" r="1.5" fill="#00FFA3" opacity="0.8"/>
                  </g>
                  <g transform="translate(82,8)">
                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="white" fill-opacity="0.1" filter="url(#sb-gw)" letter-spacing="-3">S</text>
                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sb-ms1)" letter-spacing="-3">S</text>
                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sb-sh)" letter-spacing="-3">S</text>
                    <text x="60" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sb-ms2)" letter-spacing="-3">S</text>
                    <text x="60" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sb-sh)" letter-spacing="-3">S</text>
                    <circle cx="119" cy="46" r="1.6" fill="#00FFA3" opacity="0.9"/>
                    <rect x="222" y="60" width="40" height="2.5" rx="1.2" fill="url(#sb-spd)"/>
                    <rect x="226" y="68" width="32" height="2" rx="1" fill="url(#sb-spd)" opacity="0.65"/>
                    <rect x="230" y="76" width="24" height="1.4" rx="0.7" fill="url(#sb-spd)" opacity="0.4"/>
                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="#00C6FF" fill-opacity="0.14" letter-spacing="-3" transform="translate(3,2)">P</text>
                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sb-gp)" filter="url(#sb-glow)" letter-spacing="-3">P</text>
                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sb-gp)" letter-spacing="-3">P</text>
                  </g>
                  <text x="84" y="115" font-family="Arial,Helvetica Neue,sans-serif" font-size="15.5" font-weight="700" fill="white" fill-opacity="0.82" letter-spacing="0.13em">Sigma SMS Panel</text>
                  <line x1="84" y1="126" x2="385" y2="126" stroke="url(#sb-tg)" stroke-width="0.5" opacity="0.4"/>
                  <text x="84" y="143" font-family="Arial,Helvetica Neue,sans-serif" font-size="9.5" font-weight="700" fill="url(#sb-tg)" letter-spacing="0.3em">SMART  |  SECURE  |  POWERFUL</text>
                </svg>
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
