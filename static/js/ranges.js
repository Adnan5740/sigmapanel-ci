const ranges = {
    async renderRanges(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/ranges');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMS Range Inventory</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.ranges.showAdd()">Create Range</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Prefix</th><th>Country</th><th>Rate</th><th>Stock</th><th>Action</th></tr></thead>
                        <tbody>
                            ${res.data.map(r => `
                                <tr>
                                    <td><strong>${r.name}</strong></td>
                                    <td><code>${r.number_prefix}</code></td>
                                    <td>${r.country_name}</td>
                                    <td>$${r.rate}</td>
                                    <td>${r._count.numbers}</td>
                                    <td>
                                        <div style="display:flex; gap:4px">
                                            <button class="action-btn" title="Add Numbers" onclick="window.ranges.showImport('${r.id}', '${r.name}')">${ICONS.plus}</button>
                                            <button class="action-btn" title="Edit" onclick='window.ranges.showEdit(${JSON.stringify(r)})'>${ICONS.edit || '✎'}</button>
                                            <button class="action-btn delete" onclick="window.ranges.del('${r.id}')">${ICONS.trash}</button>
                                        </div>
                                    </td>
                                </tr>`).join('') || '<tr><td colspan="6">No ranges</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {}
    },

    showAdd() {
        window.ui.showModal('Create New Range', `
            <div class="form-group"><label>Range Name</label><input type="text" id="rn-name" class="fly-input"></div>
            <div class="form-row"><div class="form-group"><label>Prefix</label><input type="text" id="rn-pre" class="fly-input"></div><div class="form-group"><label>Rate</label><input type="number" id="rn-rate" class="fly-input" value="0.05" step="0.01"></div></div>
            <div class="form-group"><label>Country Name</label><input type="text" id="rn-cn" class="fly-input"></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.save()">Save</button>');
    },

    async save() {
        const payload = { name: document.getElementById('rn-name').value, numberPrefix: document.getElementById('rn-pre').value, rate: parseFloat(document.getElementById('rn-rate').value), countryName: document.getElementById('rn-cn').value };
        try { await window.api.call('/api/ranges', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Range created', 'success'); window.ui.closeModal(); this.renderRanges(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    showEdit(r) {
        window.ui.showModal('Edit Range: ' + r.name, `
            <div class="form-group"><label>Range Name</label><input type="text" id="rn-name-edit" class="fly-input" value="${r.name}"></div>
            <div class="form-row"><div class="form-group"><label>Prefix</label><input type="text" id="rn-pre-edit" class="fly-input" value="${r.number_prefix || ''}"></div><div class="form-group"><label>Rate</label><input type="number" id="rn-rate-edit" class="fly-input" value="${r.rate}" step="0.01"></div></div>
            <div class="form-group"><label>Country Name</label><input type="text" id="rn-cn-edit" class="fly-input" value="${r.country_name || ''}"></div>
            <div class="form-row"><div class="form-group"><label>Daily OTP Limit</label><input type="number" id="rn-limit-edit" class="fly-input" value="${r.daily_otp_limit || 0}"></div><div class="form-group"><label>Limit Enabled</label><select id="rn-limit-en-edit" class="fly-input"><option value="0" ${r.otp_limit_enabled ? '' : 'selected'}>No</option><option value="1" ${r.otp_limit_enabled ? 'selected' : ''}>Yes</option></select></div></div>
        `, `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.doUpdate('${r.id}')">Update</button>`);
    },

    async doUpdate(id) {
        const payload = {
            name: document.getElementById('rn-name-edit').value,
            numberPrefix: document.getElementById('rn-pre-edit').value,
            rate: parseFloat(document.getElementById('rn-rate-edit').value),
            countryName: document.getElementById('rn-cn-edit').value,
            daily_otp_limit: parseInt(document.getElementById('rn-limit-edit').value),
            otp_limit_enabled: parseInt(document.getElementById('rn-limit-en-edit').value)
        };
        try {
            await window.api.call('/api/ranges/' + id, { method: 'PUT', body: JSON.stringify(payload) });
            window.ui.showToast('Range updated', 'success');
            window.ui.closeModal();
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    showImport(id, name) {
        window.ui.showModal('Add Numbers to ' + name, `
            <div class="form-group"><label>Numbers (one per line)</label><textarea id="rn-import-text" class="fly-input" rows="10" placeholder="+1234567890\n+9876543210"></textarea></div>
        `, `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.doImport('${id}')">Import</button>`);
    },

    async doImport(id) {
        const text = document.getElementById('rn-import-text').value;
        try {
            const res = await window.api.call(\`/api/ranges/\${id}/import\`, { method: 'POST', body: JSON.stringify({ numbersText: text }) });
            window.ui.showToast(\`Imported \${res.success} numbers\`, 'success');
            window.ui.closeModal();
            this.renderRanges(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async del(id) {
        if (confirm('Delete range?')) {
            try { await window.api.call('/api/ranges/' + id, { method: 'DELETE' }); window.ui.showToast('Deleted', 'info'); this.renderRanges(document.getElementById('page-content')); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    }
};
window.ranges = ranges;
