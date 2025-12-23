<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="xml" indent="yes" encoding="UTF-8" />
  <xsl:strip-space elements="*" />
  <!-- VERHINDERT Text-Leaks aus <group> -->
  <xsl:template match="text()" />

  <!-- ========================================================= -->
  <!-- Root -->
  <!-- ========================================================= -->

  <xsl:template match="/paths">
    <collections>
      <xsl:apply-templates select="group" mode="top" />
    </collections>
  </xsl:template>

  <!-- ========================================================= -->
  <!-- Collection (= oberste group-Ebene) -->
  <!-- ========================================================= -->

  <!-- oberste Ebene -->
  <xsl:template match="group" mode="top">
    <collection label="{@label}">
      <xsl:apply-templates select="group | item" />
    </collection>
  </xsl:template>

  <!-- verschachtelte Gruppen -->
  <xsl:template match="group">
    <collection label="{@label}">
      <xsl:apply-templates select="group | item" />
    </collection>
  </xsl:template>

  <!-- ========================================================= -->
  <!-- Entry -->
  <!-- ========================================================= -->

  <xsl:template match="item">
    <entry>

      <!-- Updated / Status -->
      <xsl:if test="@status">
        <updated>
          <xsl:value-of select="@status" />
        </updated>
      </xsl:if>
      <title>
        <xsl:choose>

          <!-- Normalfall: headline vorhanden -->
          <xsl:when test="headline/@part1">
            <main>
              <xsl:value-of select="headline/@part1" />
            </main>

            <xsl:if
              test="headline/@part3">
              <sub>
                <xsl:value-of select="headline/@part3" />
              </sub>
            </xsl:if>
          </xsl:when>

          <!-- Fallback: keine headline -->
          <xsl:otherwise>
            <main>
              <xsl:text>[entry without headline (neu: title), step text: </xsl:text>
              <xsl:value-of select="normalize-space(pathStep[1])" />
              <xsl:text>]</xsl:text>
            </main>
          </xsl:otherwise>

        </xsl:choose>
      </title>

      <trail>
        <xsl:apply-templates select="pathStep" />
      </trail>
    </entry>
  </xsl:template>

  <!-- ========================================================= -->
  <!-- Trail steps -->
  <!-- ========================================================= -->

  <xsl:template match="pathStep">
    <step>
      <xsl:if test="@url">
        <xsl:attribute name="url">
          <xsl:value-of select="@url" />
        </xsl:attribute>
      </xsl:if>
      <xsl:value-of select="normalize-space(.)" />
    </step>
  </xsl:template>

</xsl:stylesheet>