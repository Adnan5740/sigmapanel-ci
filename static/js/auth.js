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
        <div class="auth-page auth-page-login">
            <div class="auth-card auth-card-login">
                <div class="auth-cover auth-cover-login">
                    <div class="auth-cover-content auth-cover-content-login">
                        <div class="ssp-logo-wrap">
                            <div class="ssp-logo-svg-container">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 160" class="ssp-logo-svg" role="img" aria-label="SSP - Sigma SMS Panel">
                                  <defs>
                                    <filter id="glow-blue-l" x="-30%" y="-30%" width="160%" height="160%">
                                      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
                                      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0.78 1 0 0  0 0.64 1 0 0  0 0 0 1.3 0" result="c"/>
                                      <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
                                    </filter>
                                    <filter id="glow-white-l" x="-20%" y="-20%" width="140%" height="140%">
                                      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                                      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.9  0 1 0 0 0.9  0 0 1 0 1  0 0 0 0.65 0" result="c"/>
                                      <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
                                    </filter>
                                    <linearGradient id="ms1" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stop-color="#ffffff"/><stop offset="18%" stop-color="#e2e4f8"/>
                                      <stop offset="42%" stop-color="#ffffff"/><stop offset="62%" stop-color="#ccd0ee"/>
                                      <stop offset="82%" stop-color="#ffffff"/><stop offset="100%" stop-color="#d0d4f0"/>
                                    </linearGradient>
                                    <linearGradient id="ms2" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stop-color="#eef0ff"/><stop offset="28%" stop-color="#ffffff"/>
                                      <stop offset="52%" stop-color="#dde0f8"/><stop offset="78%" stop-color="#ffffff"/>
                                      <stop offset="100%" stop-color="#c8ccea"/>
                                    </linearGradient>
                                    <linearGradient id="gp" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stop-color="#00C6FF"/><stop offset="52%" stop-color="#0072FF"/>
                                      <stop offset="100%" stop-color="#00FFA3"/>
                                    </linearGradient>
                                    <linearGradient id="gpg" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stop-color="#00C6FF" stop-opacity="0.55"/>
                                      <stop offset="100%" stop-color="#00FFA3" stop-opacity="0.55"/>
                                    </linearGradient>
                                    <linearGradient id="spd" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stop-color="#00FFA3" stop-opacity="0.9"/>
                                      <stop offset="55%" stop-color="#00C6FF" stop-opacity="0.4"/>
                                      <stop offset="100%" stop-color="#00C6FF" stop-opacity="0"/>
                                    </linearGradient>
                                    <linearGradient id="ibg" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stop-color="#16163a"/><stop offset="100%" stop-color="#090922"/>
                                    </linearGradient>
                                    <linearGradient id="ist" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stop-color="#00C6FF"/><stop offset="100%" stop-color="#00FFA3"/>
                                    </linearGradient>
                                    <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stop-color="#00C6FF" stop-opacity="0.7"/>
                                      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.45"/>
                                      <stop offset="100%" stop-color="#00FFA3" stop-opacity="0.7"/>
                                    </linearGradient>
                                    <linearGradient id="sh" x1="0%" y1="0%" x2="40%" y2="100%">
                                      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
                                      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.08"/>
                                      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                                    </linearGradient>
                                  </defs>
                                  <!-- ICON -->
                                  <g transform="translate(10,18)">
                                    <circle cx="32" cy="32" r="31" fill="none" stroke="url(#ist)" stroke-width="0.8" stroke-opacity="0.2" filter="url(#glow-blue-l)"/>
                                    <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#ibg)"/>
                                    <rect x="4" y="4" width="56" height="56" rx="14" fill="none" stroke="url(#ist)" stroke-width="1.2" stroke-opacity="0.45"/>
                                    <rect x="5" y="5" width="54" height="10" rx="9" fill="white" fill-opacity="0.05"/>
                                    <rect x="11" y="13" width="38" height="24" rx="6" fill="none" stroke="url(#ist)" stroke-width="1.7"/>
                                    <path d="M19 37 L15 47 L27 40 Z" fill="url(#ist)" opacity="0.65"/>
                                    <line x1="16" y1="21" x2="40" y2="21" stroke="white" stroke-width="1.4" stroke-opacity="0.45" stroke-linecap="round"/>
                                    <line x1="16" y1="27" x2="36" y2="27" stroke="url(#ist)" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                                    <circle cx="41" cy="27" r="2.2" fill="#00FFA3" opacity="0.9"/>
                                    <path d="M42 9 Q50 9 50 17" stroke="#00C6FF" stroke-width="1.3" fill="none" stroke-opacity="0.55" stroke-linecap="round"/>
                                    <path d="M45 6 Q56 6 56 20" stroke="#00C6FF" stroke-width="1.1" fill="none" stroke-opacity="0.28" stroke-linecap="round"/>
                                    <circle cx="42" cy="9" r="1.5" fill="#00FFA3" opacity="0.85"/>
                                  </g>
                                  <!-- SSP -->
                                  <g transform="translate(82,8)">
                                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="white" fill-opacity="0.12" filter="url(#glow-white-l)" letter-spacing="-3">S</text>
                                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#ms1)" letter-spacing="-3">S</text>
                                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sh)" letter-spacing="-3">S</text>
                                    <text x="2" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.5" letter-spacing="-3">S</text>
                                    <text x="60" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="white" fill-opacity="0.12" filter="url(#glow-white-l)" letter-spacing="-3">S</text>
                                    <text x="60" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#ms2)" letter-spacing="-3">S</text>
                                    <text x="60" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#sh)" letter-spacing="-3">S</text>
                                    <text x="60" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.5" letter-spacing="-3">S</text>
                                    <circle cx="119" cy="46" r="3.2" fill="#00C6FF" opacity="0.55" filter="url(#glow-blue-l)"/>
                                    <circle cx="119" cy="46" r="1.6" fill="#00FFA3" opacity="0.95"/>
                                    <rect x="222" y="60" width="46" height="2.8" rx="1.4" fill="url(#spd)"/>
                                    <rect x="226" y="68" width="38" height="2.2" rx="1.1" fill="url(#spd)" opacity="0.7"/>
                                    <rect x="230" y="76" width="30" height="1.6" rx="0.8" fill="url(#spd)" opacity="0.5"/>
                                    <rect x="234" y="83" width="22" height="1.1" rx="0.55" fill="url(#spd)" opacity="0.3"/>
                                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="#00C6FF" fill-opacity="0.16" letter-spacing="-3" transform="translate(4,3)">P</text>
                                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="#00FFA3" fill-opacity="0.1" letter-spacing="-3" transform="translate(-3,-2)">P</text>
                                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#gpg)" filter="url(#glow-blue-l)" letter-spacing="-3">P</text>
                                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="url(#gp)" letter-spacing="-3">P</text>
                                    <text x="124" y="74" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="78" fill="none" stroke="rgba(0,198,255,0.32)" stroke-width="0.8" letter-spacing="-3">P</text>
                                  </g>
                                  <text x="84" y="115" font-family="Arial,Helvetica Neue,sans-serif" font-size="15.5" font-weight="700" fill="white" fill-opacity="0.86" letter-spacing="0.13em">Sigma SMS Panel</text>
                                  <line x1="84" y1="126" x2="385" y2="126" stroke="url(#tg)" stroke-width="0.5" opacity="0.45"/>
                                  <text x="84" y="143" font-family="Arial,Helvetica Neue,sans-serif" font-size="9.5" font-weight="700" fill="url(#tg)" letter-spacing="0.32em">SMART  |  SECURE  |  POWERFUL</text>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="auth-form auth-form-login">
                    <div class="auth-form-inner auth-login-inner">
                        <div class="auth-login-heading">
                            <h2>Welcome back</h2>
                            <p>Sign in to your account.</p>
                        </div>
                        <div id="login-error" class="auth-error" style="display:none"></div>
                        <form id="login-form" class="auth-login-form">
                            <div class="form-group">
                                <label class="fly-label" for="l-user">Username</label>
                                <div class="input-wrapper auth-input-wrap">
                                    <span class="auth-input-icon">${ICONS.user}</span>
                                    <input type="text" id="l-user" class="fly-input auth-input" placeholder="Enter username" required autocomplete="username">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="fly-label" for="l-pass">Password</label>
                                <div class="input-wrapper auth-input-wrap">
                                    <span class="auth-input-icon">${ICONS.lock}</span>
                                    <input type="password" id="l-pass" class="fly-input auth-input" placeholder="Enter password" required autocomplete="current-password">
                                    <button type="button" class="password-toggle auth-password-toggle" aria-label="Toggle password" onclick="window.auth._togglePwd('l-pass',this)">${ICONS.eyeOff}</button>
                                </div>
                            </div>
                            <div class="auth-captcha-card">
                                <div class="auth-captcha-question">
                                    <label class="fly-label" for="l-captcha">Security check</label>
                                    <strong><span id="captcha-q">${captchaQ}</span> = ?</strong>
                                </div>
                                <input type="number" id="l-captcha" class="fly-input auth-captcha-input" placeholder="Answer" required inputmode="numeric">
                            </div>
                            <button type="submit" id="login-btn" class="fly-btn auth-submit-btn">
                                <span id="login-btn-content" class="auth-btn-content">${ICONS.send} Sign In</span>
                                <span id="login-btn-loading" class="auth-btn-loading" style="display:none"><span class="spinner auth-btn-spinner"></span></span>
                            </button>
                        </form>
                        <div class="auth-link-row">
                            <span>Don't have an account?</span>
                            <a href="#" id="to-signup">Create Account</a>
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
            btnLoading.style.display = 'inline-flex';
            try {
                await this.login(document.getElementById('l-user').value.trim(), document.getElementById('l-pass').value);
                window.renderDashboardShell();
                window.ui.showToast('Logged in successfully', 'success');
            } catch (ex) {
                err.textContent = ex.message; err.style.display = 'block';
                const q = this._newCaptcha();
                document.getElementById('captcha-q').textContent = q;
                document.getElementById('l-captcha').value = '';
                btn.disabled = false;
                btnContent.style.display = 'inline-flex';
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
            <div class="auth-card auth-card-signup">
                <div class="auth-cover auth-cover-signup">
                    <div class="auth-cover-content">
                        <div style="width:52px;height:52px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);border-radius:14px;color:white">${ICONS.smpp}</div>
                        <h1 style="color:white;font-size:22px;font-weight:900;letter-spacing:-0.02em;margin-bottom:10px">Sigma SMS</h1>
                        <p style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:32px;line-height:1.5">Trusted A2P & P2P IPRN SMS Partner</p>
                        <div class="signup-steps">
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
                <div class="auth-form auth-form-signup">
                    <div class="auth-signup-inner">
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
                <div class="pay-method-grid">
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
            <div class="auth-form-actions">
                <button type="button" class="fly-btn fly-btn-secondary" onclick="window.auth._renderStep1()">${ICONS.chevronDown} Back</button>
                <button type="submit" id="s2-btn" class="fly-btn auth-primary-action">${ICONS.send}&nbsp; Submit Registration</button>
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
            const msg = ex.message || '';
            if (ex.status === 429 || msg.toLowerCase().includes('daily registration limit') || msg.toLowerCase().includes('limit reached')) {
                err.innerHTML = '🚫 Daily registration limit finished. Please contact us on Microsoft Teams at <a href="https://teams.microsoft.com/l/chat/0/0?users=adnanman2026@outlook.com" target="_blank" style="color:var(--primary)">adnanman2026@outlook.com</a>.';
            } else {
                err.textContent = msg;
            }
            err.style.display = 'block';
            btn.disabled = false; btn.innerHTML = ICONS.send + '&nbsp; Submit Registration';
        }
    }
};
window.auth = auth;
