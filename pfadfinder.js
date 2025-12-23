/* ================================================================
   PFADFINDER – NAVIGATION ARCHITEKTUR (REVIEW-BASELINE)
   ================================================================ */

/* =====================================================
   DEV-GATE – zentrale Entwicklungs-Erkennung
   ===================================================== */

/*
  DEV ist aktiv, wenn:
  <body data-dev="true"> gesetzt ist
*/
function isDevMode() {
  return document.body?.dataset?.dev === 'true';
}

/* ===================================================== */
/* Navigation States */
/* ===================================================== */

const NAV_STATE = {
  ROOT: 'root',
  SCOPE: 'scope'
};

let currentNavState = NAV_STATE.ROOT;

/* Konsolidierte State-Daten */
let currentActiveId = null;
let currentFixedParentId = null;

/* ===================================================== */
/* Helper-Funktionen */
/* ===================================================== */

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/* ===================================================== */
/* ZENTRALER NAVIGATION-STATE-WECHSEL */
/* ===================================================== */

function setNavState(nextState, reason = '') {
  if (currentNavState === nextState) return;
  const prev = currentNavState;
  currentNavState = nextState;
  PF_DEV.onStateChange(prev, nextState, reason, {
    activeId: currentActiveId,
    fixedParentId: currentFixedParentId
  });
}

/* ===================================================== */
/* STATE → UI BINDING */
/* ===================================================== */

function applyNavState() {
  if (currentNavState === NAV_STATE.ROOT) {
    document.body.classList.remove('nav-focus-mode');
  } else {
    document.body.classList.add('nav-focus-mode');
  }
}

/* ===================================================== */
/* Navigation – Zustandswechsel */
/* ===================================================== */

function enterRootMode() {
  currentActiveId = null;
  currentFixedParentId = null;

  setNavState(NAV_STATE.ROOT, 'enterRootMode');
  applyNavState();

  qsa('.nav-item.is-hidden').forEach(el =>
    el.classList.remove('is-hidden')
  );

  const navScroll = qs('.nav-scroll');
  if (navScroll) navScroll.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterScopeMode(activeItem, activeId) {
  if (!activeItem || !activeId) return;

  const parentItem = activeItem.parentElement.closest('.nav-item');
  if (!parentItem) return;

  /* =====================================================
     PATCH M18 – Scope-Leaf-Wechsel explizit loggen
     ===================================================== */

  if (
    isDevMode() &&
    currentNavState === NAV_STATE.SCOPE &&
    currentFixedParentId === (parentItem.id || null) &&
    currentActiveId &&
    currentActiveId !== activeId
  ) {
    console.log(
      '%cSCOPE leaf change (same parent)',
      'color:#9ece6a;font-weight:600'
    );
    console.log('from:', currentActiveId);
    console.log('to:  ', activeId);
  }

  /* 🔒 EINZIGE Stelle für State-Daten */
  currentActiveId = activeId;
  currentFixedParentId = parentItem.id || null;

  setNavState(NAV_STATE.SCOPE, 'enterScopeMode');
  applyNavState();

  qsa('.nav-item').forEach(item => {
    if (item !== parentItem && !parentItem.contains(item)) {
      item.classList.add('is-hidden');
    }
  });

  const navScroll = qs('.nav-scroll');
  if (navScroll) navScroll.scrollTop = parentItem.offsetTop;
}

/* ===================================================== */
/* ZENTRALER CLICK-HANDLER */
/* ===================================================== */

document.addEventListener('click', e => {

  if (e.target.closest('.nav-root-button')) {
    enterRootMode();
    return;
  }

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

  const colBtn = e.target.closest('button[data-col]');
  if (colBtn) {
    const activeId = colBtn.getAttribute('data-col');

    qsa('.collection-section.active').forEach(el =>
      el.classList.remove('active')
    );

    const target = document.getElementById(activeId);
    if (target) target.classList.add('active');

    qsa('.nav-item.active').forEach(el =>
      el.classList.remove('active')
    );

    const li = colBtn.closest('.nav-item');
    if (li) li.classList.add('active');

    enterScopeMode(li, activeId);
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

/* =====================================================
   PATCH 02 – DEV tools (gebündelt)
   ===================================================== */

const PF_DEV = (function () {

  function isEnabled() {
    return document.body?.dataset?.dev === 'true';
  }

  /* ---------- Logging ---------- */

  function logStateChange(from, to, reason) {
    if (!isEnabled()) return;
    console.groupCollapsed(
      `%cNAV STATE: ${from} → ${to}`,
      'color:#7aa2f7;font-weight:600'
    );
    if (reason) console.log('reason:', reason);
    console.groupEnd();
  }

  /* ---------- Invariants ---------- */

  function checkInvariants(state, data) {
    if (!isEnabled()) return;

    if (state === 'root') {
      if (data.activeId || data.fixedParentId) {
        console.warn('NAV INVARIANT (ROOT) violated', data);
      }
    }

    if (state === 'scope') {
      if (!data.activeId || !data.fixedParentId) {
        console.warn('NAV INVARIANT (SCOPE) violated', data);
      }
    }
  }

  /* ---------- Debug Overlay ---------- */

  let overlay;

  function ensureOverlay() {
    if (!isEnabled()) return;
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;
      bottom:.5rem;
      left:.5rem;
      z-index:9999;
      font:12px monospace;
      background:rgba(0,0,0,.75);
      color:#0f0;
      padding:.4rem .6rem;
      border-radius:4px;
      pointer-events:none;
    `;
    document.body.appendChild(overlay);
  }

  function renderOverlay(state, data) {
    if (!isEnabled()) return;
    ensureOverlay();
    overlay.innerHTML = `
      <div>NAV_STATE: <b>${state}</b></div>
      <div>activeId: <b>${data.activeId || '–'}</b></div>
      <div>fixedParent: <b>${data.fixedParentId || '–'}</b></div>
    `;
  }

  /* ---------- Dark Mode (DEV) ---------- */

  function setupDarkToggle() {
    if (!isEnabled()) return;

    document.addEventListener('click', e => {
      const btn = e.target.closest('.dev-dark-toggle');
      if (!btn) return;

      const html = document.documentElement;
      const isDark = html.classList.contains('force-dark');

      html.classList.toggle('force-dark', !isDark);
      html.classList.toggle('force-light', isDark);
      btn.textContent = isDark ? 'DEV Dark Mode' : 'DEV Light Mode';
    });
  }

  /* ---------- Public API ---------- */

  function onStateChange(prev, next, reason, data) {
    logStateChange(prev, next, reason);
    checkInvariants(next, data);
    renderOverlay(next, data);
  }

  document.addEventListener('DOMContentLoaded', setupDarkToggle);

  return { onStateChange };
})();