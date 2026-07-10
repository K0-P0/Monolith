(function () {
    'use strict';

    const PALETTES = {

        amber: {
            name:    "Terminal Amber",
            desc:    "The original. Industrial dark with gold amber.",
            preview: ["#0d0f12", "#f0a000", "#38c872"],
            vars:    {}
        },

        vanguard: {
            name:    "VanGuard",
            desc:    "The V7 flagship. Tactical command-center: gunmetal black, electric crimson, hazard orange. Raw and authoritative.",
            preview: ["#050607", "#ff1f3d", "#ff6a00"],
            vars: {
                '--bg':          '#050607',
                '--bg1':         '#0a0c0e',
                '--bg2':         '#0f1215',
                '--bg3':         '#14181c',
                '--line':        '#1b2126',
                '--line2':       '#252d35',
                '--muted':       '#3a444e',
                '--dim':         '#5d6a75',
                '--ghost':       '#8b98a3',
                '--text':        '#cdd6dd',
                '--bright':      '#f2f6f9',
                '--amber':       '#ff1f3d',
                '--amber2':      '#d40f2c',
                '--amber-bg':    'rgba(255,31,61,.09)',
                '--amber-glow':  'rgba(255,31,61,.30)',
                '--green':       '#2bd96a',
                '--green-bg':    'rgba(43,217,106,.09)',
                '--red':         '#ff6a00',
                '--red-bg':      'rgba(255,106,0,.10)',
                '--blue':        '#4fa3ff',
                '--blue-bg':     'rgba(79,163,255,.09)',
                '--purple':      '#b06aff',
                '--orange':      '#ffb300',
                '--r':           '2px',
                '--r2':          '4px',
                '--r3':          '6px',
            }
        },

        cyberpunk: {
            name:    "Cyberpunk",
            desc:    "Neon cyan on near-black. High contrast, high voltage.",
            preview: ["#0a0a14", "#00f5ff", "#ff006e"],
            vars: {
                '--bg':          '#0a0a14',
                '--bg1':         '#0e0e1a',
                '--bg2':         '#131320',
                '--bg3':         '#181828',
                '--line':        '#1c1c32',
                '--line2':       '#242440',
                '--muted':       '#2a2a50',
                '--dim':         '#4a4a80',
                '--ghost':       '#7a7aaa',
                '--text':        '#c8d0f0',
                '--bright':      '#e8eeff',
                '--amber':       '#00f5ff',
                '--amber2':      '#00c8d4',
                '--amber-bg':    'rgba(0,245,255,.08)',
                '--amber-glow':  'rgba(0,245,255,.22)',
                '--green':       '#00ff9f',
                '--green-bg':    'rgba(0,255,159,.08)',
                '--red':         '#ff006e',
                '--red-bg':      'rgba(255,0,110,.09)',
                '--blue':        '#7b2fff',
                '--blue-bg':     'rgba(123,47,255,.09)',
                '--purple':      '#ff006e',
                '--orange':      '#ff9f00',
            }
        },

        synthwave: {
            name:    "Synthwave",
            desc:    "Retro purple and pink. 80s nostalgia, maximum vibe.",
            preview: ["#0d0818", "#e040fb", "#ff6ec7"],
            vars: {
                '--bg':          '#0d0818',
                '--bg1':         '#120d20',
                '--bg2':         '#181028',
                '--bg3':         '#1e1430',
                '--line':        '#231840',
                '--line2':       '#2e2050',
                '--muted':       '#3a2860',
                '--dim':         '#6040a0',
                '--ghost':       '#9070c8',
                '--text':        '#d0c0f0',
                '--bright':      '#f0e8ff',
                '--amber':       '#e040fb',
                '--amber2':      '#b030d0',
                '--amber-bg':    'rgba(224,64,251,.09)',
                '--amber-glow':  'rgba(224,64,251,.25)',
                '--green':       '#72ffa0',
                '--green-bg':    'rgba(114,255,160,.08)',
                '--red':         '#ff6ec7',
                '--red-bg':      'rgba(255,110,199,.09)',
                '--blue':        '#40c8ff',
                '--blue-bg':     'rgba(64,200,255,.09)',
                '--purple':      '#ff6ec7',
                '--orange':      '#ffb347',
            }
        },

        deep_ocean: {
            name:    "Deep Ocean",
            desc:    "Calm blue-teal on deep navy. Focused and clean.",
            preview: ["#050d18", "#00bcd4", "#0097a7"],
            vars: {
                '--bg':          '#050d18',
                '--bg1':         '#07111f',
                '--bg2':         '#0a1828',
                '--bg3':         '#0d1e30',
                '--line':        '#102030',
                '--line2':       '#163040',
                '--muted':       '#1e4060',
                '--dim':         '#306080',
                '--ghost':       '#5090b0',
                '--text':        '#b0d0e8',
                '--bright':      '#d8eeff',
                '--amber':       '#00bcd4',
                '--amber2':      '#0097a7',
                '--amber-bg':    'rgba(0,188,212,.09)',
                '--amber-glow':  'rgba(0,188,212,.22)',
                '--green':       '#26c6da',
                '--green-bg':    'rgba(38,198,218,.09)',
                '--red':         '#ef5350',
                '--red-bg':      'rgba(239,83,80,.09)',
                '--blue':        '#42a5f5',
                '--blue-bg':     'rgba(66,165,245,.09)',
                '--purple':      '#7e57c2',
                '--orange':      '#26c6da',
            }
        },

        military: {
            name:    "Military",
            desc:    "Tactical olive and green on dark earth tones.",
            preview: ["#0c0f08", "#8bc34a", "#558b2f"],
            vars: {
                '--bg':          '#0c0f08',
                '--bg1':         '#10140a',
                '--bg2':         '#151a0e',
                '--bg3':         '#1a2012',
                '--line':        '#202810',
                '--line2':       '#283218',
                '--muted':       '#344020',
                '--dim':         '#506030',
                '--ghost':       '#7a8a50',
                '--text':        '#c0cc90',
                '--bright':      '#e0e8b0',
                '--amber':       '#8bc34a',
                '--amber2':      '#689f38',
                '--amber-bg':    'rgba(139,195,74,.09)',
                '--amber-glow':  'rgba(139,195,74,.22)',
                '--green':       '#aed581',
                '--green-bg':    'rgba(174,213,129,.09)',
                '--red':         '#e57373',
                '--red-bg':      'rgba(229,115,115,.09)',
                '--blue':        '#80cbc4',
                '--blue-bg':     'rgba(128,203,196,.09)',
                '--purple':      '#a5d6a7',
                '--orange':      '#ffcc02',
            }
        },

        arctic: {
            name:    "Arctic",
            desc:    "Ice blue and white on deep midnight navy. Pure and minimal.",
            preview: ["#060b14", "#90caf9", "#ffffff"],
            vars: {
                '--bg':          '#060b14',
                '--bg1':         '#090f1c',
                '--bg2':         '#0c1424',
                '--bg3':         '#101a2c',
                '--line':        '#142030',
                '--line2':       '#1a2a3e',
                '--muted':       '#224060',
                '--dim':         '#406080',
                '--ghost':       '#6090b0',
                '--text':        '#c0d8f0',
                '--bright':      '#eef6ff',
                '--amber':       '#90caf9',
                '--amber2':      '#64b5f6',
                '--amber-bg':    'rgba(144,202,249,.09)',
                '--amber-glow':  'rgba(144,202,249,.22)',
                '--green':       '#a5d6a7',
                '--green-bg':    'rgba(165,214,167,.09)',
                '--red':         '#ef9a9a',
                '--red-bg':      'rgba(239,154,154,.09)',
                '--blue':        '#80deea',
                '--blue-bg':     'rgba(128,222,234,.09)',
                '--purple':      '#ce93d8',
                '--orange':      '#ffcc80',
            }
        },

        crimson: {
            name:    "Crimson",
            desc:    "Deep red accent on near-black. Bold and authoritative.",
            preview: ["#0f0808", "#e53935", "#ff7043"],
            vars: {
                '--bg':          '#0f0808',
                '--bg1':         '#160c0c',
                '--bg2':         '#1c1010',
                '--bg3':         '#221414',
                '--line':        '#2a1616',
                '--line2':       '#341e1e',
                '--muted':       '#4a2020',
                '--dim':         '#703030',
                '--ghost':       '#a05050',
                '--text':        '#e0c0c0',
                '--bright':      '#ffe8e8',
                '--amber':       '#e53935',
                '--amber2':      '#c62828',
                '--amber-bg':    'rgba(229,57,53,.09)',
                '--amber-glow':  'rgba(229,57,53,.25)',
                '--green':       '#66bb6a',
                '--green-bg':    'rgba(102,187,106,.09)',
                '--red':         '#ff7043',
                '--red-bg':      'rgba(255,112,67,.09)',
                '--blue':        '#42a5f5',
                '--blue-bg':     'rgba(66,165,245,.09)',
                '--purple':      '#ab47bc',
                '--orange':      '#ff7043',
            }
        },

        void: {
            name:    "Void",
            desc:    "Pure black with white accents. Distraction-free minimalism.",
            preview: ["#000000", "#ffffff", "#444444"],
            vars: {
                '--bg':          '#000000',
                '--bg1':         '#0a0a0a',
                '--bg2':         '#111111',
                '--bg3':         '#181818',
                '--line':        '#1e1e1e',
                '--line2':       '#282828',
                '--muted':       '#333333',
                '--dim':         '#555555',
                '--ghost':       '#888888',
                '--text':        '#cccccc',
                '--bright':      '#ffffff',
                '--amber':       '#ffffff',
                '--amber2':      '#cccccc',
                '--amber-bg':    'rgba(255,255,255,.06)',
                '--amber-glow':  'rgba(255,255,255,.15)',
                '--green':       '#aaaaaa',
                '--green-bg':    'rgba(170,170,170,.08)',
                '--red':         '#888888',
                '--red-bg':      'rgba(136,136,136,.08)',
                '--blue':        '#aaaaaa',
                '--blue-bg':     'rgba(170,170,170,.08)',
                '--purple':      '#aaaaaa',
                '--orange':      '#cccccc',
            }
        },

        copper: {
            name:    "Copper",
            desc:    "Warm copper and bronze on dark charcoal. Rich and grounded.",
            preview: ["#100c08", "#b87333", "#cd7f32"],
            vars: {
                '--bg':          '#100c08',
                '--bg1':         '#170e0a',
                '--bg2':         '#1e130d',
                '--bg3':         '#251810',
                '--line':        '#2c1e12',
                '--line2':       '#382618',
                '--muted':       '#4a3020',
                '--dim':         '#705040',
                '--ghost':       '#9a7050',
                '--text':        '#d8c0a0',
                '--bright':      '#f0dcc0',
                '--amber':       '#b87333',
                '--amber2':      '#8b5a2b',
                '--amber-bg':    'rgba(184,115,51,.09)',
                '--amber-glow':  'rgba(184,115,51,.25)',
                '--green':       '#8bc34a',
                '--green-bg':    'rgba(139,195,74,.09)',
                '--red':         '#e57373',
                '--red-bg':      'rgba(229,115,115,.09)',
                '--blue':        '#80cbc4',
                '--blue-bg':     'rgba(128,203,196,.09)',
                '--purple':      '#ce93d8',
                '--orange':      '#cd7f32',
            }
        },

        forest: {
            name:    "Forest",
            desc:    "Deep greens on dark earth. Natural, calm, and easy on the eyes.",
            preview: ["#080f0a", "#2e7d32", "#66bb6a"],
            vars: {
                '--bg':          '#080f0a',
                '--bg1':         '#0d160f',
                '--bg2':         '#111d13',
                '--bg3':         '#162418',
                '--line':        '#1a2c1c',
                '--line2':       '#203824',
                '--muted':       '#2a4a2e',
                '--dim':         '#406848',
                '--ghost':       '#609068',
                '--text':        '#b0d0b8',
                '--bright':      '#d8f0dc',
                '--amber':       '#66bb6a',
                '--amber2':      '#43a047',
                '--amber-bg':    'rgba(102,187,106,.09)',
                '--amber-glow':  'rgba(102,187,106,.22)',
                '--green':       '#a5d6a7',
                '--green-bg':    'rgba(165,214,167,.09)',
                '--red':         '#ef9a9a',
                '--red-bg':      'rgba(239,154,154,.09)',
                '--blue':        '#80cbc4',
                '--blue-bg':     'rgba(128,203,196,.09)',
                '--purple':      '#ce93d8',
                '--orange':      '#ffcc80',
            }
        },

        independence: {
            name:    "Independence",
            desc:    "Red, white, and blue. A festive look for the Fourth of July.",
            preview: ["#050810", "#e0293d", "#4f7fdb"],
            vars: {
                '--bg':          '#050810',
                '--bg1':         '#070b16',
                '--bg2':         '#0a0f1e',
                '--bg3':         '#0e1428',
                '--line':        '#142040',
                '--line2':       '#1c2c54',
                '--muted':       '#24346a',
                '--dim':         '#4060a0',
                '--ghost':       '#7090c0',
                '--text':        '#c8d4f0',
                '--bright':      '#f8fafe',
                '--amber':       '#e0293d',
                '--amber2':      '#b81f30',
                '--amber-bg':    'rgba(224,41,61,.09)',
                '--amber-glow':  'rgba(224,41,61,.25)',
                '--green':       '#5b8def',
                '--green-bg':    'rgba(91,141,239,.09)',
                '--red':         '#ff4d5e',
                '--red-bg':      'rgba(255,77,94,.09)',
                '--blue':        '#2f5fbf',
                '--blue-bg':     'rgba(47,95,191,.09)',
                '--purple':      '#5b8def',
                '--orange':      '#ffd700',
            }
        },

        sunset: {
            name:    "Sunset",
            desc:    "Warm orange, pink, and gold on dusky maroon. Bold and vibrant.",
            preview: ["#1a0e14", "#ff6b35", "#ffd23f"],
            vars: {
                '--bg':          '#1a0e14',
                '--bg1':         '#210f1a',
                '--bg2':         '#281222',
                '--bg3':         '#30162a',
                '--line':        '#3a1c34',
                '--line2':       '#46243e',
                '--muted':       '#5c2e50',
                '--dim':         '#8a3e70',
                '--ghost':       '#c06090',
                '--text':        '#f0c0d8',
                '--bright':      '#fff0f8',
                '--amber':       '#ff6b35',
                '--amber2':      '#e0512a',
                '--amber-bg':    'rgba(255,107,53,.09)',
                '--amber-glow':  'rgba(255,107,53,.25)',
                '--green':       '#4ecdc4',
                '--green-bg':    'rgba(78,205,196,.09)',
                '--red':         '#ff3864',
                '--red-bg':      'rgba(255,56,100,.09)',
                '--blue':        '#a742f5',
                '--blue-bg':     'rgba(167,66,245,.09)',
                '--purple':      '#ff3864',
                '--orange':      '#ffd23f',
            }
        },
    };

    const STYLE_ID    = 'vault-theme-override';
    const CACHE_KEY   = 'vault_theme';

    function buildCSS(paletteId) {
        const p = PALETTES[paletteId];
        let css = '';
        if (p && Object.keys(p.vars).length) {
            const lines = Object.entries(p.vars)
                .map(([k, v]) => `  ${k}: ${v};`)
                .join('\n');
            css = `:root {\n${lines}\n}`;
        }
        if (paletteId === 'vanguard') {
            css += `
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.014) 0 1px, transparent 1px 3px);
}
#topbar { border-bottom: 1px solid rgba(255,31,61,.30); }
#logo   { border-bottom: 1px solid rgba(255,31,61,.30); }
#tabbar { border-top: 1px solid rgba(255,31,61,.30); }
.card-title, .stat-label { letter-spacing: 2.5px; }
.btn { letter-spacing: .8px; }
.stat { border-left: 2px solid var(--line2); }
.logo-icon, .auth-logo-icon { color: #fff; }
`;
        }
        if (paletteId === 'independence') {
            css += `
#logo .logo-name .bn-l:nth-child(3n+1) { color: #ff4d5e; }
#logo .logo-name .bn-l:nth-child(3n+2) { color: #f8fafe; }
#logo .logo-name .bn-l:nth-child(3n+3) { color: #2f5fbf; }
#logo .logo-name {
  position: relative;
  overflow: hidden;
  text-shadow: 0 0 8px rgba(255,255,255,.35);
}
#logo .logo-name::after {
  content: '';
  position: absolute;
  top: 0; left: -60%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent);
  mix-blend-mode: overlay;
  pointer-events: none;
  animation: bn-sweep 2.6s linear infinite;
}
@keyframes bn-sweep {
  0%   { left: -60%; }
  100% { left: 160%; }
}`;
        }
        return css;
    }

    function wrapBrandLetters() {
        const el = document.querySelector('#logo .logo-name');
        if (!el || el.dataset.wrapped) return;
        el.dataset.wrapped = '1';
        el.innerHTML = [...el.textContent].map(ch => `<span class="bn-l">${ch}</span>`).join('');
    }

    function applyTheme(paletteId) {
        const id = PALETTES[paletteId] ? paletteId : 'amber';
        wrapBrandLetters();
        let el = document.getElementById(STYLE_ID);
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            document.head.appendChild(el);
        }
        el.textContent = buildCSS(id);
        try { localStorage.setItem(CACHE_KEY, id); } catch (_) {}
        document.querySelectorAll('.vs-card').forEach(c => {
            c.classList.toggle('vs-active', c.dataset.pid === id);
        });
    }

    (function applyCached() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached && PALETTES[cached]) applyTheme(cached);
        } catch (_) {}
    })();

    window.applyVaultTheme = applyTheme;

    (function buildPage() {
        if (document.getElementById('vs-grid')) return;
        const div = document.getElementById('page-vault_style') || document.createElement('div');
        div.id = 'page-vault_style';
        div.className = 'page';
        div.innerHTML = `
            <div class="alert al-i">
                🎨 Pick a palette — it applies instantly and syncs across all your devices.
            </div>
            <div class="stat-row" id="vs-current-stat"></div>
            <div class="card">
                <div class="card-hd">
                    <span class="card-title">Color Palettes</span>
                    <span class="badge bg" id="vs-active-name">Terminal Amber</span>
                </div>
                <div id="vs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:4px"></div>
            </div>
        `;
        if (!div.parentNode) document.getElementById('content').appendChild(div);

        if (!document.getElementById('vs-style')) {
            const s = document.createElement('style');
            s.id = 'vs-style';
            s.textContent = `
                .vs-card {
                    background: var(--bg2);
                    border: 2px solid var(--line2);
                    border-radius: var(--r2);
                    padding: 14px 16px;
                    cursor: pointer;
                    transition: border-color .15s, transform .12s;
                    position: relative;
                    overflow: hidden;
                }
                .vs-card:hover { border-color: var(--amber); transform: translateY(-1px); }
                .vs-card.vs-active {
                    border-color: var(--amber);
                    box-shadow: 0 0 0 1px var(--amber), 0 0 16px var(--amber-glow);
                }
                .vs-card.vs-active::after {
                    content: '✓';
                    position: absolute;
                    top: 10px; right: 12px;
                    width: 22px; height: 22px;
                    background: var(--amber);
                    color: #000;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                }
                .vs-swatches {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 10px;
                }
                .vs-swatch {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--r);
                    border: 1px solid rgba(255,255,255,.1);
                    flex-shrink: 0;
                }
                .vs-pname {
                    font-weight: 700;
                    font-size: 14px;
                    color: var(--bright);
                    margin-bottom: 3px;
                }
                .vs-pdesc {
                    font-size: 11px;
                    color: var(--dim);
                    line-height: 1.5;
                }
            `;
            document.head.appendChild(s);
        }
    })();

    window.render_vault_style = async function () {
        const prefs = DB['vault_style'] || {};
        const current = prefs.theme || 'amber';

        applyTheme(current);

        const badge = document.getElementById('vs-active-name');
        if (badge) badge.textContent = PALETTES[current]?.name || current;

        const stat = document.getElementById('vs-current-stat');
        if (stat) {
            const p = PALETTES[current];
            stat.innerHTML = `
                <div class="stat">
                    <div class="stat-label">Active Palette</div>
                    <div class="stat-val" style="font-size:20px">${p?.name || current}</div>
                    <div class="stat-sub">${p?.desc || ''}</div>
                    <div class="stat-bar g"></div>
                </div>`;
        }

        const grid = document.getElementById('vs-grid');
        if (!grid) return;
        grid.innerHTML = Object.entries(PALETTES).map(([id, p]) => `
            <div class="vs-card ${id === current ? 'vs-active' : ''}"
                 data-pid="${id}"
                 onclick="vs_select('${id}')">
                <div class="vs-swatches">
                    ${p.preview.map(col =>
                        `<div class="vs-swatch" style="background:${col}"></div>`
                    ).join('')}
                    <!-- Live preview swatches using the palette's own vars -->
                    <div class="vs-swatch" style="background:${p.vars['--amber'] || '#f0a000'}"></div>
                    <div class="vs-swatch" style="background:${p.vars['--green'] || '#38c872'}"></div>
                    <div class="vs-swatch" style="background:${p.vars['--red']   || '#e05252'}"></div>
                </div>
                <div class="vs-pname">${p.name}</div>
                <div class="vs-pdesc">${p.desc}</div>
            </div>
        `).join('');
    };

    window.vs_select = async function (id) {
        if (!PALETTES[id]) return;
        applyTheme(id);
        const badge = document.getElementById('vs-active-name');
        if (badge) badge.textContent = PALETTES[id].name;
        const stat = document.getElementById('vs-current-stat');
        if (stat) {
            const p = PALETTES[id];
            stat.innerHTML = `
                <div class="stat">
                    <div class="stat-label">Active Palette</div>
                    <div class="stat-val" style="font-size:20px">${p.name}</div>
                    <div class="stat-sub">${p.desc}</div>
                    <div class="stat-bar g"></div>
                </div>`;
        }
        try {
            await api('POST', '/api/mod/vault_style/', { theme: id });
            toast(`${PALETTES[id].name} applied`, 'ok');
            DB['vault_style'] = { theme: id };
        } catch (e) {
            toast(e.message, 'er');
        }
    };

    window.dashWidget_vault_style = function () {
        const prefs   = DB['vault_style'] || {};
        const current = prefs.theme || 'amber';
        const p       = PALETTES[current];
        return `
            <div class="card" onclick="navigate('vault_style')" style="cursor:pointer">
                <div class="card-hd">
                    <span class="card-title">🎨 Vault Style</span>
                    <span class="badge bg">${p?.name || current}</span>
                </div>
                <div style="display:flex;gap:6px;margin:10px 0 4px">
                    ${(p?.preview || ['#f0a000']).map(col =>
                        `<div style="width:28px;height:28px;border-radius:var(--r);background:${col};border:1px solid rgba(255,255,255,.1)"></div>`
                    ).join('')}
                </div>
                <div style="font-size:11px;color:var(--dim)">${p?.desc || ''}</div>
            </div>`;
    };

    window.initDashWidget_vault_style = function () {
        const prefs = DB['vault_style'] || {};
        const theme = prefs.theme || 'amber';
        applyTheme(theme);
    };

})();
