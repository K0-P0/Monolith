(function () {
    'use strict';

    (function buildPage() {
        if (document.getElementById('adm-panel-mods')) return;
        const div = document.createElement('div');
        div.id = 'page-admin';
        div.className = 'page';
        div.innerHTML = `
            <div style="display:flex;background:var(--bg2);border-radius:var(--r);padding:3px;margin-bottom:0" id="adm-tabs">
                <button class="adm-tab active" id="adm-t-mods"  onclick="adm_tab('mods')"  style="flex:1;padding:9px;border:none;background:var(--amber);color:#000;cursor:pointer;font-family:var(--fd);font-size:13px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:var(--touch)">&#x1F9E9; Global Mods</button>
                <button class="adm-tab"        id="adm-t-users" onclick="adm_tab('users')" style="flex:1;padding:9px;border:none;background:transparent;color:var(--ghost);cursor:pointer;font-family:var(--fd);font-size:13px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:var(--touch)">&#x1F465; Users</button>
            </div>
            <div id="adm-panel-mods"></div>
            <div id="adm-panel-users" style="display:none"></div>
        `;
        document.getElementById('content').appendChild(div);
    })();

    window.render_admin = async function () {
        if (!ME.is_admin) {
            const el = document.getElementById('page-admin');
            if (el) el.innerHTML = `<div class="card"><div class="empty"><div class="ei">&#x1F512;</div><p class="ep">Admin access required.</p></div></div>`;
            return;
        }
        adm_tab('mods');
    };

    window.adm_tab = function (t) {
        ['mods', 'users'].forEach(x => {
            const tab   = document.getElementById(`adm-t-${x}`);
            const panel = document.getElementById(`adm-panel-${x}`);
            const active = x === t;
            if (tab) { tab.style.background = active ? 'var(--amber)' : 'transparent'; tab.style.color = active ? '#000' : 'var(--ghost)'; }
            if (panel) panel.style.display = active ? '' : 'none';
        });
        if (t === 'mods')  adm_loadMods();
        if (t === 'users') adm_loadUsers();
    };

    async function adm_loadMods() {
        const el = document.getElementById('adm-panel-mods');
        el.innerHTML = '<div style="color:var(--dim);padding:10px">Loading...</div>';
        try {
            const mods = await api('GET', '/api/admin/mods');
            el.innerHTML = `
                <div class="card">
                    <div class="card-hd"><span class="card-title">Global Mod Control</span></div>
                    <div class="mod-grid">
                        ${mods.map(m => `
                            <div class="mod-card">
                                <div class="mod-card-row">
                                    <div class="mod-icon">${m.icon}</div>
                                    <div class="mod-info">
                                        <div class="mod-name">${m.name}</div>
                                        <div class="mod-desc">
                                            ${m.globally_enabled
                                                ? '<span style="color:var(--green)">&#x1F7E2; Enabled for all users</span>'
                                                : '<span style="color:var(--red)">&#x1F534; Disabled globally</span>'}
                                        </div>
                                    </div>
                                    <label class="toggle">
                                        <input type="checkbox" ${m.globally_enabled ? 'checked' : ''}
                                               onchange="adm_toggleMod('${m.id}', this.checked)">
                                        <div class="tgl-tr"></div><div class="tgl-th"></div>
                                    </label>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>`;
        } catch (e) {
            el.innerHTML = `<div class="alert al-d">${e.message}</div>`;
        }
    }

    window.adm_toggleMod = async function (id, enable) {
        try {
            await api('POST', `/api/admin/mods/${id}/toggle`, { enabled: enable });
            toast(enable ? 'Mod enabled for all users.' : 'Mod disabled globally.', enable ? 'ok' : 'wn');
            await loadMods(); buildSidebar(); adm_loadMods();
        } catch (e) { toast(e.message, 'er'); }
    };

    async function adm_loadUsers() {
        const el = document.getElementById('adm-panel-users');
        el.innerHTML = '<div style="color:var(--dim);padding:10px">Loading...</div>';
        try {
            const [users, regStatus, ver] = await Promise.all([
                api('GET', '/api/admin/users'),
                fetch('/api/registration-status').then(r => r.json()).catch(() => ({ open: true })),
                api('GET', '/api/version').catch(() => ({ version: '?' })),
            ]);

            el.innerHTML = `
                <!-- Registration toggle -->
                <div class="card" style="margin-bottom:0">
                    <div class="card-hd"><span class="card-title">Registration</span></div>
                    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                        <div style="flex:1;min-width:0">
                            <div style="font-size:13px;font-weight:600;color:var(--bright);margin-bottom:3px">
                                ${regStatus.open
                                    ? '&#x1F7E2; Open — anyone with the URL can register'
                                    : '&#x1F534; Closed — only existing users can sign in'}
                            </div>
                            <div style="font-size:11px;color:var(--dim)">
                                ${regStatus.open
                                    ? 'Close this once everyone who needs access has registered.'
                                    : 'The Register tab is hidden on the login screen.'}
                            </div>
                        </div>
                        <button class="btn ${regStatus.open ? 'btn-d' : 'btn-ok'} btn-sm"
                                onclick="adm_toggleReg(${!regStatus.open})">
                            ${regStatus.open ? '&#x1F512; Close Registration' : '&#x1F513; Open Registration'}
                        </button>
                    </div>
                </div>

                <!-- User list -->
                <div class="card">
                    <div class="card-hd"><span class="card-title">All Users</span></div>
                    ${users.map(u => `
                        <div class="ur">
                            <div class="ur-av">${escapeHtml(u.username[0].toUpperCase())}</div>
                            <div class="ur-info">
                                <div class="ur-name">
                                    ${escapeHtml(u.username)}
                                    ${u.is_admin ? '<span class="badge ba">Admin</span>' : ''}
                                    ${u.id === ME.id ? '<span class="badge bg">You</span>' : ''}
                                </div>
                                <div class="ur-meta">
                                    ID: ${escapeHtml(u.id)} &middot; Joined: ${fd(u.created)}
                                    &nbsp;&middot;&nbsp;
                                    ${u.totp_configured
                                        ? `<span style="color:var(--green)">&#x1F6E1; 2FA active</span>
                                           (since ${escapeHtml(u.totp_setup_date || '?')}, ${u.backup_codes_remaining} backup codes)`
                                        : '<span style="color:var(--red)">&#x26A0; No 2FA</span>'}
                                </div>
                            </div>
                            ${u.id !== ME.id ? `
                                <div class="ra">
                                    <button class="btn btn-g btn-xs"
                                            data-uid="${escapeHtml(u.id)}" data-uname="${escapeHtml(u.username)}"
                                            onclick="adm_setAdmin(this.dataset.uid, this.dataset.uname, ${u.is_admin ? 'false' : 'true'})"
                                            title="${u.is_admin ? 'Remove Admin' : 'Make Admin'}">
                                        &#x1F451;
                                    </button>
                                    <button class="btn ${u.totp_configured ? 'btn-ok' : 'btn-g'} btn-xs"
                                            data-uid="${escapeHtml(u.id)}" data-uname="${escapeHtml(u.username)}"
                                            onclick="adm_resetTotp(this.dataset.uid, this.dataset.uname)"
                                            title="${u.totp_configured ? 'Reset 2FA' : '2FA not configured'}">
                                        &#x1F6E1;
                                    </button>
                                    <button class="btn btn-g btn-xs"
                                            data-uid="${escapeHtml(u.id)}" data-uname="${escapeHtml(u.username)}"
                                            onclick="adm_resetPw(this.dataset.uid, this.dataset.uname)"
                                            title="Reset Password">
                                        &#x1F511;
                                    </button>
                                    <button class="btn btn-d btn-xs"
                                            data-uid="${escapeHtml(u.id)}" data-uname="${escapeHtml(u.username)}"
                                            onclick="adm_deleteUser(this.dataset.uid, this.dataset.uname)">
                                        &#x1F5D1;
                                    </button>
                                </div>` : ''}
                        </div>`).join('')}
                </div>
                <div style="text-align:center;font-size:11px;color:var(--dim);padding:2px 0 10px">Monolith ${escapeHtml(String(ver.version))}</div>`;
        } catch (e) {
            el.innerHTML = `<div class="alert al-d">${e.message}</div>`;
        }
    }

    window.adm_toggleReg = async function (allow) {
        try {
            const r = await api('POST', '/api/admin/registration', { allow });
            toast(r.message, allow ? 'ok' : 'wn');
            const reTab = g('tab-re');
            if (reTab) reTab.style.display = allow ? '' : 'none';
            adm_loadUsers();
        } catch (e) { toast(e.message, 'er'); }
    };

    window.adm_setAdmin = async function (uid, username, make) {
        const msg = make
            ? `Make ${username} an admin? They will be able to manage every user and global mods.`
            : `Remove admin rights from ${username}?`;
        if (!confirm(msg)) return;
        try {
            const r = await api('POST', `/api/admin/users/${uid}/admin`, { is_admin: make });
            toast(r.message, 'ok');
            adm_loadUsers();
        } catch (e) { toast(e.message, 'er'); }
    };

    window.adm_resetTotp = function (uid, username) {
        const safeName = escapeHtml(username);
        openModal(`Reset 2FA — ${username}`, `
            <div class="alert al-i" style="margin-bottom:14px">
                &#x1F6E1; This removes <strong>${safeName}</strong>&apos;s authenticator and backup codes.
            </div>
            <div style="background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px">
                <div style="font-size:13px;color:var(--bright);font-weight:600;margin-bottom:4px">What happens:</div>
                <ul style="font-size:12px;color:var(--ghost);line-height:2;margin-left:16px">
                    <li>Their authenticator app is unlinked</li>
                    <li>All backup codes are invalidated</li>
                    <li>On next login they must set up a new authenticator</li>
                    <li>&#x2705; All financial data is completely untouched</li>
                    <li>&#x2705; Password is not changed</li>
                </ul>
            </div>
            <div class="fa">
                <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
                <button class="btn btn-ok" data-uid="${escapeHtml(uid)}" data-uname="${safeName}"
                        onclick="adm_confirmResetTotp(this.dataset.uid, this.dataset.uname)">
                    Reset Their 2FA &#x2713;
                </button>
            </div>`);
    };

    window.adm_confirmResetTotp = async function (uid, username) {
        try {
            const r = await api('DELETE', `/api/admin/users/${uid}/reset-totp`);
            toast(r.message, 'ok');
            closeModal();
            adm_loadUsers();
        } catch (e) { toast(e.message, 'er'); }
    };

    window.adm_resetPw = function (uid, username) {
        const safeName = escapeHtml(username);
        openModal(`Reset Password — ${username}`, `
            <div class="alert al-d" style="margin-bottom:14px">
                &#x26A0; <strong>Data wipe warning.</strong>
                Resetting the password permanently deletes all of ${safeName}&apos;s financial data.
                This cannot be undone.
            </div>
            <div class="fg-grid">
                <div class="fg">
                    <label>New Password (min 8)</label>
                    <input id="adm-rst-pw" type="password" placeholder="New password">
                </div>
                <div class="fg">
                    <label>Confirm New Password</label>
                    <input id="adm-rst-pw2" type="password" placeholder="Confirm">
                </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;margin:14px 0;padding:10px 12px;background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r)">
                <input type="checkbox" id="adm-rst-confirm" style="margin-top:2px;width:auto;height:auto;flex-shrink:0">
                <label for="adm-rst-confirm" style="font-size:12px;color:var(--text);text-transform:none;letter-spacing:0;font-weight:400;cursor:pointer">
                    I understand that <strong>${safeName}&apos;s financial data will be permanently deleted</strong>.
                </label>
            </div>
            <div class="fa">
                <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
                <button class="btn btn-d" data-uid="${escapeHtml(uid)}" data-uname="${safeName}"
                        onclick="adm_confirmResetPw(this.dataset.uid, this.dataset.uname)">
                    Reset Password &amp; Wipe Data
                </button>
            </div>`);
    };

    window.adm_confirmResetPw = async function (uid, username) {
        const pw       = g('adm-rst-pw')?.value;
        const pw2      = g('adm-rst-pw2')?.value;
        const confirmed = g('adm-rst-confirm')?.checked;
        if (!pw || pw.length < 8) { toast('Password must be at least 8 characters', 'wn'); return; }
        if (pw !== pw2) { toast('Passwords do not match', 'wn'); return; }
        if (!confirmed) { toast('Check the confirmation box', 'wn'); return; }
        try {
            const r = await api('POST', `/api/admin/users/${uid}/reset-password`,
                               { new_password: pw, confirmed: true });
            toast(r.message, 'ok');
            closeModal();
            adm_loadUsers();
        } catch (e) { toast(e.message, 'er'); }
    };

    window.adm_deleteUser = async function (uid, username) {
        if (!confirm(`Delete "${username}" and ALL their data?\n\nThis cannot be undone.`)) return;
        try {
            await api('DELETE', `/api/admin/users/${uid}`);
            toast(`"${username}" deleted`, 'ok');
            adm_loadUsers();
        } catch (e) { toast(e.message, 'er'); }
    };

})();
