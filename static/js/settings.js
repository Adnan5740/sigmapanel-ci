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
                    <div class="form-group"><label>Weekly Payout Rate ($ per SMS)</label><input type="number" id="set-weekly-rate" class="fly-input" min="0" step="0.0001" placeholder="0.04"></div>
                    <div class="form-group"><label>Monthly Payout Rate ($ per SMS)</label><input type="number" id="set-monthly-rate" class="fly-input" min="0" step="0.0001" placeholder="0.03"></div>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">Direct payout per SMS in dollars. Users who self-allocate on weekly or monthly plans will earn exactly this amount per SMS received.</div>
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
        window.settings.renderHttpOverview(container);
    },

    async renderHttpOverview(container) {
        const base = window.location.origin;
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.report} HTTP Provider Integration — Overview</div></div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:18px">
                <p style="color:var(--text-secondary);font-size:14px;line-height:1.7">
                    Sigmapanel receives live SMS from your providers via <strong>HTTP webhooks</strong>. The provider makes an HTTP call to your server each time an SMS is delivered to one of your numbers. Sigmapanel then extracts the OTP, detects the service, and records the SMS instantly.
                </p>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
                    <div class="stat-card" style="cursor:pointer" onclick="window.router.navigateTo('http-standard')">
                        <div style="font-size:22px;margin-bottom:8px">${ICONS.webhook}</div>
                        <div style="font-weight:700;margin-bottom:4px">Standard Webhook</div>
                        <div style="font-size:12px;color:var(--text-secondary)">Generic POST/GET endpoint. Works with most providers out of the box.</div>
                    </div>
                    <div class="stat-card" style="cursor:pointer" onclick="window.router.navigateTo('http-postback')">
                        <div style="font-size:22px;margin-bottom:8px">${ICONS.transfer}</div>
                        <div style="font-weight:700;margin-bottom:4px">Custom Postback</div>
                        <div style="font-size:12px;color:var(--text-secondary)">For providers with custom field names like <code>{{called_number}}</code>, <code>{{smstext}}</code>.</div>
                    </div>
                    <div class="stat-card" style="cursor:pointer" onclick="window.router.navigateTo('http-field-mapping')">
                        <div style="font-size:22px;margin-bottom:8px">${ICONS.layers}</div>
                        <div style="font-weight:700;margin-bottom:4px">Field Mapping</div>
                        <div style="font-size:12px;color:var(--text-secondary)">Full list of every accepted field alias per endpoint.</div>
                    </div>
                    <div class="stat-card" style="cursor:pointer" onclick="window.router.navigateTo('http-test')">
                        <div style="font-size:22px;margin-bottom:8px">${ICONS.terminal}</div>
                        <div style="font-weight:700;margin-bottom:4px">Test Endpoint</div>
                        <div style="font-size:12px;color:var(--text-secondary)">Send a test SMS push to verify your setup before going live.</div>
                    </div>
                </div>
                <div style="background:rgba(99,102,241,.06);border-radius:8px;padding:16px">
                    <div style="font-weight:700;margin-bottom:8px">Your endpoints at a glance</div>
                    <table class="fly-table" style="border:1px solid var(--border);border-radius:8px">
                        <thead><tr><th>Endpoint</th><th>Use case</th><th>Methods</th></tr></thead>
                        <tbody>
                            <tr><td><code>${base}/api/webhook/sms</code></td><td>Standard — generic field names</td><td><span class="badge badge-success">POST</span> <span class="badge badge-secondary">GET</span></td></tr>
                            <tr><td><code>${base}/api/webhook/receive</code></td><td>Standard — same, alternate URL</td><td><span class="badge badge-success">POST</span> <span class="badge badge-secondary">GET</span></td></tr>
                            <tr><td><code>${base}/api/webhook/postback</code></td><td>Custom postback (IP-locked to provider)</td><td><span class="badge badge-success">POST</span> <span class="badge badge-secondary">GET</span></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>`;
    },

    async renderHttpStandard(container) {
        const base = window.location.origin;
        let info = {};
        try { info = await window.api.call('/api/settings/webhook-info').catch(() => ({})); } catch(_) {}
        const url = info.webhookUrl || (base + '/api/webhook/sms');
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.webhook} Standard Webhook Endpoint</div></div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:18px">
                <p style="color:var(--text-secondary);font-size:13px">Configure your provider to call this URL every time an SMS is delivered to one of your numbers. Supports both POST (JSON or form-encoded) and GET (query string).</p>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Endpoint URL</label>
                    <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                        <code style="flex:1;background:var(--bg-page);padding:12px 16px;border-radius:8px;border:1px solid var(--border)">${url}</code>
                        <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard('${url}')">${ICONS.copy} Copy</button>
                    </div>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Required Fields</label>
                    <table class="fly-table" style="margin-top:8px;border:1px solid var(--border);border-radius:8px">
                        <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
                        <tbody>
                            <tr><td><code>to</code></td><td>Destination / called number</td><td><code>+447700900123</code></td></tr>
                            <tr><td><code>from</code></td><td>Sender ID or service name</td><td><code>WhatsApp</code></td></tr>
                            <tr><td><code>msg</code></td><td>SMS body / OTP text</td><td><code>Your code is 482910</code></td></tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Optional Fields</label>
                    <table class="fly-table" style="margin-top:8px;border:1px solid var(--border);border-radius:8px">
                        <thead><tr><th>Field</th><th>Description</th></tr></thead>
                        <tbody>
                            <tr><td><code>uuid</code></td><td>Provider-side message ID for deduplication</td></tr>
                            <tr><td><code>service</code></td><td>Explicit service name hint (overrides auto-detect)</td></tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Example — cURL POST JSON</label>
                    <pre style="background:#0f172a;color:#a78bfa;border-radius:8px;padding:16px;font-size:12px;overflow-x:auto;margin-top:8px">curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '{"to":"+447700900123","from":"WhatsApp","msg":"Your code is 482910"}'</pre>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Example — GET Query String</label>
                    <pre style="background:#0f172a;color:#a78bfa;border-radius:8px;padding:16px;font-size:12px;overflow-x:auto;margin-top:8px">${url}?to=%2B447700900123&from=WhatsApp&msg=Your+code+is+482910</pre>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Success Response</label>
                    <pre style="background:#0f172a;color:#4ade80;border-radius:8px;padding:16px;font-size:12px;margin-top:8px">{"status":"ok","message":"processed","smsId":"...","otp":"482910","service":"WhatsApp"}</pre>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Error Response</label>
                    <pre style="background:#0f172a;color:#f87171;border-radius:8px;padding:16px;font-size:12px;margin-top:8px">{"status":"failed","error":"Missing required field(s): to","missingFields":["to"]}</pre>
                </div>
            </div>
        </div>
        </div>`;
    },

    async renderHttpPostback(container) {
        const base = window.location.origin;
        const url = base + '/api/webhook/postback';
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.transfer} Custom Postback Endpoint</div></div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:18px">
                <p style="color:var(--text-secondary);font-size:13px">For providers that use their own field names (e.g. <code>{{called_number}}</code>, <code>{{smstext}}</code>, <code>{{senderid}}</code>). This endpoint also enforces an IP allowlist — only requests from the configured provider IP are accepted.</p>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Endpoint URL</label>
                    <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                        <code style="flex:1;background:var(--bg-page);padding:12px 16px;border-radius:8px;border:1px solid var(--border)">${url}</code>
                        <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard('${url}')">${ICONS.copy} Copy</button>
                    </div>
                </div>
                <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:14px;font-size:13px">
                    ${ICONS.alertCircle} <strong>IP-locked:</strong> Only requests from the configured provider IP (<code>51.38.107.49</code>) are accepted. All other IPs receive <code>403 Forbidden</code>.
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Accepted Field Names (Provider → Internal)</label>
                    <table class="fly-table" style="margin-top:8px;border:1px solid var(--border);border-radius:8px">
                        <thead><tr><th>Provider Field</th><th>Maps To</th><th>Description</th></tr></thead>
                        <tbody>
                            <tr><td><code>called_number</code></td><td><code>to</code></td><td>Destination / your number</td></tr>
                            <tr><td><code>senderid</code></td><td><code>from</code></td><td>Sender / service name</td></tr>
                            <tr><td><code>smstext</code></td><td><code>msg</code></td><td>SMS body</td></tr>
                            <tr><td><code>smsid</code> / <code>smsid2</code></td><td><code>uuid</code></td><td>Provider message ID</td></tr>
                            <tr><td><code>smstime</code></td><td>—</td><td>Delivery timestamp (logged, not stored)</td></tr>
                            <tr><td><code>payout</code></td><td>—</td><td>Provider payout hint (overridden by range rate)</td></tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Postback URL to give your provider</label>
                    <pre style="background:#0f172a;color:#a78bfa;border-radius:8px;padding:16px;font-size:12px;overflow-x:auto;margin-top:8px">${url}?called_number={{called_number}}&senderid={{senderid}}&smstext={{smstext}}&smsid={{smsid}}</pre>
                    <button class="fly-btn fly-btn-sm" style="margin-top:8px" onclick="window.ui.copyToClipboard('${url}?called_number={{called_number}}&senderid={{senderid}}&smstext={{smstext}}&smsid={{smsid}}')">${ICONS.copy} Copy Postback URL</button>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Example — cURL</label>
                    <pre style="background:#0f172a;color:#a78bfa;border-radius:8px;padding:16px;font-size:12px;overflow-x:auto;margin-top:8px">curl "${url}?called_number=%2B447700900123&senderid=Telegram&smstext=Your+OTP+is+391827&smsid=abc123"</pre>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Response</label>
                    <pre style="background:#0f172a;color:#4ade80;border-radius:8px;padding:16px;font-size:12px;margin-top:8px">{"status":"ok"}   // or {"status":"failed"}</pre>
                </div>
            </div>
        </div>
        </div>`;
    },

    async renderHttpFieldMapping(container) {
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.layers} Field Mapping — All Accepted Aliases</div></div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:18px">
                <p style="color:var(--text-secondary);font-size:13px">The SMS processor accepts many field name variants so you never need to reformat your provider's payload. Any of the aliases below are recognised automatically.</p>
                <table class="fly-table" style="border:1px solid var(--border);border-radius:8px">
                    <thead><tr><th>Internal Field</th><th>Accepted aliases (any of these work)</th><th>Required</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Destination number</strong></td>
                            <td><code>to</code> <code>number</code> <code>msisdn</code> <code>recipient</code> <code>called_number</code></td>
                            <td><span class="badge badge-danger">Yes</span></td>
                        </tr>
                        <tr>
                            <td><strong>Sender / Service</strong></td>
                            <td><code>from</code> <code>From</code> <code>sender</code> <code>Cli</code> <code>cli</code> <code>CLI</code> <code>sender_id</code> <code>senderid</code> <code>source</code> <code>oa</code> <code>originator</code></td>
                            <td><span class="badge badge-secondary">No</span></td>
                        </tr>
                        <tr>
                            <td><strong>Message body</strong></td>
                            <td><code>msg</code> <code>message</code> <code>text</code> <code>Message</code> <code>smstext</code></td>
                            <td><span class="badge badge-danger">Yes</span></td>
                        </tr>
                        <tr>
                            <td><strong>Message ID</strong></td>
                            <td><code>uuid</code> <code>smsid</code> <code>smsid2</code></td>
                            <td><span class="badge badge-secondary">No</span></td>
                        </tr>
                        <tr>
                            <td><strong>Service hint</strong></td>
                            <td><code>service</code> <code>app</code></td>
                            <td><span class="badge badge-secondary">No</span></td>
                        </tr>
                    </tbody>
                </table>
                <div>
                    <div style="font-weight:700;margin-bottom:10px">Provider Compatibility Matrix</div>
                    <table class="fly-table" style="border:1px solid var(--border);border-radius:8px">
                        <thead><tr><th>Provider Type</th><th>Use Endpoint</th><th>Notes</th></tr></thead>
                        <tbody>
                            <tr><td>Generic HTTP (REVE, Kannel, etc.)</td><td><code>/api/webhook/sms</code></td><td>Standard <code>to/from/msg</code> fields</td></tr>
                            <tr><td>Custom postback with <code>{{placeholders}}</code></td><td><code>/api/webhook/postback</code></td><td>IP-locked, maps <code>called_number→to</code> etc.</td></tr>
                            <tr><td>SMPP provider</td><td>SMPP Client Manager</td><td>Add via SMPP Settings → Remote Servers</td></tr>
                            <tr><td>Provider using <code>msisdn</code></td><td><code>/api/webhook/sms</code></td><td>Auto-mapped, no config needed</td></tr>
                            <tr><td>Provider using <code>CLI/Cli</code> for sender</td><td><code>/api/webhook/sms</code></td><td>Auto-mapped, no config needed</td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="background:rgba(99,102,241,.06);border-radius:8px;padding:14px;font-size:13px">
                    <strong>Number normalisation:</strong> All destination numbers are automatically normalised to E.164 international format (<code>+447700900123</code>). Numbers without a leading <code>+</code> or country code are accepted if they match a number in your inventory.
                </div>
            </div>
        </div>
        </div>`;
    },

    async renderHttpTest(container) {
        const base = window.location.origin;
        const stdUrl = base + '/api/webhook/sms';
        const pbUrl  = base + '/api/webhook/postback';
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.terminal} Test HTTP Endpoint</div></div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:16px">
                <p style="color:var(--text-secondary);font-size:13px">Send a test SMS push to verify your webhook integration end-to-end. The SMS will be processed, stored, and appear in the SMS reports.</p>
                <div class="form-group">
                    <label class="fly-label">Endpoint</label>
                    <select id="ht-endpoint" class="fly-input">
                        <option value="${stdUrl}">Standard — /api/webhook/sms</option>
                        <option value="${pbUrl}">Custom Postback — /api/webhook/postback</option>
                    </select>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div class="form-group">
                        <label class="fly-label">Destination number (to)</label>
                        <input id="ht-to" class="fly-input" placeholder="+447700900123">
                    </div>
                    <div class="form-group">
                        <label class="fly-label">Sender (from)</label>
                        <input id="ht-from" class="fly-input" placeholder="WhatsApp">
                    </div>
                </div>
                <div class="form-group">
                    <label class="fly-label">Message</label>
                    <input id="ht-msg" class="fly-input" placeholder="Your OTP is 482910" value="Your OTP is 482910">
                </div>
                <button class="fly-btn" onclick="window.settings.runHttpTest()">${ICONS.send} Send Test Push</button>
                <div id="ht-result" style="display:none;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap"></div>
            </div>
        </div>
        </div>`;
    },

    async runHttpTest() {
        const endpoint = document.getElementById('ht-endpoint').value;
        const to   = document.getElementById('ht-to').value.trim();
        const from = document.getElementById('ht-from').value.trim();
        const msg  = document.getElementById('ht-msg').value.trim();
        const res  = document.getElementById('ht-result');
        if (!to || !msg) { window.ui.showToast('Destination number and message are required', 'error'); return; }
        res.style.display = 'block';
        res.style.background = '#0f172a';
        res.style.color = '#94a3b8';
        res.textContent = 'Sending…';
        try {
            const isPostback = endpoint.includes('postback');
            const body = isPostback
                ? { called_number: to, senderid: from, smstext: msg, smsid: 'test-' + Date.now() }
                : { to, from, msg };
            const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await r.json();
            res.style.color = data.status === 'ok' ? '#4ade80' : '#f87171';
            res.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
            res.style.color = '#f87171';
            res.textContent = 'Error: ' + e.message;
        }
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
        let webhookUrl = window.location.origin + '/api/webhook/receive';
        let serverIp = null;
        try {
            const [tokenRes, infoRes] = await Promise.all([
                window.api.call('/api/auth/token').catch(() => ({})),
                window.api.call('/api/settings/webhook-info').catch(() => ({}))
            ]);
            token = tokenRes.token || tokenRes.api_token || '—';
            if (infoRes.webhookUrl) webhookUrl = infoRes.webhookUrl;
            if (infoRes.serverIp) serverIp = infoRes.serverIp;
        } catch (e) { /* optional */ }
        container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.key} User API Token (Webhook Auth)</div></div>
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
            <div class="card-header"><div class="card-title">${ICONS.smpp} Carrier SMS Receive Webhook</div></div>
            <div class="card-body" style="padding:20px">
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px">
                    This endpoint receives <strong>incoming SMS messages from your carrier/provider</strong>. Configure your carrier to POST or GET to this URL when a message is delivered.
                    <br><br>
                    <strong style="display:inline-flex;align-items:center;gap:5px">${ICONS.alertCircle} This is only for carrier-to-platform delivery — not for user API requests.</strong>
                </p>

                <div style="margin-bottom:16px">
                    <label style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px">Webhook Endpoint</label>
                    <div style="background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
                        <code style="font-size:13px; flex:1">${webhookUrl}</code>
                        <button class="fly-btn fly-btn-sm" onclick="window.ui.copyToClipboard('${webhookUrl}')">${ICONS.send} Copy URL</button>
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
