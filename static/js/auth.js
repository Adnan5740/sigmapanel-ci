const auth = {
    getToken() { return localStorage.getItem('token'); },
    getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
    isLoggedIn() { return !!this.getToken(); },

    async login(username, password) {
        const res = await window.api.call('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        return res;
    },

    async signup(payload) {
        return await window.api.call('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        location.reload();
    },

    _captcha: { a: 0, b: 0 },
    _newCaptcha() {
        this._captcha.a = Math.floor(Math.random() * 20) + 1;
        this._captcha.b = Math.floor(Math.random() * 20) + 1;
        return `${this._captcha.a} + ${this._captcha.b}`;
    },
    _checkCaptcha(val) {
        return parseInt(val) === this._captcha.a + this._captcha.b;
    },

    renderLogin() {
        const captchaQ = this._newCaptcha();
        document.getElementById('app').innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-cover">
                    <div class="auth-cover-content">
                        <div style="font-size:60px;margin-bottom:18px;animation: pulse 2s ease-in-out infinite">📡</div>
                        <h1 style="color:white;font-size:28px;font-weight:900;letter-spacing:-0.03em;margin-bottom:10px;text-shadow:0 2px 8px rgba(0,0,0,0.15)">Sigma SMS</h1>
                        <p style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,0.1)">Trusted A2P & P2P IPRN SMS Partner</p>
                    </div>
                </div>
                <div class="auth-form">
                    <div class="auth-form-inner">
                        <h2 style="animation: fadeInUp 0.3s ease">Welcome back</h2>
                        <p style="animation: fadeInUp 0.35s ease">Sign in to your account</p>
                        <div id="login-error" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:12px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;animation: fadeInUp 0.3s ease"></div>
                        <form id="login-form">
                            <div class="form-group" style="animation: fadeInUp 0.4s ease">
                                <label class="fly-label">Username</label>
                                <div class="input-wrapper">
                                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);transition:color 0.2s ease">${ICONS.user}</span>
                                    <input type="text" id="l-user" class="fly-input" style="padding-left:38px" placeholder="Enter username" required autocomplete="username" onfocus="this.previousElementSibling.style.color='var(--primary)';" onblur="this.previousElementSibling.style.color='var(--text-muted)';">
                                </div>
                            </div>
                            <div class="form-group" style="animation: fadeInUp 0.45s ease">
                                <label class="fly-label">Password</label>
                                <div class="input-wrapper">
                                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);transition:color 0.2s ease">${ICONS.lock}</span>
                                    <input type="password" id="l-pass" class="fly-input" style="padding-left:38px" placeholder="Enter password" required autocomplete="current-password" onfocus="this.previousElementSibling.style.color='var(--primary)';" onblur="this.previousElementSibling.style.color='var(--text-muted)';">
                                    <button type="button" class="password-toggle" onclick="window.auth._togglePwd('l-pass',this)">${ICONS.eyeOff}</button>
                                </div>
                            </div>
                            <div class="form-group" style="animation: fadeInUp 0.5s ease">
                                <label class="fly-label">Security Check: <strong id="captcha-q" style="color:var(--primary)">${captchaQ}</strong> = ?</label>
                                <input type="number" id="l-captcha" class="fly-input" placeholder="Answer" required>
                            </div>
                            <button type="submit" id="login-btn" class="fly-btn" style="width:100%;margin-top:8px;animation: fadeInUp 0.55s ease;position:relative">
                                <span id="login-btn-content">${ICONS.send}&nbsp; Sign In</span>
                                <span id="login-btn-loading" style="display:none">
                                    <div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></div>
                                </span>
                            </button>
                        </form>
                        <div style="margin-top:24px;text-align:center;font-size:13px;color:var(--text-secondary);animation: fadeInUp 0.6s ease">
                            Don't have an account?
                            <a href="#" id="to-signup" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:4px;transition:all 0.2s ease" onmouseover="this.style.color='var(--primary-dark)';this.style.transform='translateX(2px)'" onmouseout="this.style.color='var(--primary)';this.style.transform='translateX(0)'">Create Account →</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const err = document.getElementById('login-error');
            err.style.display = 'none';
            if (!this._checkCaptcha(document.getElementById('l-captcha').value)) {
                err.textContent = 'Incorrect answer. Please try again.';
                err.style.display = 'block';
                const q = this._newCaptcha();
                document.getElementById('captcha-q').textContent = q;
                document.getElementById('l-captcha').value = '';
                return;
            }
            const btn = document.getElementById('login-btn');
            const btnContent = document.getElementById('login-btn-content');
            const btnLoading = document.getElementById('login-btn-loading');
            btn.disabled = true;
            btnContent.style.display = 'none';
            btnLoading.style.display = 'inline-block';
            try {
                await this.login(document.getElementById('l-user').value.trim(), document.getElementById('l-pass').value);
                window.renderDashboardShell();
            } catch (ex) {
                err.textContent = ex.message; err.style.display = 'block';
                const q = this._newCaptcha();
                document.getElementById('captcha-q').textContent = q;
                document.getElementById('l-captcha').value = '';
                btn.disabled = false;
                btnContent.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
        };

        document.getElementById('to-signup').onclick = (e) => { e.preventDefault(); this.renderSignup(); };
    },

    _togglePwd(id, btn) {
        const inp = document.getElementById(id);
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.innerHTML = inp.type === 'password' ? ICONS.eyeOff : ICONS.eye;
    },

    // ── Step 1 data store ──
    _s1: {},

    renderSignup() {
        document.getElementById('app').innerHTML = `
        <div class="auth-page">
            <div class="auth-card" style="max-width:1000px;min-height:620px">
                <div class="auth-cover" style="width:320px;flex-shrink:0;min-height:620px">
                    <div class="auth-cover-content">
                        <div style="font-size:52px;margin-bottom:14px;animation: pulse 2s ease-in-out infinite">📡</div>
                        <h1 style="color:white;font-size:22px;font-weight:900;letter-spacing:-0.02em;margin-bottom:10px">Sigma SMS</h1>
                        <p style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:32px;line-height:1.5">Trusted A2P & P2P IPRN SMS Partner</p>
                        <div style="display:flex;flex-direction:column;gap:14px">
                            <div id="step-ind-1" class="signup-step-ind signup-step-ind--active">
                                <span class="step-num">1</span>
                                <span>Your Information</span>
                            </div>
                            <div id="step-ind-2" class="signup-step-ind">
                                <span class="step-num">2</span>
                                <span>Payment & Proof</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="auth-form" style="flex:1;align-items:flex-start;padding:2.5rem 2.5rem;overflow-y:auto;max-height:620px">
                    <div style="width:100%;max-width:520px;margin:0 auto">
                        <div id="signup-error" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;animation: fadeInUp 0.3s ease"></div>
                        <div id="signup-step-content"></div>
                        <div style="margin-top:20px;text-align:center;font-size:13px;color:var(--text-secondary)">
                            Already have an account?
                            <a href="#" id="to-login" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:4px;transition:color 0.2s ease" onmouseover="this.style.color='var(--primary-dark)'" onmouseout="this.style.color='var(--primary)'">Sign In</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('to-login').onclick = (e) => { e.preventDefault(); this.renderLogin(); };
        this._renderStep1();
    },

    _renderStep1() {
        document.getElementById('step-ind-1').classList.add('signup-step-ind--active');
        document.getElementById('step-ind-2').classList.remove('signup-step-ind--active');
        const s = this._s1;
        document.getElementById('signup-step-content').innerHTML = `
        <h2 style="font-size:20px;font-weight:800;margin-bottom:4px">Create Account</h2>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">Step 1 of 2 — Personal details</p>
        <form id="s1-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="fly-label">Full Name *</label>
                    <input type="text" id="s-name" class="fly-input" placeholder="John Doe" value="${s.fullName||''}" required>
                </div>
                <div class="form-group">
                    <label class="fly-label">Username *</label>
                    <input type="text" id="s-user" class="fly-input" placeholder="john123" value="${s.username||''}" required>
                </div>
            </div>
            <div class="form-group">
                <label class="fly-label">Email *</label>
                <input type="email" id="s-email" class="fly-input" placeholder="john@example.com" value="${s.email||''}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="fly-label">Password *</label>
                    <div class="input-wrapper">
                        <input type="password" id="s-pass" class="fly-input" placeholder="Min 6 characters" required>
                        <button type="button" class="password-toggle" onclick="window.auth._togglePwd('s-pass',this)">${ICONS.eyeOff}</button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="fly-label">WhatsApp Number *</label>
                    <input type="tel" id="s-phone" class="fly-input" placeholder="+1234567890" value="${s.phone||''}" required>
                </div>
            </div>
            <div class="form-group">
                <label class="fly-label">Microsoft Teams ID</label>
                <input type="text" id="s-teams" class="fly-input" placeholder="user@company.com" value="${s.teamsId||''}">
            </div>
            <div class="form-group">
                <label class="fly-label">Account Type *</label>
                <select id="s-prof" class="fly-input" required>
                    <option value="">Select type…</option>
                    <option value="alone" ${s.profession==='alone'?'selected':''}>Alone (Individual)</option>
                    <option value="team_owner" ${s.profession==='team_owner'?'selected':''}>Team Owner</option>
                    <option value="developer" ${s.profession==='developer'?'selected':''}>Developer</option>
                </select>
            </div>
            <button type="submit" class="fly-btn" style="width:100%;margin-top:8px">
                Continue ${ICONS.chevronDown}</button>
        </form>`;

        document.getElementById('s1-form').onsubmit = (e) => {
            e.preventDefault();
            const err = document.getElementById('signup-error');
            const pass = document.getElementById('s-pass').value;
            if (pass.length < 6) { err.textContent = 'Password must be at least 6 characters.'; err.style.display = 'block'; return; }
            err.style.display = 'none';
            this._s1 = {
                fullName: document.getElementById('s-name').value.trim(),
                username: document.getElementById('s-user').value.trim().toLowerCase(),
                email: document.getElementById('s-email').value.trim().toLowerCase(),
                password: pass,
                phone: document.getElementById('s-phone').value.trim(),
                teamsId: document.getElementById('s-teams').value.trim(),
                profession: document.getElementById('s-prof').value,
            };
            this._renderStep2();
        };
    },

    _renderStep2() {
        document.getElementById('step-ind-1').classList.remove('signup-step-ind--active');
        document.getElementById('step-ind-2').classList.add('signup-step-ind--active');
        const prof = this._s1.profession;

        const proofLabel = {
            alone: 'Payment Proof (screenshot of payment)',
            team_owner: 'WhatsApp / Telegram Group Screenshot',
            developer: 'Developer Proof (GitHub, portfolio, etc.)',
        }[prof] || 'Proof Document';

        document.getElementById('signup-step-content').innerHTML = `
        <h2 style="font-size:20px;font-weight:800;margin-bottom:4px">Payment & Proof</h2>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">Step 2 of 2 — Payment method & verification</p>
        <form id="s2-form">
            <div class="form-group">
                <label class="fly-label">Payment Method *</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">
                    <label class="pay-method-card" id="pm-binance">
                        <input type="radio" name="payMethod" value="binance" style="display:none">
                        <div style="font-size:22px;margin-bottom:6px">🟡</div>
                        <div style="font-weight:700;font-size:13px">Binance</div>
                        <div style="font-size:11px;color:var(--text-secondary)">UID payment</div>
                    </label>
                    <label class="pay-method-card" id="pm-usdt">
                        <input type="radio" name="payMethod" value="usdt_bep20" style="display:none">
                        <div style="font-size:22px;margin-bottom:6px">💵</div>
                        <div style="font-weight:700;font-size:13px">USDT BEP-20</div>
                        <div style="font-size:11px;color:var(--text-secondary)">BSC address</div>
                    </label>
                </div>
            </div>
            <div id="pay-detail-wrap" style="display:none"></div>
            <div class="form-group">
                <label class="fly-label">${proofLabel} *</label>
                <div id="proof-drop" class="proof-dropzone">
                    <input type="file" id="proof-file" accept="image/*,application/pdf" style="display:none">
                    <div id="proof-drop-label">
                        ${ICONS.upload}
                        <span style="display:block;margin-top:8px;font-size:13px;color:var(--text-secondary)">Click or drag file here</span>
                        <span style="font-size:11px;color:var(--text-muted)">JPG, PNG, PDF — max 5 MB</span>
                    </div>
                    <div id="proof-preview" style="display:none;margin-top:8px"></div>
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:8px">
                <button type="button" class="fly-btn fly-btn-secondary" style="flex:1" onclick="window.auth._renderStep1()">${ICONS.chevronDown} Back</button>
                <button type="submit" id="s2-btn" class="fly-btn" style="flex:2">${ICONS.send}&nbsp; Submit Registration</button>
            </div>
        </form>`;

        // Payment method card toggle
        document.querySelectorAll('.pay-method-card').forEach(card => {
            card.onclick = () => {
                document.querySelectorAll('.pay-method-card').forEach(c => c.classList.remove('pay-method-card--active'));
                card.classList.add('pay-method-card--active');
                card.querySelector('input[type=radio]').checked = true;
                const val = card.querySelector('input').value;
                const wrap = document.getElementById('pay-detail-wrap');
                wrap.style.display = 'block';
                wrap.innerHTML = val === 'binance'
                    ? `<div class="form-group"><label class="fly-label">Binance UID *</label><input type="text" id="pay-detail" class="fly-input" placeholder="e.g. 123456789" required></div>`
                    : `<div class="form-group"><label class="fly-label">USDT BEP-20 Address *</label><input type="text" id="pay-detail" class="fly-input" placeholder="0x..." required></div>`;
            };
        });

        // Proof file drop/click
        const dropzone = document.getElementById('proof-drop');
        const fileInput = document.getElementById('proof-file');
        dropzone.onclick = () => fileInput.click();
        dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('proof-dropzone--drag'); };
        dropzone.ondragleave = () => dropzone.classList.remove('proof-dropzone--drag');
        dropzone.ondrop = (e) => { e.preventDefault(); dropzone.classList.remove('proof-dropzone--drag'); if (e.dataTransfer.files[0]) this._previewProof(e.dataTransfer.files[0]); };
        fileInput.onchange = () => { if (fileInput.files[0]) this._previewProof(fileInput.files[0]); };

        document.getElementById('s2-form').onsubmit = async (e) => {
            e.preventDefault();
            await this._submitSignup();
        };
    },

    _proofFile: null,
    _previewProof(file) {
        this._proofFile = file;
        const prev = document.getElementById('proof-preview');
        const label = document.getElementById('proof-drop-label');
        label.style.display = 'none';
        prev.style.display = 'block';
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            prev.innerHTML = `<img src="${url}" style="max-height:120px;border-radius:8px;object-fit:contain"><div style="font-size:12px;color:var(--text-secondary);margin-top:6px">${window.ui.escapeHtml(file.name)}</div>`;
        } else {
            prev.innerHTML = `<div style="padding:16px;background:#f8fafc;border-radius:8px;text-align:center">${ICONS.report}<div style="font-size:12px;margin-top:6px;color:var(--text-secondary)">${window.ui.escapeHtml(file.name)}</div></div>`;
        }
    },

    async _submitSignup() {
        const err = document.getElementById('signup-error');
        err.style.display = 'none';
        const btn = document.getElementById('s2-btn');

        const methodEl = document.querySelector('input[name=payMethod]:checked');
        if (!methodEl) { err.textContent = 'Please select a payment method.'; err.style.display = 'block'; return; }
        const payDetail = document.getElementById('pay-detail')?.value.trim();
        if (!payDetail) { err.textContent = 'Please enter your payment detail.'; err.style.display = 'block'; return; }
        if (!this._proofFile) { err.textContent = 'Please upload your proof document.'; err.style.display = 'block'; return; }

        btn.disabled = true; btn.textContent = 'Uploading…';
        try {
            // Upload proof
            const formData = new FormData();
            formData.append('file', this._proofFile);
            const uploadRes = await fetch('/api/auth/upload-proof', { method: 'POST', body: formData });
            if (!uploadRes.ok) { const j = await uploadRes.json(); throw new Error(j.detail || 'Upload failed'); }
            const { filename } = await uploadRes.json();

            btn.textContent = 'Submitting…';
            const method = methodEl.value;
            const payload = {
                ...this._s1,
                paymentMethod: method,
                ...(method === 'binance' ? { binanceUid: payDetail } : { usdtAddress: payDetail }),
                proofFilename: filename,
            };
            await this.signup(payload);
            window.ui.showToast('Registration submitted! Await admin approval.', 'success');
            this._s1 = {};
            this._proofFile = null;
            this.renderLogin();
        } catch (ex) {
            err.textContent = ex.message; err.style.display = 'block';
            btn.disabled = false; btn.innerHTML = ICONS.send + '&nbsp; Submit Registration';
        }
    }
};
window.auth = auth;
