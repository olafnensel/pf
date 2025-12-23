/* =====================================================
   PFADFINDER – NAVIGATION ARCHITEKTUR
   =====================================================

   Review-Baseline:
   Commit: "Navigation – mit ROOT Exit"

   Grundprinzipien:
   - Navigation kennt genau EINEN aktiven Modus:
     ROOT oder SCOPE
   - JavaScript verändert NUR Klassen & Attribute
   - DOM-Struktur wird nicht umgebaut
   - Alle Klicks laufen über EINEN zentralen Handler

   Patch L0:
   - reine Struktur- und Dokumentationsschritte
   - kein neues Verhalten
   - keine DOM-Änderungen
===================================================== */

/* ===================================================== */
/* Helper-Funktionen */
/* ===================================================== */

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* ===================================================== */
/* Navigation State (ROOT / SCOPE) */
/* ===================================================== */

const NAV_STATE = {
  ROOT: 'root',
  SCOPE: 'scope'
};

let currentNavState = NAV_STATE.ROOT;

/* ===================================================== */
/* Browser-Fokus-Scroll unterdrücken (KRITISCH) */
/* ===================================================== */

document.addEventListener('mousedown', e => {
  const leafBtn = e.target.closest('button[data-col]');
  if (leafBtn) {
    e.preventDefault();
  }
});

/* ===================================================== */
/* Navigation – Zustandswechsel */
/* ===================================================== */

function enterRootMode() {
  currentNavState = NAV_STATE.ROOT;
  document.body.classList.remove('nav-focus-mode');

  qsa('.nav-item.is-hidden').forEach(item =>
    item.classList.remove('is-hidden')
  );

  const navScroll = qs('.nav-scroll');
  if (navScroll) {
    navScroll.scrollTop = 0;
  }
}

function enterScopeMode(activeItem) {
  if (!activeItem) return;

  const parentItem = activeItem.parentElement.closest('.nav-item');
  if (!parentItem) return;

  currentNavState = NAV_STATE.SCOPE;
  document.body.classList.add('nav-focus-mode');

  qsa('.nav-item').forEach(item => {
    if (item !== parentItem && !parentItem.contains(item)) {
      item.classList.add('is-hidden');
    }
  });

  const navScroll = qs('.nav-scroll');
  if (!navScroll) return;

  /* Parent als Scroll-Anker */
  navScroll.scrollTop = parentItem.offsetTop;

  const parentBtn = parentItem.querySelector('button');
  if (parentBtn) {
    parentBtn.focus({ preventScroll: true });
  }
}

/* ===================================================== */
/* ZENTRALER CLICK-HANDLER */
/* ===================================================== */

document.addEventListener('click', e => {

  /* -------- ROOT-Exit -------- */
  const rootExitBtn = e.target.closest('.nav-root-button');
  if (rootExitBtn) {
    enterRootMode();
    return;
  }

  /* -------- Parent-Collections -------- */
  const navBtn = e.target.closest('button[data-nav]');
  if (navBtn) {
    const li = navBtn.closest('.nav-item');

    qsa('.nav-item.open').forEach(el => {
      if (el !== li) {
        el.classList.remove('open');
        const btn = qs('button[data-nav]', el);
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });

    const expanded = li.classList.toggle('open');
    navBtn.setAttribute('aria-expanded', expanded);

    enterRootMode();
    return;
  }

  /* -------- Leaf -------- */
  const colBtn = e.target.closest('button[data-col]');
  if (colBtn) {
    const cid = colBtn.getAttribute('data-col');

    qsa('.collection-section.active').forEach(el =>
      el.classList.remove('active')
    );

    const target = document.getElementById(cid);
    if (target) target.classList.add('active');

    qsa('.nav-item.active').forEach(el =>
      el.classList.remove('active')
    );

    const li = colBtn.closest('.nav-item');
    if (li) li.classList.add('active');

    enterScopeMode(li);
    return;
  }

  /* -------- Tipp -------- */
  const tippBtn = e.target.closest('.tipp-toggle');
  if (tippBtn) {
    const wrapper = tippBtn.closest('.tipp-text');
    const expanded = wrapper.classList.toggle('is-expanded');
    tippBtn.setAttribute('aria-expanded', expanded);
    tippBtn.textContent = expanded ? 'weniger anzeigen' : 'mehr anzeigen';
    return;
  }

  /* -------- Trail -------- */
  if (e.target.closest('.trail-toggle-short')) {
    document.body.classList.remove('show-trail-full');
    qsa('.entry-trail.is-expanded').forEach(el =>
      el.classList.remove('is-expanded')
    );
    return;
  }

  if (e.target.closest('.trail-toggle-full')) {
    document.body.classList.add('show-trail-full');
    qsa('.entry-trail.is-expanded').forEach(el =>
      el.classList.remove('is-expanded')
    );
    return;
  }

  const trailToggle = e.target.closest('.trail-expand');
  if (trailToggle) {
    const trail = trailToggle.closest('.entry-trail');
    if (!trail) return;

    document.body.classList.remove('show-trail-full');
    qsa('.entry-trail.is-expanded').forEach(el => {
      if (el !== trail) el.classList.remove('is-expanded');
    });

    trail.classList.toggle('is-expanded');
  }
});

/* ===================================================== */
/* ESC → ROOT */
/* ===================================================== */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && currentNavState === NAV_STATE.SCOPE) {
    enterRootMode();
  }
});

/* ===================================================== */
/* Startparameter */
/* ===================================================== */

function normalizeLabel(label) {
  return label ? label.toLowerCase().replace(/\s+/g, '') : null;
}

(function initFromStartParameter() {
  const raw = new URLSearchParams(location.search).get('start');
  if (!raw) return;

  const start = normalizeLabel(decodeURIComponent(raw));

  let navItem = null;
  let content = null;

  qsa('.nav-item[data-label]').forEach(i => {
    if (normalizeLabel(i.dataset.label) === start) navItem = i;
  });

  qsa('.collection-section[data-label]').forEach(s => {
    if (normalizeLabel(s.dataset.label) === start) content = s;
  });

  if (!navItem || !content) return;

  let cur = navItem;
  while (cur && cur.classList.contains('nav-item')) {
    cur.classList.add('open');
    const btn = cur.querySelector('button[data-nav]');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    cur = cur.parentElement.closest('.nav-item');
  }

  navItem.classList.add('active');
  content.classList.add('active');

  enterScopeMode(navItem);
})();