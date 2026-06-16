const numbers = {
    async renderMyNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers?limit=50');
            const ranges = await window.api.call('/api/ranges');
            const rangeOptions = (ranges.data || []).map(r => `<option value="${r.name}">${r.name}</option>`).join('');
            
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Virtual Numbers</div>
                    <div class="card-header-actions" style="display:flex; gap:8px; flex-wrap:wrap">
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.showExportModal()" style="display:flex;align-items:center;gap:4px">
                            ${ICONS.download || '↓'} Export
                        </button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Range</th><th>App</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>${res.data.map(n => `<tr><td><code>${n.number}</code></td><td><span class="badge badge-info">${n.range_name || '-'}</span></td><td>${n.service || '-'}</td><td><span class="badge ${n.status === 'active' ? 'badge-success' : 'badge-danger'}">${n.status}</span></td><td><button class="action-btn" onclick="window.numbers.revoke('${n.id}')">Revoke</button></td></tr>`).join('') || '<tr><td colspan="5">No numbers assigned</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { 
            container.innerHTML = `<div class="empty-state"><h3>Error Loading Numbers</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderMyNumbers(document.getElementById('page-content'))">Retry</button></div>`; 
        }
    },

    showExportModal() {
        window.api.call('/api/ranges').then(ranges => {
            const rangeOptions = (ranges.data || []).map(r => `<option value="${r.name}">${r.name}</option>`).join('');
            window.ui.showModal('Export Numbers', `
                <div class="form-group">
                    <label class="fly-label">Export Format *</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='csv';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">📊</div>
                            <div style="font-weight:700;font-size:13px">CSV</div>
                        </label>
                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='xlsx';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">📗</div>
                            <div style="font-weight:700;font-size:13px">Excel</div>
                        </label>
                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='pdf';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">📄</div>
                            <div style="font-weight:700;font-size:13px">PDF</div>
                        </label>
                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='txt';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">📝</div>
                            <div style="font-weight:700;font-size:13px">TXT</div>
                        </label>
                    </div>
                    <input type="hidden" id="export-format" value="csv">
                </div>
                <div class="form-group">
                    <label class="fly-label">Filter by Range (Optional)</label>
                    <select id="export-range" class="fly-input">
                        <option value="all">All Ranges</option>
                        ${rangeOptions}
                    </select>
                </div>
            `, `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.numbers.doExport()">Download Export</button>`);
        }).catch(() => {
            window.ui.showToast('Failed to load ranges', 'error');
        });
    },

    doExport() {
        const format = document.getElementById('export-format').value;
        const rangeName = document.getElementById('export-range').value;
        let url = '/api/numbers-ext/export?format=' + format;
        if (rangeName && rangeName !== 'all') {
            url += '&rangeName=' + encodeURIComponent(rangeName);
        }
        window.location.href = url;
        window.ui.showToast('Generating export file...', 'info');
        window.ui.closeModal();
    },

    async revoke(id) {
        if (confirm('Revoke this number?')) {
            try { await window.api.call(`/api/numbers/${id}/revoke`, { method: 'POST' }); window.api.invalidate('/api/numbers'); window.ui.showToast('Number revoked', 'success'); this.renderMyNumbers(document.getElementById('page-content')); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    },

    async export(format) {
        window.location.href = '/api/numbers-ext/export?format=' + format;
        window.ui.showToast('Generating export file...', 'info');
    },

    async renderSelfAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/ranges?status=active');
            const user = window.auth.getUser();
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Self-Allocation Marketplace</div>
                    ${user.self_allocation_limit_enabled ? `<span class="badge badge-info">Limit: ${user.self_allocation_limit}</span>` : ''}
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; padding:20px">
                    ${res.data.map(r => `
                        <div class="stat-card" style="display:flex; flex-direction:column; gap:12px">
                            <h3 style="margin:0;font-size:16px">${r.name}</h3>
                            <div style="display:flex; justify-content:space-between"><span>Country:</span> <strong>${r.country_name || 'Global'}</strong></div>
                            <div style="display:flex; justify-content:space-between"><span>Available:</span> <strong style="color:var(--success)">${r._count.available}</strong></div>
                            <button class="fly-btn" onclick="window.numbers.showSelfAllocModal('${r.name}', ${r._count.available}, ${r.rate})" ${r._count.available === 0 ? 'disabled' : ''}>Request Numbers</button>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderSelfAllocation(document.getElementById('page-content'))">Retry</button></div>`; }
    },

    showSelfAllocModal(range, available, rate) {
        const weeklyRate = (rate * 0.85).toFixed(3);
        const monthlyRate = (rate * 0.75).toFixed(3);
        window.ui.showModal('Request Numbers from ' + range, `
            <div class="form-group">
                <label>Payment Term *</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
                    <label class="pay-method-card" id="term-weekly" onclick="document.getElementById('al-term').value='weekly';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                        <div style="font-size:24px;margin-bottom:6px">📅</div>
                        <div style="font-weight:700;font-size:13px">Weekly</div>
                        <div style="font-size:11px;color:var(--text-secondary)">$${weeklyRate}/SMS</div>
                    </label>
                    <label class="pay-method-card pay-method-card--active" id="term-monthly" onclick="document.getElementById('al-term').value='monthly';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                        <div style="font-size:24px;margin-bottom:6px">📆</div>
                        <div style="font-weight:700;font-size:13px">Monthly</div>
                        <div style="font-size:11px;color:var(--text-secondary)">$${monthlyRate}/SMS (Best)</div>
                    </label>
                </div>
                <input type="hidden" id="al-term" value="monthly">
            </div>
            <div class="form-group"><label>Quantity (Max: ${available})</label><input type="number" id="al-qty" class="fly-input" value="1" min="1" max="${available}"></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.numbers.doSelfAllocate(\''+range+'\')">Submit Request</button>');
    },

    async doSelfAllocate(range) {
        const qty = parseInt(document.getElementById('al-qty').value);
        const term = document.getElementById('al-term').value;
        try {
            await window.api.call('/api/numbers-ext/allocate', { method: 'POST', body: JSON.stringify({ rangeName: range, quantity: qty, duration: term }) });
            window.ui.showToast('Numbers allocated successfully', 'success');
            window.ui.closeModal();
            this.renderMyNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderBulkAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [users, ranges] = await Promise.all([window.api.call('/api/users?limit=100'), window.api.call('/api/ranges')]);
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Bulk Number Allocation</div></div>
                <div class="card-body" style="padding:24px">
                    <div style="padding:14px;background:rgba(99,102,241,0.08);border-radius:8px;margin-bottom:20px">
                        <div style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:4px">📋 Workflow</div>
                        <div style="font-size:12px;color:var(--text-secondary)">Step 1: Select ranges → Step 2: Select user → Step 3: Set quantity per range → Step 4: Allocate</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Step 1: Select Ranges *</label>
                        <div id="ba-ranges" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:8px">
                            ${ranges.data.map(r => `
                                <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.2s" onchange="window.numbers.updateBulkRanges()">
                                    <input type="checkbox" value="${r.name}" data-avail="${r._count.available}">
                                    <span style="flex:1;font-size:13px;font-weight:600">${r.name}</span>
                                    <span class="badge badge-success" style="font-size:10px">${r._count.available}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Step 2: Target User *</label>
                        <select id="ba-user" class="fly-input">
                            <option value="">-- Select User --</option>
                            ${users.data.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    
                    <div id="ba-qty-section" style="display:none">
                        <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Step 3: Quantity per Range</label>
                        <div id="ba-qty-inputs" style="display:flex;flex-direction:column;gap:10px"></div>
                    </div>
                    
                    <button class="fly-btn" style="width:100%;margin-top:20px" onclick="window.numbers.doBulkAlloc()">Step 4: Execute Bulk Allocation</button>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderBulkAllocation(document.getElementById('page-content'))">Retry</button></div>`; }
    },

    updateBulkRanges() {
        const checked = Array.from(document.querySelectorAll('#ba-ranges input:checked'));
        const section = document.getElementById('ba-qty-section');
        const inputs = document.getElementById('ba-qty-inputs');
        if (checked.length > 0) {
            section.style.display = 'block';
            inputs.innerHTML = checked.map(cb => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px">
                    <span style="flex:1;font-weight:600;font-size:13px">${cb.value}</span>
                    <input type="number" class="fly-input" data-range="${cb.value}" placeholder="Qty" min="1" max="${cb.dataset.avail}" style="width:100px" value="10">
                </div>
            `).join('');
        } else {
            section.style.display = 'none';
        }
    },

    async doBulkAlloc() {
        const userId = document.getElementById('ba-user').value;
        if (!userId) { window.ui.showToast('Please select a user', 'error'); return; }
        const qtyInputs = document.querySelectorAll('#ba-qty-inputs input[data-range]');
        if (qtyInputs.length === 0) { window.ui.showToast('Please select at least one range', 'error'); return; }
        
        let success = 0, failed = 0;
        for (const input of qtyInputs) {
            const range = input.dataset.range;
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                try {
                    await window.api.call('/api/numbers-ext/bulk-allocate', { method: 'POST', body: JSON.stringify({ userId, rangeName: range, quantity: qty }) });
                    success++;
                } catch (e) { failed++; }
            }
        }
        window.ui.showToast(`Allocated ${success} range(s). ${failed > 0 ? failed + ' failed.' : ''}`, success > 0 ? 'success' : 'error');
        this.renderBulkAllocation(document.getElementById('page-content'));
    },

    async renderLiveAccess(container) {
        container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Real-Time Traffic Stream</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Target</th><th>App</th><th>Msg</th></tr></thead><tbody id="la-body"></tbody></table></div></div>`;
        this.startLiveAccess();
    },

    startLiveAccess() {
        this.stopLiveAccess();
        this._laInterval = setInterval(async () => {
            const body = document.getElementById('la-body');
            if (!body) { this.stopLiveAccess(); return; }
            try {
                const res = await window.api.call('/api/sms?limit=10');
                body.innerHTML = res.data.map(s => `<tr><td>${window.ui.formatDate(s.received_at)}</td><td><code>${s.number}</code></td><td>${s.service}</td><td class="message-text">${s.message}</td></tr>`).join('') || '<tr><td colspan="4">No traffic</td></tr>';
            } catch (e) {}
        }, 5000);
    },

    stopLiveAccess() { if (this._laInterval) clearInterval(this._laInterval); },

    async renderUpload(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Bulk Import Numbers</div></div><div class="card-body"><textarea id="up-text" class="fly-input" rows="8" placeholder="+1234567890\n+9876543210"></textarea><button class="fly-btn" style="width:100%; margin-top:16px" onclick="window.numbers.doUpload()">Start Import</button></div></div>';
    },

    async doUpload() {
        const text = document.getElementById('up-text').value;
        if (!text.trim()) { window.ui.showToast('Please enter at least one number', 'error'); return; }
        try { await window.api.call('/api/numbers-ext/bulk-import', { method: 'POST', body: JSON.stringify({ numbersText: text }) }); window.api.invalidate('/api/numbers'); window.ui.showToast('Import successful', 'success'); document.getElementById('up-text').value = ''; }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderBlacklist(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers-ext/blacklist');
            container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Global App Blacklist</div><button class="fly-btn fly-btn-sm" onclick="window.numbers.showAddBl()">Add App</button></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>App</th><th>Pattern</th><th>Action</th></tr></thead><tbody>${res.data.map(b => `<tr><td>${b.app_name}</td><td><code>${b.pattern}</code></td><td><button class="action-btn delete" onclick="window.numbers.delBl('${b.id}')">${ICONS.trash}</button></td></tr>`).join('') || '<tr><td colspan="3">No rules</td></tr>'}</tbody></table></div></div>`;
        } catch (e) {}
    },

    async renderBulkTools(container) {
        container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Emergency Bulk Revocation</div></div><div class="card-body"><button class="fly-btn fly-btn-danger" style="width:100%" onclick="window.numbers.doEmergencyRevoke()">REVOKE ALL NUMBERS GLOBALLY</button></div></div>`;
    },

    async doEmergencyRevoke() {
        if (confirm('DANGER: This will unassign ALL numbers from ALL users. Continue?')) {
            try { await window.api.call('/api/numbers-ext/bulk-revoke', { method: 'POST', body: JSON.stringify({ scope: 'global' }) }); window.ui.showToast('Infrastructure reset successful', 'success'); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    },

    async renderTestNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers/test');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Test Numbers</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.numbers.showAddTest()">${ICONS.plus} Add Test Number</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Country</th><th>Range</th><th>Service</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${(res.data || []).map(n => `
                                <tr>
                                    <td><code>${window.ui.escapeHtml(n.number)}</code></td>
                                    <td>${window.ui.escapeHtml(n.country_name || '-')}</td>
                                    <td>${window.ui.escapeHtml(n.range_name || '-')}</td>
                                    <td>${n.service ? `<span class="badge badge-primary">${window.ui.escapeHtml(n.service)}</span>` : '-'}</td>
                                    <td><span class="badge badge-warning">TEST</span></td>
                                    <td><button class="action-btn delete" onclick="window.numbers.deleteTestNumber('${n.id}')">${ICONS.trash}</button></td>
                                </tr>`).join('') || '<tr class="empty-row"><td colspan="6">No test numbers added yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`; }
    },

    showAddTest() {
        // Load ranges first for the dropdown
        window.api.call('/api/ranges').then(rangesRes => {
            const rangeOptions = (rangesRes.data || []).map(r => `<option value="${r.id}" data-name="${window.ui.escapeHtml(r.name)}">${window.ui.escapeHtml(r.name)}</option>`).join('');
            window.ui.showModal('Add Test Number', `
                <div class="form-group"><label>Phone Number *</label><input type="text" id="tn-number" class="fly-input" placeholder="+12025550100"></div>
                <div class="form-row">
                    <div class="form-group"><label>Country</label><input type="text" id="tn-country" class="fly-input" placeholder="United States"></div>
                    <div class="form-group"><label>Service / App</label><input type="text" id="tn-service" class="fly-input" placeholder="Google, WhatsApp..."></div>
                </div>
                <div class="form-group"><label>Range (optional)</label><select id="tn-range" class="fly-input"><option value="">-- No Range --</option>${rangeOptions}</select></div>
            `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.numbers.doAddTest()">Add Test Number</button>');
        }).catch(() => {
            window.ui.showModal('Add Test Number', `
                <div class="form-group"><label>Phone Number *</label><input type="text" id="tn-number" class="fly-input" placeholder="+12025550100"></div>
                <div class="form-row">
                    <div class="form-group"><label>Country</label><input type="text" id="tn-country" class="fly-input" placeholder="United States"></div>
                    <div class="form-group"><label>Service / App</label><input type="text" id="tn-service" class="fly-input" placeholder="Google, WhatsApp..."></div>
                </div>
            `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.numbers.doAddTest()">Add Test Number</button>');
        });
    },

    async doAddTest() {
        const number = document.getElementById('tn-number')?.value.trim();
        if (!number) { window.ui.showToast('Phone number is required', 'error'); return; }
        const rangeEl = document.getElementById('tn-range');
        const rangeId = rangeEl?.value || null;
        const rangeName = rangeId ? rangeEl.options[rangeEl.selectedIndex]?.dataset.name : null;
        const payload = {
            number,
            countryName: document.getElementById('tn-country')?.value.trim() || 'Unknown',
            service: document.getElementById('tn-service')?.value.trim() || null,
            rangeId: rangeId || null,
            rangeName: rangeName || null
        };
        try {
            await window.api.call('/api/numbers/test', { method: 'POST', body: JSON.stringify(payload) });
            window.api.invalidate('/api/numbers');
            window.ui.showToast('Test number added', 'success');
            window.ui.closeModal();
            this.renderTestNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async deleteTestNumber(id) {
        if (!confirm('Delete this test number?')) return;
        try {
            await window.api.call('/api/numbers/' + id, { method: 'DELETE' });
            window.api.invalidate('/api/numbers');
            window.ui.showToast('Test number deleted', 'info');
            this.renderTestNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    showAddBl() {
        window.ui.showModal('Add to Blacklist', `
            <div class="form-group"><label>App Name</label><input type="text" id="bl-app" class="fly-input" placeholder="AppName"></div>
            <div class="form-group"><label>Pattern</label><input type="text" id="bl-pattern" class="fly-input" placeholder="verify.*"></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.numbers.doAddBl()">Add</button>');
    },

    async doAddBl() {
        try {
            await window.api.call('/api/numbers-ext/blacklist', { method: 'POST', body: JSON.stringify({ appName: document.getElementById('bl-app').value, pattern: document.getElementById('bl-pattern').value }) });
            window.ui.showToast('Added to blacklist', 'success');
            window.ui.closeModal();
            this.renderBlacklist(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async delBl(id) {
        if (!confirm('Remove from blacklist?')) return;
        try {
            await window.api.call('/api/numbers-ext/blacklist/' + id, { method: 'DELETE' });
            window.ui.showToast('Removed', 'info');
            this.renderBlacklist(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    }
};
window.numbers = numbers;
