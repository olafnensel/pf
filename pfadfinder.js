/* ================================================================
   PFADFINDER – NAVIGATION ARCHITEKTUR
   PATCH 08 – STABILES SCOPE-MODELL (KEIN DOM-REPARENTING)
   ================================================================ */

/* =====================================================
   DEV-GATE
   ===================================================== */

function isDevMode() {
  return document.body?.dataset?.dev === 'true';
}

/* =====================================================
   Navigation States
   ===================================================== */

const NAV_STATE = {
  ROOT: 'root',
  SCOPE: 'scope'
};

let currentNavState = NAV_STATE.ROOT;
let currentActiveId = null;
let currentScopeParent = null;

/* =====================================================
   Helper
   ===================================================== */

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

/* =====================================================
   Fixed Parent (Spiegel)
   ===================================================== */

const fixedParentEl = () => qs('.nav-fixed-parent');
const fixedParentBtn = () => qs('.nav-fixed-parent-button');

function showFixedParent(parentItem) {
  const wrap = fixedParentEl();
  const btn = fixedParentBtn();
  if (!wrap || !btn || !parentItem) return;

  const labelBtn = parentItem.querySelector('button');
  btn.textContent = labelBtn.textContent.trim();
  wrap.hidden = false;
}

function hideFixedParent() {
  const wrap = fixedParentEl();
  if (wrap) wrap.hidden = true;
}

/* Klick auf Fixed Parent → ROOT */
document.addEventListener('click', e => {
  if (e.target.closest('.nav-fixed-parent-button')) {
    enterRootMode();
  }
});

/* =====================================================
   State Handling
   ===================================================== */

function setNavState(next, reason = '') {
  if (currentNavState === next) return;

  const prev = currentNavState;
  currentNavState = next;

  PF_DEV.onStateChange(prev, next, reason, {
    activeId: currentActiveId,
    scopeParent: currentScopeParent?.id || null
  });
}

function applyNavState() {
  document.body.classList.toggle(
    'nav-focus-mode',
    currentNavState === NAV_STATE.SCOPE
  );

  if (currentNavState === NAV_STATE.ROOT) {
    hideFixedParent();
  }
}

/* =====================================================
   ROOT MODE
   ===================================================== */

function enterRootMode() {
  if (currentNavState === NAV_STATE.ROOT) return;

  /* Alle Scope-Markierungen entfernen */
  qsa('.nav-item').forEach(li => {
    li.classList.remove(
      'is-hidden',
      'is-scope-parent',
      'is-scope-leaf',
      'active'
    );
  });

  currentActiveId = null;
  currentScopeParent = null;

  setNavState(NAV_STATE.ROOT, 'enterRootMode');
  applyNavState();

  const navScroll = qs('.nav-scroll');
  if (navScroll) navScroll.scrollTop = 0;
}

/* =====================================================
   SCOPE MODE (KEIN DOM-UMBAU)
   ===================================================== */

function enterScopeMode(activeLeafItem, activeId) {
  if (!activeLeafItem || !activeId) return;

  const parentItem =
    activeLeafItem.closest('.nav-children')?.closest('.nav-item');
  if (!parentItem) return;

  currentActiveId = activeId;
  currentScopeParent = parentItem;

  /* Reset aller Zustände */
  qsa('.nav-item').forEach(li => {
    li.classList.remove(
      'is-hidden',
      'is-scope-parent',
      'is-scope-leaf',
      'active'
    );
  });

  /* Parent markieren */
  parentItem.classList.add('is-scope-parent');

  /* Alle direkten Leafs markieren */
  qsa(':scope > .nav-children > .nav-item', parentItem).forEach(li => {
    li.classList.add('is-scope-leaf');
  });

  /* Aktives Leaf */
  activeLeafItem.classList.add('active');

  /* Alles außerhalb des Scopes ausblenden */
  qsa('.nav-item').forEach(li => {
    if (li !== parentItem && !parentItem.contains(li)) {
      li.classList.add('is-hidden');
    }
  });

  showFixedParent(parentItem);

  setNavState(NAV_STATE.SCOPE, 'enterScopeMode');
  applyNavState();
}

/* =====================================================
   CLICK HANDLER
   ===================================================== */

document.addEventListener('click', e => {

  /* ROOT-Exit */
  if (e.target.closest('.nav-root-button')) {
    enterRootMode();
    return;
  }

  /* Parent Toggle (ROOT) */
  const navBtn = e.target.closest('button[data-nav]');
  if (navBtn) {
    const li = navBtn.closest('.nav-item');

    qsa('.nav-item.open').forEach(el => {
      if (el !== li) {
        el.classList.remove('open');
        const b = qs('button[data-nav]', el);
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });

    const expanded = li.classList.toggle('open');
    navBtn.setAttribute('aria-expanded', expanded);

    enterRootMode();
    return;
  }

  /* Leaf */
  const colBtn = e.target.closest('button[data-col]');
  if (colBtn) {
    const activeId = colBtn.getAttribute('data-col');
    const li = colBtn.closest('.nav-item');

    qsa('.collection-section.active').forEach(el =>
      el.classList.remove('active')
    );

    const target = document.getElementById(activeId);
    if (target) target.classList.add('active');

    enterScopeMode(li, activeId);
  }
});

/* =====================================================
   ESC → ROOT
   ===================================================== */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && currentNavState === NAV_STATE.SCOPE) {
    enterRootMode();
  }
});

/* =====================================================
   PATCH N3 – DEV Dark Mode Toggle (Safari-safe)
   ===================================================== */

(function setupDevDarkModeToggle() {

  // Nur im DEV-Modus
  if (document.body?.dataset?.dev !== 'true') return;

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

/* =====================================================
   DEV TOOLS
   ===================================================== */

const PF_DEV = (function () {

  function enabled() {
    return document.body?.dataset?.dev === 'true';
  }

  function onStateChange(from, to, reason, data) {
    if (!enabled()) return;

    console.groupCollapsed(
      `%cNAV STATE: ${from} → ${to}`,
      'color:#7aa2f7;font-weight:600'
    );
    console.log('reason:', reason);
    console.log(data);
    console.groupEnd();
  }

  return { onStateChange };
})();