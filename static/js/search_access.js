const searchAccess = {
    async render(container) {
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
            <div class="card-header"><div class="card-title">${ICONS.search} Search Access</div></div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
                <p style="color:var(--text-secondary);font-size:13px;margin:0">
                    Search for a service, sender, or app name to find which ranges have received SMS from it.
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <input type="text" id="sa-q" class="fly-input"
                        placeholder="e.g. WhatsApp, Google, TikTok, Facebook..."
                        style="flex:1;min-width:200px"
                        oninput="clearTimeout(window._saT);window._saT=setTimeout(()=>window.searchAccess.doSearch(),400)"
                        onkeydown="if(event.key==='Enter') window.searchAccess.doSearch()">
                    <button class="fly-btn" onclick="window.searchAccess.doSearch()">${ICONS.search} Search</button>
                </div>
                <div id="sa-res"></div>
            </div>
        </div>
        </div>`;
    },

    async doSearch() {
        const q = (document.getElementById('sa-q')?.value || '').trim();
        const resDiv = document.getElementById('sa-res');
        if (!q) { resDiv.innerHTML = ''; return; }
        resDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [smsRes, rangesRes] = await Promise.all([
                window.api.call('/api/sms?search=' + encodeURIComponent(q) + '&limit=200'),
                window.api.call('/api/ranges?search=' + encodeURIComponent(q))
            ]);
            const smsRows = smsRes.data || [];
            const ranges  = rangesRes.data || [];

            // Group SMS hits by range
            const byRange = {};
            smsRows.forEach(s => {
                const key = s.range_name || 'Unassigned';
                if (!byRange[key]) byRange[key] = { count: 0, services: new Set(), otpCount: 0 };
                byRange[key].count++;
                if (s.service) byRange[key].services.add(s.service);
                if (s.otp) byRange[key].otpCount++;
            });

            const rangeNames = Object.keys(byRange);
            if (!rangeNames.length && !ranges.length) {
                resDiv.innerHTML = '<div class="empty-state" style="padding:24px"><h3>No results for "' +
                    window.ui.escapeHtml(q) + '"</h3><p>No SMS or ranges matched this search.</p></div>';
                return;
            }

            let html = '';

            if (rangeNames.length) {
                const rows = rangeNames
                    .sort((a,b) => byRange[b].count - byRange[a].count)
                    .map(rn => {
                        const svcs = [...byRange[rn].services]
                            .map(s => '<span class="badge badge-primary" style="margin:1px">' + window.ui.escapeHtml(s) + '</span>')
                            .join('') || '—';
                        const otpBadge = byRange[rn].otpCount > 0
                            ? '<span class="badge badge-success">' + byRange[rn].otpCount + '</span>' : '—';
                        return '<tr>' +
                            '<td><span class="badge badge-info">' + window.ui.escapeHtml(rn) + '</span></td>' +
                            '<td><strong>' + byRange[rn].count + '</strong></td>' +
                            '<td>' + svcs + '</td>' +
                            '<td>' + otpBadge + '</td>' +
                            '</tr>';
                    }).join('');
                html += '<div class="card" style="margin-top:0">' +
                    '<div class="card-header">' +
                    '<div class="card-title">SMS Matches by Range</div>' +
                    '<span class="badge badge-secondary">' + smsRows.length + ' SMS found</span>' +
                    '</div>' +
                    '<div class="table-wrapper"><table class="fly-table">' +
                    '<thead><tr><th>Range</th><th>SMS Count</th><th>Services Found</th><th>OTPs</th></tr></thead>' +
                    '<tbody>' + rows + '</tbody></table></div></div>';
            }

            if (ranges.length) {
                const rrows = ranges.map(r => {
                    return '<tr>' +
                        '<td><strong>' + window.ui.escapeHtml(r.name) + '</strong></td>' +
                        '<td>' + window.ui.escapeHtml(r.country_name || '—') + '</td>' +
                        '<td><span class="badge badge-info">$' + Number(r.weekly_rate ?? r.rate ?? 0).toFixed(4) + '</span></td>' +
                        '<td><span class="badge badge-success">' + r._count.available + '</span></td>' +
                        '</tr>';
                }).join('');
                html += '<div class="card">' +
                    '<div class="card-header"><div class="card-title">Matching Ranges</div></div>' +
                    '<div class="table-wrapper"><table class="fly-table">' +
                    '<thead><tr><th>Range</th><th>Country</th><th>Weekly Payout</th><th>Available</th></tr></thead>' +
                    '<tbody>' + rrows + '</tbody></table></div></div>';
            }

            resDiv.innerHTML = html;
        } catch (e) {
            resDiv.innerHTML = '<div class="empty-state"><p>Search failed: ' + e.message + '</p></div>';
        }
    }
};
window.searchAccess = searchAccess;
