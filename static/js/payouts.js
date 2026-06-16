const payouts = {
    async renderMyPayouts(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [smsData, requestData, ledgerData] = await Promise.all([
                window.api.call('/api/sms?limit=100'),
                window.api.call('/api/transactions/payout-requests').catch(() => ({ data: [] })),
                window.api.call('/api/transactions/ledger?limit=20').catch(() => ({ data: [] }))
            ]);
            const user = window.auth.getUser() || {};
            const rows = smsData.data || [];
            const requests = requestData.data || [];
            const ledger = ledgerData.data || [];

            const payoutMap = {};
            let totalPayout = 0;
            rows.forEach(sms => {
                const key = sms.range_name || sms.number || 'Direct';
                const amount = Number(sms.profit || 0.02);
                if (!payoutMap[key]) {
                    payoutMap[key] = {
                        range: sms.range_name || 'Direct',
                        number: sms.number || '-',
                        count: 0,
                        amount: 0,
                        lastDate: sms.received_at
                    };
                }
                payoutMap[key].count++;
                payoutMap[key].amount += amount;
                totalPayout += amount;
                if (sms.received_at && (!payoutMap[key].lastDate || sms.received_at > payoutMap[key].lastDate)) {
                    payoutMap[key].lastDate = sms.received_at;
                }
            });

            const payoutRows = Object.values(payoutMap);
            const pendingTotal = requests
                .filter(r => r.status === 'pending')
                .reduce((sum, r) => sum + Number(r.amount || 0), 0);
            const balance = Number(user.balance || 0);

            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Payouts</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.payouts.showRequestModal()">${ICONS.wallet} Request Payout</button>
                </div>
                <div class="payout-summary-grid">
                    <div class="stat-card" style="margin:0"><div class="stat-card-label">Estimated Earnings</div><div class="stat-card-value">$${totalPayout.toFixed(2)}</div></div>
                    <div class="stat-card" style="margin:0"><div class="stat-card-label">Available Balance</div><div class="stat-card-value">$${balance.toFixed(2)}</div></div>
                    <div class="stat-card" style="margin:0"><div class="stat-card-label">Pending Requests</div><div class="stat-card-value">$${pendingTotal.toFixed(2)}</div></div>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" id="payout-search" placeholder="Search by range or number..." onkeyup="window.payouts.filterPayouts()">
                    <div class="filter-field">
                        <label for="payout-from">From</label>
                        <input type="date" class="filter-select" id="payout-from" onchange="window.payouts.filterPayouts()">
                    </div>
                    <div class="filter-field">
                        <label for="payout-to">To</label>
                        <input type="date" class="filter-select" id="payout-to" onchange="window.payouts.filterPayouts()">
                    </div>
                    <select class="filter-select" id="payout-range" onchange="window.payouts.filterPayouts()">
                        <option value="">All Ranges</option>
                        ${[...new Set(payoutRows.map(p => p.range))].map(r => `<option value="${window.ui.escapeHtml(r)}">${window.ui.escapeHtml(r)}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Range</th><th>Number</th><th>SMS Count</th><th>Payout Amount</th><th>Last Activity</th></tr></thead>
                        <tbody id="payout-table-body">
                            ${payoutRows.map(p => `
                                <tr data-range="${window.ui.escapeHtml(p.range)}" data-number="${window.ui.escapeHtml(p.number)}" data-date="${p.lastDate || ''}">
                                    <td><span class="badge badge-info">${window.ui.escapeHtml(p.range)}</span></td>
                                    <td><code style="font-size:12px">${window.ui.escapeHtml(p.number)}</code></td>
                                    <td><span class="badge badge-secondary">${p.count}</span></td>
                                    <td><strong style="color:var(--success);font-size:14px">$${p.amount.toFixed(2)}</strong></td>
                                    <td style="font-size:11px">${window.ui.formatDate(p.lastDate)}</td>
                                </tr>
                            `).join('')}
                            ${payoutRows.length === 0 ? '<tr class="empty-row"><td colspan="5">No payout data available</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="margin-top:20px">
                <div class="card-header"><div class="card-title">Payout Request History</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Wallet / Note</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${requests.map(r => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(r.created_at)}</td>
                                    <td><strong>$${Number(r.amount || 0).toFixed(2)}</strong></td>
                                    <td><span class="badge badge-secondary">${window.ui.escapeHtml(r.method || '-')}</span></td>
                                    <td style="font-size:12px"><code>${window.ui.escapeHtml(r.wallet_address || '-')}</code><br><small>${window.ui.escapeHtml(r.note || '')}</small></td>
                                    <td><span class="badge ${r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${window.ui.escapeHtml(String(r.status || '').toUpperCase())}</span></td>
                                    <td class="actions-cell">${r.status === 'pending' ? `<button class="action-btn delete" onclick="window.payouts.cancelRequest('${r.id}')">Cancel</button>` : '-'}</td>
                                </tr>
                            `).join('') || '<tr class="empty-row"><td colspan="6">No payout requests yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="margin-top:20px">
                <div class="card-header"><div class="card-title">Recent Balance Activity</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Note</th></tr></thead>
                        <tbody>
                            ${ledger.map(t => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(t.created_at)}</td>
                                    <td><span class="badge ${Number(t.amount || 0) >= 0 ? 'badge-success' : 'badge-danger'}">${window.ui.escapeHtml(String(t.tx_type || '').toUpperCase())}</span></td>
                                    <td><strong>$${Number(t.amount || 0).toFixed(2)}</strong></td>
                                    <td>$${Number(t.balance_after || 0).toFixed(2)}</td>
                                    <td>${window.ui.escapeHtml(t.note || '-')}</td>
                                </tr>
                            `).join('') || '<tr class="empty-row"><td colspan="5">No balance activity</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    filterPayouts() {
        const search = document.getElementById('payout-search').value.toLowerCase();
        const rangeFilter = document.getElementById('payout-range').value;
        const from = document.getElementById('payout-from').value;
        const to = document.getElementById('payout-to').value;
        const rows = document.querySelectorAll('#payout-table-body tr[data-range]');

        rows.forEach(row => {
            const range = row.dataset.range || '';
            const number = row.dataset.number || '';
            const date = (row.dataset.date || '').slice(0, 10);
            const matchSearch = !search || range.toLowerCase().includes(search) || number.toLowerCase().includes(search);
            const matchRange = !rangeFilter || range === rangeFilter;
            const matchFrom = !from || (date && date >= from);
            const matchTo = !to || (date && date <= to);
            row.style.display = matchSearch && matchRange && matchFrom && matchTo ? '' : 'none';
        });
    },

    showRequestModal() {
        const user = window.auth.getUser() || {};
        const balance = Number(user.balance || 0);
        window.ui.showModal('Request Payout', `
            <div style="padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:16px;font-size:13px">
                Available balance: <strong>$${balance.toFixed(2)}</strong>. Minimum payout is <strong>$50.00</strong>.
            </div>
            <div class="payout-request-grid">
                <div class="form-group">
                    <label>Amount *</label>
                    <input type="number" id="po-amount" class="fly-input" min="50" step="0.01" placeholder="50.00">
                </div>
                <div class="form-group">
                    <label>Method *</label>
                    <select id="po-method" class="fly-input">
                        <option value="USDT_BEP20">USDT BEP20</option>
                        <option value="USDT_TRC20">USDT TRC20</option>
                        <option value="Binance">Binance</option>
                        <option value="Bank">Bank Transfer</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Wallet / Account *</label>
                <input type="text" id="po-wallet" class="fly-input" placeholder="Wallet address, Binance UID, or account reference">
            </div>
            <div class="form-group">
                <label>Note</label>
                <textarea id="po-note" class="fly-input" rows="3" placeholder="Optional payout instructions"></textarea>
            </div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.payouts.submitRequest()">Submit Request</button>');
    },

    async submitRequest() {
        const amount = Number(document.getElementById('po-amount').value);
        const method = document.getElementById('po-method').value;
        const walletAddress = document.getElementById('po-wallet').value.trim();
        const note = document.getElementById('po-note').value.trim();
        if (!amount || amount < 50) { window.ui.showToast('Minimum payout is $50.00', 'error'); return; }
        if (!walletAddress) { window.ui.showToast('Wallet or account reference is required', 'error'); return; }
        try {
            await window.api.call('/api/transactions/payout-request', { method: 'POST', body: JSON.stringify({ amount, method, walletAddress, note }) });
            window.api.invalidate('/api/transactions');
            window.ui.showToast('Payout request submitted', 'success');
            window.ui.closeModal();
            this.renderMyPayouts(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async cancelRequest(id) {
        if (!confirm('Cancel this payout request? The held balance will be returned.')) return;
        try {
            await window.api.call(`/api/transactions/payout-requests/${id}/cancel`, { method: 'POST' });
            window.api.invalidate('/api/transactions');
            window.ui.showToast('Payout request cancelled', 'info');
            this.renderMyPayouts(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    }
};
window.payouts = payouts;
