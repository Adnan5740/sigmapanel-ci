const API = '/api';

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
                    throw new Error(msg);
                }
                return res.json();
            })
            .then(data => {
                if (cacheKey) {
                    _cache.set(cacheKey, { data, exp: Date.now() + 30000 }); // 30s TTL
                    _inflight.delete(cacheKey);
                }
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
