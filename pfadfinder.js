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
/* Sichtbarkeitsprüfung */
/* ===================================================== */

function isFullyVisible(el, container) {
  if (!el || !container) return true;

  const elRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();

  return (
    elRect.top >= cRect.top &&
    elRect.bottom <= cRect.bottom
  );
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
/* Navigation – Zustandswechsel */
/* ===================================================== */

function enterRootMode() {
  currentNavState = NAV_STATE.ROOT;

  document.body.classList.remove('nav-focus-mode');

  qsa('.nav-item.is-hidden').forEach(item => {
    item.classList.remove('is-hidden');
  });
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

  const scrollContainer = activeItem.closest('.nav-scroll');
  if (scrollContainer) {
    activeItem.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    });
  }
}

function updateNavigationScope(activeItem) {
  if (!activeItem) {
    enterRootMode();
    return;
  }

  const scrollContainer = activeItem.closest('.nav-scroll');
  if (!scrollContainer) {
    enterRootMode();
    return;
  }

  if (isFullyVisible(activeItem, scrollContainer)) {
    enterRootMode();
    activeItem.scrollIntoView({ block: 'center' });
  } else {
    enterScopeMode(activeItem);
  }
}

/* ===================================================== */
/* ZENTRALER CLICK-HANDLER */
/* ===================================================== */

document.addEventListener('click', e => {

  /* -------- Parent-Collections (auf/zu) -------- */
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

  /* -------- Leaf-Collections -------- */
  const colBtn = e.target.closest('button[data-col]');
  if (colBtn) {
    const cid = colBtn.getAttribute('data-col');

    qsa('.collection-section.active').forEach(el => el.classList.remove('active'));

    const target = document.getElementById(cid);
    if (target) target.classList.add('active');

    qsa('.nav-item.active').forEach(el => el.classList.remove('active'));

    const li = colBtn.closest('.nav-item');
    if (li) li.classList.add('active');

    updateNavigationScope(li);
    return;
  }

  /* -------- Tipp-Text Toggle -------- */
  const tippBtn = e.target.closest('.tipp-toggle');
  if (tippBtn) {
    const wrapper = tippBtn.closest('.tipp-text');
    const expanded = wrapper.classList.toggle('is-expanded');
    tippBtn.setAttribute('aria-expanded', expanded);
    tippBtn.textContent = expanded ? 'weniger anzeigen' : 'mehr anzeigen';
    return;
  }

  /* -------- Trail Toggle – GLOBAL -------- */
  if (e.target.closest('.trail-toggle-short')) {
    document.body.classList.remove('show-trail-full');
    qsa('.entry-trail.is-expanded').forEach(el => el.classList.remove('is-expanded'));
    return;
  }

  if (e.target.closest('.trail-toggle-full')) {
    document.body.classList.add('show-trail-full');
    qsa('.entry-trail.is-expanded').forEach(el => el.classList.remove('is-expanded'));
    return;
  }

  /* -------- Trail Toggle – LOKAL -------- */
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
/* ESC → zurück zu ROOT */
/* ===================================================== */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && currentNavState === NAV_STATE.SCOPE) {
    enterRootMode();
  }
});

/* ===================================================== */
/* STARTLOGIK – nur URL-Parameter */
/* ===================================================== */

function getStartLabelFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('start');
  if (!raw) return null;

  return decodeURIComponent(raw).toLowerCase().replace(/\s+/g, '');
}

function normalizeLabel(label) {
  if (!label) return null;
  return label.toLowerCase().replace(/\s+/g, '');
}

function openNavPath(navItem) {
  let current = navItem;

  while (current && current.classList.contains('nav-item')) {
    current.classList.add('open');

    const btn = current.querySelector('button[data-nav]');
    if (btn) btn.setAttribute('aria-expanded', 'true');

    current = current.parentElement.closest('.nav-item');
  }
}

(function initFromStartParameter() {
  const startLabel = getStartLabelFromUrl();
  if (!startLabel) return;

  let navItem = null;
  let contentSection = null;

  qsa('.nav-item[data-label]').forEach(item => {
    if (normalizeLabel(item.dataset.label) === startLabel) {
      navItem = item;
    }
  });

  qsa('.collection-section[data-label]').forEach(section => {
    if (normalizeLabel(section.dataset.label) === startLabel) {
      contentSection = section;
    }
  });

  if (!navItem || !contentSection) return;

  openNavPath(navItem);
  navItem.classList.add('active');
  contentSection.classList.add('active');

  updateNavigationScope(navItem);
})();