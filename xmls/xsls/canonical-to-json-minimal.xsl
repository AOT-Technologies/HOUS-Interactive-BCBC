<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:fn="http://www.w3.org/2005/xpath-functions" exclude-result-prefixes="xs fn">
    <xsl:output method="text" encoding="UTF-8"/>
    <xsl:param name="max-parts" select="2"/>
    <xsl:param name="max-sections" select="3"/>
    <xsl:param name="max-subsections" select="3"/>
    <xsl:param name="max-articles" select="3"/>
    <xsl:param name="max-sentences" select="4"/>
    <xsl:param name="max-clauses" select="3"/>
    <xsl:param name="max-appnotes" select="5"/>

    <xsl:template match="/nbc">
        <xsl:variable name="json-structure">
            <fn:map>
                <fn:string key="document_type">bc_building_code_minimal_sample</fn:string>
                <fn:string key="description">Minimal representative sample of all node types for LLM study</fn:string>
                <fn:string key="version"><xsl:value-of select="@version"/></fn:string>
                <fn:string key="canonical_version"><xsl:value-of select="@canonical-version"/></fn:string>
                <fn:map key="metadata">
                    <fn:string key="title"><xsl:value-of select="metadata/publication-info[1]/title"/></fn:string>
                    <fn:string key="subtitle"><xsl:value-of select="metadata/publication-info[1]/subtitle"/></fn:string>
                    <fn:string key="authority"><xsl:value-of select="metadata/publication-info[1]/authority"/></fn:string>
                </fn:map>
                <!-- Front matter (preface, introduction, committees) - sample only -->
                <xsl:if test="front-matter">
                    <fn:map key="front_matter">
                        <xsl:apply-templates select="front-matter" mode="json"/>
                    </fn:map>
                </xsl:if>
                <!-- Volumes array (replaces divisions array) -->
                <fn:array key="volumes">
                    <xsl:apply-templates select="volume" mode="json"/>
                </fn:array>
                <fn:map key="cross_references_sample">
                    <xsl:call-template name="build-refs"/>
                </fn:map>
                <fn:array key="bc_amendments_sample">
                    <xsl:call-template name="build-amendments"/>
                </fn:array>
                <fn:map key="glossary_sample">
                    <xsl:call-template name="build-glossary"/>
                </fn:map>
                <fn:map key="statistics">
                    <fn:number key="total_volumes"><xsl:value-of select="count(volume)"/></fn:number>
                    <fn:number key="total_divisions"><xsl:value-of select="count(.//division)"/></fn:number>
                    <fn:number key="total_parts"><xsl:value-of select="count(.//part)"/></fn:number>
                    <fn:number key="total_sections"><xsl:value-of select="count(.//section)"/></fn:number>
                    <fn:number key="total_articles"><xsl:value-of select="count(.//article)"/></fn:number>
                    <fn:number key="total_sentences"><xsl:value-of select="count(.//sentence)"/></fn:number>
                    <fn:number key="total_tables"><xsl:value-of select="count(.//table)"/></fn:number>
                    <fn:number key="total_figures"><xsl:value-of select="count(.//figure)"/></fn:number>
                    <fn:number key="total_application_notes"><xsl:value-of select="count(.//application-note)"/></fn:number>
                    <fn:number key="total_revisions"><xsl:value-of select="count(.//revision-history)"/></fn:number>
                    <!-- Volume-specific index statistics -->
                    <xsl:if test="volume[@number='1']/index">
                        <fn:number key="total_index_entries_vol1"><xsl:value-of select="count(volume[@number='1']/index//term)"/></fn:number>
                        <fn:number key="total_index_references_vol1"><xsl:value-of select="count(volume[@number='1']/index//reference)"/></fn:number>
                    </xsl:if>
                    <xsl:if test="volume[@number='2']/index">
                        <fn:number key="total_index_entries_vol2"><xsl:value-of select="count(volume[@number='2']/index//term)"/></fn:number>
                        <fn:number key="total_index_references_vol2"><xsl:value-of select="count(volume[@number='2']/index//reference)"/></fn:number>
                    </xsl:if>
                </fn:map>
                <fn:map key="schema_doc">
                    <xsl:call-template name="doc-schema"/>
                </fn:map>
            </fn:map>
        </xsl:variable>
        <xsl:value-of select="fn:xml-to-json($json-structure, map{'indent': true()})"/>
    </xsl:template>

    <!-- Volume template - outputs volume with divisions, index, and conversions -->
    <xsl:template match="volume" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
            <fn:string key="title">National Building Code of Canada <xsl:value-of select="/nbc/@version"/> - Volume <xsl:value-of select="@number"/></fn:string>
            <fn:array key="divisions">
                <xsl:apply-templates select="division" mode="json"/>
            </fn:array>
            <!-- Index sample (if present) -->
            <xsl:if test="index">
                <fn:map key="index">
                    <fn:string key="id"><xsl:value-of select="index/@xml:id"/></fn:string>
                    <fn:string key="type">index</fn:string>
                    <fn:array key="letters_sample">
                        <xsl:apply-templates select="index/letter[position() &lt;= 2]" mode="index-json"/>
                    </fn:array>
                    <fn:number key="total_letters"><xsl:value-of select="count(index/letter)"/></fn:number>
                </fn:map>
            </xsl:if>
            <!-- Conversions sample (if present) -->
            <xsl:if test="conversions">
                <fn:map key="conversions">
                    <fn:string key="id"><xsl:value-of select="conversions/@xml:id"/></fn:string>
                    <fn:string key="type">conversions</fn:string>
                    <fn:string key="table_id"><xsl:value-of select="conversions/table/@xml:id"/></fn:string>
                    <fn:string key="table_title"><xsl:apply-templates select="conversions/table/title" mode="text"/></fn:string>
                    <fn:number key="total_rows"><xsl:value-of select="count(conversions/table/tgroup/tbody/row)"/></fn:number>
                </fn:map>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <!-- Index letter template for minimal output -->
    <xsl:template match="letter" mode="index-json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            <fn:array key="groups_sample">
                <xsl:for-each select="group[position() &lt;= 2]">
                    <fn:map>
                        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                        <fn:string key="term"><xsl:apply-templates select="term" mode="text"/></fn:string>
                        <fn:number key="reference_count"><xsl:value-of select="count(.//reference)"/></fn:number>
                    </fn:map>
                </xsl:for-each>
            </fn:array>
            <fn:number key="total_groups"><xsl:value-of select="count(group)"/></fn:number>
        </fn:map>
    </xsl:template>

    <xsl:template match="division" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">division</fn:string>
            <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <fn:array key="parts">
                <xsl:apply-templates select="part[position() &lt;= $max-parts]" mode="json"/>
            </fn:array>
            <fn:number key="total_parts"><xsl:value-of select="count(part)"/></fn:number>
        </fn:map>
    </xsl:template>

    <xsl:template match="part" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">part</fn:string>
            <xsl:if test="@number"><fn:number key="number"><xsl:value-of select="@number"/></fn:number></xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <fn:array key="sections">
                <xsl:apply-templates select="section[position() &lt;= $max-sections]" mode="json"/>
            </fn:array>
            <xsl:if test="spectables">
                <fn:array key="spectables">
                    <xsl:apply-templates select="spectables[1]" mode="json"/>
                </fn:array>
            </xsl:if>
            <xsl:if test="part-appendix">
                <fn:map key="appendix">
                    <xsl:apply-templates select="part-appendix" mode="json"/>
                </fn:map>
            </xsl:if>
            <fn:number key="total_sections"><xsl:value-of select="count(section)"/></fn:number>
        </fn:map>
    </xsl:template>

    <xsl:template match="section" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">section</fn:string>
            <xsl:if test="@number"><fn:number key="number"><xsl:value-of select="@number"/></fn:number></xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <fn:array key="subsections">
                <xsl:apply-templates select="subsection[position() &lt;= $max-subsections]" mode="json"/>
            </fn:array>
            <fn:number key="total_subsections"><xsl:value-of select="count(subsection)"/></fn:number>
        </fn:map>
    </xsl:template>

    <xsl:template match="subsection" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">subsection</fn:string>
            <xsl:if test="@number"><fn:number key="number"><xsl:value-of select="@number"/></fn:number></xsl:if>
            
            <!-- Extract title and articles from revision-history if present, otherwise from direct children -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="cur" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($cur/content) then $cur/content else revision-history/original"/>
                    
                    <fn:string key="title"><xsl:apply-templates select="$content-node/title" mode="text"/></fn:string>
                    <xsl:if test="$content-node/see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="$content-node/see-also" mode="rich"/></fn:string>
                    </xsl:if>
                    <fn:array key="articles">
                        <xsl:apply-templates select="$content-node/article[position() &lt;= $max-articles]" mode="json"/>
                    </fn:array>
                    <fn:number key="total_articles"><xsl:value-of select="count($content-node/article)"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
                    <xsl:if test="see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="see-also" mode="rich"/></fn:string>
                    </xsl:if>
                    <fn:array key="articles">
                        <xsl:apply-templates select="article[position() &lt;= $max-articles]" mode="json"/>
                    </fn:array>
                    <fn:number key="total_articles"><xsl:value-of select="count(article)"/></fn:number>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised='yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="article" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">article</fn:string>
            <xsl:if test="@number"><fn:number key="number"><xsl:value-of select="@number"/></fn:number></xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <fn:array key="content">
                <xsl:apply-templates select="(sentence|table|figure)[position() &lt;= $max-sentences]" mode="json"/>
            </fn:array>
            <xsl:if test="@revised='yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="sentence" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">sentence</fn:string>
            <xsl:if test="@number"><fn:number key="number"><xsl:value-of select="@number"/></fn:number></xsl:if>
            <fn:string key="text"><xsl:apply-templates select="text" mode="rich"/></fn:string>
            
            <!-- Extract equations from text element -->
            <xsl:if test="text//equation">
                <fn:array key="equations">
                    <xsl:apply-templates select="text//equation" mode="equation-json"/>
                </fn:array>
            </xsl:if>
            
            <!-- Extract all lists from text element -->
            <xsl:call-template name="extract-lists">
                <xsl:with-param name="content-root" select="text"/>
            </xsl:call-template>
            
            <xsl:if test="clause">
                <fn:array key="clauses">
                    <xsl:apply-templates select="clause[position() &lt;= $max-clauses]" mode="json"/>
                </fn:array>
            </xsl:if>
            <xsl:if test="objectives">
                <fn:array key="objectives">
                    <xsl:apply-templates select="objectives/objective[position() &lt;= 2]" mode="json"/>
                </fn:array>
            </xsl:if>
            <xsl:if test="functional-statements">
                <fn:array key="functional_statements">
                    <xsl:apply-templates select="functional-statements/functional-statement[position() &lt;= 2]" mode="json"/>
                </fn:array>
            </xsl:if>
            <xsl:if test="@revised='yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="clause" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">clause</fn:string>
            <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            <fn:string key="text"><xsl:apply-templates select="text" mode="rich"/></fn:string>
            
            <!-- Extract equations from text element -->
            <xsl:if test="text//equation">
                <fn:array key="equations">
                    <xsl:apply-templates select="text//equation" mode="equation-json"/>
                </fn:array>
            </xsl:if>
            
            <!-- Extract all lists from text element -->
            <xsl:call-template name="extract-lists">
                <xsl:with-param name="content-root" select="text"/>
            </xsl:call-template>
            
            <xsl:if test="subclause">
                <fn:array key="subclauses">
                    <xsl:apply-templates select="subclause[position() &lt;= 2]" mode="json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="subclause" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">subclause</fn:string>
            <xsl:if test="@number"><fn:number key="number"><xsl:value-of select="@number"/></fn:number></xsl:if>
            <fn:string key="text"><xsl:apply-templates select="text" mode="rich"/></fn:string>
            
            <!-- Extract equations from text element -->
            <xsl:if test="text//equation">
                <fn:array key="equations">
                    <xsl:apply-templates select="text//equation" mode="equation-json"/>
                </fn:array>
            </xsl:if>
            
            <!-- Extract all lists from text element -->
            <xsl:call-template name="extract-lists">
                <xsl:with-param name="content-root" select="text"/>
            </xsl:call-template>
        </fn:map>
    </xsl:template>

    <xsl:template match="table" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">table</fn:string>
            <xsl:if test="number">
                <fn:string key="number"><xsl:value-of select="number"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="rich"/></fn:string>
            <fn:map key="structure">
                <xsl:if test="tgroup/@cols"><fn:number key="columns"><xsl:value-of select="tgroup/@cols"/></fn:number></xsl:if>
                <xsl:if test="tgroup/thead">
                    <fn:array key="header_rows">
                        <xsl:apply-templates select="tgroup/thead/row[position() &lt;= 2]" mode="json"/>
                    </fn:array>
                </xsl:if>
                <fn:array key="body_rows">
                    <xsl:apply-templates select="tgroup/tbody/row[position() &lt;= 5]" mode="json"/>
                </fn:array>
                <fn:number key="total_rows"><xsl:value-of select="count(tgroup/tbody/row)"/></fn:number>
            </fn:map>
            
            <!-- Extract equations from table -->
            <xsl:if test=".//equation">
                <fn:array key="equations">
                    <xsl:apply-templates select=".//equation" mode="equation-json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="row" mode="json">
        <fn:array>
            <xsl:apply-templates select="entry[position() &lt;= 6]" mode="json"/>
        </fn:array>
    </xsl:template>

    <xsl:template match="entry" mode="json">
        <fn:map>
            <fn:string key="content"><xsl:apply-templates select="." mode="rich"/></fn:string>
            <xsl:if test="@rowspan"><fn:number key="rowspan"><xsl:value-of select="@rowspan"/></fn:number></xsl:if>
            <xsl:if test="@colspan"><fn:number key="colspan"><xsl:value-of select="@colspan"/></fn:number></xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="figure" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">figure</fn:string>
            <fn:string key="title"><xsl:apply-templates select="title" mode="rich"/></fn:string>
            <fn:map key="graphic">
                <fn:string key="src"><xsl:value-of select="graphic/@src"/></fn:string>
                <fn:string key="alt"><xsl:value-of select="graphic/@alt"/></fn:string>
            </fn:map>
        </fn:map>
    </xsl:template>

    <xsl:template match="spectables" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">spectables</fn:string>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <fn:array key="tables">
                <xsl:apply-templates select="table[position() &lt;= 2]" mode="json"/>
            </fn:array>
            <fn:number key="total_tables"><xsl:value-of select="count(table)"/></fn:number>
        </fn:map>
    </xsl:template>

    <xsl:template match="part-appendix" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">part_appendix</fn:string>
        <fn:array key="application_notes">
            <xsl:apply-templates select="application-note[position() &lt;= $max-appnotes]" mode="json"/>
        </fn:array>
        <fn:number key="total_notes"><xsl:value-of select="count(application-note)"/></fn:number>
    </xsl:template>

    <xsl:template match="application-note" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">application_note</fn:string>
            <fn:string key="number"><xsl:value-of select="number"/></fn:string>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <xsl:if test="paragraph">
                <fn:array key="paragraphs">
                    <xsl:for-each select="paragraph[position() &lt;= 2]">
                        <fn:map>
                            <xsl:if test="@xml:id"><fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string></xsl:if>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich"/></fn:string>
                            
                            <!-- Extract equations from paragraph -->
                            <xsl:if test=".//equation">
                                <fn:array key="equations">
                                    <xsl:apply-templates select=".//equation" mode="equation-json"/>
                                </fn:array>
                            </xsl:if>
                            
                            <!-- Extract all lists from paragraph -->
                            <xsl:call-template name="extract-lists">
                                <xsl:with-param name="content-root" select="."/>
                            </xsl:call-template>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            <xsl:if test="note-division">
                <fn:array key="divisions">
                    <xsl:apply-templates select="note-division[position() &lt;= 2]" mode="json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="note-division" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">note_division</fn:string>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text"/></fn:string>
            <xsl:if test="paragraph">
                <fn:array key="paragraphs">
                    <xsl:for-each select="paragraph[position() &lt;= 2]">
                        <fn:map>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich"/></fn:string>
                            
                            <!-- Extract equations from paragraph -->
                            <xsl:if test=".//equation">
                                <fn:array key="equations">
                                    <xsl:apply-templates select=".//equation" mode="equation-json"/>
                                </fn:array>
                            </xsl:if>
                            
                            <!-- Extract all lists from paragraph -->
                            <xsl:call-template name="extract-lists">
                                <xsl:with-param name="content-root" select="."/>
                            </xsl:call-template>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>

    <xsl:template match="objective" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
            <fn:string key="title"><xsl:value-of select="title"/></fn:string>
            <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich"/></fn:string>
        </fn:map>
    </xsl:template>

    <xsl:template match="functional-statement" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
            <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich"/></fn:string>
        </fn:map>
    </xsl:template>

    <!-- TEXT MODES -->
    <xsl:template match="*" mode="text"><xsl:apply-templates select="text()|*" mode="text"/></xsl:template>
    <xsl:template match="text()" mode="text"><xsl:value-of select="."/></xsl:template>
    <xsl:template match="lb" mode="text"><xsl:text>&#10;</xsl:text></xsl:template>
    <xsl:template match="emphasis|super|sub|ref|measurement" mode="text"><xsl:apply-templates select="text()" mode="text"/></xsl:template>

    <xsl:template match="*" mode="rich"><xsl:apply-templates select="text()|*" mode="rich"/></xsl:template>
    <xsl:template match="text()" mode="rich">
        <xsl:variable name="normalized" select="normalize-space(.)"/>
        <xsl:if test="$normalized != ''">
            <xsl:if test="preceding-sibling::node() and matches(., '^\s')">
                <xsl:text> </xsl:text>
            </xsl:if>
            <xsl:value-of select="$normalized"/>
            <xsl:if test="following-sibling::node() and matches(., '\s$')">
                <xsl:text> </xsl:text>
            </xsl:if>
        </xsl:if>
    </xsl:template>
    <xsl:template match="lb" mode="rich"><xsl:text>&#10;</xsl:text></xsl:template>
    <xsl:template match="ref" mode="rich">
        <xsl:if test="preceding-sibling::node()[1][self::text() and not(matches(., '\s$'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
        <xsl:text>[REF:</xsl:text>
        <xsl:value-of select="@type"/>
        <xsl:text>:</xsl:text>
        <xsl:value-of select="@target"/>
        <xsl:if test="normalize-space(.) != ''">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="normalize-space(.)"/>
        </xsl:if>
        <xsl:text>]</xsl:text>
        <xsl:if test="following-sibling::node()[1][self::text() and not(matches(., '^\s'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>
    <xsl:template match="super" mode="rich">^{<xsl:value-of select="."/>}</xsl:template>
    <xsl:template match="sub" mode="rich">_{<xsl:value-of select="."/>}</xsl:template>
    <xsl:template match="measurement" mode="rich">
        <!-- No space after an opening bracket or quote, or before punctuation: "(38 mm)", "13 mm," -->
        <xsl:if test="preceding-sibling::node()[1][self::text() and not(matches(., '[\s(\[&#8220;&#8216;]$'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
        <xsl:apply-templates select="node()" mode="rich"/>
        <xsl:if test="following-sibling::node()[1][self::text() and not(matches(., '^[\s,.;:!?)\]&#8221;&#8217;]'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>
    <xsl:template match="equation" mode="rich">
        <xsl:variable name="equation-id" as="xs:string"
                      select="
                        if (@xml:id) then string(@xml:id)
                        else if (@image) then string(@image)
                        else if (@html-src) then replace(tokenize(string(@html-src), '/')[last()], '\.html', '')
                        else if (@image-src) then replace(tokenize(string(@image-src), '/')[last()], '\.eps', '')
                        else ''"/>
        <xsl:text>[EQ:</xsl:text>
        <xsl:value-of select="@type"/>
        <xsl:text>:</xsl:text>
        <xsl:value-of select="$equation-id"/>
        <xsl:text>]</xsl:text>
    </xsl:template>
    <xsl:template match="super" mode="rich">^{<xsl:value-of select="."/>}</xsl:template>
    <xsl:template match="sub" mode="rich">_{<xsl:value-of select="."/>}</xsl:template>
    
    <!-- Skip all list types in rich mode - they're extracted as structured data -->
    <xsl:template match="list" mode="rich" priority="2">
        <xsl:text>[LIST:</xsl:text>
        <xsl:value-of select="@type"/>
        <xsl:text>]</xsl:text>
    </xsl:template>
    
    <xsl:template match="revision-history" mode="rich">
        <xsl:variable name="cur" select="revision[@status='current'][last()]"/>
        <xsl:choose>
            <xsl:when test="$cur/content"><xsl:apply-templates select="$cur/content/node()" mode="rich"/></xsl:when>
            <xsl:otherwise><xsl:apply-templates select="original/node()" mode="rich"/></xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- FRONT MATTER PROCESSING -->
    <xsl:template match="front-matter" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <xsl:if test="preface">
            <fn:map key="preface">
                <fn:string key="id"><xsl:value-of select="preface/@xml:id"/></fn:string>
                <fn:string key="type">preface</fn:string>
                <fn:array key="content">
                    <xsl:apply-templates select="preface/paragraph[position() &lt;= 4] | preface/title[position() &lt;= 3]" mode="front-matter"/>
                </fn:array>
                <fn:number key="total_paragraphs"><xsl:value-of select="count(preface/paragraph)"/></fn:number>
                <fn:number key="total_headings"><xsl:value-of select="count(preface/title)"/></fn:number>
            </fn:map>
        </xsl:if>
        <xsl:if test="introduction">
            <fn:map key="introduction">
                <fn:string key="id"><xsl:value-of select="introduction/@xml:id"/></fn:string>
                <fn:string key="type">introduction</fn:string>
                <xsl:if test="introduction/title[1]">
                    <fn:string key="title"><xsl:apply-templates select="introduction/title[1]" mode="text"/></fn:string>
                </xsl:if>
                <fn:array key="content">
                    <xsl:apply-templates select="introduction/paragraph[position() &lt;= 3] | introduction/title[position() &gt; 1 and position() &lt;= 3]" mode="front-matter"/>
                </fn:array>
                <fn:number key="total_paragraphs"><xsl:value-of select="count(introduction/paragraph)"/></fn:number>
            </fn:map>
        </xsl:if>
        <xsl:if test="committees">
            <fn:map key="committees">
                <fn:string key="id"><xsl:value-of select="committees/@xml:id"/></fn:string>
                <fn:string key="type">committees</fn:string>
                <xsl:if test="committees/title[1]">
                    <fn:string key="title"><xsl:apply-templates select="committees/title[1]" mode="text"/></fn:string>
                </xsl:if>
                <fn:array key="tables">
                    <xsl:apply-templates select="committees/table[position() &lt;= 2]" mode="json"/>
                </fn:array>
                <fn:number key="total_tables"><xsl:value-of select="count(committees/table)"/></fn:number>
            </fn:map>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="paragraph" mode="front-matter">
        <fn:map>
            <fn:string key="type">paragraph</fn:string>
            <xsl:if test="@xml:id"><fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string></xsl:if>
            <fn:string key="content"><xsl:apply-templates select="." mode="rich"/></fn:string>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="title" mode="front-matter">
        <fn:map>
            <fn:string key="type">heading</fn:string>
            <xsl:if test="@xml:id"><fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string></xsl:if>
            <fn:string key="content"><xsl:apply-templates select="." mode="text"/></fn:string>
            <xsl:choose>
                <xsl:when test="contains(@xml:id, '.sub')"><fn:number key="level">3</fn:number></xsl:when>
                <xsl:when test="contains(@xml:id, '.div')"><fn:number key="level">2</fn:number></xsl:when>
                <xsl:otherwise><fn:number key="level">1</fn:number></xsl:otherwise>
            </xsl:choose>
        </fn:map>
    </xsl:template>
    
    <!-- EQUATION PROCESSING -->
    <xsl:template match="equation" mode="equation-json">
        <xsl:variable name="equation-id" as="xs:string"
                      select="
                        if (@xml:id) then string(@xml:id)
                        else if (@image) then string(@image)
                        else if (@html-src) then replace(tokenize(string(@html-src), '/')[last()], '\.html$', '')
                        else if (@image-src) then replace(tokenize(string(@image-src), '/')[last()], '\.eps$', '')
                        else ''"/>
        <fn:map>
            <fn:string key="id"><xsl:value-of select="$equation-id"/></fn:string>
            <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
            <fn:string key="latex"><xsl:apply-templates select="*[local-name()='math']" mode="latex"/></fn:string>
            <fn:string key="plainText"><xsl:apply-templates select="*[local-name()='math']" mode="plain"/></fn:string>
            <xsl:if test="@image"><fn:string key="image"><xsl:value-of select="@image"/></fn:string></xsl:if>
            <xsl:if test="@html-src or @image-src"><fn:string key="htmlSrc"><xsl:value-of select="if (@html-src) then @html-src else @image-src"/></fn:string></xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- MathML to LaTeX (simplified) - handle both namespaced and non-namespaced -->
    <xsl:template match="*[namespace-uri()='http://www.w3.org/1998/Math/MathML'] | math | *[local-name()='math']" mode="latex">
        <xsl:apply-templates select="*" mode="latex"/>
    </xsl:template>
    <xsl:template match="*:mn | mn | *[local-name()='mn'] | *:mi | mi | *[local-name()='mi']" mode="latex"><xsl:value-of select="."/></xsl:template>
    <xsl:template match="*:mo | mo | *[local-name()='mo']" mode="latex"><xsl:value-of select="."/></xsl:template>
    <xsl:template match="*:mfrac | mfrac | *[local-name()='mfrac']" mode="latex">\frac{<xsl:apply-templates select="*[1]" mode="latex"/>}{<xsl:apply-templates select="*[2]" mode="latex"/>}</xsl:template>
    <xsl:template match="*:msqrt | msqrt | *[local-name()='msqrt']" mode="latex">\sqrt{<xsl:apply-templates select="*" mode="latex"/>}</xsl:template>
    <xsl:template match="*:msup | msup | *[local-name()='msup']" mode="latex"><xsl:apply-templates select="*[1]" mode="latex"/>^{<xsl:apply-templates select="*[2]" mode="latex"/>}</xsl:template>
    <xsl:template match="*:msub | msub | *[local-name()='msub']" mode="latex"><xsl:apply-templates select="*[1]" mode="latex"/>_{<xsl:apply-templates select="*[2]" mode="latex"/>}</xsl:template>
    <xsl:template match="*:mrow | mrow | *[local-name()='mrow']" mode="latex"><xsl:apply-templates select="*" mode="latex"/></xsl:template>
    
    <!-- MathML to plain text (simplified) - handle both namespaced and non-namespaced -->
    <xsl:template match="*[namespace-uri()='http://www.w3.org/1998/Math/MathML'] | math | *[local-name()='math']" mode="plain">
        <xsl:apply-templates select="*" mode="plain"/>
    </xsl:template>
    <xsl:template match="*:mn | mn | *[local-name()='mn'] | *:mi | mi | *[local-name()='mi'] | *:mo | mo | *[local-name()='mo']" mode="plain"><xsl:value-of select="."/></xsl:template>
    <xsl:template match="*:mfrac | mfrac | *[local-name()='mfrac']" mode="plain">(<xsl:apply-templates select="*[1]" mode="plain"/>)/(<xsl:apply-templates select="*[2]" mode="plain"/>)</xsl:template>
    <xsl:template match="*:msqrt | msqrt | *[local-name()='msqrt']" mode="plain">√(<xsl:apply-templates select="*" mode="plain"/>)</xsl:template>
    <xsl:template match="*:msup | msup | *[local-name()='msup']" mode="plain"><xsl:apply-templates select="*[1]" mode="plain"/>^<xsl:apply-templates select="*[2]" mode="plain"/></xsl:template>
    <xsl:template match="*:msub | msub | *[local-name()='msub']" mode="plain"><xsl:apply-templates select="*[1]" mode="plain"/>_<xsl:apply-templates select="*[2]" mode="plain"/></xsl:template>
    <xsl:template match="*:mrow | mrow | *[local-name()='mrow']" mode="plain"><xsl:apply-templates select="*" mode="plain"/></xsl:template>

    <!-- NAMED TEMPLATES -->
    <xsl:template name="build-refs">
        <fn:array key="internal">
            <xsl:for-each select="(.//ref[@type='internal'])[position() &lt;= 5]">
                <fn:map>
                    <fn:string key="source"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                    <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                </fn:map>
            </xsl:for-each>
        </fn:array>
        <fn:array key="terms">
            <xsl:for-each select="(.//ref[@type='term'])[position() &lt;= 5]">
                <fn:map>
                    <fn:string key="term"><xsl:value-of select="@target"/></fn:string>
                    <fn:string key="text"><xsl:value-of select="."/></fn:string>
                </fn:map>
            </xsl:for-each>
        </fn:array>
        <fn:array key="standards">
            <xsl:for-each select="(.//ref[@type='standard'])[position() &lt;= 5]">
                <fn:map>
                    <fn:string key="standard"><xsl:value-of select="@target"/></fn:string>
                    <fn:string key="text"><xsl:value-of select="."/></fn:string>
                </fn:map>
            </xsl:for-each>
        </fn:array>
    </xsl:template>

    <xsl:template name="build-amendments">
        <xsl:for-each select="(.//revision-history)[position() &lt;= 5]">
            <fn:map>
                <fn:string key="location"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                <fn:string key="original_date"><xsl:value-of select="original/@effective-date"/></fn:string>
                <xsl:if test="revision">
                    <fn:array key="revisions">
                        <xsl:for-each select="revision[position() &lt;= 2]">
                            <fn:map>
                                <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                                <fn:string key="id"><xsl:value-of select="@id"/></fn:string>
                                <fn:string key="date"><xsl:value-of select="@effective-date"/></fn:string>
                                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                                <xsl:if test="change-summary"><fn:string key="summary"><xsl:value-of select="change-summary"/></fn:string></xsl:if>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>

    <xsl:template name="build-glossary">
        <xsl:for-each select="(.//list[@type='definition']/item[@xml:id])[position() &lt;= 10]">
            <fn:map key="{@xml:id}">
                <fn:string key="term"><xsl:apply-templates select="term" mode="text"/></fn:string>
                <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich"/></fn:string>
            </fn:map>
        </xsl:for-each>
    </xsl:template>

    <xsl:template name="build-revisions">
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
        </fn:map>
        <xsl:for-each select="revision-history/revision[position() &lt;= 2]">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="id"><xsl:value-of select="@id"/></fn:string>
                <fn:string key="date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                <xsl:if test="change-summary"><fn:string key="summary"><xsl:value-of select="change-summary"/></fn:string></xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>

    <xsl:template name="doc-schema">
        <fn:map key="hierarchy">
            <fn:string key="description">BC Building Code follows strict hierarchy: volume > division > part > section > subsection > article > sentence > clause > subclause</fn:string>
            <fn:array key="levels">
                <fn:map><fn:number key="level">1</fn:number><fn:string key="name">volume</fn:string><fn:string key="example">nbc.2020.vol1, nbc.2020.vol2</fn:string></fn:map>
                <fn:map><fn:number key="level">2</fn:number><fn:string key="name">division</fn:string><fn:string key="example">nbc.divA, nbc.divB</fn:string></fn:map>
                <fn:map><fn:number key="level">3</fn:number><fn:string key="name">part</fn:string><fn:string key="example">nbc.divB.part3</fn:string></fn:map>
                <fn:map><fn:number key="level">4</fn:number><fn:string key="name">section</fn:string><fn:string key="example">nbc.divB.part3.sect8</fn:string></fn:map>
                <fn:map><fn:number key="level">5</fn:number><fn:string key="name">subsection</fn:string><fn:string key="example">nbc.divB.part3.sect8.subsect2</fn:string></fn:map>
                <fn:map><fn:number key="level">6</fn:number><fn:string key="name">article</fn:string><fn:string key="example">nbc.divB.part3.sect8.subsect2.art6</fn:string></fn:map>
                <fn:map><fn:number key="level">7</fn:number><fn:string key="name">sentence</fn:string><fn:string key="example">nbc.divB.part3.sect8.subsect2.art6.sent1</fn:string></fn:map>
                <fn:map><fn:number key="level">8</fn:number><fn:string key="name">clause</fn:string><fn:string key="example">nbc.divB.part3.sect8.subsect2.art6.sent1.clause1</fn:string></fn:map>
                <fn:map><fn:number key="level">9</fn:number><fn:string key="name">subclause</fn:string><fn:string key="example">nbc.divB.part3.sect8.subsect2.art6.sent1.clause1.subclause1</fn:string></fn:map>
            </fn:array>
        </fn:map>
        <fn:map key="volume_structure">
            <fn:string key="description">NBC 2020 is published in 2 physical volumes with volume-specific index and conversions</fn:string>
            <fn:map key="volume_1">
                <fn:string key="id">nbc.2020.vol1</fn:string>
                <fn:array key="divisions"><fn:string>Division A</fn:string><fn:string>Division B (Parts 1-8)</fn:string><fn:string>Division C</fn:string></fn:array>
                <fn:string key="index">nbc.2020.vol1.index</fn:string>
                <fn:string key="conversions">nbc.2020.vol1.conversions</fn:string>
            </fn:map>
            <fn:map key="volume_2">
                <fn:string key="id">nbc.2020.vol2</fn:string>
                <fn:array key="divisions"><fn:string>Division B Part 9 (Housing and Small Buildings)</fn:string></fn:array>
                <fn:string key="index">nbc.2020.vol2.index</fn:string>
                <fn:string key="conversions">nbc.2020.vol2.conversions</fn:string>
            </fn:map>
        </fn:map>
        <fn:map key="content_types">
            <fn:array key="structural"><fn:string>volume</fn:string><fn:string>division</fn:string><fn:string>part</fn:string><fn:string>section</fn:string><fn:string>subsection</fn:string><fn:string>article</fn:string><fn:string>sentence</fn:string><fn:string>clause</fn:string><fn:string>subclause</fn:string></fn:array>
            <fn:array key="content"><fn:string>table</fn:string><fn:string>figure</fn:string><fn:string>spectables</fn:string><fn:string>application_note</fn:string><fn:string>note_division</fn:string></fn:array>
            <fn:array key="back_matter"><fn:string>index</fn:string><fn:string>conversions</fn:string></fn:array>
            <fn:array key="semantic"><fn:string>objective</fn:string><fn:string>functional_statement</fn:string><fn:string>definition</fn:string></fn:array>
            <fn:array key="references"><fn:string>internal</fn:string><fn:string>term</fn:string><fn:string>standard</fn:string><fn:string>external</fn:string></fn:array>
        </fn:map>
        <fn:map key="bc_specific">
            <fn:string key="description">BC-specific content uses bc. prefix instead of nbc.</fn:string>
            <fn:string key="example">bc.divB.part10.sect1.subsect1.art1</fn:string>
            <fn:array key="amendment_types"><fn:string>replace</fn:string><fn:string>insert</fn:string><fn:string>modify</fn:string><fn:string>remove</fn:string></fn:array>
        </fn:map>
        <fn:map key="revision_history">
            <fn:string key="description">Tracks changes over time with effective dates</fn:string>
            <fn:array key="types"><fn:string>amendment</fn:string><fn:string>errata</fn:string><fn:string>policy</fn:string><fn:string>accessibility</fn:string><fn:string>correction</fn:string></fn:array>
            <fn:array key="status"><fn:string>current</fn:string><fn:string>superseded</fn:string></fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- GENERIC LIST EXTRACTION                                            -->
    <!-- Extracts all list types as a unified "lists" array                 -->
    <!-- ================================================================== -->
    
    <xsl:template name="extract-lists">
        <xsl:param name="content-root"/>
        <xsl:if test="$content-root//list">
            <fn:array key="lists">
                <xsl:for-each select="$content-root//list">
                    <fn:map>
                        <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                        <fn:array key="items">
                            <xsl:for-each select="item">
                                <fn:map>
                                    <xsl:if test="@xml:id">
                                        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                    </xsl:if>
                                    <xsl:choose>
                                        <xsl:when test="parent::list/@type = 'variable'">
                                            <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich"/></fn:string>
                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich"/></fn:string>
                                        </xsl:when>
                                        <xsl:when test="parent::list/@type = 'symbol'">
                                            <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich"/></fn:string>
                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich"/></fn:string>
                                        </xsl:when>
                                        <xsl:when test="parent::list/@type = 'definition'">
                                            <fn:string key="term"><xsl:apply-templates select="term" mode="text"/></fn:string>
                                            <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich"/></fn:string>
                                        </xsl:when>
                                        <xsl:when test="parent::list/@type = 'organization'">
                                            <fn:string key="abbreviation"><xsl:apply-templates select="organization" mode="text"/></fn:string>
                                            <xsl:variable name="name-text">
                                                <xsl:for-each select="address/text()[following-sibling::ref[@type='external']]">
                                                    <xsl:value-of select="."/>
                                                </xsl:for-each>
                                            </xsl:variable>
                                            <xsl:variable name="trimmed-name" select="normalize-space(replace($name-text, '\s*\($', ''))"/>
                                            <fn:string key="fullName"><xsl:value-of select="$trimmed-name"/></fn:string>
                                            <xsl:if test="address//ref[@type='external']">
                                                <fn:string key="website"><xsl:value-of select="address//ref[@type='external']/@target"/></fn:string>
                                            </xsl:if>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <fn:string key="content"><xsl:apply-templates select="." mode="rich"/></fn:string>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </fn:map>
                            </xsl:for-each>
                        </fn:array>
                    </fn:map>
                </xsl:for-each>
            </fn:array>
        </xsl:if>
    </xsl:template>
</xsl:stylesheet>
