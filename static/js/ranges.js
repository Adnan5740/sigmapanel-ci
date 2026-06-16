const ranges = {
    async renderRanges(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/ranges');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMS Range Inventory</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.ranges.showAdd()">${ICONS.plus} Create Range</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Prefix</th><th>Country</th><th>Rate</th><th>Numbers</th><th>Available</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${res.data.map(r => `
                                <tr>
                                    <td><strong>${window.ui.escapeHtml(r.name)}</strong></td>
                                    <td><code>${r.number_prefix || '-'}</code></td>
                                    <td>${window.ui.escapeHtml(r.country_name || '-')}</td>
                                    <td>$${r.rate}</td>
                                    <td><span class="badge badge-secondary">${r._count.numbers}</span></td>
                                    <td><span class="badge badge-success">${r._count.available}</span></td>
                                    <td class="actions-cell">
                                        <button class="action-btn" title="Add Numbers" onclick="window.ranges.showAddNumbers('${r.id}', '${window.ui.escapeHtml(r.name).replace(/'/g, "\\'")}')">${ICONS.plus} Add Numbers</button>
                                        <button class="action-btn" title="View Numbers" onclick="window.ranges.viewNumbers('${r.id}', '${window.ui.escapeHtml(r.name).replace(/'/g, "\\'")}')">${ICONS.eye} View</button>
                                        <button class="action-btn delete" title="Delete Range" onclick="window.ranges.del('${r.id}')">${ICONS.trash}</button>
                                    </td>
                                </tr>`).join('') || '<tr class="empty-row"><td colspan="7">No ranges found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    showAdd() {
        window.ui.showModal('Create New Range', `
            <div class="form-group"><label class="fly-label">Range Name *</label><input type="text" id="rn-name" class="fly-input" placeholder="e.g. US Numbers"></div>
            <div class="form-row">
                <div class="form-group"><label class="fly-label">Number Prefix</label><input type="text" id="rn-pre" class="fly-input" placeholder="+1"></div>
                <div class="form-group"><label class="fly-label">Rate ($/SMS)</label><input type="number" id="rn-rate" class="fly-input" value="0.05" step="0.01" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="fly-label">Country Name</label><input type="text" id="rn-cn" class="fly-input" placeholder="United States"></div>
                <div class="form-group"><label class="fly-label">Profit Margin (%)</label><input type="number" id="rn-pm" class="fly-input" value="50" min="0"></div>
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
            <div style="padding:10px;background:rgba(239,68,68,0.08);border-radius:8px;margin-bottom:16px;font-size:12px;color:var(--danger)">
                ⚠️ If OTP limit is exceeded, payout will be set to $0 for this range
            </div>
            <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
            <div style="padding:14px;background:rgba(99,102,241,0.08);border-radius:8px;margin-bottom:16px">
                <div style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px">📋 Optional: Add Numbers Now</div>
                <div style="font-size:12px;color:var(--text-secondary)">You can add test numbers and IPRN numbers after creating the range, or add them now via text input or file upload.</div>
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
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">💡 Test numbers will appear in the Test Panel</div>
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
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">💡 These numbers will be available for allocation to resellers</div>
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.save()">Create Range</button>', 'large');
    },

    async save() {
        const name = document.getElementById('rn-name').value.trim();
        if (!name) { window.ui.showToast('Range name is required', 'error'); return; }
        
        const testNumsText = document.getElementById('rn-test-nums').value.trim();
        const assignNumsText = document.getElementById('rn-assign-nums').value.trim();
        
        const payload = {
            name,
            numberPrefix: document.getElementById('rn-pre').value.trim(),
            rate: parseFloat(document.getElementById('rn-rate').value) || 0.05,
            countryName: document.getElementById('rn-cn').value.trim() || 'Global',
            profitMargin: parseFloat(document.getElementById('rn-pm').value) || 50,
            dailyOtpLimit: parseInt(document.getElementById('rn-otp-limit').value) || 0,
            otpLimitEnabled: parseInt(document.getElementById('rn-otp-enabled').value) || 0
        };
        try {
            const result = await window.api.call('/api/ranges', { method: 'POST', body: JSON.stringify(payload) });
            const rangeId = result.id || result.range_id;
            if (!rangeId) throw new Error('Range created but backend did not return a range ID');
            
            // Add test numbers if provided
            if (testNumsText) {
                const testNumbers = testNumsText.split('\n').map(n => n.trim()).filter(n => n);
                if (testNumbers.length > 0) {
                    try {
                        await window.api.call(`/api/ranges/${rangeId}/test-numbers`, { 
                            method: 'POST', 
                            body: JSON.stringify({ numbers: testNumbers }) 
                        });
                        window.ui.showToast(`Added ${testNumbers.length} test number(s)`, 'success');
                    } catch (e) {
                        console.error('Failed to add test numbers:', e);
                    }
                }
            }
            
            // Add assignable numbers if provided
            if (assignNumsText) {
                const assignNumbers = assignNumsText.split('\n').map(n => n.trim()).filter(n => n);
                if (assignNumbers.length > 0) {
                    try {
                        await window.api.call(`/api/ranges/${rangeId}/numbers`, { 
                            method: 'POST', 
                            body: JSON.stringify({ numbers: assignNumbers }) 
                        });
                        window.ui.showToast(`Added ${assignNumbers.length} assignable number(s)`, 'success');
                    } catch (e) {
                        console.error('Failed to add assignable numbers:', e);
                    }
                }
            }
            
            window.api.invalidate('/api/ranges');
            window.ui.showToast('Range created successfully', 'success');
            window.ui.closeModal();
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
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
        const numbers = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (numbers.length === 0) { window.ui.showToast('No valid numbers found', 'error'); return; }
        const countryName = document.getElementById('rn-num-country').value.trim() || undefined;
        const payload = { numbers, ...(countryName && { countryName }) };
        try {
            const res = await window.api.call(`/api/ranges/${rangeId}/numbers`, { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast(`Added ${res.added || numbers.length} number(s) to range`, 'success');
            window.ui.closeModal();
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
                    <button class="fly-btn fly-btn-sm" onclick="window.ranges.showAddNumbers('${rangeId}', '${window.ui.escapeHtml(rangeName).replace(/'/g, "\\'")}')">${ICONS.plus} Add More</button>
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
                                    <td><button class="action-btn delete" onclick="window.ranges.removeNumber('${rangeId}', '${n.id}', '${rangeName.replace(/'/g, "\\'")}')">${ICONS.trash}</button></td>
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
            const numbers = content.split(/\r?\n/).filter(line => line.trim()).join('\n');
            document.getElementById(targetId).value = numbers;
            window.ui.showToast(`Loaded ${numbers.split('\n').length} numbers from file`, 'success');
        };
        reader.readAsText(file);
        input.value = ''; // Reset input
    }
};
window.ranges = ranges;
