/* ======================================================================
   PFADFINDER – NAVIGATION ARCHITEKTUR
   PATCH 12 – ROOT-CURRENT & ROOT-LEAF STATE
   ====================================================================== */

/* ======================================================================
   [BLOCK 1] DEV-GATE
   ====================================================================== */

function isDevMode() {
  return document.body?.dataset?.dev === 'true';
}

/* ============================ END BLOCK 1 ============================ */


/* ======================================================================
   [BLOCK 2] NAVIGATION STATES
   ====================================================================== */

const NAV_STATE = {
  ROOT: 'root',
  SCOPE: 'scope'
};

let currentNavState = NAV_STATE.ROOT;
let currentActiveId = null;
let currentScopeParent = null;

/* ============================ END BLOCK 2 ============================ */


/* ======================================================================
   [BLOCK 3] DOM HELPERS
   ====================================================================== */

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ============================ END BLOCK 3 ============================ */


/* ======================================================================
   [BLOCK 4] FIXED PARENT (SCOPE MIRROR)
   ====================================================================== */

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

/* ============================ END BLOCK 4 ============================ */


/* ======================================================================
   [BLOCK 5] STATE HANDLING
   ====================================================================== */

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

/* ============================ END BLOCK 5 ============================ */


/* ======================================================================
   [BLOCK 6] ROOT MODE
   ====================================================================== */

function enterRootMode() {

  /* Scope-spezifische Markierungen entfernen */
  qsa('.nav-item.is-root-active')
    .forEach(li => li.classList.remove('is-root-active'));

  qsa('.nav-item.is-scope-parent, .nav-item.is-scope-leaf, .nav-item.active')
    .forEach(li => li.classList.remove(
      'is-scope-parent',
      'is-scope-leaf',
      'active'
    ));

  currentActiveId = null;
  currentScopeParent = null;

  setNavState(NAV_STATE.ROOT, 'enterRootMode');
  applyNavState();

  const navScroll = qs('.nav-scroll');
  if (navScroll) navScroll.scrollTop = 0;
}

/* ============================ END BLOCK 6 ============================ */


/* ======================================================================
   [BLOCK 7] SCOPE MODE (NO DOM RE-PARENTING)
   ====================================================================== */

function enterScopeMode(activeLeafItem, activeId) {
  if (!activeLeafItem || !activeId) return;

  const parentItem =
    activeLeafItem.closest('.nav-children')?.closest('.nav-item');
  if (!parentItem) return;

  /* Root-Current (persistent, genau einer) */
  qsa('.nav-item.is-root-current')
    .forEach(li => li.classList.remove('is-root-current'));
  parentItem.classList.add('is-root-current');

  /* Root-Active (Scope-spezifisch) */
  parentItem.classList.add('is-root-active');

  currentActiveId = activeId;
  currentScopeParent = parentItem;

  /* temporäre Zustände zurücksetzen */
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
  qsa(':scope > .nav-children > .nav-item', parentItem)
    .forEach(li => li.classList.add('is-scope-leaf'));

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

/* ============================ END BLOCK 7 ============================ */

/* ======================================================================
   [BLOCK 8] CLICK HANDLER (ROOT + SCOPE LOGIC)
   ====================================================================== */

document.addEventListener('click', e => {

  /* --------------------------------------------------------------
     ROOT-EXIT
     -------------------------------------------------------------- */
  if (e.target.closest('.nav-root-button')) {
    enterRootMode();
    return;
  }

  /* --------------------------------------------------------------
     ROOT-PARENT (Toggle)
     -------------------------------------------------------------- */
  const navBtn = e.target.closest('button[data-nav]');
  if (navBtn) {
    const li = navBtn.closest('.nav-item');

    /* Root-Current neu setzen */
    qsa('.nav-item.is-root-current')
      .forEach(el => el.classList.remove('is-root-current', 'is-root-leaf'));

    li.classList.add('is-root-current');
    li.classList.remove('is-root-leaf'); // Parent ≠ Leaf

    /* andere Parents schließen */
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

  /* --------------------------------------------------------------
     LEAF (ROOT oder SCOPE)
     -------------------------------------------------------------- */
  const colBtn = e.target.closest('button[data-col]');
  if (colBtn) {
    const activeId = colBtn.getAttribute('data-col');
    const li = colBtn.closest('.nav-item');

    /* Root-Current immer eindeutig setzen */
    qsa('.nav-item.is-root-current')
      .forEach(el => el.classList.remove('is-root-current', 'is-root-leaf'));

    li.classList.add('is-root-current');

    /* ROOT-LEAF explizit markieren */
    const hasParent = li.closest('.nav-children');
    if (!hasParent) {
      li.classList.add('is-root-leaf');
    }

    /* aktives Ziel */
    qsa('.nav-item.active')
      .forEach(el => el.classList.remove('active'));
    li.classList.add('active');

    /* Content wechseln */
    qsa('.collection-section.active')
      .forEach(el => el.classList.remove('active'));

    const target = document.getElementById(activeId);
    if (target) target.classList.add('active');

    /* Scope nur bei echten Child-Leafs */
    if (hasParent) {
      enterScopeMode(li, activeId);
    } else {
      setNavState(NAV_STATE.ROOT, 'root-leaf-click');
      applyNavState();
    }
  }
});

/* ============================ END BLOCK 8 ============================ */

/* ======================================================================
   [BLOCK 9] ESC → ROOT
   ====================================================================== */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && currentNavState === NAV_STATE.SCOPE) {
    enterRootMode();
  }
});

/* ============================ END BLOCK 9 ============================ */


/* ======================================================================
   [BLOCK 10] DEV DARK MODE TOGGLE
   ====================================================================== */

(function setupDevDarkModeToggle() {

  if (!isDevMode()) return;

  document.addEventListener('click', e => {
    const btn = e.target.closest('.dev-dark-toggle');
    if (!btn) return;

    const html = document.documentElement;
    const isDark = html.classList.contains('force-dark');

    html.classList.toggle('force-dark', !isDark);
    html.classList.toggle('force-light', isDark);

    btn.textContent = isDark
      ? 'DEV Dark Mode'
      : 'DEV Light Mode';

    console.log(
      `%cDEV Dark Mode ${!isDark ? 'ON' : 'OFF'}`,
      'color:#7aa2f7;font-weight:600'
    );
  });

})();

/* ============================ END BLOCK 10 ============================ */


/* ======================================================================
   [BLOCK 11] DEV TOOLS
   ====================================================================== */

const PF_DEV = (function () {

  function enabled() {
    return isDevMode();
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

/* ============================ END BLOCK 11 ============================ */