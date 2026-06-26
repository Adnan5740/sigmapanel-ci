const settings = {
    async renderGeneral(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">System Configuration</div></div>
            <div class="card-body">
                <div class="form-group"><label>Platform Name</label><input type="text" id="set-pn" class="fly-input" value="SIGMAPANEL"></div>
                <div class="form-group">
                    <label>Registration Status</label>
                    <select id="set-se" class="fly-input"><option value="true">Open</option><option value="false">Closed</option></select>
                </div>
                <div class="form-group">
                    <label>Daily Registration Limit <span style="color:var(--text-secondary);font-weight:400">(0 = unlimited)</span></label>
                    <input type="number" id="set-daily-limit" class="fly-input" min="0" placeholder="e.g. 10">
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">When the daily limit is reached, new signups show the Teams contact message.</div>
                </div>
                <button class="fly-btn" onclick="window.settings.save()">Save Platform Config</button>
            </div>
        </div>
        <div class="card" style="margin-top:20px">
            <div class="card-header"><div class="card-title">Payout Rate Settings</div></div>
            <div class="card-body">
                <div class="form-row">
                    <div class="form-group"><label>Weekly Rate Multiplier</label><input type="number" id="set-weekly-rate" class="fly-input" min="0" step="0.01" placeholder="0.85"></div>
                    <div class="form-group"><label>Monthly Rate Multiplier</label><input type="number" id="set-monthly-rate" class="fly-input" min="0" step="0.01" placeholder="0.75"></div>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">These multipliers are applied to range rates when users request weekly or monthly self-allocation.</div>
                <button class="fly-btn" onclick="window.settings.savePayoutRates()">Save Payout Rates</button>
            </div>
        </div>`;
        this.load();
    },

    async load() {
        try {
            const res = await window.api.call('/api/settings');
            res.data.forEach(s => {
                if (s.setting_key === 'signup_enabled') document.getElementById('set-se').value = s.setting_value;
                if (s.setting_key === 'signup_daily_limit') { const el = document.getElementById('set-daily-limit'); if(el) el.value = s.setting_value; }
            });
            const rates = await window.api.call('/api/settings/payout-rates');
            const weekly = document.getElementById('set-weekly-rate');
            const monthly = document.getElementById('set-monthly-rate');
            if (weekly) weekly.value = rates.weekly;
            if (monthly) monthly.value = rates.monthly;
        } catch (e) {}
    },

    async save() {
        try {
            const limitVal = parseInt(document.getElementById('set-daily-limit')?.value || '0') || 0;
            await Promise.all([
                window.api.call('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'signup_enabled', value: document.getElementById('set-se').value }) }),
                window.api.call('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'signup_daily_limit', value: String(limitVal) }) })
            ]);
            window.api.invalidate('/api/settings');
            window.ui.showToast('Settings updated', 'success');
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async savePayoutRates() {
        const weekly = Number(document.getElementById('set-weekly-rate').value);
        const monthly = Number(document.getElementById('set-monthly-rate').value);
        if (Number.isNaN(weekly) || Number.isNaN(monthly) || weekly < 0 || monthly < 0) {
            window.ui.showToast('Payout rates must be valid non-negative numbers', 'error');
            return;
        }
        try {
            await window.api.call('/api/settings/payout-rates', { method: 'PUT', body: JSON.stringify({ weekly, monthly }) });
            window.api.invalidate('/api/settings');
            window.ui.showToast('Payout rates updated', 'success');
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderDocumentation(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Developer Hub & Integration</div></div>
            <div class="card-body">
                <h3>Webhook SMS Gateway</h3>
                <p>To receive SMS via HTTP POST, point your provider callback to:</p>
                <div style="background:var(--bg-page); padding:16px; border-radius:8px; margin:16px 0">
                    <code>${window.location.origin}/api/webhook/receive</code>
                </div>
                <h5>Required Parameters</h5>
                <ul>
                    <li><code>to</code>: Destination number</li>
                    <li><code>from</code>: Sender ID</li>
                    <li><code>msg</code>: SMS Content</li>
                </ul>
            </div>
        </div>`;
    },

    async renderSmppSettings(container) {
        if (window.smppInterconnect?.render) {
            return window.smppInterconnect.render(container);
        }
        container.innerHTML = `<div class="empty-state"><h3>SMPP module unavailable</h3></div>`;
    },

    async renderBackupRestore(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Disaster Recovery</div></div>
            <div class="card-body">
                <button class="fly-btn fly-btn-secondary" onclick="window.settings.triggerBackup()">Trigger Full SQL Snapshot</button>
            </div>
        </div>`;
    },

    async triggerBackup() {
        try {
            const btn = document.querySelector('button[onclick="window.settings.triggerBackup()"]');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-inline"></span> Backing up...'; }
            const res = await window.api.call('/api/settings/backup', { method: 'POST' });
            window.ui.showToast('Backup successful: ' + res.file, 'success');
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        } finally {
            const btn = document.querySelector('button[onclick="window.settings.triggerBackup()"]');
            if (btn) { btn.disabled = false; btn.textContent = 'Trigger Full SQL Snapshot'; }
        }
    },

    async renderSecurity(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Account Security Profile</div></div>
            <div class="card-body">
                <div class="form-group"><label>New Password</label><input type="password" id="s-np" class="fly-input" placeholder="Leave blank to keep current"></div>
                <button class="fly-btn" onclick="window.settings.updatePass()">Update Security Details</button>
            </div>
        </div>`;
    },

    async updatePass() {
        const pass = document.getElementById('s-np').value;
        if (!pass) return;
        try {
            await window.api.call('/api/users/' + window.auth.getUser().id, { method: 'PUT', body: JSON.stringify({ password: pass }) });
            window.ui.showToast('Password updated', 'success');
            document.getElementById('s-np').value = '';
        } catch (e) {}
    },

    async renderWebhookConfig(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        let token = '—';
        try {
            const res = await window.api.call('/api/auth/token');
            token = res.token || res.api_token || '—';
        } catch (e) { /* token fetch optional */ }

        const origin = window.location.origin;
        container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">🔑 User API Token (Webhook Auth)</div></div>
            <div class="card-body" style="padding:20px">
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px">
                    This token authenticates <strong>your requests</strong> to the API. Use it as a Bearer token or query parameter when requesting SMS data, numbers, and auth-related actions.
                </p>
                <div style="background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
                    <code id="wh-token" style="font-size:13px; word-break:break-all; flex:1">${window.ui.escapeHtml(token)}</code>
                    <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard(document.getElementById('wh-token').textContent)">${ICONS.key} Copy Token</button>
                </div>
                <div style="margin-top:12px; padding:12px; background:rgba(99,102,241,0.05); border-radius:8px; font-size:12px; color:var(--text-secondary)">
                    <strong>Usage:</strong> <code>Authorization: Bearer &lt;your-token&gt;</code> or <code>?token=&lt;your-token&gt;</code>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="card-title">📡 Carrier SMS Receive Webhook</div></div>
            <div class="card-body" style="padding:20px">
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px">
                    This endpoint receives <strong>incoming SMS messages from your carrier/provider</strong>. Configure your carrier to POST or GET to this URL when a message is delivered.
                    <br><br>
                    <strong>⚠️ This is only for carrier-to-platform delivery — not for user API requests.</strong>
                </p>

                <div style="margin-bottom:16px">
                    <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px">Webhook Endpoint</label>
                    <div style="background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
                        <code style="font-size:13px; flex:1">${origin}/api/webhook/receive</code>
                        <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard('${origin}/api/webhook/receive')">${ICONS.send} Copy URL</button>
                    </div>
                </div>

                <div style="margin-bottom:16px">
                    <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px">Supported Methods</label>
                    <div style="display:flex; gap:8px"><span class="badge badge-success">POST</span><span class="badge badge-secondary">GET</span></div>
                </div>

                <div style="margin-bottom:16px">
                    <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px">Expected Parameters</label>
                    <table class="fly-table" style="border:1px solid var(--border); border-radius:8px; overflow:hidden">
                        <thead><tr><th>Parameter</th><th>Description</th><th>Required</th></tr></thead>
                        <tbody>
                            <tr><td><code>to</code></td><td>Destination number</td><td><span class="badge badge-danger">Required</span></td></tr>
                            <tr><td><code>from</code></td><td>Sender ID or number</td><td><span class="badge badge-danger">Required</span></td></tr>
                            <tr><td><code>msg</code></td><td>SMS message body</td><td><span class="badge badge-danger">Required</span></td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom:16px">
                    <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px">Successful Response</label>
                    <div style="background:#0f172a; color:#a78bfa; border-radius:8px; padding:16px; font-family:monospace; font-size:13px">
                        {<br>
                        &nbsp;&nbsp;"status": "ok",<br>
                        &nbsp;&nbsp;"message": "processed"<br>
                        }
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    }
};
window.settings = settings;
