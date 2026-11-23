// Injected into the HRMS only for showcase captures: Nextohr palette + logo, light mode. Source code untouched.
(() => {
  try { localStorage.setItem('ss-theme', 'light'); } catch {}
  const KEY = 'ss-hrms-db';
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && raw.includes('SurfSync')) {
      localStorage.setItem(KEY, raw
        .replace(/SurfSync Infotech Private Limited/g, 'Northwind Labs Private Limited')
        .replace(/SurfSync Infotech/g, 'Northwind Labs')
        .replace(/surfsyncinfotech\.in/g, 'northwindlabs.com')
        .replace(/SurfSync/g, 'Northwind')
        .replace(/#F68713/g, '#5E0E51').replace(/#2A9CB8/g, '#FC8768'));
    }
  } catch {}
  const css = `
  :root{--bg:250 247 246;--surface:255 255 255;--surface-2:252 250 249;--surface-3:246 241 240;--line:238 231 230;--line-strong:220 210 209;
  --ink:36 16 33;--muted:94 76 90;--subtle:130 112 124;
  --primary:94 14 81;--primary-soft:248 237 245;--primary-ink:94 14 81;--primary-strong:72 8 62;--on-primary:255 255 255;
  --accent:236 112 82;--accent-soft:255 240 235;--accent-ink:178 70 42}
  html.dark{color-scheme:light}
  [fill="#F68713"]{fill:#5E0E51}[stroke="#F68713"]{stroke:#5E0E51}[stop-color="#F68713"]{stop-color:#5E0E51}
  [fill="#FDD09F"]{fill:#E7C3DC}[stroke="#FDD09F"]{stroke:#E7C3DC}[stop-color="#FDD09F"]{stop-color:#E7C3DC}
  [fill="#2A9CB8"]{fill:#FC8768}[stroke="#2A9CB8"]{stroke:#FC8768}[stop-color="#2A9CB8"]{stop-color:#FC8768}
  [fill="#AEE2EF"]{fill:#FFD3C6}[stroke="#AEE2EF"]{stroke:#FFD3C6}[stop-color="#AEE2EF"]{stop-color:#FFD3C6}
  img.nx-logo{object-fit:contain} .bg-gradient-to-r.via-orange-400{background-image:linear-gradient(90deg,#5E0E51,#B4508F 55%,#FC8768)!important}
  `;
  const LOGO = window.__NX_LOGO__;
  const apply = () => {
    document.documentElement.classList.remove('dark');
    if (!document.getElementById('nx-style')) { const s = document.createElement('style'); s.id = 'nx-style'; s.textContent = css; document.head.appendChild(s); }
    document.querySelectorAll('img[alt="SurfSync Infotech"]').forEach((img) => { if (LOGO && img.src !== LOGO) { img.src = LOGO; img.alt = 'Nextohr'; img.classList.add('nx-logo'); } });
    if (document.title.includes('SurfSync')) document.title = 'Nextohr';
    const rep = (t) => t.replace(/SurfSync Infotech Private Limited/g,'Northwind Labs Private Limited').replace(/SurfSync Infotech/g,'Northwind Labs').replace(/surfsyncinfotech.in/g,'northwindlabs.com').replace(/SurfSync/g,'Northwind');
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (/SurfSync|surfsync/.test(n.nodeValue)) n.nodeValue = rep(n.nodeValue); }
    document.querySelectorAll('input,textarea').forEach((i) => { if (/SurfSync|surfsync/.test(i.value)) i.value = rep(i.value); if (/surfsync/.test(i.placeholder)) i.placeholder = rep(i.placeholder); });
    document.querySelectorAll('[style*="246, 135, 19"],[style*="42, 156, 184"]').forEach((el) => { el.style.background = 'linear-gradient(140deg, #3A0732, #5E0E51 45%, #C2568E 75%, #FC8768)'; });
  };
  document.addEventListener('DOMContentLoaded', () => { apply(); new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], characterData: true }); });
})();
