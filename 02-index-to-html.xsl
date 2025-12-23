<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:strip-space elements="*"/>

  <!-- ======================================= -->
  <!-- Root -->
  <!-- ======================================= -->

  <xsl:template match="/collections">
    <html lang="de">
      <head>
        <meta charset="utf-8"/>
        <title>Pfadfinder 2.0</title>
      </head>
      <body>

        <h1>Pfadfinder 2.0</h1>

        <h2>Sammlungen</h2>

        <ul>
          <xsl:apply-templates select="collection"/>
        </ul>

      </body>
    </html>
  </xsl:template>

  <!-- ======================================= -->
  <!-- Top-Level Collection -->
  <!-- ======================================= -->

  <xsl:template match="collection">
    <li>
      <xsl:value-of select="@label"/>
    </li>
  </xsl:template>

</xsl:stylesheet>