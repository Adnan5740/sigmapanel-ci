const payouts = {
    async renderMyPayouts(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?limit=100');
            const user = window.auth.getUser();
            const rows = data.data || [];
            
            // Calculate payouts per number/range
            const payoutMap = {};
            let totalPayout = 0;
            rows.forEach(sms => {
                const key = sms.range_name || sms.number;
                if (!payoutMap[key]) {
                    payoutMap[key] = { range: sms.range_name || 'Direct', number: sms.number, count: 0, amount: 0, lastDate: sms.received_at };
                }
                payoutMap[key].count++;
                payoutMap[key].amount += sms.profit || 0.02;
                totalPayout += sms.profit || 0.02;
            });
            
            const payoutRows = Object.values(payoutMap);
            
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Payout Summary</div>
                    <span class="badge badge-success">Total: $${totalPayout.toFixed(2)}</span>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" id="payout-search" placeholder="Search by range or number..." onkeyup="window.payouts.filterPayouts()">
                    <input type="date" class="filter-select" id="payout-from" onchange="window.payouts.filterPayouts()">
                    <input type="date" class="filter-select" id="payout-to" onchange="window.payouts.filterPayouts()">
                    <select class="filter-select" id="payout-range" onchange="window.payouts.filterPayouts()">
                        <option value="">All Ranges</option>
                        ${[...new Set(payoutRows.map(p => p.range))].map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Range</th><th>Number</th><th>SMS Count</th><th>Payout Amount</th><th>Last Activity</th></tr></thead>
                        <tbody id="payout-table-body">
                            ${payoutRows.map(p => `
                                <tr data-range="${p.range}" data-number="${p.number}">
                                    <td><span class="badge badge-info">${p.range}</span></td>
                                    <td><code style="font-size:12px">${p.number}</code></td>
                                    <td><span class="badge badge-secondary">${p.count}</span></td>
                                    <td><strong style="color:var(--success);font-size:14px">$${p.amount.toFixed(2)}</strong></td>
                                    <td style="font-size:11px">${window.ui.formatDate(p.lastDate)}</td>
                                </tr>
                            `).join('')}
                            ${payoutRows.length === 0 ? '<tr class="empty-row"><td colspan="5">No payout data available</td></tr>' : ''}
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
        const rows = document.querySelectorAll('#payout-table-body tr[data-range]');
        
        rows.forEach(row => {
            const range = row.dataset.range;
            const number = row.dataset.number;
            const matchSearch = !search || range.toLowerCase().includes(search) || number.includes(search);
            const matchRange = !rangeFilter || range === rangeFilter;
            row.style.display = matchSearch && matchRange ? '' : 'none';
        });
    }
};
window.payouts = payouts;
