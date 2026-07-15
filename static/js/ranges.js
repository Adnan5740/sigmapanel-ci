const ranges = {
    async renderRanges(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/ranges');
            const user = window.auth.getUser() || {};
            const isAdmin = user.role === 'admin';
            const canManage = ['admin','manager'].includes(user.role);
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMS Range Inventory</div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                        <div class="input-wrapper" style="width:200px">
                            <input type="text" id="search-ranges" class="search-input" placeholder="Search ranges...">
                        </div>
                        ${canManage ? `<button class="fly-btn fly-btn-sm" onclick="window.ranges.showAdd()">${ICONS.plus} Create Range</button>` : ''}
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th>${canManage ? '<th>Provider</th><th>Real Range</th>' : ''}<th>Country</th><th>Weekly Payout</th><th>Monthly Payout</th><th>Recv Limit</th><th>Numbers</th><th>Available</th><th>Actions</th></tr></thead>
                        <tbody id="ranges-tbody">
                            ${res.data.map(r => `
                                <tr>
                                    <td><strong>${window.ui.escapeHtml(r.name)}</strong></td>
                                    ${canManage ? `<td>${r.provider_name ? `<span class="badge badge-info">${window.ui.escapeHtml(r.provider_name)}</span>` : '-'}</td><td>${window.ui.escapeHtml(r.real_range_name || '-')}</td>` : ''}
                                    <td>${window.ui.escapeHtml(r.country_name || '-')}</td>
                                    <td><span class="badge badge-info">$${Number(r.weekly_rate ?? r.rate ?? 0).toFixed(4)}</span></td>
                                    <td><span class="badge badge-success">$${Number(r.monthly_rate ?? r.rate ?? 0).toFixed(4)}</span></td>
                                    <td>${r.sms_receive_limit > 0 ? `<span class="badge badge-warning">${r.sms_receive_limit}</span>` : '<span class="badge badge-secondary">∞</span>'}</td>
                                    <td><span class="badge badge-secondary">${r._count.numbers}</span></td>
                                    <td><span class="badge badge-success">${r._count.available}</span></td>
                                    <td class="actions-cell">
                                        ${canManage ? `
                                        <button class="action-btn" title="Add Numbers" onclick="window.ranges.showAddNumbers(${window.ui.jsArg(r.id)}, ${window.ui.jsArg(r.name)})">${ICONS.plus} Add Numbers</button>
                                        <button class="action-btn" title="View Numbers" onclick="window.ranges.viewNumbers(${window.ui.jsArg(r.id)}, ${window.ui.jsArg(r.name)})">${ICONS.eye} View</button>
                                        <button class="action-btn" title="Edit Range" onclick="window.ranges.showEdit('${r.id}')">${ICONS.edit} Edit</button>
                                        ${isAdmin ? `<button class="action-btn delete" title="Delete Range" onclick="window.ranges.del('${r.id}')">${ICONS.trash}</button>` : ''}
                                        ` : `
                                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.showSelfAllocModal(${window.ui.jsArg(r.name)}, ${r._count.available}, ${Number(r.weekly_rate ?? r.rate ?? 0)}, ${Number(r.monthly_rate ?? r.rate ?? 0)})"
                                        ${r._count.available === 0 ? 'disabled' : ''}>Allocate Numbers</button>
                                        `}
                                    </td>
                                </tr>`).join('') || `<tr class="empty-row"><td colspan="${canManage ? 9 : 7}">No ranges found</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>`;
            window.ui.setupTableSearch('search-ranges', 'ranges-tbody');
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    async showEdit(rangeId) {
        try {
            const res = await window.api.call('/api/ranges');
            const r = (res.data || []).find(x => x.id === rangeId);
            if (!r) { window.ui.showToast('Range not found', 'error'); return; }
            window.ui.showModal('Edit Range: ' + r.name, `
                <div class="form-group"><label class="fly-label">Display Range Name *</label><input type="text" id="er-name" class="fly-input" value="${window.ui.escapeHtml(r.name || '')}"></div>
                <div class="form-row">
                    <div class="form-group"><label class="fly-label">Real Range Name</label><input type="text" id="er-real-name" class="fly-input" value="${window.ui.escapeHtml(r.real_range_name || '')}" placeholder="Provider/internal range label"></div>
                    <div class="form-group"><label class="fly-label">Provider Name</label><input type="text" id="er-provider" class="fly-input" value="${window.ui.escapeHtml(r.provider_name || '')}" placeholder="Carrier or supplier"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="fly-label">Number Prefix</label><input type="text" id="er-pre" class="fly-input" value="${window.ui.escapeHtml(r.number_prefix || '')}"></div>
                    <div class="form-group"><label class="fly-label">Country</label><input type="text" id="er-country" class="fly-input" value="${window.ui.escapeHtml(r.country_name || '')}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="fly-label">Weekly Payout per SMS ($)</label><input type="number" id="er-weekly-rate" class="fly-input" min="0" step="0.0001" value="${Number(r.weekly_rate ?? r.rate ?? 0)}"></div>
                    <div class="form-group"><label class="fly-label">Monthly Payout per SMS ($)</label><input type="number" id="er-monthly-rate" class="fly-input" min="0" step="0.0001" value="${Number(r.monthly_rate ?? r.rate ?? 0)}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="fly-label">Daily OTP Limit</label><input type="number" id="er-otp-limit" class="fly-input" min="0" value="${Number(r.daily_otp_limit || 0)}"></div>
                    <div class="form-group"><label class="fly-label">OTP Limit</label><select id="er-otp-enabled" class="fly-input"><option value="0" ${!r.otp_limit_enabled ? 'selected' : ''}>Disabled</option><option value="1" ${r.otp_limit_enabled ? 'selected' : ''}>Enabled</option></select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="fly-label">SMS Receive Limit / Number</label><input type="number" id="er-recv-limit" class="fly-input" min="0" value="${Number(r.sms_receive_limit || 0)}"></div>
                    <div class="form-group"><label class="fly-label">Status</label><select id="er-status" class="fly-input"><option value="active" ${r.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${r.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="revoked" ${r.status === 'revoked' ? 'selected' : ''}>Revoked</option></select></div>
                </div>
            `, `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.saveEdit('${rangeId}')">Save Range</button>`, 'large');
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async saveEdit(rangeId) {
        const payload = {
            name: document.getElementById('er-name').value.trim(),
            realRangeName: document.getElementById('er-real-name').value.trim(),
            providerName: document.getElementById('er-provider').value.trim(),
            numberPrefix: document.getElementById('er-pre').value.trim(),
            countryName: document.getElementById('er-country').value.trim(),
            weeklyRate: Number(document.getElementById('er-weekly-rate').value),
            monthlyRate: Number(document.getElementById('er-monthly-rate').value),
            dailyOtpLimit: parseInt(document.getElementById('er-otp-limit').value || '0'),
            otpLimitEnabled: parseInt(document.getElementById('er-otp-enabled').value || '0'),
            smsReceiveLimit: parseInt(document.getElementById('er-recv-limit').value || '0'),
            status: document.getElementById('er-status').value
        };
        if (!payload.name) { window.ui.showToast('Range name is required', 'error'); return; }
        try {
            await window.api.call('/api/ranges/' + rangeId, { method: 'PUT', body: JSON.stringify(payload) });
            window.api.invalidate('/api/ranges');
            window.ui.showToast('Range updated', 'success');
            window.ui.closeModal();
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    showAdd() {
        window.ui.showModal('Create New Range', `
            <div class="form-group"><label class="fly-label">Display Range Name *</label><input type="text" id="rn-name" class="fly-input" placeholder="e.g. US WhatsApp - Public"></div>
            <div class="form-row">
                <div class="form-group"><label class="fly-label">Real Range Name</label><input type="text" id="rn-real-name" class="fly-input" placeholder="Provider/internal range label"></div>
                <div class="form-group"><label class="fly-label">Provider Name</label><input type="text" id="rn-provider" class="fly-input" placeholder="Carrier or supplier"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="fly-label">Number Prefix</label><input type="text" id="rn-pre" class="fly-input" placeholder="+1"></div>
                <div class="form-group"><label class="fly-label">Country Name</label><input type="text" id="rn-cn" class="fly-input" placeholder="United States"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="fly-label">Weekly Payout per SMS ($)</label><input type="number" id="rn-weekly-rate" class="fly-input" value="0.05" step="0.0001" min="0" placeholder="e.g. 0.05"></div>
                <div class="form-group"><label class="fly-label">Monthly Payout per SMS ($)</label><input type="number" id="rn-monthly-rate" class="fly-input" value="0.04" step="0.0001" min="0" placeholder="e.g. 0.04"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="fly-label">Daily OTP Limit (0 = unlimited)</label>
                    <input type="number" id="rn-otp-limit" class="fly-input" value="0" min="0" placeholder="e.g., 1000">
                </div>
                <div class="form-group">
                    <label class="fly-label">Enable OTP Limit</label>
                    <select id="rn-otp-enabled" class="fly-input">
                        <option value="0">Disabled</option>
                        <option value="1">Enabled</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="fly-label">SMS Receive Limit per Number <span style="color:var(--text-secondary);font-weight:400">(0 = unlimited)</span></label>
                <input type="number" id="rn-recv-limit" class="fly-input" value="0" min="0" placeholder="e.g., 500">
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Once a number reaches this limit, payout stops for that number.</div>
            </div>
            <div class="professional-note professional-note-warning">
                If the OTP limit is exceeded, payout will be set to $0 for this range.
            </div>
            <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
            <div class="professional-note">
                <strong>Optional import during creation</strong>
                <span>You can add test numbers and IPRN numbers now, or import them later from the upload menu.</span>
            </div>
            <div class="form-group">
                <label class="fly-label">Test Numbers (optional)</label>
                <div style="display:flex;gap:10px;margin-bottom:8px">
                    <button type="button" class="fly-btn fly-btn-sm fly-btn-secondary" onclick="document.getElementById('test-file').click()">
                        ${ICONS.upload} Upload File
                    </button>
                    <input type="file" id="test-file" accept=".txt,.csv" style="display:none" onchange="window.ranges.loadFile(this, 'rn-test-nums')">
                    <span style="font-size:11px;color:var(--text-secondary);align-self:center">Supports .txt or .csv files</span>
                </div>
                <textarea id="rn-test-nums" class="fly-input" rows="4" placeholder="+12025550100&#10;+12025550101&#10;+12025550102" style="font-family:monospace;font-size:12px"></textarea>
                <div class="field-help">Test numbers will appear in the Test Panel.</div>
            </div>
            <div class="form-group">
                <label class="fly-label">IPRN / Assignable Numbers (optional)</label>
                <div style="display:flex;gap:10px;margin-bottom:8px">
                    <button type="button" class="fly-btn fly-btn-sm fly-btn-secondary" onclick="document.getElementById('assign-file').click()">
                        ${ICONS.upload} Upload File
                    </button>
                    <input type="file" id="assign-file" accept=".txt,.csv" style="display:none" onchange="window.ranges.loadFile(this, 'rn-assign-nums')">
                    <span style="font-size:11px;color:var(--text-secondary);align-self:center">Supports .txt or .csv files</span>
                </div>
                <textarea id="rn-assign-nums" class="fly-input" rows="6" placeholder="+12025550200&#10;+12025550201&#10;+12025550202" style="font-family:monospace;font-size:12px"></textarea>
                <div class="field-help">These numbers will be available for allocation to resellers.</div>
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.save()">Create Range</button>', 'large');
    },

    parseNumbers(text) {
        return String(text || '')
            .split(/[\n,;]+/)
            .map(n => n.trim())
            .filter(Boolean);
    },

    async save() {
        const name = document.getElementById('rn-name').value.trim();
        if (!name) { window.ui.showToast('Range name is required', 'error'); return; }

        const submitBtn = document.querySelector('.modal-footer .fly-btn:not(.secondary)');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.innerHTML; submitBtn.innerHTML = '<span class="spinner spinner-inline"></span> Creating'; }
        const testNumsText = document.getElementById('rn-test-nums').value.trim();
        const assignNumsText = document.getElementById('rn-assign-nums').value.trim();
        
        const payload = {
            name,
            realRangeName: document.getElementById('rn-real-name').value.trim(),
            providerName: document.getElementById('rn-provider').value.trim(),
            numberPrefix: document.getElementById('rn-pre').value.trim(),
            weeklyRate: parseFloat(document.getElementById('rn-weekly-rate').value) || 0.05,
            monthlyRate: parseFloat(document.getElementById('rn-monthly-rate').value) || 0.04,
            countryName: document.getElementById('rn-cn').value.trim() || 'Global',
            dailyOtpLimit: parseInt(document.getElementById('rn-otp-limit').value) || 0,
            otpLimitEnabled: parseInt(document.getElementById('rn-otp-enabled').value) || 0,
            smsReceiveLimit: parseInt(document.getElementById('rn-recv-limit').value) || 0
        };
        try {
            const result = await window.api.call('/api/ranges', { method: 'POST', body: JSON.stringify(payload) });
            const rangeId = result.id || result.range_id;
            if (!rangeId) throw new Error('Range created but backend did not return a range ID');

            // Add test numbers independently (don't let failure block IPRN numbers)
            if (testNumsText) {
                const testNumbers = this.parseNumbers(testNumsText);
                if (testNumbers.length > 0) {
                    try {
                        const res = await window.api.call(`/api/ranges/${rangeId}/test-numbers`, {
                            method: 'POST',
                            body: JSON.stringify({ numbers: testNumbers })
                        });
                        window.ui.showToast(res.message || `Added ${res.added || testNumbers.length} test number(s)`, 'success');
                    } catch (testErr) {
                        window.ui.showToast('Test numbers: ' + testErr.message, 'error');
                    }
                }
            }

            // Add assignable/IPRN numbers independently
            if (assignNumsText) {
                const assignNumbers = this.parseNumbers(assignNumsText);
                if (assignNumbers.length > 0) {
                    try {
                        const res = await window.api.call(`/api/ranges/${rangeId}/numbers`, {
                            method: 'POST',
                            body: JSON.stringify({ numbers: assignNumbers })
                        });
                        window.ui.showToast(res.message || `Added ${res.added || assignNumbers.length} IPRN number(s)`, 'success');
                    } catch (iprnErr) {
                        window.ui.showToast('IPRN numbers: ' + iprnErr.message, 'error');
                    }
                }
            }

            window.api.invalidate('/api/ranges');
            window.ui.closeModal();
            window.ui.showSuccess(
                '✓ Range Created',
                `Range <strong>${name}</strong> is ready.${assignNumsText ? ' IPRN numbers have been added.' : ''}${testNumsText ? ' Test numbers have been added.' : ''}`,
                null
            );
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) {
            window.ui.showToast(e.message, 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = submitBtn.dataset.originalText || 'Create Range'; }
        }
    },

    showAddNumbers(rangeId, rangeName) {
        window.ui.showModal('Add Numbers to ' + rangeName, `
            <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px">Enter one phone number per line. Numbers will be added to the <strong>${window.ui.escapeHtml(rangeName)}</strong> range.</p>
            <div class="form-group">
                <label>Phone Numbers (one per line) *</label>
                <textarea id="rn-numbers" class="fly-input" rows="8" placeholder="+12025550100\n+12025550101\n+12025550102" style="resize:vertical; font-family:monospace"></textarea>
            </div>
            <div class="form-group"><label>Country Name (optional override)</label><input type="text" id="rn-num-country" class="fly-input" placeholder="Leave blank to use range default"></div>
        `, `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.doAddNumbers('${rangeId}')">Add Numbers</button>`,
        'large');
    },

    async doAddNumbers(rangeId) {
        const text = document.getElementById('rn-numbers').value.trim();
        if (!text) { window.ui.showToast('Please enter at least one number', 'error'); return; }
        const numbers = this.parseNumbers(text);
        if (numbers.length === 0) { window.ui.showToast('No valid numbers found', 'error'); return; }
        const countryName = document.getElementById('rn-num-country').value.trim() || undefined;
        const payload = { numbers, ...(countryName && { countryName }) };
        try {
            const res = await window.api.call(`/api/ranges/${rangeId}/numbers`, { method: 'POST', body: JSON.stringify(payload) });
            window.ui.closeModal();
            window.ui.showSuccess(
                '✓ Numbers Added',
                `<strong>${res.added || numbers.length}</strong> number(s) added to range${res.skipped ? `<br><span style="color:var(--text-secondary);font-size:12px">${res.skipped} duplicate(s) skipped</span>` : ''}`,
                null
            );
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async viewNumbers(rangeId, rangeName) {
        window.ui.showModal('Numbers in ' + rangeName, '<div class="loading-spinner"><div class="spinner"></div></div>', '', 'large');
        try {
            const res = await window.api.call(`/api/ranges/${rangeId}/numbers`);
            const rows = res.data || [];
            const body = document.querySelector('.modal-body');
            if (!body) return;
            body.innerHTML = `
                <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center">
                    <span style="font-size:13px; color:var(--text-secondary)">${rows.length} number(s)</span>
                    <button class="fly-btn fly-btn-sm" onclick="window.ranges.showAddNumbers(${window.ui.jsArg(rangeId)}, ${window.ui.jsArg(rangeName)})">${ICONS.plus} Add More</button>
                </div>
                <div class="table-wrapper" style="max-height:400px; overflow-y:auto">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.map(n => `
                                <tr>
                                    <td><code>${window.ui.escapeHtml(n.number)}</code></td>
                                    <td><span class="badge ${n.status === 'active' ? 'badge-success' : 'badge-danger'}">${n.status}</span></td>
                                    <td>${n.assigned_to || '<span style="color:var(--text-secondary)">Available</span>'}</td>
                                    <td><button class="action-btn delete" onclick="window.ranges.removeNumber(${window.ui.jsArg(rangeId)}, ${window.ui.jsArg(n.id)}, ${window.ui.jsArg(rangeName)})">${ICONS.trash}</button></td>
                                </tr>
                            `).join('') || '<tr class="empty-row"><td colspan="4">No numbers in this range</td></tr>'}
                        </tbody>
                    </table>
                </div>`;
        } catch (e) {
            const body = document.querySelector('.modal-body');
            if (body) body.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    async removeNumber(rangeId, numberId, rangeName) {
        if (!confirm('Remove this number from the range?')) return;
        try {
            await window.api.call(`/api/ranges/${rangeId}/numbers/${numberId}`, { method: 'DELETE' });
            window.ui.showToast('Number removed', 'info');
            this.viewNumbers(rangeId, rangeName);
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async del(id) {
        if (!confirm('Delete this range? All numbers in this range will be unassigned.')) return;
        try {
            await window.api.call('/api/ranges/' + id, { method: 'DELETE' });
            window.api.invalidate('/api/ranges');
            window.ui.showToast('Range deleted', 'info');
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    loadFile(input, targetId) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const numbers = this.parseNumbers(content).join('\n');
            document.getElementById(targetId).value = numbers;
            window.ui.showToast(`Loaded ${numbers.split('\n').length} numbers from file`, 'success');
        };
        reader.readAsText(file);
        input.value = ''; // Reset input
    }
};
window.ranges = ranges;
