const notifications = {
    async renderNews(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const user = window.auth.getUser();
            const isAdmin = ['admin', 'manager'].includes(user.role);
            const news = await window.api.call('/api/notifications/news').catch(() => ({data:[]}));
            
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">📢 News & Announcements</div>
                    ${isAdmin ? `<button class="fly-btn fly-btn-sm" onclick="window.notifications.showAddNews()">+ Post News</button>` : ''}
                </div>
                <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
                    ${(news.data || []).map(n => `
                        <div style="padding:16px;background:#f8fafc;border-left:3px solid var(--primary);border-radius:8px">
                            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                                <strong style="font-size:14px">${window.ui.escapeHtml(n.subject)}</strong>
                                <span style="font-size:11px;color:var(--text-muted)">${window.ui.formatDate(n.created_at)}</span>
                            </div>
                            <div style="font-size:13px;color:var(--text-secondary)">${window.ui.escapeHtml(n.message)}</div>
                        </div>
                    `).join('')}
                    ${(news.data || []).length === 0 ? '<div class="empty-state"><p>No news available</p></div>' : ''}
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }
    },

    showAddNews() {
        window.ui.showModal('Post News', `
            <div class="form-group"><label>Subject *</label><input type="text" id="news-subject" class="fly-input"></div>
            <div class="form-group"><label>Message *</label><textarea id="news-message" class="fly-input" rows="6"></textarea></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.notifications.postNews()">Post</button>');
    },

    async postNews() {
        const subject = document.getElementById('news-subject').value.trim();
        const message = document.getElementById('news-message').value.trim();
        if (!subject || !message) { window.ui.showToast('Subject and message required', 'error'); return; }
        try {
            await window.api.call('/api/notifications/news', { method: 'POST', body: JSON.stringify({ subject, message }) });
            window.ui.showToast('News posted', 'success');
            window.ui.closeModal();
            this.renderNews(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderSupport(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const tickets = await window.api.call('/api/notifications/support').catch(() => ({data:[]}));
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Support Tickets</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.notifications.showNewTicket()">+ New Ticket</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>ID</th><th>User</th><th>Subject</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${(tickets.data || []).map(t => `
                                <tr>
                                    <td><code>#${t.id.slice(0,8)}</code></td>
                                    <td>${window.ui.escapeHtml(t.username || '-')}</td>
                                    <td><strong>${window.ui.escapeHtml(t.subject)}</strong></td>
                                    <td><span class="badge badge-${t.status === 'open' ? 'warning' : 'secondary'}">${t.status}</span></td>
                                    <td style="font-size:11px">${window.ui.formatDate(t.updated_at || t.created_at)}</td>
                                    <td><button class="action-btn" onclick="window.notifications.viewTicket('${t.id}')">View</button></td>
                                </tr>
                            `).join('')}
                            ${(tickets.data || []).length === 0 ? '<tr class="empty-row"><td colspan="6">No tickets</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }
    },

    showNewTicket() {
        window.ui.showModal('Create Ticket', `
            <div class="form-group"><label>Subject *</label><input type="text" id="ticket-subject" class="fly-input"></div>
            <div class="form-group"><label>Message *</label><textarea id="ticket-message" class="fly-input" rows="6"></textarea></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.notifications.createTicket()">Submit</button>');
    },

    async createTicket() {
        const subject = document.getElementById('ticket-subject').value.trim();
        const message = document.getElementById('ticket-message').value.trim();
        if (!subject || !message) { window.ui.showToast('Subject and message required', 'error'); return; }
        try {
            await window.api.call('/api/notifications/support', { method: 'POST', body: JSON.stringify({ subject, message }) });
            window.ui.showToast('Ticket created', 'success');
            window.ui.closeModal();
            this.renderSupport(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async viewTicket(id) {
        window.ui.showModal('Ticket', '<div class="loading-spinner"><div class="spinner"></div></div>', '', 'large');
        try {
            const ticket = await window.api.call('/api/notifications/support/' + id);
            const user = window.auth.getUser();
            const isAdmin = ['admin', 'manager'].includes(user.role);
            const body = document.querySelector('.modal-body');
            if (!body) return;
            body.innerHTML = `
                <div style="margin-bottom:16px">
                    <h3 style="margin:0 0 8px 0">${window.ui.escapeHtml(ticket.subject)}</h3>
                    <div style="padding:12px;background:#f8fafc;border-radius:8px;white-space:pre-wrap">${window.ui.escapeHtml(ticket.message)}</div>
                </div>
                ${ticket.reply ? `<div style="margin-bottom:16px"><h4 style="margin:0 0 8px 0">Reply</h4><div style="padding:12px;background:rgba(5,150,105,0.08);border-radius:8px;white-space:pre-wrap">${window.ui.escapeHtml(ticket.reply)}</div><div style="font-size:11px;color:var(--text-secondary);margin-top:6px">${window.ui.escapeHtml(ticket.reply_by || '')} ${ticket.updated_at ? ' · ' + window.ui.formatDate(ticket.updated_at) : ''}</div></div>` : ''}
                ${isAdmin && ticket.status === 'open' ? `
                <div class="form-group"><label>Reply</label><textarea id="ticket-reply" class="fly-input" rows="4"></textarea></div>
                <div style="display:flex;gap:10px">
                    <button class="fly-btn" onclick="window.notifications.replyTicket('${id}')">Reply & Close</button>
                    <button class="fly-btn fly-btn-secondary" onclick="window.notifications.closeTicket('${id}')">Close</button>
                </div>` : ''}
            `;
        } catch (e) { const body = document.querySelector('.modal-body'); if (body) body.innerHTML = `<p>${e.message}</p>`; }
    },

    async replyTicket(id) {
        const reply = document.getElementById('ticket-reply').value.trim();
        if (!reply) { window.ui.showToast('Reply required', 'error'); return; }
        try {
            await window.api.call(`/api/notifications/support/${id}/reply`, { method: 'POST', body: JSON.stringify({ message: reply }) });
            window.ui.showToast('Reply sent', 'success');
            window.ui.closeModal();
            this.renderSupport(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async closeTicket(id) {
        try {
            await window.api.call(`/api/notifications/support/${id}/close`, { method: 'POST' });
            window.ui.showToast('Ticket closed', 'info');
            window.ui.closeModal();
            this.renderSupport(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    }
};
window.notifications = notifications;
