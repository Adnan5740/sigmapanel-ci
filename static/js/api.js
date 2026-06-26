const API = '/api';

function shouldAutoSuccessToast(endpoint, method, options) {
    if (options && options.silentSuccess) return false;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
    const path = String(endpoint || '').split('?')[0];
    if (/\/api\/auth\/(login|signup|upload-proof)$/.test(path)) return false;
    return true;
}

function successMessageFor(endpoint, method, data) {
    if (data && typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    const path = String(endpoint || '').split('?')[0].toLowerCase();
    if (method === 'DELETE') return 'Deleted successfully';
    if (path.includes('unblock')) return 'Unblocked successfully';
    if (path.includes('block')) return 'Blocked successfully';
    if (path.includes('approve')) return 'Approved successfully';
    if (path.includes('reject')) return 'Rejected successfully';
    if (path.includes('cancel')) return 'Cancelled successfully';
    if (path.includes('revoke')) return 'Revoked successfully';
    if (method === 'POST') return 'Saved successfully';
    return 'Updated successfully';
}

function maybeAutoSuccessToast(endpoint, method, options, data) {
    if (!shouldAutoSuccessToast(endpoint, method, options)) return;
    window.setTimeout(() => {
        const recentToast = Date.now() - (window.__lastToastAt || 0) < 900;
        if (recentToast) return;
        if (window.ui && typeof window.ui.showToast === 'function') {
            window.ui.showToast(successMessageFor(endpoint, method, data), 'success');
        }
    }, 60);
}

// In-flight request deduplication + short-lived GET cache (30s TTL)
const _cache = new Map();   // key → { data, exp }
const _inflight = new Map(); // key → Promise

const api = {
    getToken() { return localStorage.getItem('token'); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    },

    async call(endpoint, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const isGET  = method === 'GET';
        const cacheKey = isGET ? endpoint : null;

        // Return cached response if fresh
        if (cacheKey) {
            const hit = _cache.get(cacheKey);
            if (hit && hit.exp > Date.now()) return hit.data;
        }

        // Deduplicate identical in-flight GET requests
        if (cacheKey && _inflight.has(cacheKey)) {
            return _inflight.get(cacheKey);
        }

        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), options.timeout || 15000);

        const promise = fetch(endpoint, { ...options, headers, signal: controller.signal })
            .then(async res => {
                clearTimeout(tid);
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    location.reload();
                    throw new Error('Unauthorized');
                }
                if (!res.ok) {
                    let msg = 'Request failed';
                    try {
                        const j = await res.json();
                        msg = Array.isArray(j.detail)
                            ? j.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ')
                            : (j.error || j.detail || msg);
                    } catch {}
                    const err = new Error(msg);
                    err.status = res.status;
                    throw err;
                }
                return res.json();
            })
            .then(data => {
                if (cacheKey) {
                    _cache.set(cacheKey, { data, exp: Date.now() + 30000 }); // 30s TTL
                    _inflight.delete(cacheKey);
                } else {
                    this.invalidate(API);
                }
                maybeAutoSuccessToast(endpoint, method, options, data);
                return data;
            })
            .catch(err => {
                clearTimeout(tid);
                if (cacheKey) _inflight.delete(cacheKey);
                if (err.name === 'AbortError') throw new Error('Request timed out.');
                throw err;
            });

        if (cacheKey) _inflight.set(cacheKey, promise);
        return promise;
    },

    async download(endpoint) {
        const token = this.getToken();
        const headers = token ? { Authorization: "Bearer " + token } : {};
        const res = await fetch(endpoint, { headers });
        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            location.reload();
            throw new Error("Unauthorized");
        }
        if (!res.ok) {
            let msg = "Download failed";
            try {
                const j = await res.json();
                msg = j.error || j.detail || msg;
            } catch {}
            throw new Error(msg);
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="?([^";]+)"?/i);
        const filename = match ? match[1] : "numbers-export";
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },

    // Invalidate cache for a prefix (call after mutations)
    invalidate(prefix) {
        for (const k of _cache.keys()) {
            if (k.startsWith(prefix)) _cache.delete(k);
        }
    },
};

// Lazy Chart.js loader — only fetched when first chart is needed
let _chartReady = null;
window.loadChart = () => {
    if (window.Chart) return Promise.resolve();
    if (_chartReady) return _chartReady;
    _chartReady = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
    return _chartReady;
};

window.api = api;
