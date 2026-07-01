const router = {
    routes: {},
    currentPage: 'dashboard',
    currentGroup: null,

    // Detect base path (e.g. '/sms' if served under /sms/)
    _base: (function() {
        const p = window.location.pathname;
        // Find the deepest prefix before a known page key or root
        const m = p.match(/^(\/[^/]+)\//) ;
        if (m && m[1] !== '') return m[1];
        return '';
    })(),

    init() {
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
        this.handleRoute();
    },

    handleRoute() {
        const base = this._base;
        let path = window.location.pathname;
        // Strip base prefix
        if (base && path.startsWith(base)) {
            path = path.slice(base.length);
        }
        path = path.replace(/^\//, '') || 'dashboard';
        this.navigateTo(path, false);
    },

    navigateTo(page, pushState = true) {
        this.currentPage = page;
        if (pushState) {
            const base = this._base;
            const url = base + (page === 'dashboard' ? '/' : `/${page}`);
            window.history.pushState({}, '', url);
        }

        if (typeof window.renderDashboardShell === 'function') {
            window.renderDashboardShell();
        } else {
            console.warn('renderDashboardShell not yet available');
        }

        const content = document.getElementById('page-content');
        if (content) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(8px)';
            requestAnimationFrame(() => {
                content.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            });
        }
    },

    resolvePage(contentContainer) {
        const page = this.currentPage;
        if (this.routes[page]) {
            this.routes[page](contentContainer);
        } else {
            if (this.routes['dashboard']) {
                this.routes['dashboard'](contentContainer);
            } else {
                contentContainer.innerHTML = `<div class="empty-state"><h3>404</h3><p>Page ${page} not found</p></div>`;
            }
        }
    },

    addRoute(path, handler) {
        this.routes[path] = handler;
    }
};

window.router = router;
