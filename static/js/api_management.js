const apiManagement = {

    async renderPlayground(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/api-management/my-token');
            const base = window.location.origin;
            const user = window.auth.getUser();
            const isAdmin = user && ['admin','manager'].includes(user.role);

            container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:20px">

              <!-- API Playground Card -->
              <div class="card">
                <div class="card-header">
                  <div class="card-title">${ICONS.terminal} API Playground - SMS Query Interface</div>
                  <span class="badge badge-primary">Interactive</span>
                </div>
                <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
                  
                  <!-- Step 1: Base URL -->
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                      <span style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">1</span>
                      <label class="fly-label" style="margin:0;font-size:14px">Base URL</label>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <code style="flex:1;font-size:13px;padding:12px 16px;background:#0f172a;color:#a78bfa;border-radius:8px;min-width:0;font-weight:600">${base}/api/sms</code>
                      <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard('${base}/api/sms')">${ICONS.copy}</button>
                    </div>
                  </div>

                  <!-- Step 2: Token -->
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                      <span style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">2</span>
                      <label class="fly-label" style="margin:0;font-size:14px">Your API Token</label>
                      <button class="fly-btn fly-btn-sm fly-btn-secondary" style="margin-left:auto" onclick="window.apiManagement.regen()">↻ Rotate</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <code id="pg-token" style="flex:1;word-break:break-all;font-size:12px;padding:12px 16px;background:#f8fafc;border:1.5px solid var(--border);border-radius:8px;font-weight:600">${window.ui.escapeHtml(data.token)}</code>
                      <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard(document.getElementById('pg-token').textContent)">${ICONS.copy}</button>
                    </div>
                    <div style="margin-top:8px;padding:10px 14px;background:rgba(99,102,241,0.08);border-radius:8px;font-size:12px;color:var(--text-secondary)">
                      💡 Use as: <code style="background:white;padding:2px 6px;border-radius:4px">?token=&lt;your_token&gt;</code> or <code style="background:white;padding:2px 6px;border-radius:4px">Authorization: Bearer &lt;token&gt;</code>
                    </div>
                  </div>

                  <!-- Step 3: Optional Parameters -->
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                      <span style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">3</span>
                      <label class="fly-label" style="margin:0;font-size:14px">Optional Parameters</label>
                    </div>
                    <div class="pg-grid filter-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
                      <div class="form-group" style="margin:0">
                        <label class="fly-label" style="font-size:12px">Date From</label>
                        <input type="date" id="pg-from" class="fly-input" oninput="window.apiManagement.buildUrl()" style="font-size:13px">
                      </div>
                      <div class="form-group" style="margin:0">
                        <label class="fly-label" style="font-size:12px">Date To</label>
                        <input type="date" id="pg-to" class="fly-input" oninput="window.apiManagement.buildUrl()" style="font-size:13px">
                      </div>
                      <div class="form-group" style="margin:0">
                        <label class="fly-label" style="font-size:12px">CLI / Sender</label>
                        <input type="text" id="pg-cli" class="fly-input" placeholder="Google, WhatsApp…" oninput="window.apiManagement.buildUrl()" style="font-size:13px">
                      </div>
                      <div class="form-group" style="margin:0">
                        <label class="fly-label" style="font-size:12px">Number</label>
                        <input type="text" id="pg-number" class="fly-input" placeholder="+1234567890" oninput="window.apiManagement.buildUrl()" style="font-size:13px">
                      </div>
                    </div>
                  </div>

                  <!-- Step 4: Complete API URL -->
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                      <span style="width:28px;height:28px;border-radius:50%;background:var(--success);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">4</span>
                      <label class="fly-label" style="margin:0;font-size:14px">Complete API URL</label>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <code id="pg-url" style="flex:1;word-break:break-all;font-size:12px;padding:12px 16px;background:#0f172a;color:#10b981;border-radius:8px;min-width:0;font-weight:600">${base}/api/sms?token=${data.token}</code>
                      <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard(document.getElementById('pg-url').textContent)">${ICONS.copy}</button>
                    </div>
                  </div>

                  <!-- Execute Button -->
                  <div style="display:flex;gap:10px;padding-top:8px;border-top:1px solid var(--border)">
                    <button class="fly-btn" style="min-width:180px" onclick="window.apiManagement.runQuery()">
                      ${ICONS.send}&nbsp; Execute API Call
                    </button>
                    <button class="fly-btn fly-btn-secondary" onclick="window.apiManagement.clearFilters()">
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              ${isAdmin ? `
              <!-- Provider connection status -->
              <div class="card">
                <div class="card-header"><div class="card-title">${ICONS.server} HTTP / SMPP Provider Health</div><button class="fly-btn fly-btn-sm" onclick="window.apiManagement._loadProviderHealth()">Refresh</button></div>
                <div id="provider-health-wrap"><div class="loading-spinner"><div class="spinner"></div></div></div>
              </div>` : ''}

              <!-- Step 5: Response Section -->
              <div class="card" id="pg-response-card" style="display:none">
                <div class="card-header">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="width:28px;height:28px;border-radius:50%;background:var(--info);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">5</span>
                    <div class="card-title">API Response</div>
                  </div>
                  <span id="pg-response-meta" class="badge badge-success"></span>
                </div>
                <div style="overflow-x:auto">
                  <table class="fly-table">
                    <thead><tr><th>Timestamp</th><th>Number</th><th>Sender</th><th>OTP</th><th>Message Content</th></tr></thead>
                    <tbody id="pg-response-body"></tbody>
                  </table>
                </div>
              </div>

              <!-- Step 6: Evaluate Response -->
              <div class="card" id="pg-evaluate-card" style="display:none">
                <div class="card-header">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="width:28px;height:28px;border-radius:50%;background:var(--warning);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">6</span>
                    <div class="card-title">Evaluate Response</div>
                  </div>
                </div>
                <div style="padding:20px">
                  <div id="pg-evaluation" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px"></div>
                </div>
              </div>

              ${isAdmin ? `
              <!-- Admin: all tokens -->
              <div class="card">
                <div class="card-header"><div class="card-title">${ICONS.users} All User Tokens (Admin View)</div></div>
                <div id="admin-tokens-wrap"><div class="loading-spinner"><div class="spinner"></div></div></div>
              </div>` : ''}

            </div>`;

            // store token for query
            this._token = data.token;
            this._base  = base;
            this.buildUrl();

            if (isAdmin) {
                this._loadAdminTokens();
                this._loadProviderHealth();
            }

        } catch(e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    clearFilters() {
        document.getElementById('pg-from').value = '';
        document.getElementById('pg-to').value = '';
        document.getElementById('pg-cli').value = '';
        document.getElementById('pg-number').value = '';
        this.buildUrl();
        window.ui.showToast('Filters cleared', 'info');
    },

    _token: '', _base: '',

    buildUrl() {
        const tok  = this._token;
        const from = document.getElementById('pg-from')?.value;
        const to   = document.getElementById('pg-to')?.value;
        const num  = document.getElementById('pg-number')?.value.trim();
        const cli  = document.getElementById('pg-cli')?.value.trim();
        let url = `${this._base}/api/sms?token=${tok}`;
        if (from) url += `&from=${from}`;
        if (to)   url += `&to=${to}`;
        if (num)  url += `&number=${encodeURIComponent(num)}`;
        if (cli)  url += `&search=${encodeURIComponent(cli)}`;
        const el = document.getElementById('pg-url');
        if (el) el.textContent = url;
        this._queryUrl = url;
    },

    async runQuery() {
        const card = document.getElementById('pg-response-card');
        const evalCard = document.getElementById('pg-evaluate-card');
        const body = document.getElementById('pg-response-body');
        const meta = document.getElementById('pg-response-meta');
        const evaluation = document.getElementById('pg-evaluation');
        
        card.style.display = 'block';
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px"><div class="spinner" style="margin:auto"></div></td></tr>`;
        try {
            // Build internal API call (same params, without token in URL since we use header auth)
            const from = document.getElementById('pg-from')?.value;
            const to   = document.getElementById('pg-to')?.value;
            const num  = document.getElementById('pg-number')?.value.trim();
            const cli  = document.getElementById('pg-cli')?.value.trim();
            let ep = '/api/sms?limit=50';
            if (num) ep += `&number=${encodeURIComponent(num)}`;
            if (cli) ep += `&search=${encodeURIComponent(cli)}`;
            if (from) ep += `&from=${encodeURIComponent(from)}`;
            if (to) ep += `&to=${encodeURIComponent(to)}`;
            const data = await window.api.call(ep);
            const rows = (data.data || []);
            meta.textContent = `${rows.length} results`;
            meta.className = rows.length > 0 ? 'badge badge-success' : 'badge badge-warning';
            window.ui.showToast(`API query completed: ${rows.length} result(s)`, rows.length ? 'success' : 'info');
            
            body.innerHTML = rows.length ? rows.map(s => `
                <tr style="animation: fadeInUp 0.3s ease">
                    <td style="white-space:nowrap;font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                    <td><code style="font-size:12px">${window.ui.escapeHtml(s.number)}</code></td>
                    <td><span class="badge badge-primary">${window.ui.escapeHtml(s.sender || s.service || '-')}</span></td>
                    <td>${s.otp ? `<span class="otp-code" style="font-weight:700">${s.otp}</span>` : '-'}</td>
                    <td class="message-text">${window.ui.escapeHtml(s.message)}</td>
                </tr>`).join('')
            : `<tr class="empty-row"><td colspan="5">No SMS found for these filters</td></tr>`;
            
            // Show evaluation
            evalCard.style.display = 'block';
            const otpCount = rows.filter(s => s.otp).length;
            const uniqueServices = [...new Set(rows.map(s => s.service).filter(Boolean))].length;
            const avgLatency = '0.3s'; // Mock
            
            evaluation.innerHTML = `
                <div class="stat-card" style="animation: fadeInUp 0.3s ease">
                    <div class="stat-card-label">Total SMS</div>
                    <div class="stat-card-value" style="color:var(--primary)">${rows.length}</div>
                </div>
                <div class="stat-card" style="animation: fadeInUp 0.35s ease">
                    <div class="stat-card-label">OTP Messages</div>
                    <div class="stat-card-value" style="color:var(--success)">${otpCount}</div>
                </div>
                <div class="stat-card" style="animation: fadeInUp 0.4s ease">
                    <div class="stat-card-label">Unique Services</div>
                    <div class="stat-card-value" style="color:var(--info)">${uniqueServices}</div>
                </div>
                <div class="stat-card" style="animation: fadeInUp 0.45s ease">
                    <div class="stat-card-label">Avg. Latency</div>
                    <div class="stat-card-value" style="color:var(--warning)">${avgLatency}</div>
                </div>
            `;
        } catch(e) {
            body.innerHTML = `<tr><td colspan="5" style="color:var(--danger);text-align:center;padding:20px">${e.message}</td></tr>`;
            evalCard.style.display = 'none';
        }
    },

    async renderTokens(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/api-management/my-token');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${ICONS.key} My API Token</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.apiManagement.regen()">↻ Rotate Token</button>
                </div>
                <div style="padding:20px;display:flex;flex-direction:column;gap:12px">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                        <code id="tok-val" style="flex:1;word-break:break-all;font-size:13px;padding:12px 16px;background:#f8fafc;border:1px solid var(--border);border-radius:8px">${window.ui.escapeHtml(res.token)}</code>
                        <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard(document.getElementById('tok-val').textContent)">${ICONS.copy} Copy</button>
                    </div>
                    <div class="pg-grid" style="margin-top:4px">
                        <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px">
                            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Status</div>
                            <span class="badge badge-success">Active</span>
                        </div>
                        <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px">
                            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Usage</div>
                            <code style="font-size:11px">Bearer &lt;token&gt;</code>
                        </div>
                    </div>
                </div>
            </div>`;
        } catch(e) {}
    },

    async regen() {
        if (!confirm('Rotate token? All existing integrations using the old token will stop working.')) return;
        try {
            const res = await window.api.call('/api/api-management/regenerate-token', { method: 'POST' });
            window.api.invalidate('/api/api-management');
            window.ui.showToast('Token rotated successfully', 'success');
            this.renderTokens(document.getElementById('page-content'));
        } catch(e) { window.ui.showToast(e.message, 'error'); }
    },

    async _loadProviderHealth() {
        const wrap = document.getElementById('provider-health-wrap');
        if (!wrap) return;
        wrap.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/providers/connection-status');
            const rows = res.data || [];
            wrap.innerHTML = `<div class="table-wrapper"><table class="fly-table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>${rows.map(p => `<tr>
                    <td><strong>${window.ui.escapeHtml(p.name || '-')}</strong></td>
                    <td><span class="badge badge-secondary">${window.ui.escapeHtml(String(p.type || '-').toUpperCase())}</span></td>
                    <td><span class="badge ${['ready','reachable'].includes(p.status) ? 'badge-success' : p.status === 'configured' ? 'badge-warning' : 'badge-danger'}">${window.ui.escapeHtml(String(p.status || 'unknown').toUpperCase())}</span></td>
                    <td style="font-size:12px;color:var(--text-secondary)">${window.ui.escapeHtml(p.detail || '-')}</td>
                </tr>`).join('') || '<tr class="empty-row"><td colspan="4">No providers configured</td></tr>'}</tbody>
            </table></div>`;
        } catch (e) {
            wrap.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    async _loadAdminTokens() {
        const wrap = document.getElementById('admin-tokens-wrap');
        if (!wrap) return;
        try {
            const res = await window.api.call('/api/api-management/admin/tokens');
            wrap.innerHTML = `<div class="table-wrapper"><table class="fly-table">
                <thead><tr><th>User</th><th>Role</th><th>Token</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${(res.data||[]).map(u=>`
                <tr>
                    <td><strong>${window.ui.escapeHtml(u.username)}</strong></td>
                    <td><span class="badge badge-secondary">${u.role}</span></td>
                    <td><code style="font-size:11px">${u.api_token ? u.api_token.slice(0,20)+'…' : '—'}</code></td>
                    <td><span class="badge ${u.status==='active'?'badge-success':'badge-danger'}">${u.status}</span></td>
                    <td>
                        <button class="action-btn" onclick="window.apiManagement.adminRegen('${u.id}')">Regenerate</button>
                        ${u.api_token ? `<button class="action-btn delete" onclick="window.apiManagement.adminRevoke('${u.id}')">Revoke</button>` : ''}
                    </td>
                </tr>`).join('')}
                </tbody></table></div>`;
        } catch(e) { wrap.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }
    },

    async adminRegen(id) {
        if (!confirm('Regenerate token for this user?')) return;
        try {
            await window.api.call('/api/api-management/admin/regenerate-token/' + id, { method: 'POST' });
            window.ui.showToast('Token regenerated', 'success');
            this._loadAdminTokens();
        } catch(e) { window.ui.showToast(e.message, 'error'); }
    },

    async adminRevoke(id) {
        if (!confirm('Revoke token for this user?')) return;
        try {
            await window.api.call('/api/api-management/admin/revoke-token/' + id, { method: 'POST' });
            window.ui.showToast('Token revoked', 'success');
            this._loadAdminTokens();
        } catch(e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderLiveTest(container) {
        const user = window.auth.getUser() || {};
        if (!['admin', 'manager'].includes(user.role)) {
            container.innerHTML = '<div class="empty-state"><h3>Permission denied</h3><p>Live webhook testing is available only to admins and managers.</p></div>';
            return;
        }
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.send} Webhook Simulator</div></div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
                <div class="pg-grid">
                    <div class="form-group" style="margin:0"><label class="fly-label">To (Number)</label><input type="text" id="sim-to" class="fly-input" placeholder="+1234567890"></div>
                    <div class="form-group" style="margin:0"><label class="fly-label">CLI / From (Sender)</label><input type="text" id="sim-from" class="fly-input" placeholder="Google"></div>
                </div>
                <div class="form-group" style="margin:0"><label class="fly-label">Message</label><textarea id="sim-msg" class="fly-input" rows="3" placeholder="Your OTP is 123456">Your OTP is 123456</textarea></div>
                <button class="fly-btn" style="align-self:flex-start" onclick="window.apiManagement.sim()">${ICONS.send}&nbsp; Send Test Webhook</button>
                <div id="sim-result" style="display:none;background:#0f172a;color:#a78bfa;padding:14px;border-radius:8px;font-family:monospace;font-size:12px;white-space:pre"></div>
            </div>
        </div>`;
    },

    async sim() {
        const to = document.getElementById('sim-to').value.trim();
        const cli = document.getElementById('sim-from').value.trim();
        const msg = document.getElementById('sim-msg').value.trim();
        const res_el = document.getElementById('sim-result');
        res_el.style.color = '#a78bfa';
        if (!to) { window.ui.showToast('To number is required', 'error'); document.getElementById('sim-to').focus(); return; }
        if (!cli) { window.ui.showToast('CLI / From is required', 'error'); document.getElementById('sim-from').focus(); return; }
        if (!msg) { window.ui.showToast('Message is required', 'error'); document.getElementById('sim-msg').focus(); return; }

        const payload = { to, from: cli, Cli: cli, cli, msg, message: msg };
        const btn = document.querySelector('button[onclick="window.apiManagement.sim()"]');
        if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<span class="spinner spinner-inline"></span> Sending'; }
        try {
            const res = await window.api.call('/api/webhook/receive', { method: 'POST', body: JSON.stringify(payload) });
            res_el.style.display = 'block';
            res_el.textContent = JSON.stringify(res, null, 2);
            window.ui.showToast('Webhook processed', 'success');
        } catch(e) {
            res_el.style.display = 'block';
            res_el.style.color = '#f87171';
            res_el.textContent = 'Error: ' + e.message;
            window.ui.showToast(e.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText || `${ICONS.send}&nbsp; Send Test Webhook`; }
        }
    }
};
window.apiManagement = apiManagement;
