/* ================================================================
   PFADFINDER – NAVIGATION ARCHITEKTUR (REVIEW-BASELINE)
   ================================================================ */

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
/* DEV – Navigation State Logging */
/* ===================================================== */

function logNavStateChange(from, to, reason = '') {
  console.groupCollapsed(
    `%cNAV STATE: ${from} → ${to}`,
    'color:#7aa2f7;font-weight:600'
  );
  if (reason) console.log('reason:', reason);
  console.groupEnd();
}

/* ===================================================== */
/* NAV STATE – Invarianten (DEV) */
/* ===================================================== */

function assertNavInvariants(context = '') {
  if (currentNavState === NAV_STATE.ROOT) {
    if (currentActiveId !== null || currentFixedParentId !== null) {
      console.warn('%cNAV INVARIANT VIOLATION (ROOT)', 'color:#e0af68;font-weight:600');
      console.warn('activeId:', currentActiveId);
      console.warn('fixedParent:', currentFixedParentId);
      if (context) console.warn('context:', context);
    }
  }

  if (currentNavState === NAV_STATE.SCOPE) {
    if (!currentFixedParentId || !currentActiveId) {
      console.warn('%cNAV INVARIANT VIOLATION (SCOPE)', 'color:#e0af68;font-weight:600');
      console.warn('activeId:', currentActiveId);
      console.warn('fixedParent:', currentFixedParentId);
      if (context) console.warn('context:', context);
    }
  }
}

/* ===================================================== */
/* ZENTRALER NAVIGATION-STATE-WECHSEL */
/* ===================================================== */

function setNavState(nextState, reason = '') {
  if (currentNavState === nextState) return;

  const prev = currentNavState;
  currentNavState = nextState;

  logNavStateChange(prev, nextState, reason);
  assertNavInvariants(reason);
  updateDebugOverlay();
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

  applyDevVisualState();
}

/* ===================================================== */
/* DEV – Visuelles State-Highlight */
/* ===================================================== */

function applyDevVisualState() {
  if (document.body.dataset.dev !== 'true') return;

  qsa('.nav-item').forEach(el => {
    el.classList.remove('dev-fixed-parent', 'dev-active-leaf');
  });

  if (currentFixedParentId) {
    const parent = document.getElementById(currentFixedParentId);
    if (parent) parent.classList.add('dev-fixed-parent');
  }

  if (currentActiveId) {
    const leaf = document.getElementById(currentActiveId);
    if (leaf) leaf.classList.add('dev-active-leaf');
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

/* ===================================================== */
/* DEV DEBUG OVERLAY */
/* ===================================================== */

let debugOverlayEl = null;
const devStateHistory = [];
const DEV_STATE_HISTORY_LIMIT = 6;

function ensureDebugOverlay() {
  if (document.body.dataset.dev !== 'true') return;

  if (!debugOverlayEl) {
    debugOverlayEl = document.createElement('div');
    debugOverlayEl.id = 'pf-debug-overlay';
    debugOverlayEl.style.cssText = `
      position: fixed;
      bottom: .5rem;
      left: .5rem;
      z-index: 9999;
      font: 12px monospace;
      background: rgba(0,0,0,.75);
      color: #0f0;
      padding: .4rem .6rem;
      border-radius: 4px;
      pointer-events: none;
    `;
    document.body.appendChild(debugOverlayEl);
  }
}

function updateDebugOverlay() {
  if (document.body.dataset.dev !== 'true') return;
  ensureDebugOverlay();

  debugOverlayEl.innerHTML = `
    <div>NAV_STATE: <b>${currentNavState}</b></div>
    <div>activeId: <b>${currentActiveId || '–'}</b></div>
    <div>fixedParent: <b>${currentFixedParentId || '–'}</b></div>
    <div style="margin-top:4px;opacity:.8">History:</div>
    ${devStateHistory.map(h =>
    `<div>• ${h.from} → ${h.to} (${h.reason})</div>`
  ).join('')}
  `;
}

/* Hook für Timeline */
(function patchSetNavStateForTimeline() {
  const originalSetNavState = setNavState;

  window.setNavState = function (next, reason = '') {
    const prev = currentNavState;
    if (prev !== next) {
      devStateHistory.unshift({ from: prev, to: next, reason });
      if (devStateHistory.length > DEV_STATE_HISTORY_LIMIT) {
        devStateHistory.length = DEV_STATE_HISTORY_LIMIT;
      }
    }
    originalSetNavState(next, reason);
  };
})();

/* Initial Sync */
document.addEventListener('DOMContentLoaded', () => {
  applyNavState();
  updateDebugOverlay();
});

/* ===================================================== */
/* PATCH N3 – DEV Dark Mode Toggle (DEV only)            */
/* ===================================================== */

(function setupDevDarkModeToggle() {

  /* Nur im DEV-Modus */
  if (document.body.dataset.dev !== 'true') return;

  document.addEventListener('click', e => {
    const btn = e.target.closest('.dev-dark-toggle');
    if (!btn) return;

    const html = document.documentElement;

    const isDark = html.classList.contains('force-dark');

    if (isDark) {
      html.classList.remove('force-dark');
      html.classList.add('force-light');
      btn.textContent = 'DEV Dark Mode';
    } else {
      html.classList.add('force-dark');
      html.classList.remove('force-light');
      btn.textContent = 'DEV Light Mode';
    }

    console.log(
      `%cDEV Dark Mode ${!isDark ? 'ON' : 'OFF'}`,
      'color:#7aa2f7;font-weight:600'
    );
  });

})();