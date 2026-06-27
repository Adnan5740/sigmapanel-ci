const ui = {
    parseDate(dateStr) {
        if (!dateStr) return null;
        const raw = String(dateStr).trim();
        if (!raw) return null;
        const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
        const normalized = hasZone ? raw : raw + "Z";
        const d = new Date(normalized);
        return Number.isNaN(d.getTime()) ? null : d;
    },

    formatIST(dateStr) {
        const d = this.parseDate(dateStr);
        if (!d) return dateStr || "-";
        return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) + " IST";
    },
    renderUserAvatar(user, className = 'sidebar-user-avatar') {
        const name = user?.username || user?.full_name || user?.fullName || 'U';
        const initial = String(name).charAt(0).toUpperCase();
        const avatarUrl = user?.avatar_url || user?.avatarUrl;
        if (avatarUrl) {
            const src = avatarUrl + (avatarUrl.includes('?') ? '&' : '?') + 't=' + (user?.avatar_ts || Date.now());
            return `<img class="${className} user-avatar-img" src="${this.escapeHtml(src)}" alt="${this.escapeHtml(name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${className}',textContent:'${initial}'}))">`;
        }
        return `<div class="${className}">${initial}</div>`;
    },

    refreshShellUser(user) {
        if (!user) return;
        const sidebarAvatar = document.querySelector('.sidebar-user-avatar, .sidebar-user .user-avatar-img');
        const topAvatar = document.querySelector('.top-bar-avatar, .top-bar-user .user-avatar-img');
        const sidebarHtml = this.renderUserAvatar(user, 'sidebar-user-avatar');
        const topHtml = this.renderUserAvatar(user, 'top-bar-avatar');
        if (sidebarAvatar) sidebarAvatar.outerHTML = sidebarHtml;
        if (topAvatar) topAvatar.outerHTML = topHtml;
        const sidebarName = document.querySelector('.sidebar-user-name');
        const topName = document.querySelector('.top-bar-user-name > div:first-child');
        if (sidebarName) sidebarName.textContent = user.full_name || user.fullName || user.username || '';
        if (topName) topName.textContent = user.username || '';
    },

    showToast(message, type = 'info') {
        window.__lastToastAt = Date.now();
        window.__lastToastType = type;
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        container.className = 'toast-container';
        if (container.parentElement !== document.body) {
            document.body.appendChild(container);
        }
        const icons = { success: ICONS.check, error: ICONS.alertCircle, info: ICONS.info };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(110%)';
            setTimeout(() => toast.remove(), 320);
        }, 3200);
    },

    setupTableSearch(inputId, tableBodyId) {
        const input = document.getElementById(inputId);
        const tbody = document.getElementById(tableBodyId);
        if (!input || !tbody) return;
        input.addEventListener('input', this.debounce((e) => {
            const query = e.target.value.toLowerCase();
            const rows = tbody.querySelectorAll('tr:not(.empty-row)');
            let hasVisible = false;
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(query)) {
                    row.style.display = '';
                    hasVisible = true;
                } else {
                    row.style.display = 'none';
                }
            });
            let emptyRow = tbody.querySelector('.empty-row.search-empty');
            if (!hasVisible && query) {
                if (!emptyRow) {
                    emptyRow = document.createElement('tr');
                    emptyRow.className = 'empty-row search-empty';
                    emptyRow.innerHTML = `<td colspan="10">No results for "${this.escapeHtml(e.target.value)}"</td>`;
                    tbody.appendChild(emptyRow);
                } else {
                    emptyRow.innerHTML = `<td colspan="10">No results for "${this.escapeHtml(e.target.value)}"</td>`;
                    emptyRow.style.display = '';
                }
            } else if (emptyRow) {
                emptyRow.style.display = 'none';
            }
        }, 300));
    },

    /**
     * Beautiful animated success popup with optional download button.
     * @param {string} title - Main heading
     * @param {string} message - Body text
     * @param {object|null} download - { url, filename } — optional download button
     */
    showSuccess(title, message, download = null) {
        let root = document.getElementById('modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
        const dlBtn = download
            ? `<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap">
                 <button class="fly-btn fly-btn-secondary success-dl-btn" onclick="window.ui._successDownload('${download.url.replace('format=txt','format=csv')}','numbers.csv')">
                   <span style="font-size:16px">📊</span> CSV
                 </button>
                 <button class="fly-btn fly-btn-secondary success-dl-btn" onclick="window.ui._successDownload('${download.url.replace('format=txt','format=xlsx')}','numbers.xlsx')">
                   <span style="font-size:16px">📗</span> Excel
                 </button>
                 <button class="fly-btn fly-btn-secondary success-dl-btn" onclick="window.ui._successDownload('${download.url}','numbers.txt')">
                   <span style="font-size:16px">📝</span> TXT
                 </button>
               </div>`
            : '';
        root.innerHTML = `
        <div class="modal-overlay success-overlay" id="success-overlay-bg">
          <div class="success-modal" style="position:relative;overflow:hidden;">
            <div id="confetti-container" style="position:absolute;inset:0;pointer-events:none;z-index:0"></div>
            <div style="position:relative;z-index:1">
                <div class="success-icon-wrap">
                  <svg class="success-circle" viewBox="0 0 52 52">
                    <circle class="success-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                    <circle class="success-circle-fill" cx="26" cy="26" r="25" fill="none"/>
                    <polyline class="success-tick" points="14,27 22,35 38,17"/>
                  </svg>
                </div>
                <h2 class="success-title">${title}</h2>
                <p class="success-msg">${message}</p>
                ${dlBtn}
                <div class="success-actions">
                  <button class="fly-btn" style="width:100%" onclick="window.ui.closeModal()">Close</button>
                </div>
            </div>
          </div>
        </div>`;
        document.getElementById('success-overlay-bg').onclick = (e) => { if (e.target.id === 'success-overlay-bg') window.ui.closeModal(); };

        // Add confetti
        const cContainer = document.getElementById('confetti-container');
        if (cContainer) {
            const colors = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899'];
            for (let i = 0; i < 40; i++) {
                const conf = document.createElement('div');
                conf.style.position = 'absolute';
                conf.style.width = Math.random() * 8 + 4 + 'px';
                conf.style.height = Math.random() * 8 + 4 + 'px';
                conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                conf.style.top = '-10px';
                conf.style.left = Math.random() * 100 + '%';
                conf.style.opacity = Math.random() + 0.5;
                conf.style.transform = `rotate(${Math.random() * 360}deg)`;
                conf.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                cContainer.appendChild(conf);

                setTimeout(() => {
                    conf.style.top = (Math.random() * 100 + 50) + '%';
                    conf.style.transform = `rotate(${Math.random() * 720}deg) translate(${Math.random() * 40 - 20}px, 0)`;
                    conf.style.opacity = 0;
                }, 50);
            }
        }
    },

    async _successDownload(url, filename) {
        try {
            window.ui.showToast('Preparing download…', 'info');
            await window.api.download(url);
        } catch(e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    },

    jsArg(value) {
        return this.escapeHtml(JSON.stringify(value === null || value === undefined ? '' : String(value)));
    },

    formatDate(dateStr) {
        const d = this.parseDate(dateStr);
        if (!d) return dateStr || "-";
        const diff = Date.now() - d.getTime();
        if (diff >= 0 && diff < 60000) return "Just now";
        if (diff >= 0 && diff < 3600000) return Math.floor(diff / 60000) + "m ago";
        if (diff >= 0 && diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
        return this.formatIST(dateStr);
    },

    formatDateTitle(dateStr) {
        return this.formatIST(dateStr);
    },

    formatPayout(amount) {
        const value = Number(amount || 0);
        const cls = value > 0 ? 'badge-success' : 'badge-secondary';
        return `<span class="badge ${cls}" title="Per-SMS payout">$${value.toFixed(4)}</span>`;
    },

    formatRangeTermination(item) {
        const esc = (v) => this.escapeHtml(String(v || ""));
        const range = item?.range_name || item?.rangeName;
        const sender = item?.sender || item?.cli || item?.from;
        const service = item?.service;
        if (range) return esc(range);
        if (item?.is_alphanumeric_cli) {
            const readable = service || sender;
            return readable ? "Termination: " + esc(readable) : "Termination";
        }
        return sender ? "Direct: " + esc(sender) : "Direct";
    },

    debounce(fn, delay) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
    },

    renderPagination(pg, onPageChange) {
        if (!pg || pg.totalPages <= 1) return '';
        // Store callback globally so inline onclick can reach it
        window._paginationCb = onPageChange;
        let btns = '';
        for (let i = 1; i <= pg.totalPages && i <= 10; i++) {
            btns += `<button class="pagination-btn ${i === pg.page ? 'active' : ''}" onclick="if(window._paginationCb)window._paginationCb(${i})">${i}</button>`;
        }
        return `
            <div class="pagination">
                <div class="pagination-info">Showing ${(pg.page-1)*pg.limit+1}–${Math.min(pg.page*pg.limit,pg.total)} of ${pg.total}</div>
                <div class="pagination-buttons">
                    <button class="pagination-btn" ${pg.page<=1?'disabled':''} onclick="if(window._paginationCb)window._paginationCb(${pg.page-1})">‹ Prev</button>
                    ${btns}
                    <button class="pagination-btn" ${!pg.hasMore?'disabled':''} onclick="if(window._paginationCb)window._paginationCb(${pg.page+1})">Next ›</button>
                </div>
            </div>`;
    },

    showModal(title, bodyHtml, footerHtml = '', size = 'medium') {
        let root = document.getElementById('modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
        const maxWidth = size === 'small' ? '400px' : size === 'large' ? '800px' : '500px';
        root.innerHTML = `
        <div class="modal-overlay" id="modal-overlay-bg">
            <div class="modal" style="max-width:${maxWidth}">
                <div class="modal-header"><div class="modal-title">${title}</div><button class="modal-close" id="modal-close-btn">${ICONS.x}</button></div>
                <div class="modal-body">${bodyHtml}</div>
                ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
            </div>
        </div>`;
        document.getElementById('modal-close-btn').onclick = () => root.innerHTML = '';
        document.getElementById('modal-overlay-bg').onclick = (e) => { if (e.target.id === 'modal-overlay-bg') root.innerHTML = ''; };
    },

    closeModal() { const root = document.getElementById('modal-root'); if (root) root.innerHTML = ''; },

    maskService(service) {
        if (!service) return '-';
        if (service.length <= 2) return service + '**';
        return service.substring(0, 2) + '*'.repeat(service.length - 2);
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => this.showToast('Copied to clipboard', 'success'));
    }
};

const ICONS = {
    // Layout & Navigation
    dashboard: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    menu: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    chevronDown: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
    x: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    // Numbers & Phone
    phone: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>',
    layers: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    upload: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
    ban: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    // SMS
    sms: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    inbox: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    // Users & People
    users: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    user: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    // Settings & Tools
    settings: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    key: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    shield: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    lock: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    backup: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    // Charts & Stats
    chart: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    trendUp: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    profit: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    // Finance
    wallet: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
    // Servers & API
    server: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    api: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    terminal: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    webhook: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9a3 3 0 1 0 0 6c.79 0 1.5-.31 2.04-.81l7.12 4.15c-.05.21-.08.43-.08.66a3 3 0 1 0 3-3z"/></svg>',
    // Actions
    send: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    plus: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    copy: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    download: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    // Status & Feedback
    bell: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    check: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    alertCircle: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    // Misc
    eye: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    search: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    report: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    transfer: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    logout: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    smpp: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    help: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    camera: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    activity: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
};

window.ui = ui;
window.ICONS = ICONS;

window.addEventListener('load', () => {
    // Session timeout
    let lastActivity = Date.now();
    const TIMEOUT = 30 * 60 * 1000;
    const resetTimer = () => { lastActivity = Date.now(); };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    setInterval(() => {
        if (window.auth && window.auth.isLoggedIn() && (Date.now() - lastActivity > TIMEOUT)) {
            window.ui.showToast('Session expired due to inactivity', 'info');
            window.auth.logout();
        }
    }, 60000);

    // Ripple effect on .fly-btn clicks
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.fly-btn');
        if (!btn || btn.disabled) return;
        const r = document.createElement('span');
        r.className = 'ripple-el';
        const rect = btn.getBoundingClientRect();
        r.style.left = (e.clientX - rect.left) + 'px';
        r.style.top  = (e.clientY - rect.top)  + 'px';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 600);
    });
});
