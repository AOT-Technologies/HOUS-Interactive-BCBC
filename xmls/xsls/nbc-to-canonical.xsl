<?xml version="1.0" encoding="UTF-8" ?>
<xsl:stylesheet
    version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:atict="http://www.arbortext.com/namespace/atict"
    xmlns:bc="urn:bc:canonical"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    exclude-result-prefixes="xs xlink atict bc fn"
>

  <!-- ================================================================== -->
  <!-- NBC TO CANONICAL TRANSFORM (v1.1)                                   -->
  <!-- - Fix: clause xml:id bug                                            -->
  <!-- - Stronger internal-ref remap via key()                              -->
  <!-- - Intent refs: support @refid and @xlink:href                       -->
  <!-- - Whitespace cleanup around inline nodes                            -->
  <!-- - change-begin / change-end now IGNORED (no redline)                -->
  <!-- ================================================================== -->

  <xsl:output method="xml" indent="yes" encoding="UTF-8" />

  <!-- Add CSS stylesheet and schema reference to output -->
  <xsl:template name="add-stylesheet-pi">
    <xsl:processing-instruction
            name="xml-stylesheet"
        >type="text/css" href="nbc-canonical-author.css"</xsl:processing-instruction>
    <xsl:text>&#10;</xsl:text>
    <xsl:processing-instruction
            name="xml-model"
        >href="schema/canonical-nbc.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"</xsl:processing-instruction>
    <xsl:text>&#10;</xsl:text>
  </xsl:template>

  <!-- Global parameters -->
  <xsl:param name="target-version" select="'2020'" />
  <xsl:param name="canonical-version" select="'1.0'" />

  <!-- Build graphics asset paths from vendor IDs (e.g., EG01301B, eg02506a). -->
  <xsl:function name="bc:asset-src" as="xs:string">
    <xsl:param name="asset-id" as="xs:string?" />
    <xsl:param name="extension" as="xs:string" />
    <xsl:variable name="id" select="normalize-space($asset-id)" />
    <!-- NOTE: Extension parameter kept for backward compatibility but not appended to output -->
    <!-- Rendering layer should append .jpg or .eps as needed -->
    <xsl:sequence
            select="
        if (matches($id, '^(EG|GG)\d{3}.*$', 'i')) then
          concat('graphics/', lower-case(substring($id, 1, 2)), '/', substring($id, 3, 3), '/', lower-case($id))
        else
          concat('graphics/', lower-case($id))"
        />
  </xsl:function>

  <!-- Keys -->
  <!-- Look up ORIGINAL vendor nodes in source by @id (first pass build) -->
  <xsl:key name="element-by-vendor-id" match="*[@id]" use="@id" />
  <!-- Look up CANONICAL nodes in constructed tree by @vendor-id (second pass) -->
  <xsl:key name="canon-by-vendor-id" match="*[@vendor-id]" use="@vendor-id" />

  <!-- ================================================================== -->
  <!-- ROOT TEMPLATE                                                      -->
  <!-- ================================================================== -->

  <xsl:template match="/OBCode">
    <!-- Add stylesheet processing instruction -->
    <xsl:call-template name="add-stylesheet-pi" />

    <!-- First pass: create structure with vendor IDs preserved -->
    <xsl:variable name="first-pass">
      <nbc
                version="{@code-year}"
                edition="15"
                xml:id="nbc.{@code-year}"
                canonical-version="{$canonical-version}"
            >

        <!-- Extract metadata -->
        <metadata>
          <xsl:apply-templates
                        select="OBCode.vol.main/OBCode.titlepage"
                        mode="metadata"
                    />
          <!-- Volume 2 metadata if present -->
          <xsl:if test="OBCode.vol.sub/OBCode.titlepage.vol">
            <xsl:apply-templates
                            select="OBCode.vol.sub/OBCode.titlepage.vol"
                            mode="metadata-volume"
                        />
          </xsl:if>
        </metadata>

        <!-- Volume 1: Front matter + Divisions A, B (Parts 1-8), C + Index + Conversions -->
        <volume number="1" xml:id="nbc.{@code-year}.vol1">
          <xsl:if test="OBCode.vol.main/@id">
            <xsl:attribute name="vendor-id" select="OBCode.vol.main/@id"/>
          </xsl:if>
          
          <!-- Front matter (Preface, Introduction, Committees) -->
          <xsl:apply-templates select="OBCode.vol.main/front-matter" />
          
          <!-- Process divisions from Volume 1 -->
          <xsl:apply-templates select="OBCode.vol.main/OBCode.div" />
          
          <!-- Volume 1 index -->
          <xsl:apply-templates select="OBCode.vol.main/index">
            <xsl:with-param name="volume-number" select="1"/>
          </xsl:apply-templates>
          
          <!-- Volume 1 conversions -->
          <xsl:apply-templates select="OBCode.vol.main/conversions">
            <xsl:with-param name="volume-number" select="1"/>
          </xsl:apply-templates>
        </volume>

        <!-- Volume 2: Division B Part 9 + Index + Conversions -->
        <volume number="2" xml:id="nbc.{@code-year}.vol2">
          <xsl:if test="OBCode.vol.sub/@id">
            <xsl:attribute name="vendor-id" select="OBCode.vol.sub/@id"/>
          </xsl:if>
          
          <!-- Process divisions from Volume 2 -->
          <xsl:apply-templates select="OBCode.vol.sub/OBCode.div" />
          
          <!-- Volume 2 index -->
          <xsl:apply-templates select="OBCode.vol.sub/index">
            <xsl:with-param name="volume-number" select="2"/>
          </xsl:apply-templates>
          
          <!-- Volume 2 conversions -->
          <xsl:apply-templates select="OBCode.vol.sub/conversions">
            <xsl:with-param name="volume-number" select="2"/>
          </xsl:apply-templates>
        </volume>
      </nbc>
    </xsl:variable>

    <!-- Second pass: update all references to use canonical IDs -->
    <xsl:apply-templates select="$first-pass" mode="update-references" />
  </xsl:template>

  <!-- ================================================================== -->
  <!-- METADATA PROCESSING                                                -->
  <!-- ================================================================== -->

  <xsl:template match="OBCode.titlepage" mode="metadata">
    <xsl:if test="catalog-info">
      <catalog-info>
        <nrc-number><xsl:value-of
                        select="catalog-info/nrc-number"
                    /></nrc-number>
        <isbn><xsl:value-of select="catalog-info/isbn" /></isbn>
        <isbn-pdf><xsl:value-of select="catalog-info/isbn-pdf" /></isbn-pdf>
        <library-number><xsl:value-of
                        select="catalog-info/library-number"
                    /></library-number>
        <library-number-pdf><xsl:value-of
                        select="catalog-info/library-number-pdf"
                    /></library-number-pdf>
      </catalog-info>
    </xsl:if>

    <publication-info volume="1">
      <title>
        <xsl:value-of
                    select="string-join(title.cover/text.line[position() &lt;= 3], ' ')"
                />
      </title>
      <subtitle>
        <xsl:value-of select="title.cover/title.cover.sub/text.line" />
      </subtitle>
      <authority>
        <xsl:value-of select="string-join(authority/text.line, ' ')" />
      </authority>
      <publication-date>
        <xsl:value-of
                    select="substring-before(ancestor::OBCode/@print-date, '-')"
                />
      </publication-date>
      <print-date>
        <xsl:value-of select="ancestor::OBCode/@print-date" />
      </print-date>
    </publication-info>
  </xsl:template>

  <!-- Volume 2 metadata template -->
  <xsl:template match="OBCode.titlepage.vol" mode="metadata-volume">
    <publication-info volume="2">
      <title>
        <xsl:value-of
                    select="string-join(title.cover/text.line[position() &lt;= 3], ' ')"
                />
      </title>
      <subtitle>
        <xsl:value-of select="title.cover/title.cover.sub/text.line" />
      </subtitle>
      <authority>
        <xsl:value-of select="string-join(authority/text.line, ' ')" />
      </authority>
    </publication-info>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- FRONT MATTER PROCESSING                                            -->
  <!-- ================================================================== -->

  <xsl:template match="front-matter">
    <xsl:variable name="code-year" select="ancestor::OBCode/@code-year" />
    <front-matter xml:id="nbc.{$code-year}.frontmatter">
      <xsl:apply-templates select="preface | intro | committees" />
    </front-matter>
  </xsl:template>

  <xsl:template match="preface">
    <xsl:variable name="code-year" select="ancestor::OBCode/@code-year" />
    <xsl:variable
            name="parent-id"
            select="concat('nbc.', $code-year, '.preface')"
        />
    <preface xml:id="{$parent-id}">
      <xsl:apply-templates select="*" mode="document-content">
        <xsl:with-param name="parent-id" select="$parent-id" />
      </xsl:apply-templates>
    </preface>
  </xsl:template>

  <xsl:template match="intro">
    <xsl:variable name="code-year" select="ancestor::OBCode/@code-year" />
    <xsl:variable
            name="parent-id"
            select="concat('nbc.', $code-year, '.intro.', position())"
        />
    <introduction xml:id="{$parent-id}">
      <xsl:apply-templates select="*" mode="document-content">
        <xsl:with-param name="parent-id" select="$parent-id" />
      </xsl:apply-templates>
    </introduction>
  </xsl:template>

  <xsl:template match="committees">
    <xsl:variable name="code-year" select="ancestor::OBCode/@code-year" />
    <xsl:variable
            name="parent-id"
            select="concat('nbc.', $code-year, '.committees')"
        />
    <committees xml:id="{$parent-id}">
      <xsl:apply-templates select="*" mode="document-content">
        <xsl:with-param name="parent-id" select="$parent-id" />
      </xsl:apply-templates>
    </committees>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- DIVISION PROCESSING                                                -->
  <!-- ================================================================== -->

  <xsl:template match="OBCode.div">
    <xsl:variable
            name="div-letter"
            select="
      if (@id = 'nbc2020-a') then 'A'
      else if (@id = 'nbc2020-b-v1') then 'B'
      else if (@id = 'nbc2020-b-v2') then 'BV2'
      else if (@id = 'nbc2020-c') then 'C'
      else substring-after(@id, 'nbc2020-')"
        />

    <division
            xml:id="nbc.div{$div-letter}"
            letter="{if ($div-letter = 'BV2') then 'B' else $div-letter}"
        >
      <xsl:if test="@id">
        <xsl:attribute name="vendor-id" select="@id" />
      </xsl:if>
      <xsl:attribute name="volume">
        <xsl:choose>
          <xsl:when test="@id = 'nbc2020-b-v2'">2</xsl:when>
          <xsl:otherwise>1</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <title><xsl:apply-templates
                    select="title/node()"
                    mode="rich-text"
                /></title>
      <number><xsl:value-of select="number" /></number>

      <xsl:for-each select="part">
        <!-- For Division BV2 (Volume 2), parts should be numbered starting from 9 -->
        <xsl:variable
                    name="part-number"
                    select="
          if ($div-letter = 'BV2') then position() + 8
          else position()"
                />
        <xsl:variable
                    name="part-id"
                    select="concat('nbc.div', $div-letter, '.part', $part-number)"
                />
        <part xml:id="{$part-id}" number="{$part-number}">
          <xsl:if test="@id">
            <xsl:attribute name="vendor-id" select="@id" />
          </xsl:if>
          <title><xsl:apply-templates
                            select="title/node()"
                            mode="rich-text"
                        /></title>
          <xsl:if test="seealso">
            <see-also xml:id="{$part-id}.seealso">
              <xsl:apply-templates select="seealso/node()" mode="rich-text" />
            </see-also>
          </xsl:if>
          <xsl:if test="toc.part"><toc /></xsl:if>

          <xsl:for-each select="section">
            <!-- Extract section number from vendor ID (e.g., ep001029.37 -> 37) -->
            <xsl:variable
                            name="section-number"
                            select="
              if (@id and contains(@id, '.')) then
                substring-after(@id, '.')
              else
                position()"
                        />
            <xsl:variable
                            name="sect-id"
                            select="concat($part-id, '.sect', $section-number)"
                        />
            <section xml:id="{$sect-id}" number="{$section-number}">
              <xsl:if test="@id"><xsl:attribute
                                    name="vendor-id"
                                    select="@id"
                                /></xsl:if>
              <title><xsl:apply-templates
                                    select="title/node()"
                                    mode="rich-text"
                                /></title>

              <xsl:for-each select="subsect">
                <xsl:variable
                                    name="subsect-id"
                                    select="concat($sect-id, '.subsect', position())"
                                />
                <subsection xml:id="{$subsect-id}" number="{position()}">
                  <xsl:if test="@id"><xsl:attribute
                                            name="vendor-id"
                                            select="@id"
                                        /></xsl:if>
                  <title><xsl:apply-templates
                                            select="title/node()"
                                            mode="rich-text"
                                        /></title>
                  <xsl:if test="seealso">
                    <see-also xml:id="{$subsect-id}.seealso">
                      <xsl:apply-templates select="seealso/node()" mode="rich-text" />
                    </see-also>
                  </xsl:if>

                  <xsl:for-each select="article">
                    <xsl:variable
                                            name="art-id"
                                            select="concat($subsect-id, '.art', position())"
                                        />
                    <article xml:id="{$art-id}" number="{position()}">
                      <xsl:if test="@id"><xsl:attribute
                                                    name="vendor-id"
                                                    select="@id"
                                                /></xsl:if>
                      <title><xsl:apply-templates
                                                    select="title/node()"
                                                    mode="rich-text"
                                                /></title>
                      <xsl:if test="seealso">
                        <see-also xml:id="{$art-id}.seealso">
                          <xsl:apply-templates select="seealso/node()" mode="rich-text" />
                        </see-also>
                      </xsl:if>

                      <xsl:apply-templates select="sentence | table | figure">
                        <xsl:with-param name="parent-id" select="$art-id" />
                      </xsl:apply-templates>
                    </article>
                  </xsl:for-each>
                </subsection>
              </xsl:for-each>

              <!-- Note: partapp elements are processed at part level, not section level -->
            </section>
          </xsl:for-each>

          <!-- Process spectables (special tables like Fire/Sound Resistance, Span Tables) -->
          <xsl:for-each select="spectables">
            <xsl:variable
                        name="spectables-id"
                        select="concat($part-id, '.spectables', position())"
                    />
            <spectables xml:id="{$spectables-id}">
              <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id"/></xsl:if>
              <xsl:if test="@tbl_prefix"><xsl:attribute name="table-prefix" select="@tbl_prefix"/></xsl:if>
              <xsl:if test="@toc_entry"><xsl:attribute name="toc-entry" select="@toc_entry"/></xsl:if>
              <title><xsl:apply-templates select="title/node()" mode="rich-text"/></title>
              <!-- Process tables within spectables -->
              <xsl:apply-templates select="table">
                <xsl:with-param name="parent-id" select="$spectables-id"/>
              </xsl:apply-templates>
            </spectables>
          </xsl:for-each>

          <!-- Process part appendix (application notes) at part level if present after spectables -->
          <xsl:if test="partapp">
            <xsl:apply-templates select="partapp">
              <xsl:with-param name="part-id" select="$part-id"/>
            </xsl:apply-templates>
          </xsl:if>
        </part>
      </xsl:for-each>

      <!-- Process division appendices (e.g., Appendix C, D for Division B) -->
      <xsl:for-each select="appendix">
        <xsl:apply-templates select=".">
          <xsl:with-param name="div-letter" select="$div-letter" />
        </xsl:apply-templates>
      </xsl:for-each>
    </division>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- PART APPENDIX (APPLICATION NOTES) PROCESSING                        -->
  <!-- ================================================================== -->

  <xsl:template match="partapp">
    <xsl:param name="sect-id" as="xs:string" select="''"/>
    <xsl:param name="part-id" as="xs:string" select="''"/>
    <!-- Use sect-id if provided (section-level partapp), otherwise use part-id (part-level partapp) -->
    <xsl:variable name="base-id" select="if ($sect-id != '') then $sect-id else $part-id"/>
    <part-appendix xml:id="{$base-id}.appendix">
      <xsl:if test="note.app-intro">
        <introduction>
          <xsl:apply-templates
                        select="note.app-intro/para.note/node()"
                        mode="rich-text"
                    />
        </introduction>
      </xsl:if>

      <xsl:for-each select="appnote">
        <xsl:variable
                    name="appnote-id"
                    select="concat($base-id, '.appendix.appnote', position())"
                />
        <application-note xml:id="{$appnote-id}">
          <xsl:if test="@id"><xsl:attribute
                            name="vendor-id"
                            select="@id"
                        /></xsl:if>
          <xsl:if test="@refs"><xsl:attribute
                            name="refs"
                            select="@refs"
                        /></xsl:if>

          <number><xsl:value-of select="number" /></number>
          <title><xsl:apply-templates
                            select="title/node()"
                            mode="rich-text"
                        /></title>

          <xsl:for-each select="para">
            <xsl:variable
                            name="para-id"
                            select="concat($appnote-id, '.para', position())"
                        />
            <paragraph xml:id="{$para-id}"><xsl:apply-templates
                                select="node()"
                                mode="rich-text"
                            /></paragraph>
          </xsl:for-each>

          <!-- Handle divisions within notes (sub-sections) -->
          <xsl:for-each select="division">
            <xsl:variable
                            name="div-id"
                            select="concat($appnote-id, '.div', position())"
                        />
            <note-division xml:id="{$div-id}">
              <xsl:if test="@id"><xsl:attribute
                                    name="vendor-id"
                                    select="@id"
                                /></xsl:if>
              <title><xsl:apply-templates
                                    select="title/node()"
                                    mode="rich-text"
                                /></title>
              
              <!-- Process all child elements in order -->
              <xsl:for-each select="*[not(self::title)]">
                <xsl:choose>
                  <!-- Paragraphs -->
                  <xsl:when test="self::para">
                    <xsl:variable
                                        name="para-id"
                                        select="concat($div-id, '.para', position())"
                                    />
                    <paragraph xml:id="{$para-id}">
                      <xsl:apply-templates select="node()" mode="rich-text"/>
                    </paragraph>
                  </xsl:when>
                  
                  <!-- Tables -->
                  <xsl:when test="self::table">
                    <xsl:apply-templates select=".">
                      <xsl:with-param name="parent-id" select="$div-id"/>
                    </xsl:apply-templates>
                  </xsl:when>
                  
                  <!-- Figures -->
                  <xsl:when test="self::figure">
                    <xsl:apply-templates select=".">
                      <xsl:with-param name="parent-id" select="$div-id"/>
                    </xsl:apply-templates>
                  </xsl:when>
                  
                  <!-- Lists -->
                  <xsl:when test="self::list">
                    <xsl:apply-templates select="." mode="rich-text"/>
                  </xsl:when>
                  
                  <!-- Examples -->
                  <xsl:when test="self::example">
                    <xsl:apply-templates select=".">
                      <xsl:with-param name="parent-id" select="$div-id"/>
                    </xsl:apply-templates>
                  </xsl:when>
                  
                  <!-- Default: try to process as rich-text -->
                  <xsl:otherwise>
                    <xsl:apply-templates select="." mode="rich-text"/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:for-each>
            </note-division>
          </xsl:for-each>

          <!-- Handle any tables or figures in notes -->
          <xsl:apply-templates select="table | figure">
            <xsl:with-param name="parent-id" select="$appnote-id" />
          </xsl:apply-templates>

          <!-- Handle example elements directly in notes (e.g. formula tables) -->
          <xsl:apply-templates select="example">
            <xsl:with-param name="parent-id" select="$appnote-id" />
          </xsl:apply-templates>
        </application-note>
      </xsl:for-each>
    </part-appendix>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- DIVISION APPENDIX PROCESSING (Appendices C, D, etc.)              -->
  <!-- ================================================================== -->

  <xsl:template match="appendix">
    <xsl:param name="div-letter" as="xs:string" select="'B'" />

    <!-- Determine appendix letter from forcenum attribute (e.g., "3" -> "C") -->
    <xsl:variable
            name="appendix-letter"
            select="
      if (@forcenum = '1') then 'A'
      else if (@forcenum = '2') then 'B'
      else if (@forcenum = '3') then 'C'
      else if (@forcenum = '4') then 'D'
      else if (@forcenum = '5') then 'E'
      else if (@forcenum = '6') then 'F'
      else concat('appendix', position())"
        />

    <xsl:variable
            name="appendix-id"
            select="concat('nbc.div', $div-letter, '.appendix', $appendix-letter)"
        />

    <appendix xml:id="{$appendix-id}">
      <xsl:if test="@id">
        <xsl:attribute name="vendor-id" select="@id" />
      </xsl:if>
      <xsl:if test="$appendix-letter">
        <xsl:attribute name="letter" select="$appendix-letter" />
      </xsl:if>
      <xsl:if test="@forcenum">
        <xsl:attribute name="number" select="@forcenum" />
      </xsl:if>

      <title><xsl:apply-templates
                    select="title/node()"
                    mode="rich-text"
                /></title>

      <!-- Process introduction note if present -->
      <xsl:if test="note.app-intro">
        <introduction>
          <xsl:apply-templates
                        select="note.app-intro/para.note/node()"
                        mode="rich-text"
                    />
        </introduction>
      </xsl:if>

      <!-- Process content (appsection, divisions, paragraphs, tables, figures) -->
      <xsl:apply-templates
                select="appsection | division | para | table | figure"
                mode="appendix-content"
            >
        <xsl:with-param name="appendix-id" select="$appendix-id" />
      </xsl:apply-templates>
    </appendix>
  </xsl:template>

  <!-- Process appsection within appendices -->
  <xsl:template match="appsection" mode="appendix-content">
    <xsl:param name="appendix-id" as="xs:string" />
    <xsl:apply-templates select=".">
      <xsl:with-param name="appendix-id" select="$appendix-id" />
    </xsl:apply-templates>
  </xsl:template>

  <!-- Process divisions within appendices -->
  <xsl:template match="division" mode="appendix-content">
    <xsl:param name="appendix-id" as="xs:string" />
    <xsl:variable
            name="div-num"
            select="count(preceding-sibling::division) + 1"
        />
    <xsl:variable
            name="div-id"
            select="concat($appendix-id, '.div', $div-num)"
        />
    
    <!-- Create note-division wrapper -->
    <note-division xml:id="{$div-id}">
      <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id"/></xsl:if>
      
      <!-- Process title if present -->
      <xsl:if test="title">
        <title><xsl:apply-templates select="title/node()" mode="rich-text"/></title>
      </xsl:if>
      
      <!-- Process all child elements in order -->
      <xsl:for-each select="*[not(self::title)]">
        <xsl:choose>
          <!-- Paragraphs -->
          <xsl:when test="self::para">
            <xsl:variable
                    name="para-id"
                    select="concat($div-id, '.para', position())"
                />
            <paragraph xml:id="{$para-id}">
              <xsl:apply-templates select="node()" mode="rich-text"/>
            </paragraph>
          </xsl:when>
          
          <!-- Tables -->
          <xsl:when test="self::table">
            <xsl:apply-templates select=".">
              <xsl:with-param name="parent-id" select="$div-id"/>
            </xsl:apply-templates>
          </xsl:when>
          
          <!-- Figures -->
          <xsl:when test="self::figure">
            <xsl:apply-templates select=".">
              <xsl:with-param name="parent-id" select="$div-id"/>
            </xsl:apply-templates>
          </xsl:when>
          
          <!-- Lists -->
          <xsl:when test="self::list">
            <xsl:apply-templates select="." mode="rich-text"/>
          </xsl:when>
          
          <!-- Examples -->
          <xsl:when test="self::example">
            <xsl:apply-templates select=".">
              <xsl:with-param name="parent-id" select="$div-id"/>
            </xsl:apply-templates>
          </xsl:when>
          
          <!-- Nested divisions -->
          <xsl:when test="self::division">
            <xsl:apply-templates select="." mode="appendix-content">
              <xsl:with-param name="appendix-id" select="$div-id"/>
            </xsl:apply-templates>
          </xsl:when>
          
          <!-- Default: try to process as rich-text -->
          <xsl:otherwise>
            <xsl:apply-templates select="." mode="rich-text"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </note-division>
  </xsl:template>

  <!-- Process paragraphs within appendices (direct children, not in divisions) -->
  <xsl:template match="para" mode="appendix-content">
    <xsl:param name="appendix-id" as="xs:string" />
    <!-- Count all preceding para siblings, including those in divisions -->
    <xsl:variable
            name="para-num"
            select="count(preceding-sibling::para | preceding-sibling::division/para) + 1"
        />
    <xsl:variable
            name="para-id"
            select="concat($appendix-id, '.para', $para-num)"
        />
    <paragraph xml:id="{$para-id}"><xsl:apply-templates
                select="node()"
                mode="rich-text"
            /></paragraph>
  </xsl:template>

  <!-- Process tables within appendices -->
  <xsl:template match="table" mode="appendix-content">
    <xsl:param name="appendix-id" as="xs:string" />
    <xsl:apply-templates select=".">
      <xsl:with-param name="parent-id" select="$appendix-id" />
    </xsl:apply-templates>
  </xsl:template>

  <!-- Process figures within appendices -->
  <xsl:template match="figure" mode="appendix-content">
    <xsl:param name="appendix-id" as="xs:string" />
    <xsl:apply-templates select=".">
      <xsl:with-param name="parent-id" select="$appendix-id" />
    </xsl:apply-templates>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- APPENDIX SECTION PROCESSING (appsection, appsubsect, apparticle)   -->
  <!-- ================================================================== -->

  <!-- Process appsection elements (e.g., ex000109.1) -->
  <xsl:template match="appsection">
    <xsl:param name="appendix-id" as="xs:string" select="''" />
    <xsl:variable
            name="appsection-id"
            select="
      if ($appendix-id != '') then concat($appendix-id, '.appsect', count(preceding-sibling::appsection) + 1)
      else if (@id) then @id
      else concat('appsection.', generate-id())"
        />

    <appendix-section xml:id="{$appsection-id}">
      <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
      <title><xsl:apply-templates select="title/node()" mode="rich-text" /></title>

      <!-- Process direct paragraphs -->
      <xsl:for-each select="para">
        <xsl:variable name="para-id" select="concat($appsection-id, '.para', position())" />
        <paragraph xml:id="{$para-id}"><xsl:apply-templates select="node()" mode="rich-text" /></paragraph>
      </xsl:for-each>

      <!-- Process appsubsect elements -->
      <xsl:apply-templates select="appsubsect">
        <xsl:with-param name="appsection-id" select="$appsection-id" />
      </xsl:apply-templates>
    </appendix-section>
  </xsl:template>

  <!-- Process appsubsect elements (e.g., ex000109.1.1) -->
  <xsl:template match="appsubsect">
    <xsl:param name="appsection-id" as="xs:string" select="''" />
    <xsl:variable
            name="appsubsect-id"
            select="
      if ($appsection-id != '') then concat($appsection-id, '.subsect', count(preceding-sibling::appsubsect) + 1)
      else if (@id) then @id
      else concat('appsubsect.', generate-id())"
        />

    <appendix-subsection xml:id="{$appsubsect-id}">
      <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
      <title><xsl:apply-templates select="title/node()" mode="rich-text" /></title>

      <!-- Process paragraphs (may contain bibliography lists) -->
      <xsl:for-each select="para">
        <xsl:variable name="para-id" select="concat($appsubsect-id, '.para', count(preceding-sibling::para) + 1)" />
        <paragraph xml:id="{$para-id}">
          <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
          <xsl:apply-templates select="node()" mode="rich-text" />
        </paragraph>
      </xsl:for-each>

      <!-- Process apparticle elements -->
      <xsl:apply-templates select="apparticle">
        <xsl:with-param name="appsubsect-id" select="$appsubsect-id" />
      </xsl:apply-templates>
    </appendix-subsection>
  </xsl:template>

  <!-- Process apparticle elements (e.g., en000443) -->
  <xsl:template match="apparticle">
    <xsl:param name="appsubsect-id" as="xs:string" select="''" />
    <xsl:variable
            name="apparticle-id"
            select="
      if ($appsubsect-id != '') then concat($appsubsect-id, '.article', count(preceding-sibling::apparticle) + 1)
      else if (@id) then @id
      else concat('apparticle.', generate-id())"
        />

    <appendix-article xml:id="{$apparticle-id}">
      <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
      <title><xsl:apply-templates select="title/node()" mode="rich-text" /></title>

      <!-- Process all child nodes except title -->
      <xsl:variable name="content-nodes" select="node()[not(self::title)]" />
      <xsl:variable name="para-counter" select="0" />
      
      <xsl:for-each select="$content-nodes">
        <xsl:choose>
          <!-- Skip whitespace-only text nodes -->
          <xsl:when test="self::text() and not(normalize-space())" />
          <!-- Wrap non-empty text nodes in paragraph -->
          <xsl:when test="self::text() and normalize-space()">
            <xsl:variable name="para-id" select="concat($apparticle-id, '.para', count(preceding-sibling::*[self::para or self::para-nmbrd or self::table or self::figure or self::list or self::example] | preceding-sibling::text()[normalize-space()]) + 1)" />
            <paragraph xml:id="{$para-id}">
              <xsl:value-of select="." />
            </paragraph>
          </xsl:when>
          <!-- Process element nodes -->
          <xsl:otherwise>
            <xsl:apply-templates select=".">
              <xsl:with-param name="parent-id" select="$apparticle-id" />
            </xsl:apply-templates>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </appendix-article>
  </xsl:template>

  <!-- Process para-nmbrd (numbered paragraphs in apparticle) -->
  <xsl:template match="para-nmbrd">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="para-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.para', count(preceding-sibling::para-nmbrd | preceding-sibling::para) + 1)
      else if (@id) then @id
      else concat('para.', generate-id())"
        />

    <paragraph xml:id="{$para-id}">
      <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
      <!-- Include number as text content, not as separate element -->
      <xsl:if test="number">
        <xsl:value-of select="number" />
        <xsl:if test="node()[not(self::number)][normalize-space()]">
          <xsl:text> </xsl:text>
        </xsl:if>
      </xsl:if>
      <xsl:apply-templates select="node()[not(self::number)]" mode="rich-text" />
    </paragraph>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- SENTENCE PROCESSING                                                -->
  <!-- ================================================================== -->

  <xsl:template match="sentence">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <!-- Count only preceding sentence siblings, not tables or other elements -->
    <xsl:variable
            name="sentence-number"
            select="count(preceding-sibling::sentence) + 1"
        />
    <xsl:variable
            name="sentence-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.sent', $sentence-number)
      else if (@id) then @id
      else generate-id()"
        />

    <sentence xml:id="{$sentence-id}" number="{$sentence-number}">
      <xsl:if test="@id"><xsl:attribute
                    name="vendor-id"
                    select="@id"
                /></xsl:if>

      <!-- Intent reference if present; support both @xlink:href and @refid -->
      <!-- Skip intent-ref if it points to an external .xml file (invalid reference) -->
      <xsl:if test="ref.intent and not(contains((ref.intent/@refid, ref.intent/@xlink:href)[1], '.xml'))">
        <intent-ref target="{(ref.intent/@refid, ref.intent/@xlink:href)[1]}" />
      </xsl:if>

      <!-- Main text content -->
      <text>
        <xsl:apply-templates select="text/node()" mode="rich-text" />
      </text>

      <!-- Process clauses -->
      <xsl:for-each select="clause">
        <xsl:variable
                    name="clause-id"
                    select="concat($sentence-id, '.clause', position())"
                />
        <clause
                    xml:id="{$clause-id}"
                    letter="{substring(@id, string-length(@id))}"
                >
          <xsl:if test="@id"><xsl:attribute
                            name="vendor-id"
                            select="@id"
                        /></xsl:if>
          <text><xsl:apply-templates
                            select="text/node()"
                            mode="rich-text"
                        /></text>
          <xsl:if test="seealso">
            <see-also xml:id="{$clause-id}.seealso">
              <xsl:apply-templates select="seealso/node()" mode="rich-text" />
            </see-also>
          </xsl:if>
          <!-- Process subclauses -->
          <xsl:for-each select="subclause">
            <xsl:variable
                            name="subclause-id"
                            select="concat($clause-id, '.subclause', position())"
                        />
            <subclause xml:id="{$subclause-id}" number="{position()}">
              <xsl:if test="@id"><xsl:attribute
                                    name="vendor-id"
                                    select="@id"
                                /></xsl:if>
              <text><xsl:apply-templates
                                    select="text/node()"
                                    mode="rich-text"
                                /></text>
            </subclause>
          </xsl:for-each>
        </clause>
      </xsl:for-each>

      <!-- Process seealso elements at sentence level -->
      <xsl:for-each select="seealso">
        <see-also xml:id="{$sentence-id}.seealso{if (position() > 1) then position() else ''}">
          <xsl:apply-templates select="node()" mode="rich-text" />
        </see-also>
      </xsl:for-each>

      <!-- Objectives / Functional statements -->
      <xsl:if test="list.obj">
        <objectives xml:id="{$sentence-id}.objectives">
          <xsl:apply-templates select="list.obj/objective" />
        </objectives>
      </xsl:if>
      <xsl:if test="list.fs">
        <functional-statements xml:id="{$sentence-id}.functionalstatements">
          <xsl:apply-templates select="list.fs/func-state" />
        </functional-statements>
      </xsl:if>
    </sentence>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- TABLE PROCESSING                                                   -->
  <!-- ================================================================== -->

  <xsl:template match="table|table.comm">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="table-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.table', count(preceding-sibling::*[self::table or self::table.comm]) + 1)
      else concat('table.', generate-id())"
        />
    
    <!-- Count title notes so table-note numbering stays stable -->
    <xsl:variable name="title-notes" select="(title.tbl|title)/note" />
    <xsl:variable name="title-note-count" select="count($title-notes)" />
    <!-- Count all entry notes across the entire table -->
    <xsl:variable name="entry-notes" select="tgroup//note" />

    <table xml:id="{$table-id}">
      <xsl:if test="@id"><xsl:attribute
                    name="vendor-id"
                    select="@id"
                /></xsl:if>
      <xsl:if test="@frame"><xsl:attribute name="frame" select="@frame"/></xsl:if>
      
      <!-- Number element (table number, e.g. 9.20.17.4.-A in spectables) -->
      <xsl:if test="number">
        <number><xsl:value-of select="number"/></number>
      </xsl:if>
      
      <!-- Title element (main title text only, no notes) -->
      <xsl:if test="title.tbl or title">
        <title>
          <!-- Process text nodes and inline elements, but not note elements -->
          <xsl:apply-templates
                      select="(title.tbl|title)/node()[not(self::note)]"
                      mode="rich-text"
                  />
        </title>
      </xsl:if>
      
      <!-- Forming-part element (contains forming part references) -->
      <xsl:if test="ref.int">
        <forming-part>
          <xsl:for-each select="ref.int">
            <xsl:apply-templates select="." mode="rich-text" />
          </xsl:for-each>
        </forming-part>
      </xsl:if>
      
      <!-- Tgroup (table structure) -->
      <xsl:apply-templates select="tgroup">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="title-note-count" select="$title-note-count" />
      </xsl:apply-templates>
      
      <!-- Table-notes (title notes first, then entry notes) -->
      <xsl:if test="exists($title-notes) or exists($entry-notes)">
        <table-notes>
          <!-- Title notes (from title.tbl/title) -->
          <xsl:for-each select="$title-notes">
            <note xml:id="{concat($table-id, '.note', position())}">
              <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
              <xsl:apply-templates select="para.note/node()" mode="rich-text" />
            </note>
          </xsl:for-each>

          <!-- Entry notes (from thead, tbody, tfoot) -->
          <xsl:for-each select="$entry-notes">
            <xsl:variable name="note-pos" select="position()" />
            <note xml:id="{concat($table-id, '.note', $title-note-count + $note-pos)}">
              <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
              <xsl:apply-templates select="para.note/node()" mode="rich-text" />
            </note>
          </xsl:for-each>
        </table-notes>
      </xsl:if>
    </table>
  </xsl:template>

  <xsl:template match="tgroup">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="title-note-count" as="xs:integer" select="0" />
    <tgroup cols="{@cols}">
      <xsl:if test="@colsep"><xsl:attribute name="colsep" select="@colsep"/></xsl:if>
      <xsl:if test="@rowsep"><xsl:attribute name="rowsep" select="@rowsep"/></xsl:if>
      <xsl:apply-templates select="colspec" />
      <xsl:apply-templates select="thead">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="title-note-count" select="$title-note-count" />
      </xsl:apply-templates>
      <xsl:apply-templates select="tbody">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="title-note-count" select="$title-note-count" />
        <xsl:with-param name="thead-note-count" select="count(thead//note)" />
      </xsl:apply-templates>
      <xsl:apply-templates select="tfoot">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="title-note-count" select="$title-note-count" />
        <xsl:with-param name="thead-note-count" select="count(thead//note)" />
        <xsl:with-param name="tbody-note-count" select="count(tbody//note)" />
      </xsl:apply-templates>
    </tgroup>
  </xsl:template>

  <xsl:template match="colspec">
    <colspec colname="{@colname}" colwidth="{@colwidth}" />
  </xsl:template>

  <xsl:template match="thead | tbody | tfoot">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="title-note-count" as="xs:integer" select="0" />
    <xsl:param name="thead-note-count" as="xs:integer" select="0" />
    <xsl:param name="tbody-note-count" as="xs:integer" select="0" />
    <xsl:variable name="section-note-offset" select="
      if (local-name() = 'thead') then $title-note-count
      else if (local-name() = 'tbody') then $title-note-count + $thead-note-count
      else $title-note-count + $thead-note-count + $tbody-note-count" />
    <xsl:element name="{local-name()}">
      <xsl:if test="@valign"><xsl:attribute name="valign" select="@valign"/></xsl:if>
      <xsl:apply-templates select="row">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="section-name" select="local-name()" />
        <xsl:with-param
                    name="row-offset"
                    select="count(preceding-sibling::*/row)"
                />
        <xsl:with-param name="section-note-offset" select="$section-note-offset" />
      </xsl:apply-templates>
    </xsl:element>
  </xsl:template>

  <xsl:template match="row">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="section-name" as="xs:string" select="''" />
    <xsl:param name="row-offset" as="xs:integer" select="0" />
    <xsl:param name="section-note-offset" as="xs:integer" select="0" />
    <xsl:variable name="row-number" select="$row-offset + position()" />
    <xsl:variable name="row-id" select="concat($table-id, '.row', $row-number)" />
    <!-- Count notes in preceding rows within this section -->
    <xsl:variable name="preceding-row-notes" select="count(preceding-sibling::row//note)" />
    <row>
      <xsl:if test="$table-id != ''">
        <xsl:attribute name="xml:id" select="$row-id" />
      </xsl:if>
      <xsl:if test="@valign"><xsl:attribute name="valign" select="@valign"/></xsl:if>
      <xsl:if test="@rowsep"><xsl:attribute name="rowsep" select="@rowsep"/></xsl:if>
      <xsl:apply-templates select="entry">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="row-id" select="$row-id" />
        <xsl:with-param name="note-offset" select="$section-note-offset + $preceding-row-notes" />
      </xsl:apply-templates>
    </row>
  </xsl:template>

  <xsl:template match="entry">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="row-id" as="xs:string" select="''" />
    <xsl:param name="note-offset" as="xs:integer" select="0" />
    <!-- Count notes in preceding entries within this row -->
    <xsl:variable name="preceding-entry-notes" select="count(preceding-sibling::entry//note)" />
    <xsl:variable name="colnames" as="xs:string*" select="ancestor::tgroup[1]/colspec/@colname ! string(.)"/>
    <xsl:variable name="start-col" as="xs:integer?" select="if (@namest) then (index-of($colnames, string(@namest))[1]) else ()"/>
    <xsl:variable name="end-col" as="xs:integer?" select="if (@nameend) then (index-of($colnames, string(@nameend))[1]) else ()"/>
    <xsl:variable name="derived-rowspan" as="xs:integer?" select="if (not(@rowspan) and @morerows castable as xs:integer) then xs:integer(@morerows) + 1 else ()"/>
    <xsl:variable name="derived-colspan" as="xs:integer?"
                  select="
                    if (not(@colspan) and @namest and @nameend and exists($start-col) and exists($end-col) and $end-col ge $start-col)
                    then $end-col - $start-col + 1
                    else ()"/>
    <entry>
      <xsl:if test="@align"><xsl:attribute name="align" select="@align"/></xsl:if>
      <xsl:if test="@valign"><xsl:attribute name="valign" select="@valign"/></xsl:if>
      <xsl:if test="@colsep"><xsl:attribute name="colsep" select="@colsep"/></xsl:if>
      <xsl:if test="@rowsep"><xsl:attribute name="rowsep" select="@rowsep"/></xsl:if>
      <xsl:if test="@colname"><xsl:attribute name="colname" select="@colname"/></xsl:if>
      <xsl:if test="@rowspan">
        <xsl:attribute name="rowspan" select="@rowspan"/>
      </xsl:if>
      <xsl:if test="not(@rowspan) and exists($derived-rowspan)">
        <xsl:attribute name="rowspan" select="$derived-rowspan"/>
      </xsl:if>
      <xsl:if test="@colspan">
        <xsl:attribute name="colspan" select="@colspan"/>
      </xsl:if>
      <xsl:if test="not(@colspan) and exists($derived-colspan)">
        <xsl:attribute name="colspan" select="$derived-colspan"/>
      </xsl:if>
      
      <!-- Preserve standard reference metadata from child elements -->
      <xsl:if test="StandTitle/@StandID">
        <xsl:attribute name="standard-id" select="StandTitle/@StandID"/>
      </xsl:if>
      <xsl:if test="StandTitle/@StandRefID">
        <xsl:attribute name="standard-ref-id" select="StandTitle/@StandRefID"/>
      </xsl:if>
      <xsl:if test="StandTitle/@StandRefTitle">
        <xsl:attribute name="standard-ref-title" select="StandTitle/@StandRefTitle"/>
      </xsl:if>
      <xsl:if test="StandNumb/@StandRefNumb">
        <xsl:attribute name="standard-ref-number" select="StandNumb/@StandRefNumb"/>
      </xsl:if>
      
      <xsl:apply-templates select="node()" mode="entry-content">
        <xsl:with-param name="table-id" select="$table-id" />
        <xsl:with-param name="note-offset" select="$note-offset + $preceding-entry-notes" />
      </xsl:apply-templates>
    </entry>
  </xsl:template>

  <!-- Entry content mode: handle notes specially - emit ref to table-notes section -->
  <xsl:template match="note" mode="entry-content">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="note-offset" as="xs:integer" select="0" />
    <!-- Count all preceding notes within this entry (at any depth) -->
    <xsl:variable name="preceding-notes-in-entry" select="count(ancestor::entry[1]//note[. &lt;&lt; current()])" />
    <xsl:variable name="note-number" select="$note-offset + $preceding-notes-in-entry + 1" />
    <!-- Emit a reference to the note in table-notes instead of inline note -->
    <ref type="table-note" target="{concat($table-id, '.note', $note-number)}" />
  </xsl:template>

  <!-- ref.note in entry: reference to a table note -->
  <xsl:template match="ref.note" mode="entry-content">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="note-offset" as="xs:integer" select="0" />
    <ref type="table-note" target="{@refid}" />
  </xsl:template>

  <!-- Elements that may contain notes - process children in entry-content mode -->
  <xsl:template match="indent1.tbl | indent2.tbl | indent3.tbl" mode="entry-content">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="note-offset" as="xs:integer" select="0" />
    <xsl:apply-templates select="node()" mode="entry-content">
      <xsl:with-param name="table-id" select="$table-id" />
      <xsl:with-param name="note-offset" select="$note-offset" />
    </xsl:apply-templates>
  </xsl:template>

  <!-- Text nodes in entry-content mode -->
  <xsl:template match="text()" mode="entry-content">
    <xsl:value-of select="replace(., '\\s+', ' ')" />
  </xsl:template>

  <!-- Standard reference elements in entry-content mode - output text only -->
  <xsl:template match="StandAgency | StandNumb | StandTitle" mode="entry-content">
    <xsl:value-of select="normalize-space(.)" />
  </xsl:template>

  <!-- Graphics inside table entries -->
  <xsl:template match="graphic" mode="entry-content">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="note-offset" as="xs:integer" select="0" />
    <graphic src="{bc:asset-src(string(@catalog-id), 'eps')}" alt="{@alt}">
      <xsl:copy-of select="@width | @height" />
    </graphic>
  </xsl:template>

  <!-- Default: pass through to rich-text mode for other elements -->
  <xsl:template match="*" mode="entry-content">
    <xsl:param name="table-id" as="xs:string" select="''" />
    <xsl:param name="note-offset" as="xs:integer" select="0" />
    <xsl:apply-templates select="." mode="rich-text" />
  </xsl:template>

  <!-- ================================================================== -->
  <!-- FIGURE PROCESSING                                                  -->
  <!-- ================================================================== -->

  <xsl:template match="figure">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="figure-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.figure', count(preceding-sibling::figure) + 1)
      else if (@id) then @id
      else generate-id()"
        />

    <figure xml:id="{$figure-id}">
      <xsl:if test="@id"><xsl:attribute
                    name="vendor-id"
                    select="@id"
                /></xsl:if>
      <title><xsl:apply-templates
                    select="title/node()"
                    mode="rich-text"
                /></title>

      <!-- Forming-part element (contains forming part references) -->
      <xsl:if test="ref.int">
        <forming-part>
          <xsl:for-each select="ref.int">
            <xsl:apply-templates select="." mode="rich-text" />
          </xsl:for-each>
        </forming-part>
      </xsl:if>

      <xsl:for-each select="graphic">
        <graphic src="{bc:asset-src(string(@catalog-id), 'eps')}" alt="{@alt}">
          <xsl:copy-of select="@width | @height" />
        </graphic>
      </xsl:for-each>

      <xsl:for-each select="note">
        <note xml:id="{$figure-id}.note{position()}">
          <xsl:apply-templates select="para.note/node()" mode="rich-text" />
        </note>
      </xsl:for-each>
    </figure>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- OBJECTIVES AND FUNCTIONAL STATEMENTS                               -->
  <!-- ================================================================== -->

  <xsl:template match="objective">
    <objective xml:id="nbc.objective.{@key}" key="{@key}">
      <title><xsl:value-of select="title" /></title>
      <definition><xsl:apply-templates
                    select="text.defin/node()"
                    mode="rich-text"
                /></definition>
      <xsl:for-each select="obj.sub1">
        <sub-objective xml:id="nbc.objective.{@key}" key="{@key}">
          <title><xsl:value-of select="title" /></title>
          <definition><xsl:apply-templates
                            select="text.defin/node()"
                            mode="rich-text"
                        /></definition>
        </sub-objective>
      </xsl:for-each>
    </objective>
  </xsl:template>

  <xsl:template match="func-state">
    <functional-statement xml:id="nbc.functional.{@key}" key="{@key}">
      <definition><xsl:apply-templates
                    select="text.defin/node()"
                    mode="rich-text"
                /></definition>
    </functional-statement>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- RICH TEXT PROCESSING                                               -->
  <!-- ================================================================== -->

  <!-- Collapse excessive whitespace inside text nodes in rich text -->
  <xsl:template match="text()" mode="rich-text">
    <xsl:value-of select="replace(., '\\s+', ' ')" />
  </xsl:template>

  <xsl:template match="emphasis" mode="rich-text">
    <emphasis style="{@style}"><xsl:apply-templates
                select="node()"
                mode="rich-text"
            /></emphasis>
  </xsl:template>

  <xsl:template match="super" mode="rich-text"><super><xsl:value-of
                select="."
            /></super></xsl:template>
  <xsl:template match="sub" mode="rich-text"><sub><xsl:value-of
                select="."
            /></sub></xsl:template>

  <xsl:template match="meas" mode="rich-text">
    <xsl:if test="not(@units = 'imperial')">
      <measurement>
        <xsl:attribute name="units">
          <xsl:choose>
            <xsl:when test="@units and normalize-space(@units) != ''">
              <xsl:value-of select="normalize-space(@units)" />
            </xsl:when>
            <xsl:otherwise>metric</xsl:otherwise>
          </xsl:choose>
        </xsl:attribute>
        <xsl:apply-templates select="node()" mode="rich-text" />
      </measurement>
    </xsl:if>
  </xsl:template>

  <!-- Cross-reference processing -->
  <xsl:template match="ref.int" mode="rich-text">
    <ref
            type="internal"
            target="{@refid}"
            display-type="{if (@type) then @type else 'long'}"
        >
      <xsl:if test="@pretext"><xsl:attribute
                    name="pretext"
                    select="@pretext"
                /></xsl:if>
    </ref>
  </xsl:template>

  <xsl:template match="ref.ext" mode="rich-text">
    <ref type="external" target="{@refdoc}"><xsl:apply-templates
                select="node()"
                mode="rich-text"
            /></ref>
  </xsl:template>

  <xsl:template match="ref.stand" mode="rich-text">
    <ref type="standard" target="{@StandID}" standardId="{@StandID}">
      <xsl:apply-templates select="node()" mode="rich-text" />
    </ref>
  </xsl:template>

  <xsl:template match="term" mode="rich-text">
    <ref type="term" target="{@refid}"><xsl:apply-templates
                select="node()"
                mode="rich-text"
            /></ref>
  </xsl:template>

  <!-- Inline graphics (e.g., logos in table cells, appendix content) -->
  <xsl:template match="graphic" mode="rich-text">
    <graphic src="{bc:asset-src(string(@catalog-id), 'eps')}" alt="{@alt}">
      <xsl:copy-of select="@width | @height" />
    </graphic>
  </xsl:template>

  <!-- Functional statement references -->
  <xsl:template match="ref.fs" mode="rich-text">
    <ref type="functional-statement" target="{@refid}" />
  </xsl:template>

  <!-- Sub-objective references -->
  <xsl:template match="ref.so" mode="rich-text">
    <ref type="sub-objective" target="{@refid}" />
  </xsl:template>

  <!-- Objective references -->
  <xsl:template match="ref.obj" mode="rich-text">
    <ref type="objective" target="{@refid}" />
  </xsl:template>

  <!-- Change tracking: IGNORE markers (no redline in canonical) -->
  <xsl:template match="change-begin | change-end" mode="rich-text" />

  <!-- ================================================================== -->
  <!-- MATHEMATICAL EQUATIONS - MathML Conversion                         -->
  <!-- ================================================================== -->

  <!-- Display equations (block-level) -->
  <xsl:template match="eqdisplay" mode="rich-text">
    <equation type="display">
      <xsl:if test="@id"><xsl:attribute name="xml:id" select="@id" /></xsl:if>
      <!-- Preserve image reference for rendering -->
      <xsl:if test="@image">
        <xsl:attribute name="html-src" select="bc:asset-src(string(@image), 'html')" />
      </xsl:if>
      <!-- Convert to MathML -->
      <xsl:choose>
        <xsl:when test="fd | fl | rm | fr | rad">
          <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
            <xsl:apply-templates select="*" mode="mathml" />
          </math>
        </xsl:when>
        <xsl:when test="eqtxt">
          <!-- Plain text equation - process rich text content from eqtxt -->
          <text><xsl:apply-templates select="eqtxt/node()" mode="rich-text" /></text>
        </xsl:when>
        <xsl:otherwise>
          <!-- Fallback: preserve as text if no recognizable structure -->
          <text>[Equation: <xsl:value-of select="if (@image) then @image else 'unknown'" />]</text>
        </xsl:otherwise>
      </xsl:choose>
    </equation>
  </xsl:template>

  <!-- Inline equations -->
  <xsl:template match="eqinline" mode="rich-text">
    <equation type="inline">
      <xsl:if test="@id"><xsl:attribute name="xml:id" select="@id" /></xsl:if>
      <xsl:if test="@image">
        <xsl:attribute name="html-src" select="bc:asset-src(string(@image), 'html')" />
      </xsl:if>
      <xsl:choose>
        <xsl:when test="eqtxt">
          <text><xsl:apply-templates select="eqtxt/node()" mode="rich-text" /></text>
        </xsl:when>
        <xsl:otherwise>
          <math xmlns="http://www.w3.org/1998/Math/MathML" display="inline">
            <xsl:apply-templates select="*" mode="mathml" />
          </math>
        </xsl:otherwise>
      </xsl:choose>
    </equation>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- MATHML CONVERSION TEMPLATES                                        -->
  <!-- ================================================================== -->

  <!-- Fraction display (fd) - wrapper for fractions -->
  <xsl:template match="fd" mode="mathml">
    <xsl:apply-templates select="node()" mode="mathml" />
  </xsl:template>

  <!-- Fraction line (fl) - numerator or denominator -->
  <xsl:template match="fl" mode="mathml">
    <xsl:apply-templates select="node()" mode="mathml" />
  </xsl:template>

  <!-- Fraction (fr) with numerator (nu) and denominator (de) -->
  <xsl:template match="fr" mode="mathml">
    <mfrac>
      <xsl:apply-templates select="nu" mode="mathml" />
      <xsl:apply-templates select="de" mode="mathml" />
    </mfrac>
  </xsl:template>

  <!-- Numerator -->
  <xsl:template match="nu" mode="mathml">
    <mrow>
      <xsl:apply-templates select="node()" mode="mathml" />
    </mrow>
  </xsl:template>

  <!-- Denominator -->
  <xsl:template match="de" mode="mathml">
    <mrow>
      <xsl:apply-templates select="node()" mode="mathml" />
    </mrow>
  </xsl:template>

  <!-- Roman (normal) text -->
  <xsl:template match="rm" mode="mathml">
    <xsl:apply-templates select="node()" mode="mathml" />
  </xsl:template>

  <!-- Italic text -->
  <xsl:template match="it" mode="mathml">
    <mi>
      <xsl:apply-templates select="node()" mode="mathml" />
    </mi>
  </xsl:template>

  <!-- Bold text -->
  <xsl:template match="bf" mode="mathml">
    <mi mathvariant="bold">
      <xsl:apply-templates select="node()" mode="mathml" />
    </mi>
  </xsl:template>

  <!-- Superscript -->
  <xsl:template match="sup" mode="mathml">
    <msup>
      <mrow />
      <mrow>
        <xsl:apply-templates select="node()" mode="mathml" />
      </mrow>
    </msup>
  </xsl:template>

  <!-- Subscript (inf in Arbortext) -->
  <xsl:template match="inf" mode="mathml">
    <msub>
      <mrow />
      <mrow>
        <xsl:apply-templates select="node()" mode="mathml" />
      </mrow>
    </msub>
  </xsl:template>

  <!-- Radical (square root) -->
  <xsl:template match="rad" mode="mathml">
    <msqrt>
      <xsl:apply-templates select="rcd" mode="mathml" />
    </msqrt>
  </xsl:template>

  <!-- Radicand (content under radical) -->
  <xsl:template match="rcd" mode="mathml">
    <mrow>
      <xsl:apply-templates select="node()" mode="mathml" />
    </mrow>
  </xsl:template>

  <!-- Summation -->
  <xsl:template match="sum" mode="mathml">
    <mo>∑</mo>
    <xsl:apply-templates select="node()" mode="mathml" />
  </xsl:template>

  <!-- Integral -->
  <xsl:template match="int" mode="mathml">
    <mo>∫</mo>
    <xsl:apply-templates select="node()" mode="mathml" />
  </xsl:template>

  <!-- Lower limit -->
  <xsl:template match="ll" mode="mathml">
    <msub>
      <mrow />
      <mrow>
        <xsl:apply-templates select="node()" mode="mathml" />
      </mrow>
    </msub>
  </xsl:template>

  <!-- Upper limit -->
  <xsl:template match="ul" mode="mathml">
    <msup>
      <mrow />
      <mrow>
        <xsl:apply-templates select="node()" mode="mathml" />
      </mrow>
    </msup>
  </xsl:template>

  <!-- Grouping (g) - Greek letter mapping -->
  <!-- In Arbortext, <g> maps Latin letters to Greek equivalents -->
  <xsl:template match="g" mode="mathml">
    <xsl:variable name="letter" select="normalize-space(.)" />
    <mi>
      <xsl:choose>
        <xsl:when test="$letter='a'">α</xsl:when>
        <xsl:when test="$letter='b'">β</xsl:when>
        <xsl:when test="$letter='g'">γ</xsl:when>
        <xsl:when test="$letter='d'">δ</xsl:when>
        <xsl:when test="$letter='e'">ε</xsl:when>
        <xsl:when test="$letter='f'">φ</xsl:when>
        <xsl:when test="$letter='h'">η</xsl:when>
        <xsl:when test="$letter='l'">λ</xsl:when>
        <xsl:when test="$letter='m'">μ</xsl:when>
        <xsl:when test="$letter='n'">ν</xsl:when>
        <xsl:when test="$letter='p'">π</xsl:when>
        <xsl:when test="$letter='q'">θ</xsl:when>
        <xsl:when test="$letter='r'">ρ</xsl:when>
        <xsl:when test="$letter='s'">σ</xsl:when>
        <xsl:when test="$letter='t'">τ</xsl:when>
        <xsl:when test="$letter='w'">ω</xsl:when>
        <xsl:when test="$letter='x'">ξ</xsl:when>
        <xsl:when test="$letter='y'">ψ</xsl:when>
        <xsl:when test="$letter='z'">ζ</xsl:when>
        <xsl:when test="$letter='A'">Α</xsl:when>
        <xsl:when test="$letter='B'">Β</xsl:when>
        <xsl:when test="$letter='D'">Δ</xsl:when>
        <xsl:when test="$letter='F'">Φ</xsl:when>
        <xsl:when test="$letter='G'">Γ</xsl:when>
        <xsl:when test="$letter='L'">Λ</xsl:when>
        <xsl:when test="$letter='P'">Π</xsl:when>
        <xsl:when test="$letter='S'">Σ</xsl:when>
        <xsl:when test="$letter='W'">Ω</xsl:when>
        <xsl:when test="$letter='X'">Ξ</xsl:when>
        <xsl:when test="$letter='Y'">Ψ</xsl:when>
        <xsl:otherwise><xsl:value-of select="$letter" /></xsl:otherwise>
      </xsl:choose>
    </mi>
  </xsl:template>

  <!-- Fence (fen) - parentheses, brackets, etc. -->
  <xsl:template match="fen" mode="mathml">
    <!-- Opening fence -->
    <xsl:if test="@lp">
      <mo>
        <xsl:choose>
          <xsl:when test="@lp='par'">(</xsl:when>
          <xsl:when test="@lp='bra'">[</xsl:when>
          <xsl:when test="@lp='brc'">{</xsl:when>
          <xsl:otherwise>(</xsl:otherwise>
        </xsl:choose>
      </mo>
    </xsl:if>
    
    <!-- Process children (fractions, operators, etc.) -->
    <xsl:apply-templates select="node()" mode="mathml" />
    
    <!-- Note: Closing fence is handled by <rp> child element -->
  </xsl:template>

  <!-- Left parenthesis -->
  <xsl:template match="rp[@type='lp']" mode="mathml">
    <mo>(</mo>
  </xsl:template>

  <!-- Right parenthesis -->
  <xsl:template match="rp[@type='rp']" mode="mathml">
    <mo>)</mo>
  </xsl:template>

  <!-- Generic rp (parenthesis) - handles closing fences -->
  <xsl:template match="rp" mode="mathml">
    <mo>
      <xsl:choose>
        <xsl:when test="@post='par'">)</xsl:when>
        <xsl:when test="@post='bra'">]</xsl:when>
        <xsl:when test="@post='brc'">}</xsl:when>
        <xsl:when test="@type='lp'">(</xsl:when>
        <xsl:when test="@type='rp'">)</xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="if (normalize-space(.) != '') then . else ')'" />
        </xsl:otherwise>
      </xsl:choose>
    </mo>
  </xsl:template>

  <!-- Horizontal space -->
  <xsl:template match="hsp" mode="mathml">
    <mspace width="0.5em" />
  </xsl:template>

  <!-- Vertical mark (vmk, vmkr) - typically for absolute value or norms -->
  <xsl:template match="vmk | vmkr" mode="mathml">
    <mo>|</mo>
  </xsl:template>

  <!-- Accent (ac) -->
  <xsl:template match="ac" mode="mathml">
    <mover>
      <mrow>
        <xsl:apply-templates select="node()" mode="mathml" />
      </mrow>
      <mo>^</mo>
    </mover>
  </xsl:template>

  <!-- Reference (rf) - typically for equation references -->
  <xsl:template match="rf" mode="mathml">
    <mtext>
      <xsl:apply-templates select="node()" mode="mathml" />
    </mtext>
  </xsl:template>

  <!-- Text nodes in MathML - wrap in appropriate elements -->
  <xsl:template match="text()" mode="mathml">
    <xsl:variable name="text" select="normalize-space(.)" />
    <xsl:if test="$text != ''">
      <xsl:choose>
        <!-- Operators -->
        <xsl:when test="matches($text, '^[+\-×÷=≤≥&lt;&gt;±∓]$')">
          <mo><xsl:value-of select="$text" /></mo>
        </xsl:when>
        <!-- Numbers -->
        <xsl:when test="matches($text, '^[0-9.]+$')">
          <mn><xsl:value-of select="$text" /></mn>
        </xsl:when>
        <!-- Single letter variables -->
        <xsl:when test="matches($text, '^[a-zA-Z]$')">
          <mi><xsl:value-of select="$text" /></mi>
        </xsl:when>
        <!-- Multi-character identifiers or text -->
        <xsl:otherwise>
          <xsl:analyze-string select="$text" regex="([+\-×÷=≤≥&lt;&gt;±∓/])|([0-9.]+)|([a-zA-Z]+)|(\s+)">
            <xsl:matching-substring>
              <xsl:choose>
                <xsl:when test="regex-group(1)">
                  <mo><xsl:value-of select="regex-group(1)" /></mo>
                </xsl:when>
                <xsl:when test="regex-group(2)">
                  <mn><xsl:value-of select="regex-group(2)" /></mn>
                </xsl:when>
                <xsl:when test="regex-group(3)">
                  <mi><xsl:value-of select="regex-group(3)" /></mi>
                </xsl:when>
                <xsl:when test="regex-group(4)">
                  <!-- Skip whitespace -->
                </xsl:when>
              </xsl:choose>
            </xsl:matching-substring>
            <xsl:non-matching-substring>
              <mtext><xsl:value-of select="." /></mtext>
            </xsl:non-matching-substring>
          </xsl:analyze-string>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
  </xsl:template>

  <!-- Default: pass through unknown equation elements -->
  <xsl:template match="*" mode="mathml">
    <mtext>[<xsl:value-of select="local-name()" />]</mtext>
    <xsl:apply-templates select="node()" mode="mathml" />
  </xsl:template>

  <!-- lixpara: extended paragraph inside a listitem.
       Outputs pre-table text, converts frame="none" table rows to a variable
       list (col2=symbol, col3=description), and passes list.var children through. -->
  <xsl:template match="lixpara" mode="rich-text">
    <xsl:apply-templates select="node()[not(self::table) and not(self::list) and not(self::list.var) and not(self::list.def)]" mode="rich-text"/>
    <xsl:for-each select="table[@frame='none']">
      <list type="variable">
        <xsl:for-each select=".//row[normalize-space(entry[2]) != '' or normalize-space(entry[3]) != '']">
          <item>
            <variable><xsl:apply-templates select="entry[2]/node()" mode="rich-text"/></variable>
            <description><xsl:apply-templates select="entry[3]/node()" mode="rich-text"/></description>
          </item>
        </xsl:for-each>
      </list>
    </xsl:for-each>
    <xsl:apply-templates select="list | list.var | list.def" mode="rich-text"/>
  </xsl:template>

  <!-- Lists -->
  <xsl:template match="list" mode="rich-text">
    <list
            type="{ if (@mark='bull') then 'bulleted' else if (@mark='arabic') then 'numbered' else if (@mark='alpha') then 'alphabetic' else 'bulleted' }"
        >
      <xsl:for-each select="listitem"><item><xsl:apply-templates
                        select="node()"
                        mode="rich-text"
                    /></item></xsl:for-each>
    </list>
  </xsl:template>

  <xsl:template match="list.def" mode="rich-text">
    <list type="definition">
      <xsl:for-each select="def.group">
        <item>
          <xsl:if test="@id"><xsl:attribute
                            name="xml:id"
                            select="@id"
                        /></xsl:if>
          <term>
            <xsl:apply-templates select="defterm/node()" mode="rich-text" />
            <xsl:if test="dtqualify"><xsl:text> </xsl:text><xsl:apply-templates
                                select="dtqualify/node()"
                                mode="rich-text"
                            /></xsl:if>
          </term>
          <definition><xsl:apply-templates
                            select="text.defin/node()"
                            mode="rich-text"
                        /></definition>
        </item>
      </xsl:for-each>
    </list>
  </xsl:template>

  <xsl:template match="list.var" mode="rich-text">
    <list type="variable">
      <xsl:for-each select="var.group">
        <item>
          <variable><xsl:apply-templates
                            select="variable/node()"
                            mode="rich-text"
                        /></variable>
          <description><xsl:apply-templates
                            select="descrip/node()"
                            mode="rich-text"
                        /></description>
        </item>
      </xsl:for-each>
    </list>
  </xsl:template>

  <!-- Symbol list (symbols and abbreviations) -->
  <xsl:template match="list.sym" mode="rich-text">
    <list type="symbol">
      <xsl:for-each select="sym.group">
        <item>
          <symbol><xsl:apply-templates
                            select="symbol/node()"
                            mode="rich-text"
                        /></symbol>
          <description><xsl:apply-templates
                            select="descrip/node()"
                            mode="rich-text"
                        /></description>
        </item>
      </xsl:for-each>
    </list>
  </xsl:template>

  <!-- Bibliography list (references in appendices) -->
  <xsl:template match="list.bib" mode="rich-text">
    <list type="bibliography">
      <!-- Optional bibliography header (e.g., "References:") -->
      <xsl:if test="bibh">
        <header><xsl:value-of select="bibh"/></header>
      </xsl:if>
      <xsl:for-each select="bib">
        <item>
          <xsl:if test="@id"><xsl:attribute name="xml:id" select="@id"/></xsl:if>
          <xsl:apply-templates select="publine/node()" mode="rich-text"/>
        </item>
      </xsl:for-each>
    </list>
  </xsl:template>

  <!-- Organization list (abbreviations and addresses) -->
  <xsl:template match="list.org" mode="rich-text">
    <list type="organization">
      <xsl:for-each select="org.group">
        <xsl:variable name="item-id" select="concat('org.', generate-id())" />
        <item xml:id="{$item-id}">
          <organization><xsl:apply-templates
                            select="orgname/node()"
                            mode="rich-text"
                        /></organization>
          <address><xsl:apply-templates
                            select="orgaddr/node()"
                            mode="rich-text"
                        /></address>
        </item>
      </xsl:for-each>
    </list>
  </xsl:template>

  <!-- Web address references within organization addresses -->
  <xsl:template match="web.addr" mode="rich-text">
    <ref type="external" target="{@href}"><xsl:apply-templates
                select="node()"
                mode="rich-text"
            /></ref>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- DOCUMENT CONTENT MODE (for front/back matter)                       -->
  <!-- ================================================================== -->

  <!-- Capture title elements in document content (front/back matter) -->
  <xsl:template match="title" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="title-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.title')
      else concat('title', generate-id())"
        />
    <title xml:id="{$title-id}">
      <xsl:apply-templates select="node()" mode="rich-text" />
    </title>
  </xsl:template>

  <xsl:template match="para" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="para-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.para', count(preceding-sibling::para) + 1)
      else concat('para', generate-id())"
        />
    <paragraph xml:id="{$para-id}">
      <xsl:apply-templates select="node()" mode="rich-text" />
    </paragraph>
  </xsl:template>

  <!-- Default para template (for use in apparticle and other contexts) -->
  <xsl:template match="para">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="para-id"
            select="
      if ($parent-id != '') then concat($parent-id, '.para', count(preceding-sibling::para | preceding-sibling::para-nmbrd) + 1)
      else if (@id) then @id
      else concat('para.', generate-id())"
        />
    <paragraph xml:id="{$para-id}">
      <xsl:if test="@id"><xsl:attribute name="vendor-id" select="@id" /></xsl:if>
      <xsl:apply-templates select="node()" mode="rich-text" />
    </paragraph>
  </xsl:template>

  <!-- Process example elements (contain title and para) -->
  <xsl:template match="example">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable name="example-num" select="count(preceding-sibling::example) + 1" />
    <xsl:variable name="example-id" select="concat($parent-id, '.example', $example-num)" />
    
    <!-- Process the title as emphasized text in a paragraph -->
    <xsl:if test="title and normalize-space(title)">
      <paragraph xml:id="{$example-id}">
        <emphasis style="bold"><xsl:apply-templates select="title/node()" mode="rich-text" /></emphasis>
      </paragraph>
    </xsl:if>
    <!-- Process the para elements inside example with unique parent-id -->
    <xsl:apply-templates select="para | para-nmbrd | table | figure | list">
      <xsl:with-param name="parent-id" select="$example-id" />
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="division" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable
            name="div-num"
            select="count(preceding-sibling::division) + 1"
        />
    <xsl:variable
            name="div-id"
            select="
        if ($parent-id != '') then concat($parent-id, '.div', $div-num)
        else concat('div', generate-id())"
        />
    <!-- Process title if present -->
    <xsl:if test="title">
      <title xml:id="{$div-id}.title">
        <xsl:apply-templates select="title/node()" mode="rich-text" />
      </title>
    </xsl:if>
    <!-- Process all non-title children in document order to preserve source ordering -->
    <xsl:for-each select="*[not(self::title)]">
      <xsl:choose>
        <!-- Paragraphs -->
        <xsl:when test="self::para">
          <xsl:variable name="para-pos" select="count(preceding-sibling::para) + 1" />
          <paragraph xml:id="{$div-id}.para{$para-pos}">
            <xsl:apply-templates select="node()" mode="rich-text" />
          </paragraph>
        </xsl:when>
        <!-- Nested division.sub1 elements -->
        <xsl:when test="self::division.sub1">
          <xsl:variable name="sub-num" select="count(preceding-sibling::division.sub1) + 1" />
          <xsl:variable name="sub-id" select="concat($div-id, '.sub', $sub-num)" />
          <!-- Process sub-division title -->
          <xsl:if test="title">
            <title xml:id="{$sub-id}.title">
              <xsl:apply-templates select="title/node()" mode="rich-text" />
            </title>
          </xsl:if>
          <!-- Process sub-division paragraphs -->
          <xsl:for-each select="para">
            <paragraph xml:id="{$sub-id}.para{position()}">
              <xsl:apply-templates select="node()" mode="rich-text" />
            </paragraph>
          </xsl:for-each>
          <!-- Process tables in sub-division -->
          <xsl:apply-templates select="table" mode="document-content">
            <xsl:with-param name="parent-id" select="$sub-id" />
          </xsl:apply-templates>
        </xsl:when>
        <!-- Tables directly in division -->
        <xsl:when test="self::table">
          <xsl:apply-templates select="." mode="document-content">
            <xsl:with-param name="parent-id" select="$div-id" />
          </xsl:apply-templates>
        </xsl:when>
        <!-- Lists directly in division -->
        <xsl:when test="self::list or self::list.def or self::list.var or self::list.bib or self::list.org">
          <xsl:apply-templates select="." mode="rich-text" />
        </xsl:when>
        <!-- Figures directly in division -->
        <xsl:when test="self::figure">
          <xsl:apply-templates select="." mode="document-content">
            <xsl:with-param name="parent-id" select="$div-id" />
          </xsl:apply-templates>
        </xsl:when>
      </xsl:choose>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="comm-note.grp" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:for-each select="note">
      <xsl:variable
                name="note-id"
                select="
        if ($parent-id != '') then concat($parent-id, '.note', position())
        else concat('note', generate-id())"
            />
      <paragraph xml:id="{$note-id}">
        <xsl:apply-templates select="para.note/node()" mode="rich-text" />
      </paragraph>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="table|figure|table.comm" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:apply-templates select=".">
      <xsl:with-param name="parent-id" select="$parent-id" />
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="list" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:apply-templates select="." mode="rich-text" />
  </xsl:template>

  <!-- Default list template (for use in example and other contexts) -->
  <xsl:template match="list">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:apply-templates select="." mode="rich-text" />
  </xsl:template>

  <!-- Default seealso template (for use in apparticle and other contexts) -->
  <xsl:template match="seealso">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:variable name="seealso-id" select="concat($parent-id, '.seealso', count(preceding-sibling::seealso) + 1)" />
    <see-also xml:id="{$seealso-id}">
      <xsl:apply-templates select="node()" mode="rich-text" />
    </see-also>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- INDEX AND CONVERSIONS PROCESSING                                   -->
  <!-- ================================================================== -->

  <!-- Process index structure -->
  <xsl:template match="index">
    <xsl:param name="volume-number" as="xs:integer" select="1"/>
    <xsl:variable name="code-year" select="ancestor::OBCode/@code-year" />
    <xsl:variable name="index-id" select="concat('nbc.', $code-year, '.vol', $volume-number, '.index')" />
    
    <index xml:id="{$index-id}">
      <xsl:if test="@id">
        <xsl:attribute name="vendor-id" select="@id" />
      </xsl:if>
      
      <!-- Process introductory note if present -->
      <xsl:if test="note.index">
        <note>
          <xsl:apply-templates select="note.index/para.note/node()" mode="rich-text" />
        </note>
      </xsl:if>
      
      <!-- Process letter groupings (A-Z) -->
      <xsl:apply-templates select="iletter">
        <xsl:with-param name="index-id" select="$index-id" />
      </xsl:apply-templates>
    </index>
  </xsl:template>

  <!-- Process index letter groupings -->
  <xsl:template match="iletter">
    <xsl:param name="index-id" as="xs:string" />
    <xsl:variable name="letter" select="@letter" />
    <xsl:variable name="letter-id" select="concat($index-id, '.', $letter)" />
    
    <index-letter xml:id="{$letter-id}" letter="{$letter}">
      <!-- Process index groups within this letter -->
      <xsl:apply-templates select="igroup">
        <xsl:with-param name="letter-id" select="$letter-id" />
      </xsl:apply-templates>
    </index-letter>
  </xsl:template>

  <!-- Process index groups -->
  <xsl:template match="igroup">
    <xsl:param name="letter-id" as="xs:string" />
    <xsl:variable name="group-num" select="position()" />
    <xsl:variable name="group-id" select="concat($letter-id, '.group', $group-num)" />
    
    <index-group xml:id="{$group-id}">
      <xsl:if test="@id">
        <xsl:attribute name="vendor-id" select="@id" />
      </xsl:if>
      
      <!-- Process main term group -->
      <xsl:apply-templates select="itermgrp">
        <xsl:with-param name="group-id" select="$group-id" />
      </xsl:apply-templates>
      
      <!-- Process sub-term group if present -->
      <xsl:if test="isubtermgrp">
        <xsl:apply-templates select="isubtermgrp">
          <xsl:with-param name="group-id" select="$group-id" />
        </xsl:apply-templates>
      </xsl:if>
    </index-group>
  </xsl:template>

  <!-- Process index term groups (main terms) -->
  <xsl:template match="itermgrp">
    <xsl:param name="group-id" as="xs:string" />
    <xsl:variable name="term-num" select="position()" />
    <xsl:variable name="term-id" select="concat($group-id, '.term', $term-num)" />
    
    <index-term-group xml:id="{$term-id}">
      <!-- Extract term text -->
      <index-term>
        <xsl:apply-templates select="iterm/node()" mode="rich-text" />
      </index-term>
      
      <!-- Process references -->
      <xsl:apply-templates select="ref.index" />
    </index-term-group>
  </xsl:template>

  <!-- Process index sub-term groups -->
  <xsl:template match="isubtermgrp">
    <xsl:param name="group-id" as="xs:string" />
    <xsl:variable name="subterm-id" select="concat($group-id, '.subterm', position())" />
    
    <index-subterm-group xml:id="{$subterm-id}">
      <!-- Process each sub-term -->
      <xsl:for-each select="itermgrp">
        <xsl:variable name="subterm-num" select="position()" />
        <xsl:variable name="subterm-term-id" select="concat($subterm-id, '.term', $subterm-num)" />
        
        <index-term-group xml:id="{$subterm-term-id}">
          <!-- Extract sub-term text -->
          <index-term>
            <xsl:apply-templates select="iterm/node()" mode="rich-text" />
          </index-term>
          
          <!-- Process references -->
          <xsl:apply-templates select="ref.index" />
        </index-term-group>
      </xsl:for-each>
    </index-subterm-group>
  </xsl:template>

  <!-- Process index references -->
  <xsl:template match="ref.index">
    <index-ref target="{@refid}">
      <xsl:if test="@division">
        <xsl:attribute name="division" select="@division" />
      </xsl:if>
      <xsl:if test="@refid">
        <xsl:attribute name="vendor-target" select="@refid" />
      </xsl:if>
    </index-ref>
  </xsl:template>

  <!-- Process conversions table -->
  <xsl:template match="conversions">
    <xsl:param name="volume-number" as="xs:integer" select="1"/>
    <xsl:variable name="code-year" select="ancestor::OBCode/@code-year" />
    <xsl:variable name="conversions-id" select="concat('nbc.', $code-year, '.vol', $volume-number, '.conversions')" />
    
    <conversions xml:id="{$conversions-id}">
      <xsl:if test="@id">
        <xsl:attribute name="vendor-id" select="@id" />
      </xsl:if>
      
      <!-- Process the conversion factors table -->
      <xsl:apply-templates select="table">
        <xsl:with-param name="parent-id" select="$conversions-id" />
      </xsl:apply-templates>
    </conversions>
  </xsl:template>

  <!-- Skip Arbortext tracking elements -->
  <xsl:template match="atict:*" mode="#all" />

  <!-- Default text passthrough for unmatched elements in rich-text mode -->
  <xsl:template match="*" mode="rich-text"><xsl:apply-templates
            select="node()"
            mode="rich-text"
        /></xsl:template>

  <!-- Default element passthrough for document-content mode -->
  <xsl:template match="*" mode="document-content">
    <xsl:param name="parent-id" as="xs:string" select="''" />
    <xsl:apply-templates select="node()" mode="document-content">
      <xsl:with-param name="parent-id" select="$parent-id" />
    </xsl:apply-templates>
  </xsl:template>

  <!-- ================================================================== -->
  <!-- REFERENCE UPDATE MODE (Second Pass)                                -->
  <!-- ================================================================== -->

  <!-- Default: copy everything as-is -->
  <xsl:template match="node() | @*" mode="update-references">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()" mode="update-references" />
    </xsl:copy>
  </xsl:template>

  <!-- Update ref elements to use canonical IDs via key() -->
  <xsl:template match="ref[@type='internal']/@target" mode="update-references">
    <xsl:variable name="vendor-id" select="." />
    <xsl:variable
            name="hit"
            select="key('canon-by-vendor-id', $vendor-id)[1]"
        />
    <xsl:attribute
            name="target"
            select="if ($hit) then $hit/@xml:id else $vendor-id"
        />
    <xsl:if test="not($hit)"><xsl:attribute
                name="vendor-target"
                select="$vendor-id"
            /></xsl:if>
  </xsl:template>

  <!-- Also update intent-ref targets if they used vendor ids -->
  <xsl:template match="intent-ref/@target" mode="update-references">
    <xsl:variable name="vendor-id" select="." />
    <xsl:variable
            name="hit"
            select="key('canon-by-vendor-id', $vendor-id)[1]"
        />
    <xsl:attribute
            name="target"
            select="if ($hit) then $hit/@xml:id else $vendor-id"
        />
    <xsl:if test="not($hit)"><xsl:attribute
                name="vendor-target"
                select="$vendor-id"
            /></xsl:if>
  </xsl:template>

  <!-- Update table-note ref targets to use canonical IDs -->
  <xsl:template match="ref[@type='table-note']/@target" mode="update-references">
    <xsl:variable name="vendor-id" select="." />
    <xsl:variable
            name="hit"
            select="key('canon-by-vendor-id', $vendor-id)[1]"
        />
    <xsl:attribute
            name="target"
            select="if ($hit) then $hit/@xml:id else $vendor-id"
        />
    <xsl:if test="not($hit)"><xsl:attribute
                name="vendor-target"
                select="$vendor-id"
            /></xsl:if>
  </xsl:template>

  <!-- Update index-ref targets to use canonical IDs -->
  <xsl:template match="index-ref/@target" mode="update-references">
    <xsl:variable name="vendor-id" select="." />
    <xsl:variable
            name="hit"
            select="key('canon-by-vendor-id', $vendor-id)[1]"
        />
    <xsl:attribute
            name="target"
            select="if ($hit) then $hit/@xml:id else $vendor-id"
        />
    <!-- Keep vendor-target for reference -->
    <xsl:if test="not($hit) or @vendor-target"><xsl:attribute
                name="vendor-target"
                select="if (@vendor-target) then @vendor-target else $vendor-id"
            /></xsl:if>
  </xsl:template>

  <!-- Optional: warn on unresolved internal refs -->
  <!-- DISABLED: Forward references (e.g., to appnotes) are expected and valid -->
  <!--
  <xsl:template match="ref[@type='internal']" mode="update-references">
    <xsl:variable name="t" select="@target"/>
    <xsl:if test="empty(//*[@xml:id=$t])">
      <xsl:message terminate="no">[WARN] Unresolved internal ref: <xsl:value-of select="$t"/></xsl:message>
    </xsl:if>
    <xsl:next-match/>
  </xsl:template>
  -->

</xsl:stylesheet>
