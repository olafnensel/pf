<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:strip-space elements="*" />

  <!-- ===================================================== -->
  <!-- ROOT -->
  <!-- ===================================================== -->
  <xsl:template match="/collections">
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>Pfadfinder</title>
        <link rel="stylesheet" href="pfadfinder.css" />
      </head>
      <body data-dev="true">

        <h1>Pfadfinder</h1>

        <div class="dev-tools">
          <button type="button" class="dev-dark-toggle">
            DEV Dark Mode
          </button>
        </div>

        <div class="layout">

          <!-- ================= NAVIGATION ================= -->
          <aside class="nav-pane">

            <!-- ROOT-Exit: nur einmal -->
            <div class="nav-root-exit">
              <button
                type="button"
                class="nav-root-button"
                aria-label="Zurück zur Gesamtübersicht">
                ← Alle Informationen
              </button>
            </div>

            <!-- FIXED PARENT (SCOPE – Spiegel, NICHT Teil des Trees) -->
            <div class="nav-fixed-parent" hidden="hidden">
              <button
                type="button"
                class="nav-fixed-parent-button"
                aria-current="true">
                <!-- Label wird per JS gesetzt -->
              </button>
            </div>

            <!-- Scrollbarer Navigationsbereich -->
            <div class="nav-scroll">

              <!-- ROOT-NAVIGATION (immer vorhanden) -->
              <nav aria-label="Sammlungen">
                <ul class="nav-root">
                  <xsl:apply-templates select="collection" mode="nav" />
                </ul>
              </nav>

              <!-- SCOPE-NAVIGATION (nur im Fokusmodus, per JS befüllt) -->
              <div class="nav-scope" hidden="hidden"></div>

            </div>

          </aside>

          <!-- ================= CONTENT ================= -->
          <main>
            <xsl:apply-templates
              select=".//collection[not(collection)]"
              mode="content" />
          </main>

        </div>

        <script src="pfadfinder.js"></script>
      </body>
    </html>
  </xsl:template>

  <!-- ===================================================== -->
  <!-- JUMPMARKS entry's mit Attribut vi="true" -->
  <!-- ===================================================== -->
  <xsl:template name="jumpmarks">
    <xsl:for-each select=".//entry[@vi='true']">

      <xsl:variable name="title"
        select="normalize-space(title/main)" />

      <xsl:variable name="cutpos"
        select="
          string-length(
            substring-before(
              concat(substring($title, 5), ' '),
              ' '
            )
          ) + 4
        " />

      <xsl:variable
        name="short"
        select="normalize-space(substring($title, 1, $cutpos))" />

      <xsl:variable name="noPara"
        select="normalize-space(translate($short, '§', ''))" />

      <xsl:variable name="label"
        select="concat('§ ', $noPara)" />

      <a href="#{generate-id()}">
        <xsl:value-of select="$label" />
      </a>

      <xsl:if test="position() != last()">
        <span class="jumpmark-sep" aria-hidden="true">|</span>
      </xsl:if>

    </xsl:for-each>
  </xsl:template>

  <!-- ===================================================== -->
  <!-- NAVIGATION (rekursiv) -->
  <!-- ===================================================== -->
  <xsl:template match="collection" mode="nav">
    <xsl:variable name="cid" select="concat('col-', generate-id(.))" />
    <xsl:variable name="nid"
      select="concat('nav-', generate-id(.))" />

    <li class="nav-item"
      id="{$nid}"
      data-label="{@label}"
      data-pf-start="{@pf-start}">

      <xsl:choose>

        <!-- FALL A: Collection hat Unter-Collections -->
        <xsl:when test="collection">
          <button
            type="button"
            class="nav-toggle"
            data-nav="{$nid}"
            aria-expanded="false">
            <xsl:value-of select="@label" />
          </button>

          <ul class="nav-children">
            <xsl:apply-templates select="collection" mode="nav" />
          </ul>
        </xsl:when>

        <!-- FALL B: Leaf-Collection -->
        <xsl:otherwise>
          <button
            type="button"
            class="nav-leaf"
            data-col="{$cid}">
            <xsl:value-of select="@label" />
          </button>
        </xsl:otherwise>

      </xsl:choose>

    </li>
  </xsl:template>

  <!-- ===================================================== -->
  <!-- COLLECTION: Nur LEAF-Collections erzeugen Content -->
  <!-- ===================================================== -->
  <xsl:template match="collection" mode="content">
    <xsl:variable name="cid" select="concat('col-', generate-id(.))" />

    <section id="{$cid}"
      class="collection-section"
      data-label="{@label}"
      data-pf-start="{@pf-start}">

      <!-- ================= TIPP ================= -->
      <div class="tipp-text is-collapsed">

        <span class="tipp-short">
          <span class="tipp-label">Tipp:</span> Sollte ein Link nicht zu dem angegebenen Ziel
    führen, … </span>

        <span class="tipp-long">
          <span class="tipp-label">Tipp:</span> Sollte ein Link nicht zu dem angegebenen Ziel
    führen, hat sich wieder einmal die Adresse (der URL) der Information geändert. Versuchen Sie
    bitte, die Information mithilfe der angegebenen Pfadangabe von einer oder mehreren
    Verzeichnisebenen höher aus aufzurufen (ggf. vorher im Pfad »[…]« anklicken). Außerdem wäre ich
    für einen Hinweis sehr dankbar (Link: »Fehlerhinweis senden«). </span>

        <button type="button"
          class="tipp-toggle"
          aria-expanded="false">
          mehr anzeigen
        </button>
      </div>

      <!-- ================= GLOBALER PFAD-SCHALTER ================= -->
      <div class="global-trail-toggle">
        <span>Pfad: </span>
        <button type="button" class="trail-toggle-short">gekürzt</button>
        <span> | </span>
        <button type="button" class="trail-toggle-full">vollständig</button>
      </div>

      <h2>
        <xsl:choose>
          <xsl:when test="parent::collection">
            <span class="collection-parent">
              <xsl:value-of select="parent::collection/@label" />
            </span>
            <xsl:text>: </xsl:text>
            <span
              class="collection-leaf">
              <xsl:value-of select="@label" />
            </span>
          </xsl:when>
          <xsl:otherwise>
            <span class="collection-leaf">
              <xsl:value-of select="@label" />
            </span>
          </xsl:otherwise>
        </xsl:choose>
      </h2>

      <!-- ================= JUMPMARKS ================= -->
      <xsl:if test="entry[@vi='true']">
        <nav class="jumpmarks" aria-label="Sprungmarken">
          <xsl:call-template name="jumpmarks" />
        </nav>
      </xsl:if>

      <!-- ================= ENTRIES ================= -->
      <div class="entries">
        <xsl:apply-templates select="entry" />
      </div>

    </section>
  </xsl:template>

  <!-- ENTRY / TRAIL-Templates unverändert -->
  <!-- … (identisch zu deinem Stand) … -->

</xsl:stylesheet>