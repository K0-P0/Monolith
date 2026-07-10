(function () {
    'use strict';

    (function buildPage() {
        if (document.getElementById('prof-info')) return;
        const div = document.createElement('div');
        div.id = 'page-profile';
        div.className = 'page';
        div.innerHTML = `
            <!-- Account info -->
            <div class="card">
                <div class="card-hd"><span class="card-title">Account</span></div>
                <div id="prof-info"></div>
            </div>

            <!-- 2FA status -->
            <div class="card">
                <div class="card-hd">
                    <span class="card-title">Two-Factor Authentication</span>
                    <span class="badge" id="prof-2fa-badge"></span>
                </div>
                <div id="prof-2fa-body"></div>
            </div>

            <!-- Change password -->
            <div class="card">
                <div class="card-hd"><span class="card-title">Change Password</span></div>
                <div class="fg-grid">
                    <div class="fg full"><label>Current Password</label>
                        <input id="pw-c" type="password" placeholder="Current password">
                    </div>
                    <div class="fg"><label>New Password</label>
                        <input id="pw-n" type="password" placeholder="New (min 6)">
                    </div>
                    <div class="fg"><label>Confirm New Password</label>
                        <input id="pw-c2" type="password" placeholder="Confirm">
                    </div>
                    <div class="fg full">
                        <div class="fa">
                            <button class="btn btn-p btn-sm" onclick="prof_changePw()">Update Password</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="alert al-i">
                Your financial data is Fernet-encrypted with a key unique to your account.
                Resetting your password via admin wipes all data — keep your password safe.
            </div>
        `;
        document.getElementById('content').appendChild(div);
    })();

    window.render_profile = async function () {
        try {
            const data = await api('GET', '/api/mod/profile/');
            prof_renderInfo(data);
            prof_render2FA(data);
        } catch (e) {
            toast(e.message, 'er');
        }
        g('pw-c').value = ''; g('pw-n').value = ''; g('pw-c2').value = '';
    };

    function prof_renderInfo(data) {
        const el = g('prof-info');
        if (!el) return;
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--bg2);border-radius:var(--r)">
                <div style="width:46px;height:46px;background:var(--amber);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#000;flex-shrink:0">
                    ${escapeHtml(data.username[0].toUpperCase())}
                </div>
                <div>
                    <div style="font-weight:700;font-size:16px;color:var(--bright)">${escapeHtml(data.username)}</div>
                    <div style="font-size:11px;color:var(--dim);font-family:var(--fm);margin-top:3px">
                        ${data.is_admin ? 'Administrator' : 'User'} &middot; ID: ${escapeHtml(data.id)} &middot; Joined: ${fd(data.created)}
                    </div>
                </div>
            </div>`;
    }

    function prof_render2FA(data) {
        const badge = g('prof-2fa-badge');
        const body  = g('prof-2fa-body');
        if (!badge || !body) return;

        if (data.totp_configured) {
            badge.textContent = '&#x2705; Active';
            badge.className   = 'badge bg';
            badge.innerHTML   = '&#x2705; Active';

            body.innerHTML = `
                <div style="font-size:13px;color:var(--ghost);line-height:1.7;margin-bottom:16px">
                    Authenticator active since
                    <span class="mono am">${data.totp_setup_date || '—'}</span>.
                    &nbsp;&nbsp;
                    <strong style="color:${data.backup_codes_remaining <= 2 ? 'var(--red)' : 'var(--text)'}">
                        ${data.backup_codes_remaining} backup code${data.backup_codes_remaining !== 1 ? 's' : ''} remaining.
                    </strong>
                </div>
                ${data.backup_codes_remaining <= 2
                    ? `<div class="alert al-w" style="margin-bottom:14px">
                        &#x26A0; You're running low on backup codes. Regenerate them now before you lose access.
                       </div>`
                    : ''}
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                    <button class="btn btn-g btn-sm" onclick="prof_showRegenBackup()">
                        &#x1F504; Regenerate Backup Codes
                    </button>
                    <button class="btn btn-d btn-sm" onclick="prof_showDisable2FA()">
                        &#x1F513; Remove 2FA
                    </button>
                </div>`;
        } else {
            badge.innerHTML = '&#x26A0; Not Set Up';
            badge.className = 'badge ba';
            body.innerHTML  = `
                <div style="font-size:13px;color:var(--ghost);line-height:1.7;margin-bottom:14px">
                    Two-factor authentication is not active on your account.
                    You will be required to set it up on your next login regardless.
                </div>
                <button class="btn btn-p btn-sm" onclick="prof_triggerSetup()">
                    &#x1F6E1;&#xFE0F; Set Up Authenticator
                </button>`;
        }
    }

    window.prof_changePw = async function () {
        const c = g('pw-c').value, n = g('pw-n').value, c2 = g('pw-c2').value;
        if (!c || !n || !c2) { toast('Fill in all fields', 'wn'); return; }
        if (n !== c2) { toast('Passwords do not match', 'wn'); return; }
        if (n.length < 6) { toast('Min 6 characters', 'wn'); return; }
        try {
            await api('POST', '/api/mod/profile/change-password', { current: c, new: n });
            toast('Password updated', 'ok');
            g('pw-c').value = ''; g('pw-n').value = ''; g('pw-c2').value = '';
        } catch (e) { toast(e.message, 'er'); }
    };

    window.prof_showRegenBackup = function () {
        openModal('Regenerate Backup Codes', `
            <div class="alert al-w" style="margin-bottom:14px">
                &#x26A0; This invalidates all existing backup codes immediately.
                You will be shown 8 new codes that cannot be recovered if lost.
            </div>
            <div class="fg" style="margin-bottom:14px">
                <label>Confirm with your authenticator code</label>
                <input id="regen-totp" class="totp-inp" type="text" inputmode="numeric"
                       pattern="[0-9]*" maxlength="6" placeholder="000000" autocomplete="one-time-code"
                       style="font-size:28px;letter-spacing:8px;height:60px;text-align:center">
            </div>
            <div class="fa">
                <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
                <button class="btn btn-p" onclick="prof_regenBackup()">Generate New Codes &#x2192;</button>
            </div>`);
        setTimeout(() => g('regen-totp')?.focus(), 100);
    };

    window.prof_regenBackup = async function () {
        const code = g('regen-totp')?.value?.trim();
        if (!code || code.length !== 6) { toast('Enter your 6-digit authenticator code', 'wn'); return; }
        try {
            const r = await api('POST', '/api/mod/profile/regen-backup-codes',
                                { totp_confirm: code });
            closeModal();
            prof_showBackupCodes(r.backup_codes, r.message);
        } catch (e) { toast(e.message, 'er'); }
    };

    function prof_showBackupCodes(codes, message) {
        const grid = codes.map(c =>
            `<div style="font-family:var(--fm);font-size:15px;font-weight:600;letter-spacing:3px;
                         background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r);
                         padding:10px 14px;text-align:center;color:var(--amber)">${c}</div>`
        ).join('');
        openModal('Save Your Backup Codes', `
            <div class="alert al-d" style="margin-bottom:16px">
                &#x1F6A8; <strong>Save these now.</strong> They will never be shown again.
                Each code can only be used once.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
                ${grid}
            </div>
            <div style="font-size:12px;color:var(--dim);margin-bottom:14px">
                Store these in a password manager, printed paper kept somewhere safe,
                or an encrypted notes app. Do not store them in the same place as your phone.
            </div>
            <div class="fa">
                <button class="btn btn-p" onclick="closeModal();render_profile()">
                    I have saved my codes &#x2713;
                </button>
            </div>`);
    }

    window.prof_showDisable2FA = function () {
        openModal('Remove Two-Factor Authentication', `
            <div class="alert al-d" style="margin-bottom:14px">
                &#x26A0; Removing 2FA reduces your account security.
                You will be required to set it up again on your next login.
            </div>
            <div class="fg" style="margin-bottom:10px">
                <label>Your current password</label>
                <input id="dis-pw" type="password" placeholder="Password" autocomplete="current-password">
            </div>
            <div class="fg" style="margin-bottom:14px">
                <label>Authenticator code (to confirm it is you)</label>
                <input id="dis-totp" class="totp-inp" type="text" inputmode="numeric"
                       pattern="[0-9]*" maxlength="6" placeholder="000000"
                       style="font-size:28px;letter-spacing:8px;height:60px;text-align:center">
            </div>
            <div class="fa">
                <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
                <button class="btn btn-d" onclick="prof_disable2FA()">Remove 2FA</button>
            </div>`);
        setTimeout(() => g('dis-pw')?.focus(), 100);
    };

    window.prof_disable2FA = async function () {
        const pw   = g('dis-pw')?.value;
        const code = g('dis-totp')?.value?.trim();
        if (!pw) { toast('Enter your password', 'wn'); return; }
        if (!code || code.length !== 6) { toast('Enter your 6-digit code', 'wn'); return; }
        try {
            const r = await api('DELETE', '/api/mod/profile/disable-2fa',
                                { password: pw, totp_confirm: code });
            toast(r.message, 'wn');
            closeModal();
            await render_profile();
        } catch (e) { toast(e.message, 'er'); }
    };

    window.prof_triggerSetup = function () {
        if (typeof window.showTotpSetup === 'function') {
            window.showTotpSetup(true);
        }
    };

})();
