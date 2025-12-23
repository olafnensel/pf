/* ================================================================
   PFADFINDER – NAVIGATION ARCHITEKTUR (REVIEW-BASELINE)
   ================================================================

   Review-Baseline:
   Commit: "Navigation – mit ROOT Exit"

   Ziel dieses Dokuments:
   - Architektur und Grenzen der Navigation eindeutig festlegen
   - spätere Änderungen überprüfbar und reversibel machen
   - implizite Annahmen explizit dokumentieren

   ---------------------------------------------------------------
   GRUNDPRINZIPIEN
   ---------------------------------------------------------------

   1) Eindeutiger Navigationszustand (State Machine)
      ------------------------------------------------
      Die Navigation ist eine explizite Zustandsmaschine
      mit genau ZWEI erlaubten Zuständen:

        - ROOT  : ungefilterte Navigation
        - SCOPE : Navigation fokussiert auf einen aktiven Parent

      Es darf zu jedem Zeitpunkt GENAU EIN Zustand aktiv sein.
      Zwischenzustände sind nicht erlaubt.

   2) Keine strukturellen DOM-Umbauten
      ------------------------------------------------
      - Die vom XSLT erzeugte DOM-Struktur ist stabil.
      - JavaScript fügt KEINE neuen Navigationselemente ein
        und entfernt KEINE bestehenden.

      Begründung:
      - XSLT bleibt alleiniger Strukturverantwortlicher
      - Debugging und Wartung bleiben nachvollziehbar
      - Accessibility-Logik bleibt kontrollierbar

   3) JavaScript verändert ausschließlich Zustände
      ------------------------------------------------
      JavaScript verändert NUR:
      - Zustandsklassen (z. B. .active, .open, .is-hidden)
      - ARIA-Attribute (z. B. aria-current, aria-expanded)

      JavaScript verändert NICHT:
      - die DOM-Hierarchie
      - Textinhalte
      - Layout-relevante Inline-Styles

   4) Zentrale Ereignissteuerung
      ------------------------------------------------
      - Es existiert genau EIN zentraler Click-Handler
        (Event Delegation).
      - Einzelne Navigationselemente besitzen keine
        eigenen Event Listener.

      Begründung:
      - konsistentes Verhalten für Maus & Tastatur
      - klare Trennung von Struktur und Verhalten
      - keine versteckten Seiteneffekte

   5) Trennung der Verantwortlichkeiten
      ------------------------------------------------
      - XSLT: erzeugt Struktur & Daten
      - CSS : definiert Darstellung aller Zustände
      - JS  : steuert ausschließlich den aktiven Zustand

   ---------------------------------------------------------------
   WICHTIGE ARCHITEKTUR-ENTSCHEIDUNG
   ---------------------------------------------------------------

   Diese Baseline beschreibt den LETZTEN stabilen Zustand
   vor Einführung eines "Fixed Parent".

   Abweichungen von diesen Prinzipien müssen:
   - bewusst erfolgen
   - explizit dokumentiert werden
   - und technisch begründet sein

   ================================================================ */

/* =====================================================
   PATCH M2 – STATE INVARIANTS & REVIEW GUARDS
   =====================================================

   Zweck:
   - Macht implizite Annahmen der Navigation explizit
   - Keine Verhaltensänderung
   - Dient ausschließlich Review & Stabilisierung

   Grundannahmen (Invariant):
   1) Es gibt IMMER genau einen Navigationszustand:
      - ROOT oder SCOPE
   2) ROOT und SCOPE schließen sich gegenseitig aus
   3) DOM wird NICHT umgebaut, nur Klassen geändert
   4) Alle Zustandswechsel laufen über zentrale Funktionen
*/

/* -----------------------------------------------------
   STATE INVARIANT GUARD
   ----------------------------------------------------- */

function assertValidNavState(context = '') {
  if (!Object.values(NAV_STATE).includes(currentNavState)) {
    console.warn(
      '[Pfadfinder][Invariant verletzt]',
      'Ungültiger Navigation State:',
      currentNavState,
      context
    );
  }
}

/* -----------------------------------------------------
   ZUSTANDSWECHSEL – DOKUMENTIERT
   ----------------------------------------------------- */

/*
  enterRootMode():
  - setzt Navigation in Ausgangszustand
  - KEIN aktiver Parent
  - KEIN Scope
*/

function setNavStateRoot(context = '') {
  currentNavState = NAV_STATE.ROOT;
  assertValidNavState(context);
}

/*
  enterScopeMode():
  - Navigation fokussiert auf EINEN Parent
  - Root-Navigation ist visuell eingeschränkt
*/

function setNavStateScope(context = '') {
  currentNavState = NAV_STATE.SCOPE;
  assertValidNavState(context);
}

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