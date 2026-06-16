const payments = {
    async renderPayoutRequests(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/transactions/payout-requests');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Reseller Payout Queue</div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Wallet / Note</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(r => `
                                <tr>
                                    <td><strong>${r.username}</strong></td>
                                    <td style="color:var(--primary); font-weight:700">$${(r.amount || 0).toFixed(2)}</td>
                                    <td><span class="badge badge-secondary">${r.method}</span></td>
                                    <td style="font-size:12px">
                                        <code>${r.wallet_address || '-'}</code><br>
                                        <small>${r.note || ''}</small>
                                    </td>
                                    <td><span class="badge ${r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${r.status.toUpperCase()}</span></td>
                                    <td class="actions-cell">
                                        ${r.status === 'pending' ? `
                                            <button class="action-btn" onclick="window.payments.approvePayout('${r.id}')" style="color:var(--success)">Approve</button>
                                            <button class="action-btn delete" onclick="window.payments.rejectPayout('${r.id}')">Reject</button>
                                        ` : '-'}
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="6">No payout requests in queue</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async approvePayout(id) {
        if (!confirm('Approve and mark this payout as completed?')) return;
        try {
            await window.api.call(`/api/transactions/payout-requests/${id}/approve`, { method: 'PUT' });
            window.ui.showToast('Payout approved', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async rejectPayout(id) {
        if (!confirm('Reject this payout? Funds will be returned to the user balance.')) return;
        try {
            await window.api.call(`/api/transactions/payout-requests/${id}/reject`, { method: 'PUT' });
            window.ui.showToast('Payout rejected and refunded', 'info');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    }
};

window.payments = payments;
