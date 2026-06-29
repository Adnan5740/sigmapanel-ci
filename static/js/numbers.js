const numbers = {
    async renderMyNumbers(container, page = 1) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call(`/api/numbers?limit=50&page=${page}`);
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Virtual Numbers</div>
                    <div class="card-header-actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                        <div class="input-wrapper" style="width:200px">
                            <input type="text" id="search-mynumbers" class="search-input" placeholder="Search numbers...">
                        </div>
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.showExportModal()">${ICONS.download} Export</button>
                    </div>
                </div>
                <div id="bulk-action-bar" style="display:none;padding:10px 18px;background:rgba(115,93,255,.07);border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <span id="bulk-count" style="font-size:13px;font-weight:600;color:var(--primary)">0 selected</span>
                    <button class="fly-btn fly-btn-sm" onclick="window.numbers.bulkReturn()">${ICONS.backup} Return Selected</button>
                    <button class="fly-btn fly-btn-sm fly-btn-danger" onclick="window.numbers.bulkRevoke()">${ICONS.x} Revoke Selected</button>
                    <button class="fly-btn fly-btn-sm" style="background:linear-gradient(135deg,#10b981,#059669)" onclick="window.numbers.bulkReturnAndAllocate()">${ICONS.transfer} Return &amp; Allocate</button>
                    <button class="fly-btn fly-btn-sm" style="background:linear-gradient(135deg,#3b82f6,#2563eb)" onclick="window.numbers.bulkAllocate()">${ICONS.users} Allocate Selected</button>
                    <button class="fly-btn fly-btn-sm secondary" onclick="window.numbers.clearSelection()">Clear</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr>
                            <th style="width:36px"><input type="checkbox" id="select-all-numbers" onchange="window.numbers.toggleSelectAll(this.checked)" style="cursor:pointer;width:16px;height:16px;accent-color:var(--primary)"></th>
                            <th>Number</th><th>Range</th><th>App</th><th>Status</th><th>Payout Rate</th><th>Actions</th>
                        </tr></thead>
                        <tbody id="mynumbers-tbody">${(res.data||[]).map(n => `<tr>
                            <td><input type="checkbox" class="num-cb" data-id="${n.id}" data-range="${window.ui.escapeHtml(n.range_name||'')}" onchange="window.numbers.onCheckboxChange()" style="cursor:pointer;width:16px;height:16px;accent-color:var(--primary)"></td>
                            <td><code>${window.ui.escapeHtml(n.number)}</code></td>
                            <td><span class="badge badge-info">${window.ui.escapeHtml(n.range_name||'-')}</span></td>
                            <td>${window.ui.escapeHtml(n.service||'-')}</td>
                            <td><span class="badge ${n.status==='active'?'badge-success':'badge-danger'}">${n.status==='active'?'IPRN':window.ui.escapeHtml(n.status)}</span></td>
                            <td>$${Number(n.rate||0).toFixed(4)}</td>
                            <td><button class="action-btn" onclick="window.numbers.revoke('${n.id}')">Revoke</button></td>
                        </tr>`).join('')||'<tr class="empty-row"><td colspan="7">No numbers assigned</td></tr>'}</tbody>
                    </table>
                </div>
                ${window.ui.renderPagination(res.pagination, (p) => this.renderMyNumbers(container, p))}
            </div>`;
            window.ui.setupTableSearch('search-mynumbers', 'mynumbers-tbody');
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error Loading Numbers</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderMyNumbers(document.getElementById('page-content'))">Retry</button></div>`;
        }
    },

    _getSelectedIds() {
        return [...document.querySelectorAll('.num-cb:checked')].map(cb => cb.dataset.id);
    },

    _getSelectedRanges() {
        return [...new Set([...document.querySelectorAll('.num-cb:checked')].map(cb => cb.dataset.range).filter(Boolean))];
    },

    onCheckboxChange() {
        const ids = this._getSelectedIds();
        const bar = document.getElementById('bulk-action-bar');
        const countEl = document.getElementById('bulk-count');
        const allCb = document.getElementById('select-all-numbers');
        if (bar) bar.style.display = ids.length ? 'flex' : 'none';
        if (countEl) countEl.textContent = `${ids.length} selected`;
        if (allCb) {
            const total = document.querySelectorAll('.num-cb').length;
            allCb.indeterminate = ids.length > 0 && ids.length < total;
            allCb.checked = ids.length === total;
        }
    },

    toggleSelectAll(checked) {
        document.querySelectorAll('.num-cb').forEach(cb => { cb.checked = checked; });
        this.onCheckboxChange();
    },

    clearSelection() {
        document.querySelectorAll('.num-cb').forEach(cb => { cb.checked = false; });
        const allCb = document.getElementById('select-all-numbers');
        if (allCb) { allCb.checked = false; allCb.indeterminate = false; }
        this.onCheckboxChange();
    },

    async bulkRevoke() {
        const ids = this._getSelectedIds();
        if (!ids.length) return;
        if (!confirm(`Revoke ${ids.length} number(s)?`)) return;
        try {
            await window.api.call('/api/numbers-ext/bulk-revoke', { method: 'POST', body: JSON.stringify({ numberIds: ids }) });
            window.ui.showToast(`${ids.length} number(s) revoked`, 'success');
            this.renderMyNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async bulkReturn() {
        const ids = this._getSelectedIds();
        if (!ids.length) return;
        if (!confirm(`Return ${ids.length} number(s) to pool?`)) return;
        try {
            await window.api.call('/api/numbers-ext/bulk-revoke', { method: 'POST', body: JSON.stringify({ numberIds: ids, action: 'return' }) });
            window.ui.showToast(`${ids.length} number(s) returned`, 'success');
            this.renderMyNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async bulkReturnAndAllocate() {
        const ids = this._getSelectedIds();
        if (!ids.length) return;
        if (!confirm(`Return ${ids.length} number(s) then open allocation?`)) return;
        try {
            await window.api.call('/api/numbers-ext/bulk-revoke', { method: 'POST', body: JSON.stringify({ numberIds: ids, action: 'return' }) });
            window.ui.showToast(`${ids.length} returned — opening allocation`, 'success');
            this.showBulkAllocateModal(ids.length);
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async bulkAllocate() {
        const ids = this._getSelectedIds();
        if (!ids.length) return;
        this.showBulkAllocateModal(ids.length, ids);
    },

    async showBulkAllocateModal(count, ids = []) {
        let users = [], ranges = [];
        try {
            [{ data: users }, { data: ranges }] = await Promise.all([
                window.api.call('/api/users?limit=200'),
                window.api.call('/api/ranges?status=active')
            ]);
        } catch (e) {}
        const user = window.auth.getUser() || {};
        const isAdmin = ['admin','manager'].includes(user.role);
        window.ui.showModal('Allocate Numbers', `
            ${ids.length ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Allocating <strong>${ids.length}</strong> selected number(s).</p>` : `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Allocating <strong>${count}</strong> number(s) from pool.</p>`}
            ${isAdmin ? `<div class="form-group"><label>Assign To User *</label><select id="ba-user" class="fly-input">
                <option value="">— Select user —</option>
                ${users.map(u => `<option value="${u.id}">${window.ui.escapeHtml(u.username)} (${u.role})</option>`).join('')}
            </select></div>` : ''}
            <div class="form-group"><label>Range *</label><select id="ba-range" class="fly-input">
                <option value="">— Select range —</option>
                ${ranges.map(r => `<option value="${window.ui.escapeHtml(r.name)}">${window.ui.escapeHtml(r.name)}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Quantity</label><input type="number" id="ba-qty" class="fly-input" value="${ids.length || 1}" min="1" ${ids.length ? 'readonly' : ''}></div>
            <div class="form-group"><label>Payment Term</label><select id="ba-term" class="fly-input">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
            </select></div>
        `, `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button>
            <button class="fly-btn" onclick="window.numbers.doAllocateSelected(${JSON.stringify(ids)})">${ICONS.check} Allocate</button>`);
    },

    async doAllocateSelected(ids = []) {
        const rangeName = document.getElementById('ba-range')?.value;
        const qty = parseInt(document.getElementById('ba-qty')?.value || '1');
        const term = document.getElementById('ba-term')?.value || 'monthly';
        const userId = document.getElementById('ba-user')?.value;
        if (!rangeName) { window.ui.showToast('Select a range', 'error'); return; }
        const user = window.auth.getUser() || {};
        const isAdmin = ['admin','manager'].includes(user.role);
        try {
            const payload = isAdmin
                ? { userId, rangeName, quantity: qty, duration: term, numberIds: ids.length ? ids : undefined }
                : { rangeName, quantity: qty, duration: term };
            const endpoint = isAdmin ? '/api/numbers-ext/bulk-allocate' : '/api/numbers-ext/allocate';
            await window.api.call(endpoint, { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Numbers allocated successfully', 'success');
            window.ui.closeModal();
            this.renderMyNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderRateCard(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [rangesRes, ratesRes] = await Promise.all([
                window.api.call('/api/ranges?status=active'),
                window.api.call('/api/settings/payout-rates').catch(() => ({ weekly: 0.85, monthly: 0.75 }))
            ]);
            const ranges = rangesRes.data || [];
            const multiplier = { weekly: Number(ratesRes.weekly || 0.85), monthly: Number(ratesRes.monthly || 0.75) };

            const totalNumbers = ranges.reduce((s, r) => s + (r._count?.numbers || 0), 0);
            const totalAvail   = ranges.reduce((s, r) => s + (r._count?.available || 0), 0);
            const totalAlloc   = totalNumbers - totalAvail;

            container.innerHTML = `
            <div class="stats-grid" style="margin-bottom:20px">
                <div class="stat-card"><div class="stat-card-label">Total Ranges</div><div class="stat-card-value">${ranges.length}</div></div>
                <div class="stat-card"><div class="stat-card-label">Total Numbers</div><div class="stat-card-value">${totalNumbers.toLocaleString()}</div></div>
                <div class="stat-card"><div class="stat-card-label">Allocated</div><div class="stat-card-value" style="color:var(--primary)">${totalAlloc.toLocaleString()}</div></div>
                <div class="stat-card"><div class="stat-card-label">Available</div><div class="stat-card-value" style="color:var(--success)">${totalAvail.toLocaleString()}</div></div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${ICONS.profit} SMS Rate Card</div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <input type="text" id="rate-card-search" class="fly-input" placeholder="Search ranges..." style="width:180px" oninput="window.numbers.filterRateCard(this.value)">
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr>
                            <th>Range</th>
                            <th>Country</th>
                            <th>Weekly Payout</th>
                            <th>Monthly Payout</th>
                            <th>Daily OTP Limit</th>
                            <th>Total Nums</th>
                            <th>Allocated</th>
                            <th>Remaining</th>
                            <th>Usage</th>
                        </tr></thead>
                        <tbody id="rate-card-tbody">
                        ${ranges.length ? ranges.map(r => {
                            const base    = Number(r.rate || 0);
                            const weekly  = Number(r.weekly_rate  || base * multiplier.weekly);
                            const monthly = Number(r.monthly_rate || base * multiplier.monthly);
                            const total   = r._count?.numbers  || 0;
                            const avail   = r._count?.available || 0;
                            const alloc   = total - avail;
                            const pct     = total ? Math.round(alloc / total * 100) : 0;
                            const otpLim  = r.otp_limit_enabled && r.daily_otp_limit > 0
                                ? `${(r.otp_count_today||0).toLocaleString()} / ${Number(r.daily_otp_limit).toLocaleString()}`
                                : '<span style="color:var(--text-secondary)">Unlimited</span>';
                            return `<tr>
                                <td><strong>${window.ui.escapeHtml(r.name)}</strong>${r.provider_name?`<div style="font-size:10px;color:var(--text-secondary)">${window.ui.escapeHtml(r.provider_name)}</div>`:''}  </td>
                                <td>${window.ui.escapeHtml(r.country_name||'—')}</td>
                                <td><span class="badge badge-info">$${weekly.toFixed(4)}</span></td>
                                <td><span class="badge badge-success">$${monthly.toFixed(4)}</span></td>
                                <td>${otpLim}</td>
                                <td>${total.toLocaleString()}</td>
                                <td style="color:var(--primary);font-weight:600">${alloc.toLocaleString()}</td>
                                <td style="color:var(--success);font-weight:600">${avail.toLocaleString()}</td>
                                <td style="min-width:100px">
                                    <div style="display:flex;align-items:center;gap:6px">
                                        <div style="flex:1;height:6px;background:#e2e8f0;border-radius:10px;overflow:hidden">
                                            <div style="height:100%;width:${pct}%;background:${pct>80?'var(--danger)':pct>50?'#f59e0b':'var(--primary)'};border-radius:10px"></div>
                                        </div>
                                        <span style="font-size:11px;color:var(--text-secondary);white-space:nowrap">${pct}%</span>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('') : '<tr class="empty-row"><td colspan="9">No active ranges found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderRateCard(document.getElementById('page-content'))">Retry</button></div>`;
        }
    },

    showExportModal() {
        window.api.call('/api/ranges').then(ranges => {
            const rangeOptions = (ranges.data || []).map(r => `<option value="${window.ui.escapeHtml(r.name)}">${window.ui.escapeHtml(r.name)}</option>`).join('');
            window.ui.showModal('Export Numbers', `
                <div class="form-group">
                    <label class="fly-label">Export Format *</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                        <label class="pay-method-card pay-method-card--active" onclick="document.getElementById('export-format').value='csv';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">${ICONS.chart}</div>
                            <div style="font-weight:700;font-size:13px">CSV</div>
                        </label>
                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='xlsx';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">${ICONS.report}</div>
                            <div style="font-weight:700;font-size:13px">Excel</div>
                        </label>
                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='pdf';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">${ICONS.copy}</div>
                            <div style="font-weight:700;font-size:13px">PDF</div>
                        </label>

                        <label class="pay-method-card" onclick="document.getElementById('export-format').value='txt';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                            <div style="font-size:28px;margin-bottom:6px">${ICONS.edit}</div>
                            <div style="font-weight:700;font-size:13px">TXT</div>
                        </label>
                    </div>
                    <input type="hidden" id="export-format" value="csv">
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">Exports include production/live numbers only. Test numbers stay in the test panel and are never exported here.</div>
                <div class="form-group">
                    <label class="fly-label">Filter by Range</label>
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

    async doExport() {
        const format = document.getElementById('export-format').value;
        const rangeName = document.getElementById('export-range').value;
        let url = '/api/numbers-ext/export?format=' + encodeURIComponent(format);
        if (rangeName && rangeName !== 'all') {
            url += '&rangeName=' + encodeURIComponent(rangeName);
        }
        try {
            window.ui.showToast('Generating export file...', 'info');
            await window.api.download(url);
            window.ui.closeModal();
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    async revoke(id) {
        if (confirm('Revoke this number?')) {
            try { await window.api.call(`/api/numbers/${id}/revoke`, { method: 'POST' }); window.api.invalidate('/api/numbers'); window.ui.showToast('Number revoked', 'success'); this.renderMyNumbers(document.getElementById('page-content')); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    },

    async export(format) {
        try {
            window.ui.showToast('Generating export file...', 'info');
            await window.api.download('/api/numbers-ext/export?format=' + encodeURIComponent(format));
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        }
    },

    async renderSelfAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [res, myNums, rates] = await Promise.all([
                window.api.call('/api/ranges?status=active'),
                window.api.call('/api/numbers?limit=1'),
                window.api.call('/api/settings/payout-rates').catch(() => ({ weekly: 0.85, monthly: 0.75 }))
            ]);
            const user = window.auth.getUser() || {};
            const limitEnabled = user.self_allocation_limit_enabled;
            const limit = Number(user.self_allocation_limit || 100);
            const used = myNums.pagination ? myNums.pagination.total : 0;
            const remaining = limitEnabled ? Math.max(0, limit - used) : null;

            const limitBar = limitEnabled ? `
                <div style="padding:12px 18px;background:rgba(99,102,241,.06);border-bottom:1px solid var(--border)">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
                        <span>Allocation Quota</span>
                        <strong>${used} / ${limit} used — <span style="color:${remaining===0?'var(--danger)':'var(--success)'}">${remaining} remaining</span></strong>
                    </div>
                    <div style="height:6px;background:#e2e8f0;border-radius:10px;overflow:hidden">
                        <div style="height:100%;width:${Math.min(100,Math.round(used/limit*100))}%;background:${used>=limit?'var(--danger)':'var(--primary)'};border-radius:10px;transition:width .5s ease"></div>
                    </div>
                    ${remaining === 0 ? `<div style="margin-top:8px;color:var(--danger);font-size:12px;font-weight:600">${ICONS.alertCircle} Self allocation limit reached. Contact support for more numbers.</div>` : ''}
                </div>` : '';

            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Self-Allocation Marketplace</div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <span class="badge badge-info">Weekly payout/SMS</span>
                        <span class="badge badge-success">Monthly payout/SMS</span>
                    </div>
                </div>
                ${limitBar}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:20px">
                    ${res.data.map(r => {
                        const disabled = r._count.available === 0 || (limitEnabled && remaining === 0);
                        return `<div class="stat-card" style="display:flex;flex-direction:column;gap:10px">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <h3 style="margin:0;font-size:15px;font-weight:700">${window.ui.escapeHtml(r.name)}</h3>
                                <span class="badge badge-primary">${r.country_name || 'Global'}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:13px">
                                <span>Weekly</span><strong>$${Number(r.weekly_rate ?? r.rate ?? 0).toFixed(4)}/SMS</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:13px">
                                <span>Monthly</span><strong style="color:var(--success)">$${Number(r.monthly_rate ?? r.rate ?? 0).toFixed(4)}/SMS</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:13px">
                                <span>Available</span><strong style="color:var(--success)">${r._count.available}</strong>
                            </div>
                            <button class="fly-btn" onclick="window.numbers.showSelfAllocModal(${window.ui.jsArg(r.name)}, ${r._count.available}, ${Number(r.weekly_rate ?? r.rate ?? 0)}, ${Number(r.monthly_rate ?? r.rate ?? 0)})" ${disabled ? 'disabled' : ''}>
                                ${disabled && r._count.available > 0 ? 'Limit Reached' : 'Request Numbers'}
                            </button>
                        </div>`;
                    }).join('')}
                    ${res.data.length === 0 ? '<div class="empty-state"><p>No active ranges available</p></div>' : ''}
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderSelfAllocation(document.getElementById('page-content'))">Retry</button></div>`; }
    },

    async showSelfAllocModal(range, available, weeklyRate, monthlyRate) {
        const wr = Number(weeklyRate || 0).toFixed(4);
        const mr = Number(monthlyRate || weeklyRate || 0).toFixed(4);
        window.ui.showModal('Request Numbers from ' + range, `
            <div class="form-group">
                <label>Payment Term *</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
                    <label class="pay-method-card" id="term-weekly" onclick="document.getElementById('al-term').value='weekly';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                        <div style="margin-bottom:6px">${ICONS.report}</div>
                        <div style="font-weight:700;font-size:13px">Weekly</div>
                        <div style="font-size:11px;color:var(--text-secondary)">$${wr}/SMS</div>
                    </label>
                    <label class="pay-method-card pay-method-card--active" id="term-monthly" onclick="document.getElementById('al-term').value='monthly';document.querySelectorAll('.pay-method-card').forEach(c=>c.classList.remove('pay-method-card--active'));this.classList.add('pay-method-card--active')">
                        <div style="margin-bottom:6px">${ICONS.profit}</div>
                        <div style="font-weight:700;font-size:13px">Monthly</div>
                        <div style="font-size:11px;color:var(--text-secondary)">$${mr}/SMS (Best)</div>
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
            window.ui.closeModal();
            window.ui.showSuccess(
                '✓ Numbers Allocated',
                `<strong>${qty}</strong> number(s) allocated on <strong>${term}</strong> plan.<br><span style="color:var(--text-secondary);font-size:12px">They are now available in My Numbers.</span>`,
                { url: '/api/numbers-ext/export?format=txt', filename: 'my-numbers.txt' }
            );
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
                        <label>Step 1: Select Ranges * (Search)</label>
                        <input type="text" id="ba-range-search" class="fly-input" placeholder="Search ranges..." oninput="window.numbers.filterBulkRanges(this.value)" style="margin-bottom:10px">
                        <div id="ba-ranges" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:8px">
                            ${ranges.data.map(r => `
                                <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.2s">
                                    <input type="checkbox" value="${r.name}" data-avail="${r._count.available}" onchange="window.numbers.updateBulkRanges()">
                                    <span style="flex:1;font-size:13px;font-weight:600">${r.name}</span>
                                    <span class="badge badge-success" style="font-size:10px">${r._count.available}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Step 2: Target User * (Search)</label>
                        <input type="text" id="ba-user-search" class="fly-input" placeholder="Search users..." oninput="window.numbers.filterBulkUsers(this.value)" style="margin-bottom:10px">
                        <select id="ba-user" class="fly-input">
                            <option value="">-- Select User --</option>
                            ${users.data.map(u => `<option value="${u.id}" data-username="${u.username}" data-role="${u.role}">${u.username} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    
                    <div id="ba-qty-section" style="display:none">
                        <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Step 3: Quantity &amp; Payout Margin per Range</label>
                        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">Leave payout blank to use the range default margin.</div>
                        <div id="ba-qty-inputs" style="display:flex;flex-direction:column;gap:10px"></div>
                    </div>
                    
                    <button class="fly-btn" style="width:100%;margin-top:20px" onclick="window.numbers.doBulkAlloc()">Step 4: Execute Bulk Allocation</button>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p><button class="fly-btn" onclick="window.numbers.renderBulkAllocation(document.getElementById('page-content'))">Retry</button></div>`; }
    },
    
    filterBulkRanges(query) {
        const labels = document.querySelectorAll('#ba-ranges label');
        labels.forEach(label => {
            const rangeName = label.querySelector('span:nth-child(2)').textContent.toLowerCase();
            if (rangeName.includes(query.toLowerCase())) {
                label.style.display = '';
            } else {
                label.style.display = 'none';
            }
        });
    },
    
    filterRateCard(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('#rate-card-tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    },

    filterBulkUsers(query) {        const options = document.querySelectorAll('#ba-user option');
        options.forEach(opt => {
            if (opt.value === '') return; // Always show the placeholder
            const username = (opt.dataset.username || '').toLowerCase();
            const role = (opt.dataset.role || '').toLowerCase();
            const searchText = (username + ' ' + role).includes(query.toLowerCase());
            opt.style.display = searchText ? '' : 'none';
        });
    },

    updateBulkRanges() {
        const checked = Array.from(document.querySelectorAll('#ba-ranges input:checked'));
        const section = document.getElementById('ba-qty-section');
        const inputs = document.getElementById('ba-qty-inputs');
        if (checked.length > 0) {
            section.style.display = 'block';
            inputs.innerHTML = checked.map(cb => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px;flex-wrap:wrap">
                    <span style="flex:1;min-width:120px;font-weight:600;font-size:13px">${cb.value}</span>
                    <input type="number" class="fly-input ba-qty" data-range="${cb.value}" placeholder="Qty" min="1" max="${cb.dataset.avail}" style="width:90px" value="10">
                    <input type="number" class="fly-input ba-margin" data-range="${cb.value}" placeholder="Payout %" min="0" step="0.1" style="width:110px" title="Profit margin % — blank uses range default">
                </div>
            `).join('');
        } else {
            section.style.display = 'none';
        }
    },

    async doBulkAlloc() {
        const userId = document.getElementById('ba-user').value;
        if (!userId) { window.ui.showToast('Please select a user', 'error'); return; }
        const qtyInputs = document.querySelectorAll('#ba-qty-inputs .ba-qty');
        if (qtyInputs.length === 0) { window.ui.showToast('Please select at least one range', 'error'); return; }
        
        let success = 0, failed = 0;
        for (const input of qtyInputs) {
            const range = input.dataset.range;
            const qty = parseInt(input.value) || 0;
            const marginEl = document.querySelector(`#ba-qty-inputs .ba-margin[data-range="${CSS.escape(range)}"]`);
            const marginRaw = marginEl?.value;
            const payload = { userId, rangeName: range, quantity: qty };
            if (marginRaw !== '' && marginRaw != null) payload.profitMargin = Number(marginRaw);
            if (qty > 0) {
                try {
                    await window.api.call('/api/numbers-ext/bulk-allocate', { method: 'POST', body: JSON.stringify(payload) });
                    success++;
                } catch (e) { failed++; window.ui.showToast(e.message, 'error'); }
            }
        }
        if (success > 0) {
            window.ui.showSuccess('✓ Bulk Allocation Done',
                `Allocated numbers from <strong>${success}</strong> range(s).${failed > 0 ? `<br><span style="color:var(--danger);font-size:12px">${failed} range(s) failed.</span>` : ''}`,
                { url: '/api/numbers-ext/export?format=txt', filename: 'allocated-numbers.txt' }
            );
        } else {
            window.ui.showToast('Allocation failed', 'error');
        }
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
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const ranges = await window.api.call('/api/ranges');
            const options = (ranges.data || []).map(r => `
                <option value="${window.ui.escapeHtml(r.id)}" data-name="${window.ui.escapeHtml(r.name || '')}" data-country="${window.ui.escapeHtml(r.country_name || '')}">
                    ${window.ui.escapeHtml(r.name || '-')} ${r.provider_name ? '- ' + window.ui.escapeHtml(r.provider_name) : ''}
                </option>`).join('');
            container.innerHTML = `
            <div class="card professional-card upload-panel">
                <div class="card-header professional-header">
                    <div>
                        <div class="card-title">Bulk Import Numbers</div>
                        <div class="professional-subtitle">Select the destination range first, then paste or upload TXT/CSV numbers.</div>
                    </div>
                    <span class="badge badge-info">${(ranges.data || []).length} Ranges</span>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="fly-label" for="up-range">Destination Range *</label>
                            <select id="up-range" class="fly-input">
                                <option value="">Select range...</option>
                                ${options}
                            </select>
                            <div class="field-help">Imported numbers become live/assignable numbers in this range.</div>
                        </div>
                        <div class="form-group">
                            <label class="fly-label" for="up-country">Country Override</label>
                            <input type="text" id="up-country" class="fly-input" placeholder="Leave blank to use range country">
                            <div class="field-help">Use only when this batch country differs from the range default.</div>
                        </div>
                    </div>
                    <div class="professional-note">
                        <strong>Import format</strong>
                        <span>One number per line. Spaces, dashes, brackets, and 00 prefixes are normalized before saving.</span>
                    </div>
                    <div class="form-group">
                        <div class="upload-toolbar">
                            <label class="fly-label" for="up-text">Numbers *</label>
                            <div class="upload-toolbar-actions">
                                <button type="button" class="fly-btn fly-btn-sm fly-btn-secondary" onclick="document.getElementById('up-file').click()">${ICONS.upload} Upload TXT/CSV</button>
                                <input type="file" id="up-file" accept=".txt,.csv,text/plain,text/csv" style="display:none" onchange="window.numbers.loadUploadFile(this)">
                            </div>
                        </div>
                        <textarea id="up-text" class="fly-input upload-textarea" rows="12" placeholder="+1234567890&#10;+9876543210&#10;001234567890"></textarea>
                    </div>
                    <button class="fly-btn upload-submit-btn" onclick="window.numbers.doUpload()">${ICONS.upload} Import Numbers</button>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Unable to load upload tool</h3><p>${window.ui.escapeHtml(e.message)}</p></div>`;
        }
    },

    loadUploadFile(input) {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = String(e.target.result || '').replace(/,/g, '\n');
            const target = document.getElementById('up-text');
            if (target) target.value = text;
            const count = text.split(/[\n;]+/).map(v => v.trim()).filter(Boolean).length;
            window.ui.showToast(`Loaded ${count} number(s) from file`, 'success');
        };
        reader.onerror = () => window.ui.showToast('Could not read upload file', 'error');
        reader.readAsText(file);
        input.value = '';
    },

    async doUpload() {
        const text = document.getElementById('up-text')?.value || '';
        const rangeEl = document.getElementById('up-range');
        const rangeId = rangeEl?.value || '';
        const selected = rangeEl && rangeEl.selectedIndex >= 0 ? rangeEl.options[rangeEl.selectedIndex] : null;
        const rangeName = selected?.dataset?.name || '';
        const countryName = document.getElementById('up-country')?.value.trim();
        if (!rangeId) { window.ui.showToast('Please select a destination range', 'error'); return; }
        if (!text.trim()) { window.ui.showToast('Please enter at least one number', 'error'); return; }
        const btn = document.querySelector('.upload-submit-btn');
        if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<span class="spinner spinner-inline"></span> Importing'; }
        try {
            const payload = { numbersText: text, rangeId, rangeName };
            if (countryName) payload.countryName = countryName;
            const res = await window.api.call('/api/numbers-ext/bulk-import', { method: 'POST', body: JSON.stringify(payload), silentSuccess: true });
            window.api.invalidate('/api/numbers');
            window.api.invalidate('/api/ranges');
            document.getElementById('up-text').value = '';
            window.ui.showSuccess(
                'Numbers Imported',
                `<strong>${res.success || 0}</strong> number(s) imported into <strong>${window.ui.escapeHtml(res.rangeName || rangeName)}</strong>${res.skipped ? `<br><span style="color:var(--text-secondary);font-size:12px">${res.skipped} duplicate or invalid number(s) skipped.</span>` : ''}`,
                null
            );
        } catch (e) { window.ui.showToast(e.message, 'error'); }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText || 'Import Numbers'; } }
    },

    async renderBlacklist(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers-ext/blacklist');
            container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Global App Blacklist</div><button class="fly-btn fly-btn-sm" onclick="window.numbers.showAddBl()">Add App</button></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>App</th><th>Pattern</th><th>Action</th></tr></thead><tbody>${res.data.map(b => `<tr><td>${b.app_name}</td><td><code>${b.pattern}</code></td><td><button class="action-btn delete" onclick="window.numbers.delBl('${b.id}')">${ICONS.trash}</button></td></tr>`).join('') || '<tr><td colspan="3">No rules</td></tr>'}</tbody></table></div></div>`;
        } catch (e) {}
    },

    async renderBulkTools(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [users, ranges] = await Promise.all([
                window.api.call('/api/users?limit=200'),
                window.api.call('/api/ranges')
            ]);
            const role = window.auth.getUser()?.role || '';
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Revoke Numbers</div></div>
                <div class="card-body" style="padding:24px">
                    <div class="form-group">
                        <label>Revoke Scope *</label>
                        <select id="rv-scope" class="fly-input" onchange="window.numbers.toggleRevokeFields()">
                            <option value="user">Specific User</option>
                            <option value="range">Specific Range</option>
                            ${role === 'admin' ? '<option value="global">All Numbers (Global)</option>' : ''}
                        </select>
                    </div>
                    <div class="form-group" id="rv-user-wrap">
                        <label>Target User</label>
                        <select id="rv-user" class="fly-input">
                            <option value="">-- Select User --</option>
                            ${users.data.map(u => `<option value="${u.id}">${window.ui.escapeHtml(u.username)} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" id="rv-range-wrap" style="display:none">
                        <label>Target Range</label>
                        <select id="rv-range" class="fly-input">
                            <option value="">-- Select Range --</option>
                            ${ranges.data.map(r => `<option value="${window.ui.escapeHtml(r.name)}">${window.ui.escapeHtml(r.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div style="padding:12px;background:rgba(239,68,68,0.08);border-radius:8px;margin-bottom:16px;font-size:12px;color:var(--danger)">
                        Revoked numbers are unassigned from users but remain in inventory. Test numbers are never affected.
                    </div>
                    <button class="fly-btn fly-btn-danger" style="width:100%" onclick="window.numbers.doBulkRevoke()">Execute Revocation</button>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    toggleRevokeFields() {
        const scope = document.getElementById('rv-scope')?.value;
        const userWrap = document.getElementById('rv-user-wrap');
        const rangeWrap = document.getElementById('rv-range-wrap');
        if (userWrap) userWrap.style.display = scope === 'user' ? 'block' : 'none';
        if (rangeWrap) rangeWrap.style.display = scope === 'range' ? 'block' : 'none';
    },

    async doBulkRevoke() {
        const scope = document.getElementById('rv-scope').value;
        const payload = { scope };
        if (scope === 'user') {
            payload.userId = document.getElementById('rv-user').value;
            if (!payload.userId) { window.ui.showToast('Select a user to revoke', 'error'); return; }
        } else if (scope === 'range') {
            payload.rangeName = document.getElementById('rv-range').value;
            if (!payload.rangeName) { window.ui.showToast('Select a range to revoke', 'error'); return; }
        } else if (scope === 'global' && !confirm('DANGER: Revoke ALL production numbers from ALL users?')) {
            return;
        }
        try {
            await window.api.call('/api/numbers-ext/bulk-revoke', { method: 'POST', body: JSON.stringify(payload) });
            window.api.invalidate('/api/numbers');
            window.ui.showToast('Numbers revoked successfully', 'success');
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderAllocationHistory(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [allocs, users, ranges] = await Promise.all([
                window.api.call('/api/numbers-ext/allocations?limit=200'),
                window.api.call('/api/users?limit=200'),
                window.api.call('/api/ranges')
            ]);
            const rows = allocs.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Allocation History</div></div>
                <div class="filter-bar filter-bar-labeled">
                    <div class="filter-field"><label>User</label><select id="ah-user" class="filter-select" onchange="window.numbers.reloadAllocationHistory()"><option value="">All Users</option>${(users.data || []).map(u => `<option value="${u.id}">${window.ui.escapeHtml(u.username)} (${u.role})</option>`).join('')}</select></div>
                    <div class="filter-field"><label>Range</label><select id="ah-range" class="filter-select" onchange="window.numbers.reloadAllocationHistory()"><option value="">All Ranges</option>${(ranges.data || []).map(r => `<option value="${window.ui.escapeHtml(r.name)}">${window.ui.escapeHtml(r.name)}</option>`).join('')}</select></div>
                    <div class="filter-field"><label>Status</label><select id="ah-status" class="filter-select" onchange="window.numbers.reloadAllocationHistory()"><option value="">All</option><option value="active">Active</option><option value="revoked">Revoked</option></select></div>
                </div>
                <div id="allocation-history-table">${this.renderAllocationRows(rows)}</div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`; }
    },

    renderAllocationRows(rows) {
        return `<div class="table-wrapper"><table class="fly-table">
            <thead><tr><th>Time</th><th>User</th><th>Range</th><th>Number</th><th>Status</th></tr></thead>
            <tbody>${rows.map(a => `<tr><td style="font-size:11px">${window.ui.formatDate(a.created_at)}</td><td><strong>${window.ui.escapeHtml(a.username || '-')}</strong></td><td>${window.ui.escapeHtml(a.range_name || '-')}</td><td><code>${window.ui.escapeHtml(a.number || a.number_id || '-')}</code></td><td><span class="badge ${a.status === 'active' ? 'badge-success' : 'badge-secondary'}">${window.ui.escapeHtml(a.status || '-')}</span></td></tr>`).join('') || '<tr class="empty-row"><td colspan="5">No allocation records found</td></tr>'}</tbody>
        </table></div>`;
    },

    async reloadAllocationHistory() {
        const userId = document.getElementById('ah-user')?.value || '';
        const rangeName = document.getElementById('ah-range')?.value || '';
        const status = document.getElementById('ah-status')?.value || '';
        let url = '/api/numbers-ext/allocations?limit=200';
        if (userId) url += '&userId=' + encodeURIComponent(userId);
        if (rangeName) url += '&rangeName=' + encodeURIComponent(rangeName);
        if (status) url += '&status=' + encodeURIComponent(status);
        try {
            const res = await window.api.call(url);
            const target = document.getElementById('allocation-history-table');
            if (target) target.innerHTML = this.renderAllocationRows(res.data || []);
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderClientAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [users, ranges, myNumbers] = await Promise.all([
                window.api.call('/api/users?limit=200'),
                window.api.call('/api/ranges'),
                window.api.call('/api/numbers?limit=500')
            ]);
            const clients = users.data.filter(u => u.role === 'sub_reseller');
            const myRanges = [...new Set((myNumbers.data || []).map(n => n.range_name).filter(Boolean))];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Allocate Numbers to Clients</div></div>
                <div class="card-body" style="padding:24px">
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">Transfer IPRN numbers from your inventory to a client account. Set a custom payout margin or leave blank for the range default.</div>
                    <div class="form-group">
                        <label>Client Account * (Search)</label>
                        <input type="text" id="ca-user-search" class="fly-input" placeholder="Search clients..." oninput="window.numbers.filterClientUsers(this.value)" style="margin-bottom:10px">
                        <select id="ca-user" class="fly-input">
                            <option value="">-- Select Client --</option>
                            ${clients.map(u => `<option value="${u.id}" data-username="${u.username}">${window.ui.escapeHtml(u.username)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Range * (Search)</label>
                            <input type="text" id="ca-range-search" class="fly-input" placeholder="Search ranges..." oninput="window.numbers.filterClientRanges(this.value)" style="margin-bottom:10px">
                            <select id="ca-range" class="fly-input">
                                <option value="">-- Select Range --</option>
                                ${myRanges.map(r => `<option value="${window.ui.escapeHtml(r)}" data-rangename="${r}">${window.ui.escapeHtml(r)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" id="ca-qty" class="fly-input" min="1" value="1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Payout Margin % (optional)</label>
                        <input type="number" id="ca-margin" class="fly-input" min="0" step="0.1" placeholder="Uses range default if blank">
                    </div>
                    <button class="fly-btn" style="width:100%" onclick="window.numbers.doClientAllocate()">Allocate to Client</button>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },
    
    filterClientUsers(query) {
        const options = document.querySelectorAll('#ca-user option');
        options.forEach(opt => {
            if (opt.value === '') return; // Always show the placeholder
            const username = (opt.dataset.username || '').toLowerCase();
            const searchText = username.includes(query.toLowerCase());
            opt.style.display = searchText ? '' : 'none';
        });
    },
    
    filterClientRanges(query) {
        const options = document.querySelectorAll('#ca-range option');
        options.forEach(opt => {
            if (opt.value === '') return; // Always show the placeholder
            const rangename = (opt.dataset.rangename || '').toLowerCase();
            const searchText = rangename.includes(query.toLowerCase());
            opt.style.display = searchText ? '' : 'none';
        });
    },

    async doClientAllocate() {
        const userId = document.getElementById('ca-user').value;
        const rangeName = document.getElementById('ca-range').value;
        const quantity = parseInt(document.getElementById('ca-qty').value) || 0;
        const marginRaw = document.getElementById('ca-margin').value;
        if (!userId || !rangeName || quantity < 1) {
            window.ui.showToast('Client, range, and quantity are required', 'error');
            return;
        }
        const payload = { userId, rangeName, quantity };
        if (marginRaw !== '') payload.profitMargin = Number(marginRaw);
        try {
            await window.api.call('/api/numbers-ext/reseller-allocate', { method: 'POST', body: JSON.stringify(payload) });
            window.api.invalidate('/api/numbers');
            const qty3 = parseInt(document.getElementById('ca-qty')?.value||'0');
            window.ui.showSuccess('✓ Client Allocation Done',
                `<strong>${qty3}</strong> number(s) transferred to client successfully.`,
                { url: '/api/numbers-ext/export?format=txt', filename: 'client-numbers.txt' }
            );
            this.renderClientAllocation(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderTestNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers/test');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Test Numbers</div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                        <div class="input-wrapper" style="width:200px">
                            <input type="text" id="search-testnumbers" class="search-input" placeholder="Search test numbers...">
                        </div>
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.showAddTest()">${ICONS.plus} Add Test Number</button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Country</th><th>Range</th><th>Service</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody id="testnumbers-tbody">
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
            window.ui.setupTableSearch('search-testnumbers', 'testnumbers-tbody');
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
