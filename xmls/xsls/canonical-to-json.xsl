<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:fn="http://www.w3.org/2005/xpath-functions"
                exclude-result-prefixes="xs fn">
    
    <!-- ================================================================== -->
    <!-- CANONICAL NBC TO JSON TRANSFORM                                    -->
    <!-- Converts merged canonical NBC+BC to structured JSON for AI systems -->
    <!-- ================================================================== -->
    
    <xsl:output method="text" encoding="UTF-8"/>
    
    <!-- Parameters -->
    <!-- include-metadata: Include document metadata and publication info (default: true) -->
    <!-- include-cross-references: Generate cross-reference index for navigation/analysis (default: false) -->
    <!--   Enable for: interactive web apps, reference analysis, standards indexing -->
    <!--   Disable for: smaller file size, AI/LLM systems that don't need the index -->
    <!-- include-bc-annotations: Include BC amendments and revision history (default: true) -->
    <!-- flatten-hierarchy: Flatten hierarchical structure - experimental (default: false) -->
    <xsl:param name="include-metadata" select="true()"/>
    <xsl:param name="include-cross-references" select="false()"/>
    <xsl:param name="include-bc-annotations" select="true()"/>
    <xsl:param name="flatten-hierarchy" select="false()"/>
    
    <!-- Root template -->
    <xsl:template match="/nbc">
        <xsl:variable name="json-structure">
            <fn:map>
                <fn:string key="document_type">bc_building_code</fn:string>
                <fn:string key="version"><xsl:value-of select="@version"/></fn:string>
                <fn:string key="canonical_version"><xsl:value-of select="@canonical-version"/></fn:string>
                <fn:string key="generated_timestamp"><xsl:value-of select="current-dateTime()"/></fn:string>
                
                <xsl:if test="$include-metadata">
                    <fn:map key="metadata">
                        <xsl:apply-templates select="metadata" mode="json"/>
                    </fn:map>
                </xsl:if>
                
                <!-- Volumes structure (replaces divisions array) -->
                <!-- Front matter is included in Volume 1 -->
                <fn:array key="volumes">
                    <xsl:apply-templates select="volume" mode="json"/>
                </fn:array>
                
                <xsl:if test="$include-cross-references">
                    <fn:map key="cross_references">
                        <xsl:call-template name="build-reference-index"/>
                    </fn:map>
                </xsl:if>
                
                <xsl:if test="$include-bc-annotations">
                    <fn:array key="bc_amendments">
                        <xsl:call-template name="extract-bc-amendments"/>
                    </fn:array>
                </xsl:if>
                
                <!-- Glossary/definitions -->
                <fn:map key="glossary">
                    <xsl:call-template name="build-glossary"/>
                </fn:map>
                
                <!-- Standards reference mapping -->
                <fn:map key="standards">
                    <xsl:call-template name="build-standards-reference"/>
                </fn:map>
                
                <!-- Statistics -->
                <fn:map key="statistics">
                    <fn:number key="total_volumes"><xsl:value-of select="count(volume)"/></fn:number>
                    <fn:number key="total_divisions"><xsl:value-of select="count(.//division)"/></fn:number>
                    <fn:number key="total_parts"><xsl:value-of select="count(.//part)"/></fn:number>
                    <fn:number key="total_sections"><xsl:value-of select="count(.//section)"/></fn:number>
                    <fn:number key="total_articles"><xsl:value-of select="count(.//article)"/></fn:number>
                    <fn:number key="total_sentences"><xsl:value-of select="count(.//sentence)"/></fn:number>
                    <fn:number key="total_tables"><xsl:value-of select="count(.//table)"/></fn:number>
                    <fn:number key="total_figures"><xsl:value-of select="count(.//figure)"/></fn:number>
                    <fn:number key="total_spectables"><xsl:value-of select="count(.//spectables)"/></fn:number>
                    <fn:number key="total_application_notes"><xsl:value-of select="count(.//application-note)"/></fn:number>
                    
                    <!-- Volume-specific index statistics -->
                    <fn:number key="total_index_entries_vol1"><xsl:value-of select="count(volume[@number='1']//index-term-group)"/></fn:number>
                    <fn:number key="total_index_entries_vol2"><xsl:value-of select="count(volume[@number='2']//index-term-group)"/></fn:number>
                    <fn:number key="total_index_references_vol1"><xsl:value-of select="count(volume[@number='1']//index-ref)"/></fn:number>
                    <fn:number key="total_index_references_vol2"><xsl:value-of select="count(volume[@number='2']//index-ref)"/></fn:number>
                    
                    <!-- Aggregate totals for backward compatibility -->
                    <fn:number key="total_index_entries"><xsl:value-of select="count(.//index-term-group)"/></fn:number>
                    <fn:number key="total_index_references"><xsl:value-of select="count(.//index-ref)"/></fn:number>
                </fn:map>
            </fn:map>
        </xsl:variable>
        
        <xsl:value-of select="fn:xml-to-json($json-structure, map{'indent': true()})"/>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- METADATA PROCESSING                                                -->
    <!-- ================================================================== -->
    
    <xsl:template match="metadata" mode="json">
        <fn:string key="title"><xsl:value-of select="publication-info[1]/title"/></fn:string>
        <fn:string key="subtitle"><xsl:value-of select="publication-info[1]/subtitle"/></fn:string>
        <fn:string key="authority"><xsl:value-of select="publication-info[1]/authority"/></fn:string>
        <fn:string key="publication_date"><xsl:value-of select="publication-info[1]/publication-date"/></fn:string>
        <fn:string key="nrc_number"><xsl:value-of select="catalog-info/nrc-number"/></fn:string>
        <fn:string key="isbn"><xsl:value-of select="catalog-info/isbn"/></fn:string>
        <xsl:if test="count(publication-info) > 1">
            <fn:array key="volumes">
                <xsl:for-each select="publication-info">
                    <fn:map>
                        <fn:string key="volume"><xsl:value-of select="@volume"/></fn:string>
                        <fn:string key="title"><xsl:value-of select="title"/></fn:string>
                        <fn:string key="subtitle"><xsl:value-of select="subtitle"/></fn:string>
                    </fn:map>
                </xsl:for-each>
            </fn:array>
        </xsl:if>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- FRONT MATTER PROCESSING                                            -->
    <!-- ================================================================== -->
    
    <xsl:template match="front-matter" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        
        <!-- Preface -->
        <xsl:if test="preface">
            <fn:map key="preface">
                <xsl:apply-templates select="preface" mode="json"/>
            </fn:map>
        </xsl:if>
        
        <!-- Introduction -->
        <xsl:if test="introduction">
            <fn:map key="introduction">
                <xsl:apply-templates select="introduction" mode="json"/>
            </fn:map>
        </xsl:if>
        
        <!-- Committees -->
        <xsl:if test="committees">
            <fn:map key="committees">
                <xsl:apply-templates select="committees" mode="json"/>
            </fn:map>
        </xsl:if>
    </xsl:template>
    
    <!-- Preface processing -->
    <xsl:template match="preface" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">preface</fn:string>
        
        <!-- Process all content in order -->
        <fn:array key="content">
            <xsl:apply-templates select="paragraph | title | table | figure | list" mode="front-matter-content"/>
        </fn:array>
    </xsl:template>
    
    <!-- Introduction processing -->
    <xsl:template match="introduction" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">introduction</fn:string>
        <xsl:if test="title">
            <fn:string key="title"><xsl:apply-templates select="title[1]" mode="text-only"/></fn:string>
        </xsl:if>
        
        <!-- Process all content in order -->
        <fn:array key="content">
            <xsl:apply-templates select="paragraph | title[position() > 1] | table | figure | list" mode="front-matter-content"/>
        </fn:array>
    </xsl:template>
    
    <!-- Committees processing -->
    <xsl:template match="committees" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">committees</fn:string>
        <xsl:if test="title">
            <fn:string key="title"><xsl:apply-templates select="title[1]" mode="text-only"/></fn:string>
        </xsl:if>
        
        <!-- Tables (committee member lists) -->
        <xsl:if test="table">
            <fn:array key="tables">
                <xsl:apply-templates select="table" mode="json"/>
            </fn:array>
        </xsl:if>
        
        <!-- Paragraphs (notes about committee members) -->
        <xsl:if test="paragraph">
            <fn:array key="notes">
                <xsl:for-each select="paragraph">
                    <fn:map>
                        <xsl:if test="@xml:id">
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                        </xsl:if>
                        <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                    </fn:map>
                </xsl:for-each>
            </fn:array>
        </xsl:if>
    </xsl:template>
    
    <!-- Front matter content items -->
    <xsl:template match="paragraph" mode="front-matter-content">
        <fn:map>
            <fn:string key="type">paragraph</fn:string>
            <xsl:if test="@xml:id">
                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    <fn:string key="content"><xsl:apply-templates select="$content-node/node()" mode="rich-text-json"/></fn:string>
                    
                    <!-- Inline revisions array -->
                    <fn:array key="revisions">
                        <!-- Original baseline -->
                        <fn:map>
                            <fn:string key="type">original</fn:string>
                            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
                            <fn:string key="content"><xsl:apply-templates select="revision-history/original/node()" mode="rich-text-json"/></fn:string>
                        </fn:map>
                        <!-- Each revision snapshot -->
                        <xsl:for-each select="revision-history/revision">
                            <fn:map>
                                <fn:string key="type">revision</fn:string>
                                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                                <xsl:choose>
                                    <xsl:when test="@seq and @seq != ''">
                                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <fn:null key="sequence"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                                <fn:string key="content"><xsl:apply-templates select="content/node()" mode="rich-text-json"/></fn:string>
                                <xsl:if test="change-summary">
                                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                                </xsl:if>
                                <xsl:if test="note">
                                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                                </xsl:if>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                    
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
                </xsl:otherwise>
            </xsl:choose>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="title" mode="front-matter-content">
        <fn:map>
            <fn:string key="type">heading</fn:string>
            <xsl:if test="@xml:id">
                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            </xsl:if>
            <fn:string key="content"><xsl:apply-templates select="." mode="text-only"/></fn:string>
            <!-- Determine heading level based on ID structure -->
            <xsl:choose>
                <xsl:when test="contains(@xml:id, '.sub')">
                    <fn:number key="level">3</fn:number>
                </xsl:when>
                <xsl:when test="contains(@xml:id, '.div')">
                    <fn:number key="level">2</fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:number key="level">1</fn:number>
                </xsl:otherwise>
            </xsl:choose>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="table" mode="front-matter-content">
        <fn:map>
            <fn:string key="type">table</fn:string>
            <xsl:if test="@xml:id">
                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            </xsl:if>
            <xsl:if test="title">
                <fn:string key="title"><xsl:apply-templates select="title" mode="rich-text-json"/></fn:string>
            </xsl:if>
            
            <!-- Subtitle (notes from title) - Option A -->
            <xsl:if test="subtitle">
                <fn:array key="subtitle">
                    <xsl:for-each select="subtitle/note">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <xsl:if test="@vendor-id">
                                <fn:string key="vendor_id"><xsl:value-of select="@vendor-id"/></fn:string>
                            </xsl:if>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>

            <!-- Forming part references - Option A -->
            <xsl:if test="forming-part">
                <fn:array key="forming_part">
                    <xsl:for-each select="forming-part/ref">
                        <fn:map>
                            <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                            <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                            <xsl:if test="@display-type">
                                <fn:string key="display_type"><xsl:value-of select="@display-type"/></fn:string>
                            </xsl:if>
                            <xsl:if test="text()">
                                <fn:string key="text"><xsl:value-of select="text()"/></fn:string>
                            </xsl:if>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            
            <xsl:if test="table-notes/note or subtitle/note or title/note or tgroup//note">
                <fn:array key="table_notes">
                    <xsl:for-each-group select="table-notes/note | subtitle/note | title/note | tgroup//note" group-by="@xml:id">
                        <xsl:sort select="current-grouping-key()"/>
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="current-grouping-key()"/></fn:string>
                            <xsl:if test="current-group()[1]/@vendor-id">
                                <fn:string key="vendor_id"><xsl:value-of select="current-group()[1]/@vendor-id"/></fn:string>
                            </xsl:if>
                            <xsl:call-template name="render-note-content">
                                <xsl:with-param name="note" select="current-group()[1]"/>
                            </xsl:call-template>
                        </fn:map>
                    </xsl:for-each-group>
                </fn:array>
            </xsl:if>
            <fn:map key="structure">
                <xsl:choose>
                    <xsl:when test="tgroup/@cols and tgroup/@cols != ''">
                        <fn:number key="columns"><xsl:value-of select="tgroup/@cols"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="columns"/>
                    </xsl:otherwise>
                </xsl:choose>

                <xsl:if test="tgroup/@colsep">
                    <fn:string key="colsep"><xsl:value-of select="tgroup/@colsep"/></fn:string>
                </xsl:if>
                <xsl:if test="tgroup/@rowsep">
                    <fn:string key="rowsep"><xsl:value-of select="tgroup/@rowsep"/></fn:string>
                </xsl:if>

                <xsl:if test="tgroup/colspec">
                    <fn:array key="column_specs">
                        <xsl:for-each select="tgroup/colspec">
                            <fn:map>
                                <fn:string key="name"><xsl:value-of select="@colname"/></fn:string>
                                <fn:string key="width"><xsl:value-of select="@colwidth"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                
                <xsl:if test="tgroup/thead">
                    <fn:array key="header_rows">
                        <xsl:apply-templates select="tgroup/thead/row" mode="json"/>
                    </fn:array>
                </xsl:if>
                
                <fn:array key="body_rows">
                    <xsl:apply-templates select="tgroup/tbody/row" mode="json"/>
                </fn:array>
            </fn:map>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="figure" mode="front-matter-content">
        <fn:map>
            <fn:string key="type">figure</fn:string>
            <xsl:if test="@xml:id">
                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            </xsl:if>
            <xsl:if test="@hideLabel = 'true'">
                <fn:boolean key="hide_label">true</fn:boolean>
            </xsl:if>
            <xsl:if test="title">
                <fn:string key="title"><xsl:apply-templates select="title" mode="rich-text-json"/></fn:string>
            </xsl:if>
            <fn:map key="graphic">
                <fn:string key="src"><xsl:value-of select="graphic/@src"/></fn:string>
                <fn:string key="alt_text"><xsl:value-of select="graphic/@alt"/></fn:string>
            </fn:map>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="list" mode="front-matter-content">
        <fn:map>
            <fn:string key="type">list</fn:string>
            <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
            <fn:array key="items">
                <xsl:for-each select="item">
                    <fn:string><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                </xsl:for-each>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- STRUCTURAL HIERARCHY PROCESSING                                    -->
    <!-- ================================================================== -->
    
    <!-- Volume template -->
    <xsl:template match="volume" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">volume</fn:string>
            <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
            
            <!-- Volume title from metadata -->
            <xsl:variable name="vol-num" select="@number"/>
            <xsl:variable name="vol-title" select="ancestor::nbc/metadata/publication-info[@volume=$vol-num]/title"/>
            <xsl:if test="$vol-title">
                <fn:string key="title"><xsl:value-of select="$vol-title"/></fn:string>
            </xsl:if>
            
            <!-- Front matter (child of volume element) -->
            <xsl:if test="front-matter">
                <fn:map key="front_matter">
                    <xsl:apply-templates select="front-matter" mode="json"/>
                </fn:map>
            </xsl:if>
            
            <!-- Divisions within this volume -->
            <fn:array key="divisions">
                <xsl:apply-templates select="division" mode="json"/>
            </fn:array>
            
            <!-- Volume-specific index -->
            <xsl:if test="index">
                <fn:map key="index">
                    <xsl:apply-templates select="index" mode="json"/>
                </fn:map>
            </xsl:if>
            
            <!-- Volume-specific conversions -->
            <xsl:if test="conversions">
                <fn:map key="conversions">
                    <xsl:apply-templates select="conversions" mode="json"/>
                </fn:map>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="division" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">division</fn:string>
            <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            
            <!-- Volume field removed - now part of parent volume -->
            
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            <fn:string key="number"><xsl:value-of select="number"/></fn:string>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <fn:array key="parts">
                <xsl:apply-templates select="part" mode="json"/>
            </fn:array>
            
            <xsl:if test="appendix">
                <fn:array key="appendices">
                    <xsl:apply-templates select="appendix" mode="json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="part" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">part</fn:string>
            <xsl:choose>
                <xsl:when test="@number and @number != ''">
                    <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="number"/>
                </xsl:otherwise>
            </xsl:choose>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <xsl:if test="see-also">
                <fn:string key="see_also"><xsl:apply-templates select="see-also" mode="rich-text-json"/></fn:string>
            </xsl:if>
            
            <fn:array key="sections">
                <xsl:apply-templates select="section" mode="json"/>
            </fn:array>
            
            <!-- Special tables (Fire/Sound Resistance, Span Tables, etc.) -->
            <xsl:if test="spectables">
                <fn:array key="special_tables">
                    <xsl:apply-templates select="spectables" mode="json"/>
                </fn:array>
            </xsl:if>
            
            <!-- Part appendix (application notes) -->
            <xsl:if test="part-appendix">
                <fn:map key="appendix">
                    <xsl:apply-templates select="part-appendix" mode="json"/>
                </fn:map>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="section" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">section</fn:string>
            <xsl:choose>
                <xsl:when test="@number and @number != ''">
                    <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="number"/>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            
            <fn:array key="subsections">
                <xsl:apply-templates select="subsection" mode="json"/>
            </fn:array>
            
            <!-- Section appendix (application notes) - some sections have their own appendix -->
            <xsl:if test="part-appendix">
                <fn:map key="appendix">
                    <xsl:apply-templates select="part-appendix" mode="json"/>
                </fn:map>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="subsection" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">subsection</fn:string>
            <xsl:choose>
                <xsl:when test="@number and @number != ''">
                    <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="number"/>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <!-- Extract title and articles from revision-history if present, otherwise from direct children -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    
                    <fn:string key="title"><xsl:apply-templates select="$content-node/title" mode="text-only"/></fn:string>
                    
                    <xsl:if test="$content-node/see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="$content-node/see-also" mode="rich-text-json"/></fn:string>
                    </xsl:if>
                    
                    <fn:array key="articles">
                        <xsl:apply-templates select="$content-node/article" mode="json"/>
                    </fn:array>
                </xsl:when>
                <xsl:when test="title[@revised='yes' and revision-history]">
                    <!-- Title has revision history (child-element amendment) - output as object -->
                    <xsl:variable name="current-revision" select="title/revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="title-content" select="if ($current-revision/content) then $current-revision/content else title/revision-history/original"/>
                    
                    <fn:map key="title">
                        <fn:boolean key="revised">true</fn:boolean>
                        <fn:string key="text"><xsl:value-of select="normalize-space($title-content)"/></fn:string>
                        <fn:array key="revisions">
                            <xsl:call-template name="build-title-revisions"/>
                        </fn:array>
                    </fn:map>
                    
                    <xsl:if test="see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="see-also" mode="rich-text-json"/></fn:string>
                    </xsl:if>
                    
                    <fn:array key="articles">
                        <xsl:apply-templates select="article" mode="json"/>
                    </fn:array>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
                    
                    <xsl:if test="see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="see-also" mode="rich-text-json"/></fn:string>
                    </xsl:if>
                    
                    <fn:array key="articles">
                        <xsl:apply-templates select="article" mode="json"/>
                    </fn:array>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present on subsection itself -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-subsection-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="article" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">article</fn:string>
            <xsl:choose>
                <xsl:when test="@number and @number != ''">
                    <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="number"/>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <!-- Extract title, see-also, and content from revision-history if present, otherwise from direct children -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <!-- For title: prefer current revision's title if it exists, else original -->
                    <xsl:variable name="title-node" select="if ($current-revision/content/title) then $current-revision/content else revision-history/original"/>
                    <!-- For content: prefer current revision if it has sentences/tables/figures, else original -->
                    <xsl:variable name="content-node" select="if ($current-revision/content/(sentence|table|figure)) then $current-revision/content else revision-history/original"/>
                    
                    <fn:string key="title"><xsl:apply-templates select="$title-node/title" mode="text-only"/></fn:string>
                    
                    <xsl:if test="$content-node/see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="$content-node/see-also" mode="rich-text-json"/></fn:string>
                    </xsl:if>
                    
                    <fn:array key="content">
                        <xsl:apply-templates select="$content-node/sentence | $content-node/table | $content-node/figure" mode="json"/>
                    </fn:array>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
                    
                    <xsl:if test="see-also">
                        <fn:string key="see_also"><xsl:apply-templates select="see-also" mode="rich-text-json"/></fn:string>
                    </xsl:if>
                    
                    <!-- Article-level note (e.g. "See Note A-9.36.5.3.") -->
                    <xsl:if test="note">
                        <fn:string key="note"><xsl:apply-templates select="note/text" mode="rich-text-json"/></fn:string>
                    </xsl:if>
                    
                    <fn:array key="content">
                        <xsl:apply-templates select="sentence | table | figure" mode="json"/>
                    </fn:array>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-article-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="appendix" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">appendix</fn:string>
            <xsl:if test="@letter">
                <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            </xsl:if>
            <xsl:if test="@number">
                <fn:string key="number"><xsl:value-of select="@number"/></fn:string>
            </xsl:if>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            <xsl:if test="introduction">
                <fn:string key="introduction"><xsl:apply-templates select="introduction" mode="rich-text-json"/></fn:string>
            </xsl:if>
            <fn:array key="sections">
                <xsl:for-each select="appendix-section | note-division | paragraph | list | table | figure">
                    <xsl:choose>
                        <xsl:when test="self::appendix-section">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::note-division">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::paragraph">
                            <fn:map>
                                <fn:string key="type">paragraph</fn:string>
                                <xsl:if test="@xml:id">
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                </xsl:if>
                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                
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
                        </xsl:when>
                        <xsl:when test="self::list">
                            <fn:map>
                                <fn:string key="type">list</fn:string>
                                <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
                                <fn:array key="items">
                                    <xsl:for-each select="item">
                                        <fn:map>
                                            <xsl:if test="@xml:id">
                                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                            </xsl:if>
                                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                        </fn:map>
                                    </xsl:for-each>
                                </fn:array>
                            </fn:map>
                        </xsl:when>
                        <xsl:when test="self::table">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::figure">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                    </xsl:choose>
                </xsl:for-each>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="appendix-section" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">appendix_section</fn:string>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            <xsl:if test="paragraph">
                <fn:array key="paragraphs">
                    <xsl:for-each select="paragraph">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                            
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
            <fn:array key="subsections">
                <xsl:apply-templates select="appendix-subsection" mode="json"/>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="appendix-subsection" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">appendix_subsection</fn:string>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            <xsl:if test="paragraph">
                <fn:array key="paragraphs">
                    <xsl:for-each select="paragraph">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                            
                            <!-- Extract all lists from paragraph -->
                            <xsl:call-template name="extract-lists">
                                <xsl:with-param name="content-root" select="."/>
                            </xsl:call-template>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            <fn:array key="articles">
                <xsl:apply-templates select="appendix-article" mode="json"/>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="appendix-article" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">appendix_article</fn:string>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            <xsl:if test="see-also">
                <fn:string key="see_also"><xsl:apply-templates select="see-also" mode="rich-text-json"/></fn:string>
            </xsl:if>
            <!-- Content array preserving document order of paragraphs, sentences, tables, figures, and lists -->
            <fn:array key="content">
                <xsl:for-each select="paragraph | sentence | table | figure | list">
                    <xsl:choose>
                        <xsl:when test="self::paragraph">
                            <fn:map>
                                <fn:string key="type">paragraph</fn:string>
                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                
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
                        </xsl:when>
                        <xsl:when test="self::sentence">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::table">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::figure">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::list">
                            <fn:map>
                                <fn:string key="type">list</fn:string>
                                <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
                                <fn:array key="items">
                                    <xsl:for-each select="item">
                                        <fn:map>
                                            <xsl:if test="@xml:id">
                                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                            </xsl:if>
                                            <xsl:choose>
                                                <xsl:when test="parent::list/@type = 'variable'">
                                                    <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich-text-json"/></fn:string>
                                                    <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                </xsl:when>
                                                <xsl:when test="parent::list/@type = 'symbol'">
                                                    <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich-text-json"/></fn:string>
                                                    <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                </xsl:when>
                                                <xsl:when test="parent::list/@type = 'definition'">
                                                    <xsl:call-template name="emit-definition-item-fields">
                                                        <xsl:with-param name="item" select="."/>
                                                    </xsl:call-template>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </fn:map>
                                    </xsl:for-each>
                                </fn:array>
                            </fn:map>
                        </xsl:when>
                    </xsl:choose>
                </xsl:for-each>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- CONTENT PROCESSING                                                 -->
    <!-- ================================================================== -->
    
    <xsl:template match="sentence" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">sentence</fn:string>
            <xsl:choose>
                <xsl:when test="@number and @number != ''">
                    <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="number"/>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Main text content with rich formatting preserved -->
            <!-- Extract text and child elements from revision-history if present, otherwise from direct children -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    
                    <fn:string key="text"><xsl:for-each select="$content-node/text"><xsl:if test="position() > 1"><xsl:text>&#10;</xsl:text></xsl:if><xsl:apply-templates select="." mode="rich-text-json"/></xsl:for-each></fn:string>
                    
                    <!-- Extract equations from text element -->
                    <xsl:if test="$content-node/text//equation">
                        <fn:array key="equations">
                            <xsl:apply-templates select="$content-node/text//equation" mode="equation-json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- Extract all lists from text element -->
                    <xsl:call-template name="extract-lists">
                        <xsl:with-param name="content-root" select="$content-node/text"/>
                    </xsl:call-template>
                    
                    <!-- Intent reference if present -->
                    <xsl:if test="$content-node/intent-ref">
                        <fn:string key="intent_reference"><xsl:value-of select="$content-node/intent-ref/@target"/></fn:string>
                    </xsl:if>
                    
                    <!-- Clauses -->
                    <xsl:if test="$content-node/clause">
                        <fn:array key="clauses">
                            <xsl:apply-templates select="$content-node/clause" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- See-also references -->
                    <xsl:if test="$content-node/see-also">
                        <fn:array key="see_also">
                            <xsl:for-each select="$content-node/see-also">
                                <fn:map>
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                </fn:map>
                            </xsl:for-each>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- Objectives and functional statements -->
                    <xsl:if test="$content-node/objectives">
                        <fn:array key="objectives">
                            <xsl:apply-templates select="$content-node/objectives/objective" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <xsl:if test="$content-node/functional-statements">
                        <fn:array key="functional_statements">
                            <xsl:apply-templates select="$content-node/functional-statements/functional-statement" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- BC annotations if present -->
                    <xsl:if test="$content-node/bc-annotation">
                        <fn:array key="bc_annotations">
                            <xsl:apply-templates select="$content-node/bc-annotation" mode="json"/>
                        </fn:array>
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="text"><xsl:for-each select="text"><xsl:if test="position() > 1"><xsl:text>&#10;</xsl:text></xsl:if><xsl:apply-templates select="." mode="rich-text-json"/></xsl:for-each></fn:string>
                    
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
                    
                    <!-- Intent reference if present -->
                    <xsl:if test="intent-ref">
                        <fn:string key="intent_reference"><xsl:value-of select="intent-ref/@target"/></fn:string>
                    </xsl:if>
                    
                    <!-- Clauses -->
                    <xsl:if test="clause">
                        <fn:array key="clauses">
                            <xsl:apply-templates select="clause" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- See-also references -->
                    <xsl:if test="see-also">
                        <fn:array key="see_also">
                            <xsl:for-each select="see-also">
                                <fn:map>
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                </fn:map>
                            </xsl:for-each>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- Objectives and functional statements -->
                    <xsl:if test="objectives">
                        <fn:array key="objectives">
                            <xsl:apply-templates select="objectives/objective" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <xsl:if test="functional-statements">
                        <fn:array key="functional_statements">
                            <xsl:apply-templates select="functional-statements/functional-statement" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- BC annotations if present -->
                    <xsl:if test="bc-annotation">
                        <fn:array key="bc_annotations">
                            <xsl:apply-templates select="bc-annotation" mode="json"/>
                        </fn:array>
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-sentence-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="clause" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">clause</fn:string>
            <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Extract text and child elements from revision-history if present, otherwise from direct children -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    
                    <fn:string key="text"><xsl:for-each select="$content-node/text"><xsl:if test="position() > 1"><xsl:text>&#10;</xsl:text></xsl:if><xsl:apply-templates select="." mode="rich-text-json"/></xsl:for-each></fn:string>
                    
                    <!-- Extract equations from text element -->
                    <xsl:if test="$content-node/text//equation">
                        <fn:array key="equations">
                            <xsl:apply-templates select="$content-node/text//equation" mode="equation-json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- Extract all lists from text element -->
                    <xsl:call-template name="extract-lists">
                        <xsl:with-param name="content-root" select="$content-node/text"/>
                    </xsl:call-template>
                    
                    <xsl:if test="$content-node/see-also">
                        <fn:array key="see_also">
                            <xsl:for-each select="$content-node/see-also">
                                <fn:map>
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                </fn:map>
                            </xsl:for-each>
                        </fn:array>
                    </xsl:if>
                    
                    <xsl:if test="$content-node/subclause">
                        <fn:array key="subclauses">
                            <xsl:apply-templates select="$content-node/subclause" mode="json"/>
                        </fn:array>
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="text"><xsl:for-each select="text"><xsl:if test="position() > 1"><xsl:text>&#10;</xsl:text></xsl:if><xsl:apply-templates select="." mode="rich-text-json"/></xsl:for-each></fn:string>
                    
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
                    
                    <xsl:if test="see-also">
                        <fn:array key="see_also">
                            <xsl:for-each select="see-also">
                                <fn:map>
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                </fn:map>
                            </xsl:for-each>
                        </fn:array>
                    </xsl:if>
                    
                    <xsl:if test="subclause">
                        <fn:array key="subclauses">
                            <xsl:apply-templates select="subclause" mode="json"/>
                        </fn:array>
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-clause-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="subclause" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">subclause</fn:string>
            <xsl:choose>
                <xsl:when test="@number and @number != ''">
                    <fn:number key="number"><xsl:value-of select="@number"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="number"/>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Extract text from revision-history if present, otherwise from direct child -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    <fn:string key="text"><xsl:for-each select="$content-node/text"><xsl:if test="position() > 1"><xsl:text>&#10;</xsl:text></xsl:if><xsl:apply-templates select="." mode="rich-text-json"/></xsl:for-each></fn:string>
                    
                    <!-- Extract equations from text element -->
                    <xsl:if test="$content-node/text//equation">
                        <fn:array key="equations">
                            <xsl:apply-templates select="$content-node/text//equation" mode="equation-json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <!-- Extract all lists from text element -->
                    <xsl:call-template name="extract-lists">
                        <xsl:with-param name="content-root" select="$content-node/text"/>
                    </xsl:call-template>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="text"><xsl:for-each select="text"><xsl:if test="position() > 1"><xsl:text>&#10;</xsl:text></xsl:if><xsl:apply-templates select="." mode="rich-text-json"/></xsl:for-each></fn:string>
                    
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
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-subclause-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- TABLE PROCESSING                                                   -->
    <!-- ================================================================== -->
    
    <xsl:template match="table" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">table</fn:string>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <!-- Source attribute (bc or nbc) -->
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <!-- Table number (e.g. 9.20.17.4.-A in spectables) -->
            <xsl:if test="number">
                <fn:string key="number"><xsl:value-of select="number"/></fn:string>
            </xsl:if>
            
            <fn:string key="title"><xsl:apply-templates select="title" mode="rich-text-json"/></fn:string>

            <!-- Subtitle (notes from title) - Option A -->
            <xsl:if test="subtitle">
                <fn:array key="subtitle">
                    <xsl:for-each select="subtitle/note">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <xsl:if test="@vendor-id">
                                <fn:string key="vendor_id"><xsl:value-of select="@vendor-id"/></fn:string>
                            </xsl:if>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>

            <!-- Forming part references - Option A -->
            <xsl:if test="forming-part">
                <fn:array key="forming_part">
                    <xsl:for-each select="forming-part/ref">
                        <fn:map>
                            <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                            <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                            <xsl:if test="@display-type">
                                <fn:string key="display_type"><xsl:value-of select="@display-type"/></fn:string>
                            </xsl:if>
                            <xsl:if test="text()">
                                <fn:string key="text"><xsl:value-of select="text()"/></fn:string>
                            </xsl:if>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>

            <xsl:if test="@frame">
                <fn:string key="frame"><xsl:value-of select="@frame"/></fn:string>
            </xsl:if>

            <xsl:if test="table-notes/note or subtitle/note or title/note or tgroup//note">
                <fn:array key="table_notes">
                    <xsl:for-each-group select="table-notes/note | subtitle/note | title/note | tgroup//note" group-by="@xml:id">
                        <xsl:sort select="current-grouping-key()"/>
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="current-grouping-key()"/></fn:string>
                            <xsl:if test="current-group()[1]/@vendor-id">
                                <fn:string key="vendor_id"><xsl:value-of select="current-group()[1]/@vendor-id"/></fn:string>
                            </xsl:if>
                            <xsl:call-template name="render-note-content">
                                <xsl:with-param name="note" select="current-group()[1]"/>
                            </xsl:call-template>
                        </fn:map>
                    </xsl:for-each-group>
                </fn:array>
            </xsl:if>
            
            <fn:map key="structure">
                <xsl:choose>
                    <xsl:when test="tgroup/@cols and tgroup/@cols != ''">
                        <fn:number key="columns"><xsl:value-of select="tgroup/@cols"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="columns"/>
                    </xsl:otherwise>
                </xsl:choose>

                <xsl:if test="tgroup/@colsep">
                    <fn:string key="colsep"><xsl:value-of select="tgroup/@colsep"/></fn:string>
                </xsl:if>
                <xsl:if test="tgroup/@rowsep">
                    <fn:string key="rowsep"><xsl:value-of select="tgroup/@rowsep"/></fn:string>
                </xsl:if>
                
                <xsl:if test="tgroup/colspec">
                    <fn:array key="column_specs">
                        <xsl:for-each select="tgroup/colspec">
                            <fn:map>
                                <fn:string key="name"><xsl:value-of select="@colname"/></fn:string>
                                <fn:string key="width"><xsl:value-of select="@colwidth"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                
                <xsl:if test="tgroup/thead">
                    <fn:array key="header_rows">
                        <xsl:apply-templates select="tgroup/thead/row" mode="json"/>
                    </fn:array>
                </xsl:if>
                
                <fn:array key="body_rows">
                    <xsl:apply-templates select="tgroup/tbody/row" mode="json"/>
                </fn:array>
            </fn:map>
            
            <!-- Extract equations from table (title and all entries) -->
            <xsl:if test=".//equation">
                <fn:array key="equations">
                    <xsl:apply-templates select=".//equation" mode="equation-json"/>
                </fn:array>
            </xsl:if>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-table-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="row" mode="json">
        <fn:map>
            <!-- Row ID -->
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            
            <!-- Row type (header_row or body_row) -->
            <xsl:choose>
                <xsl:when test="parent::thead">
                    <fn:string key="type">header_row</fn:string>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="type">body_row</fn:string>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <!-- Source attribute (bc or nbc) -->
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>

            <xsl:if test="@valign">
                <fn:string key="valign"><xsl:value-of select="@valign"/></fn:string>
            </xsl:if>
            <xsl:if test="@rowsep">
                <fn:string key="rowsep"><xsl:value-of select="@rowsep"/></fn:string>
            </xsl:if>
            
            <!-- Cells array (current content) -->
            <fn:array key="cells">
                <xsl:choose>
                    <xsl:when test="@revised='yes' and revision-history">
                        <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                        <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                        <xsl:apply-templates select="$content-node/entry" mode="json"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates select="entry" mode="json"/>
                    </xsl:otherwise>
                </xsl:choose>
            </fn:array>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-row-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="entry" mode="json">
        <fn:map>
            <!-- Content array supporting mixed text and figures -->
            <fn:array key="content">
                <xsl:call-template name="process-entry-content">
                    <xsl:with-param name="entry" select="."/>
                </xsl:call-template>
            </fn:array>
            
            <xsl:if test="@align">
                <fn:string key="align"><xsl:value-of select="@align"/></fn:string>
            </xsl:if>
            <xsl:if test="@valign">
                <fn:string key="valign"><xsl:value-of select="@valign"/></fn:string>
            </xsl:if>
            <xsl:if test="@colsep">
                <fn:string key="colsep"><xsl:value-of select="@colsep"/></fn:string>
            </xsl:if>
            <xsl:if test="@rowsep">
                <fn:string key="rowsep"><xsl:value-of select="@rowsep"/></fn:string>
            </xsl:if>
            <xsl:if test="@colname">
                <fn:string key="colname"><xsl:value-of select="@colname"/></fn:string>
            </xsl:if>
            <xsl:if test="@rowspan and @rowspan != ''">
                <fn:number key="rowspan"><xsl:value-of select="@rowspan"/></fn:number>
            </xsl:if>
            <xsl:if test="@colspan and @colspan != ''">
                <fn:number key="colspan"><xsl:value-of select="@colspan"/></fn:number>
            </xsl:if>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-entry-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- Process entry content - handles mixed text, figure, and list content -->
    <xsl:template name="process-entry-content">
        <xsl:param name="entry"/>
        
        <xsl:choose>
            <!-- If entry contains figure(s), bare graphic(s), or list(s), process as mixed content -->
            <xsl:when test="$entry/figure or $entry/graphic or $entry/list">
                <xsl:for-each select="$entry/node()">
                    <xsl:choose>
                        <!-- Figure element -->
                        <xsl:when test="self::figure">
                            <fn:map>
                                <fn:string key="type">figure</fn:string>
                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                <xsl:if test="@hideLabel = 'true'">
                                    <fn:boolean key="hide_label">true</fn:boolean>
                                </xsl:if>
                                <xsl:if test="@source">
                                    <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
                                </xsl:if>
                                <xsl:if test="title">
                                    <fn:string key="title"><xsl:apply-templates select="title" mode="rich-text-json"/></fn:string>
                                </xsl:if>
                                <fn:map key="graphic">
                                    <fn:string key="src"><xsl:value-of select="graphic/@src"/></fn:string>
                                    <fn:string key="alt_text"><xsl:value-of select="graphic/@alt"/></fn:string>
                                    <xsl:if test="graphic/@width">
                                        <fn:string key="width"><xsl:value-of select="graphic/@width"/></fn:string>
                                    </xsl:if>
                                    <xsl:if test="graphic/@height">
                                        <fn:string key="height"><xsl:value-of select="graphic/@height"/></fn:string>
                                    </xsl:if>
                                </fn:map>
                            </fn:map>
                        </xsl:when>
                        <!-- List element - extract as structured data -->
                        <xsl:when test="self::list">
                            <fn:map>
                                <fn:string key="type">list</fn:string>
                                <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
                                <fn:array key="items">
                                    <xsl:for-each select="item">
                                        <fn:map>
                                            <xsl:if test="@xml:id">
                                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                            </xsl:if>
                                            <xsl:choose>
                                                <xsl:when test="parent::list/@type = 'variable'">
                                                    <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich-text-json"/></fn:string>
                                                    <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                </xsl:when>
                                                <xsl:when test="parent::list/@type = 'symbol'">
                                                    <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich-text-json"/></fn:string>
                                                    <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                </xsl:when>
                                                <xsl:when test="parent::list/@type = 'definition'">
                                                    <xsl:call-template name="emit-definition-item-fields">
                                                        <xsl:with-param name="item" select="."/>
                                                    </xsl:call-template>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </fn:map>
                                    </xsl:for-each>
                                </fn:array>
                            </fn:map>
                        </xsl:when>
                        <!-- Table note marker -->
                        <xsl:when test="self::note[@xml:id]">
                            <fn:map>
                                <fn:string key="type">text</fn:string>
                                <fn:string key="value"> [REF:table-note:<xsl:value-of select="@xml:id"/>] </fn:string>
                            </fn:map>
                        </xsl:when>
                        <!-- Bare graphic element (not wrapped in figure) - output in figure structure for consistency -->
                        <xsl:when test="self::graphic">
                            <fn:map>
                                <fn:string key="type">figure</fn:string>
                                <xsl:if test="@alt">
                                    <fn:string key="title"><xsl:value-of select="@alt"/></fn:string>
                                </xsl:if>
                                <fn:map key="graphic">
                                    <fn:string key="src"><xsl:value-of select="@src"/></fn:string>
                                    <fn:string key="alt_text"><xsl:value-of select="@alt"/></fn:string>
                                    <xsl:if test="@width">
                                        <fn:string key="width"><xsl:value-of select="@width"/></fn:string>
                                    </xsl:if>
                                    <xsl:if test="@height">
                                        <fn:string key="height"><xsl:value-of select="@height"/></fn:string>
                                    </xsl:if>
                                </fn:map>
                            </fn:map>
                        </xsl:when>
                        <!-- Text node or other elements - collect as text -->
                        <xsl:when test="self::text()[normalize-space()] or self::*[not(self::figure or self::graphic or self::note or self::list)]">
                            <xsl:variable name="text-content">
                                <xsl:apply-templates select="." mode="rich-text-json"/>
                            </xsl:variable>
                            <xsl:if test="normalize-space($text-content)">
                                <fn:map>
                                    <fn:string key="type">text</fn:string>
                                    <fn:string key="value"><xsl:value-of select="$text-content"/></fn:string>
                                </fn:map>
                            </xsl:if>
                        </xsl:when>
                    </xsl:choose>
                </xsl:for-each>
            </xsl:when>
            <!-- No figures or lists - just text content -->
            <xsl:otherwise>
                <xsl:variable name="text-content">
                    <xsl:for-each select="$entry/node()">
                        <xsl:choose>
                            <xsl:when test="self::note[@xml:id]">
                                <xsl:text>[REF:table-note:</xsl:text>
                                <xsl:value-of select="@xml:id"/>
                                <xsl:text>]</xsl:text>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:apply-templates select="." mode="rich-text-json"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:for-each>
                </xsl:variable>
                <fn:map>
                    <fn:string key="type">text</fn:string>
                    <fn:string key="value"><xsl:value-of select="$text-content"/></fn:string>
                </fn:map>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- FIGURE PROCESSING                                                  -->
    <!-- ================================================================== -->
    
    <xsl:template match="figure" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">figure</fn:string>
            <xsl:if test="@hideLabel = 'true'">
                <fn:boolean key="hide_label">true</fn:boolean>
            </xsl:if>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <!-- Source attribute (bc or nbc) -->
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <fn:string key="title"><xsl:apply-templates select="title" mode="rich-text-json"/></fn:string>
            
            <!-- Forming part references -->
            <xsl:if test="forming-part">
                <fn:array key="forming_part">
                    <xsl:for-each select="forming-part/ref">
                        <fn:map>
                            <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                            <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                            <xsl:if test="@display-type">
                                <fn:string key="display_type"><xsl:value-of select="@display-type"/></fn:string>
                            </xsl:if>
                            <xsl:if test="text()">
                                <fn:string key="text"><xsl:value-of select="text()"/></fn:string>
                            </xsl:if>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            
            <fn:map key="graphic">
                <fn:string key="src"><xsl:value-of select="graphic/@src"/></fn:string>
                <fn:string key="alt_text"><xsl:value-of select="graphic/@alt"/></fn:string>
                <xsl:if test="graphic/@width">
                    <fn:string key="width"><xsl:value-of select="graphic/@width"/></fn:string>
                </xsl:if>
                <xsl:if test="graphic/@height">
                    <fn:string key="height"><xsl:value-of select="graphic/@height"/></fn:string>
                </xsl:if>
            </fn:map>
            
            <xsl:if test="note">
                <fn:array key="notes">
                    <xsl:for-each select="note">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- SPECTABLES PROCESSING (Special Tables)                            -->
    <!-- ================================================================== -->
    
    <xsl:template match="spectables" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">spectables</fn:string>
            
            <!-- Source attribute (bc or nbc) -->
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            <xsl:if test="@table-prefix">
                <fn:string key="table_prefix"><xsl:value-of select="@table-prefix"/></fn:string>
            </xsl:if>
            <xsl:if test="@toc-entry">
                <fn:string key="toc_entry"><xsl:value-of select="@toc-entry"/></fn:string>
            </xsl:if>
            
            <fn:array key="tables">
                <xsl:apply-templates select="table" mode="json"/>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- PART APPENDIX PROCESSING (Application Notes)                      -->
    <!-- ================================================================== -->
    
    <xsl:template match="part-appendix" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">part_appendix</fn:string>
        
        <xsl:if test="introduction">
            <fn:string key="introduction"><xsl:apply-templates select="introduction" mode="rich-text-json"/></fn:string>
        </xsl:if>
        
        <fn:array key="application_notes">
            <xsl:apply-templates select="application-note" mode="json"/>
        </fn:array>
    </xsl:template>
    
    <xsl:template match="application-note" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">application_note</fn:string>
            
            <!-- Extract number and title from revision-history if present, otherwise from direct children -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    <fn:string key="number"><xsl:value-of select="$content-node/number"/></fn:string>
                    <fn:string key="title"><xsl:apply-templates select="$content-node/title" mode="text-only"/></fn:string>
                </xsl:when>
                <xsl:otherwise>
                    <fn:string key="number"><xsl:value-of select="number"/></fn:string>
                    <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
                </xsl:otherwise>
            </xsl:choose>
            
            <xsl:if test="@refs">
                <fn:string key="refs"><xsl:value-of select="@refs"/></fn:string>
            </xsl:if>
            
            <!-- Deleted flag -->
            <xsl:if test="@deleted = 'yes'">
                <fn:boolean key="deleted">true</fn:boolean>
            </xsl:if>
            
            <!-- Revised flag -->
            <xsl:if test="@revised = 'yes'">
                <fn:boolean key="revised">true</fn:boolean>
            </xsl:if>
            
            <!-- Source attribute (bc or nbc) -->
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <!-- Paragraphs - extract from revision-history if present -->
            <xsl:choose>
                <xsl:when test="@revised='yes' and revision-history">
                    <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                    <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                    <!-- Content array preserving document order from revision content -->
                    <fn:array key="content">
                        <xsl:for-each select="$content-node/paragraph | $content-node/list | $content-node/note-division | $content-node/table | $content-node/figure">
                            <xsl:choose>
                                <xsl:when test="self::paragraph">
                                    <fn:map>
                                        <fn:string key="type">paragraph</fn:string>
                                        <xsl:if test="@xml:id">
                                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                        </xsl:if>
                                        <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                        
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
                                </xsl:when>
                                <xsl:when test="self::note-division">
                                    <xsl:apply-templates select="." mode="json"/>
                                </xsl:when>
                                <xsl:when test="self::table">
                                    <xsl:apply-templates select="." mode="json"/>
                                </xsl:when>
                                <xsl:when test="self::figure">
                                    <xsl:apply-templates select="." mode="json"/>
                                </xsl:when>
                                <xsl:when test="self::list">
                                    <fn:map>
                                        <fn:string key="type">list</fn:string>
                                        <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
                                        <fn:array key="items">
                                            <xsl:for-each select="item">
                                                <fn:map>
                                                    <xsl:if test="@xml:id">
                                                        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                                    </xsl:if>
                                                    <xsl:choose>
                                                        <xsl:when test="parent::list/@type = 'variable'">
                                                            <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich-text-json"/></fn:string>
                                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                        </xsl:when>
                                                        <xsl:when test="parent::list/@type = 'symbol'">
                                                            <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich-text-json"/></fn:string>
                                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                        </xsl:when>
                                                        <xsl:when test="parent::list/@type = 'definition'">
                                                            <xsl:call-template name="emit-definition-item-fields">
                                                                <xsl:with-param name="item" select="."/>
                                                            </xsl:call-template>
                                                        </xsl:when>
                                                        <xsl:otherwise>
                                                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                                        </xsl:otherwise>
                                                    </xsl:choose>
                                                </fn:map>
                                            </xsl:for-each>
                                        </fn:array>
                                    </fn:map>
                                </xsl:when>
                            </xsl:choose>
                        </xsl:for-each>
                    </fn:array>
                </xsl:when>
                <xsl:otherwise>
                    <!-- Content array preserving document order of paragraphs, lists, note-divisions, tables, and figures -->
                    <fn:array key="content">
                        <xsl:for-each select="paragraph | list | note-division | table | figure">
                            <xsl:choose>
                                <xsl:when test="self::paragraph">
                                    <fn:map>
                                        <fn:string key="type">paragraph</fn:string>
                                        <xsl:if test="@xml:id">
                                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                        </xsl:if>
                                        
                                        <!-- Revised flag -->
                                        <xsl:if test="@revised = 'yes'">
                                            <fn:boolean key="revised">true</fn:boolean>
                                        </xsl:if>
                                        
                                        <!-- Extract content from revision-history if present, otherwise from direct content -->
                                        <xsl:choose>
                                            <xsl:when test="@revised='yes' and revision-history">
                                                <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                                                <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                                                <fn:string key="content"><xsl:apply-templates select="$content-node/node()" mode="rich-text-json"/></fn:string>
                                                
                                                <!-- Extract equations from revised paragraph -->
                                                <xsl:if test="$content-node//equation">
                                                    <fn:array key="equations">
                                                        <xsl:apply-templates select="$content-node//equation" mode="equation-json"/>
                                                    </fn:array>
                                                </xsl:if>
                                                
                                                <!-- Extract all lists from revised paragraph -->
                                                <xsl:call-template name="extract-lists">
                                                    <xsl:with-param name="content-root" select="$content-node"/>
                                                </xsl:call-template>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                                
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
                                            </xsl:otherwise>
                                        </xsl:choose>
                                        
                                        <!-- Revision history if present -->
                                        <xsl:if test="@revised = 'yes' and revision-history">
                                            <fn:array key="revisions">
                                                <xsl:call-template name="build-paragraph-revisions"/>
                                            </fn:array>
                                        </xsl:if>
                                    </fn:map>
                                </xsl:when>
                                <xsl:when test="self::note-division">
                                    <xsl:apply-templates select="." mode="json"/>
                                </xsl:when>
                                <xsl:when test="self::table">
                                    <xsl:apply-templates select="." mode="json"/>
                                </xsl:when>
                                <xsl:when test="self::figure">
                                    <xsl:apply-templates select="." mode="json"/>
                                </xsl:when>
                                <xsl:when test="self::list">
                                    <fn:map>
                                        <fn:string key="type">list</fn:string>
                                        <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
                                        <fn:array key="items">
                                            <xsl:for-each select="item">
                                                <fn:map>
                                                    <xsl:if test="@xml:id">
                                                        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                                    </xsl:if>
                                                    <xsl:choose>
                                                        <xsl:when test="parent::list/@type = 'variable'">
                                                            <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich-text-json"/></fn:string>
                                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                        </xsl:when>
                                                        <xsl:when test="parent::list/@type = 'symbol'">
                                                            <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich-text-json"/></fn:string>
                                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                        </xsl:when>
                                                        <xsl:when test="parent::list/@type = 'definition'">
                                                            <xsl:call-template name="emit-definition-item-fields">
                                                                <xsl:with-param name="item" select="."/>
                                                            </xsl:call-template>
                                                        </xsl:when>
                                                        <xsl:otherwise>
                                                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                                        </xsl:otherwise>
                                                    </xsl:choose>
                                                </fn:map>
                                            </xsl:for-each>
                                        </fn:array>
                                    </fn:map>
                                </xsl:when>
                            </xsl:choose>
                        </xsl:for-each>
                    </fn:array>
                </xsl:otherwise>
            </xsl:choose>
            
            <!-- Revision history if present -->
            <xsl:if test="@revised = 'yes' and revision-history">
                <fn:array key="revisions">
                    <xsl:call-template name="build-appnote-revisions"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="note-division" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="type">note_division</fn:string>
            
            <!-- Source attribute (bc or nbc) -->
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="@source"/></fn:string>
            </xsl:if>
            
            <fn:string key="title"><xsl:apply-templates select="title" mode="text-only"/></fn:string>
            
            <!-- Content array preserving document order of paragraphs, lists, tables, and figures -->
            <fn:array key="content">
                <xsl:for-each select="paragraph | list | table | figure">
                    <xsl:choose>
                        <xsl:when test="self::paragraph">
                            <fn:map>
                                <fn:string key="type">paragraph</fn:string>
                                <xsl:if test="@xml:id">
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                </xsl:if>
                                
                                <!-- Deleted flag -->
                                <xsl:if test="@deleted = 'yes'">
                                    <fn:boolean key="deleted">true</fn:boolean>
                                </xsl:if>
                                
                                <!-- Revised flag -->
                                <xsl:if test="@revised = 'yes'">
                                    <fn:boolean key="revised">true</fn:boolean>
                                </xsl:if>
                                
                                <!-- Extract content from revision-history if present, otherwise from direct content -->
                                <xsl:choose>
                                    <xsl:when test="@revised='yes' and revision-history">
                                        <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                                        <xsl:variable name="content-node" select="if ($current-revision/content) then $current-revision/content else revision-history/original"/>
                                        <fn:string key="content"><xsl:apply-templates select="$content-node/node()" mode="rich-text-json"/></fn:string>
                                        
                                        <!-- Extract equations from revised paragraph -->
                                        <xsl:if test="$content-node//equation">
                                            <fn:array key="equations">
                                                <xsl:apply-templates select="$content-node//equation" mode="equation-json"/>
                                            </fn:array>
                                        </xsl:if>
                                        
                                        <!-- Extract all lists from revised paragraph -->
                                        <xsl:call-template name="extract-lists">
                                            <xsl:with-param name="content-root" select="$content-node"/>
                                        </xsl:call-template>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                        
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
                                    </xsl:otherwise>
                                </xsl:choose>
                                
                                <!-- Revision history if present -->
                                <xsl:if test="@revised = 'yes' and revision-history">
                                    <fn:array key="revisions">
                                        <xsl:call-template name="build-paragraph-revisions"/>
                                    </fn:array>
                                </xsl:if>
                            </fn:map>
                        </xsl:when>
                        <xsl:when test="self::table">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::figure">
                            <xsl:apply-templates select="." mode="json"/>
                        </xsl:when>
                        <xsl:when test="self::list">
                            <fn:map>
                                <fn:string key="type">list</fn:string>
                                <fn:string key="list_type"><xsl:value-of select="@type"/></fn:string>
                                <fn:array key="items">
                                    <xsl:for-each select="item">
                                        <fn:map>
                                            <xsl:if test="@xml:id">
                                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                            </xsl:if>
                                            <xsl:choose>
                                                <xsl:when test="parent::list/@type = 'variable'">
                                                    <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich-text-json"/></fn:string>
                                                    <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                </xsl:when>
                                                <xsl:when test="parent::list/@type = 'symbol'">
                                                    <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich-text-json"/></fn:string>
                                                    <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                                </xsl:when>
                                                <xsl:when test="parent::list/@type = 'definition'">
                                                    <xsl:call-template name="emit-definition-item-fields">
                                                        <xsl:with-param name="item" select="."/>
                                                    </xsl:call-template>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </fn:map>
                                    </xsl:for-each>
                                </fn:array>
                            </fn:map>
                        </xsl:when>
                    </xsl:choose>
                </xsl:for-each>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- OBJECTIVES AND FUNCTIONAL STATEMENTS                              -->
    <!-- ================================================================== -->
    
    <xsl:template match="objective" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="fn:string(@source)"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:value-of select="title"/></fn:string>
            <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich-text-json"/></fn:string>
            
            <xsl:if test="sub-objective">
                <fn:array key="sub_objectives">
                    <xsl:apply-templates select="sub-objective" mode="json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="sub-objective" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="fn:string(@source)"/></fn:string>
            </xsl:if>
            <fn:string key="title"><xsl:value-of select="title"/></fn:string>
            <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich-text-json"/></fn:string>
        </fn:map>
    </xsl:template>
    
    <xsl:template match="functional-statement" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
            <xsl:if test="@source">
                <fn:string key="source"><xsl:value-of select="fn:string(@source)"/></fn:string>
            </xsl:if>
            <fn:string key="definition"><xsl:apply-templates select="definition" mode="rich-text-json"/></fn:string>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- BC ANNOTATIONS                                                     -->
    <!-- ================================================================== -->
    
    <xsl:template match="bc-annotation" mode="json">
        <fn:map>
            <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- RICH TEXT PROCESSING                                               -->
    <!-- ================================================================== -->
    
    <xsl:template match="*" mode="rich-text-json">
        <xsl:apply-templates select="text() | *" mode="rich-text-json"/>
    </xsl:template>
    
    <xsl:template match="text()" mode="rich-text-json">
        <!-- Normalize whitespace but preserve word boundaries -->
        <xsl:variable name="normalized" select="normalize-space(.)"/>
        <xsl:if test="$normalized != ''">
            <!-- Add leading space if original text started with whitespace and we're not first -->
            <xsl:if test="preceding-sibling::node() and matches(., '^\s')">
                <xsl:text> </xsl:text>
            </xsl:if>
            <xsl:value-of select="$normalized"/>
            <!-- Add trailing space if original text ended with whitespace and we're not last -->
            <xsl:if test="following-sibling::node() and matches(., '\s$')">
                <xsl:text> </xsl:text>
            </xsl:if>
        </xsl:if>
    </xsl:template>

    <xsl:template match="lb" mode="rich-text-json">
        <xsl:text>&#10;</xsl:text>
    </xsl:template>
    
    <xsl:template match="emphasis" mode="rich-text-json">
        <xsl:text>&lt;</xsl:text>
        <xsl:value-of select="@style"/>
        <xsl:text>&gt;</xsl:text>
        <xsl:apply-templates select="node()" mode="rich-text-json"/>
        <xsl:text>&lt;/</xsl:text>
        <xsl:value-of select="@style"/>
        <xsl:text>&gt;</xsl:text>
    </xsl:template>
    
    <xsl:template match="super" mode="rich-text-json">
        <xsl:text>^{</xsl:text>
        <xsl:value-of select="."/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <xsl:template match="sub" mode="rich-text-json">
        <xsl:text>_{</xsl:text>
        <xsl:value-of select="."/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <xsl:template match="ref" mode="rich-text-json">
        <!-- Determine the next significant sibling (skipping whitespace-only text nodes) -->
        <xsl:variable name="next-significant" select="following-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
        <!-- Determine the previous significant sibling (skipping whitespace-only text nodes) -->
        <xsl:variable name="prev-significant" select="preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
        
        <!-- Add leading space if preceded by non-whitespace text OR another ref element -->
        <!-- BUT: Don't add leading space if this ref has pretext (pretext will provide the separation) -->
        <xsl:if test="not(@pretext) and ($prev-significant[self::text() and not(matches(., '\s$'))] or $prev-significant[self::ref])">
            <xsl:text> </xsl:text>
        </xsl:if>
        
        <!-- Include pretext if present (with leading space only if preceded by something) -->
        <xsl:if test="@pretext">
            <xsl:if test="$prev-significant">
                <xsl:text> </xsl:text>
            </xsl:if>
            <xsl:value-of select="@pretext"/>
            <xsl:text> </xsl:text>
        </xsl:if>
        
        <xsl:text>[REF:</xsl:text>
        <xsl:value-of select="@type"/>
        <xsl:text>:</xsl:text>
        <xsl:value-of select="@target"/>
        <xsl:if test="@display-type">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="@display-type"/>
        </xsl:if>
        <!-- Include display text if present, preserving trailing space -->
        <xsl:variable name="has-trailing-space" select="matches(., '\s$')"/>
        <xsl:if test="normalize-space(.) != ''">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="normalize-space(.)"/>
            <!-- Preserve trailing space if original text had one -->
            <xsl:if test="$has-trailing-space">
                <xsl:text> </xsl:text>
            </xsl:if>
        </xsl:if>
        <xsl:text>]</xsl:text>
        
        <!-- Add trailing space if followed by non-whitespace text OR another ref WITHOUT pretext -->
        <!-- BUT: Don't add trailing space if the ref content already had a trailing space -->
        <xsl:if test="not($has-trailing-space) and ($next-significant[self::text() and not(matches(., '^\s'))] or $next-significant[self::ref and not(@pretext)])">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>

    
    <xsl:template match="measurement" mode="rich-text-json">
        <!-- Add leading space if preceded by text without trailing space -->
        <xsl:if test="preceding-sibling::node()[1][self::text() and not(matches(., '\s$'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
        <!-- Process child nodes to handle super/sub elements -->
        <xsl:apply-templates select="node()" mode="rich-text-json"/>
        <!-- Add trailing space if followed by text without leading space -->
        <xsl:if test="following-sibling::node()[1][self::text() and not(matches(., '^\s'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="equation" mode="rich-text-json">
        <!-- Insert placeholder in text that matches the pattern [EQ:type:id] -->
        <!-- Use same ID fallback logic as equation-json template -->
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
    
    <xsl:template match="change" mode="rich-text-json">
        <xsl:text>&lt;CHANGE:</xsl:text>
        <xsl:value-of select="@type"/>
        <xsl:text>&gt;</xsl:text>
        <xsl:apply-templates select="node()" mode="rich-text-json"/>
        <xsl:text>&lt;/CHANGE&gt;</xsl:text>
    </xsl:template>
    
    <xsl:template match="see-also" mode="rich-text-json">
        <xsl:apply-templates select="node()" mode="rich-text-json"/>
    </xsl:template>
    
    <!-- Bare graphic elements (e.g., logos in table cells) -->
    <xsl:template match="graphic" mode="rich-text-json">
        <xsl:text>[GRAPHIC:</xsl:text>
        <xsl:value-of select="@src"/>
        <xsl:if test="@alt">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="@alt"/>
        </xsl:if>
        <xsl:text>]</xsl:text>
    </xsl:template>
    
    <!-- Skip all list types in rich-text-json mode - they're extracted as structured data -->
    <xsl:template match="list" mode="rich-text-json" priority="2">
        <xsl:text>[LIST:</xsl:text>
        <xsl:value-of select="@type"/>
        <xsl:text>]</xsl:text>
    </xsl:template>

    <!-- Named template for rendering a table note that may contain an inline list.
         Emits a flat "content" string when no list is present, or "content" + structured
         "list" object when a child <list> element exists (mixed content note). -->
    <!-- Renders a table note's content. When a note contains an inline <list>,
         "content" is a flat string with [LIST:type] appended (matching the
         existing cell content pattern so renderFormattedText handles it safely),
         and a separate "list" key holds the structured items as { "content": "..." }
         objects — identical to cell content list items. -->
    <xsl:template name="render-note-content">
        <xsl:param name="note"/>
        <xsl:choose>
            <xsl:when test="$note/list">
                <fn:string key="content">
                    <xsl:apply-templates select="$note/node()[not(self::list)]" mode="rich-text-json"/>
                    <xsl:text>[LIST:</xsl:text>
                    <xsl:value-of select="$note/list/@type"/>
                    <xsl:text>]</xsl:text>
                </fn:string>
                <fn:map key="list">
                    <fn:string key="type"><xsl:value-of select="$note/list/@type"/></fn:string>
                    <fn:array key="items">
                        <xsl:for-each select="$note/list/item">
                            <fn:map>
                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </fn:map>
            </xsl:when>
            <xsl:otherwise>
                <fn:string key="content"><xsl:apply-templates select="$note" mode="rich-text-json"/></fn:string>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Revision history processing for JSON output (snapshot approach for date-based versioning) -->
    <!-- Display content comes from the latest revision (status="current") -->
    <xsl:template match="revision-history" mode="rich-text-json">
        <xsl:variable name="current-revision" select="revision[@status='current'][last()]"/>
        <xsl:choose>
            <xsl:when test="$current-revision/content">
                <xsl:apply-templates select="$current-revision/content/node()" mode="rich-text-json"/>
            </xsl:when>
            <xsl:otherwise>
                <!-- Fallback to original if no current revision -->
                <xsl:apply-templates select="original/node()" mode="rich-text-json"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Handle elements with revision history - show current content in main text field -->
    <xsl:template match="*[@revised='yes']" mode="rich-text-json" priority="1">
        <xsl:choose>
            <xsl:when test="revision-history">
                <xsl:variable name="current-revision" select="revision-history/revision[@status='current'][last()]"/>
                <xsl:choose>
                    <xsl:when test="$current-revision/content">
                        <xsl:apply-templates select="$current-revision/content/node()" mode="rich-text-json"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Fallback to original if no current revision -->
                        <xsl:apply-templates select="revision-history/original/node()" mode="rich-text-json"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <!-- No revision history, process normally -->
                <xsl:apply-templates select="text() | *[not(self::revision-history)]" mode="rich-text-json"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Handle text elements within revised elements -->
    <xsl:template match="text[parent::*[@revised='yes']]" mode="rich-text-json" priority="1">
        <xsl:variable name="parent" select="parent::*"/>
        <xsl:choose>
            <xsl:when test="$parent/revision-history">
                <xsl:variable name="current-revision" select="$parent/revision-history/revision[@status='current'][last()]"/>
                <xsl:choose>
                    <xsl:when test="$current-revision/content">
                        <xsl:apply-templates select="$current-revision/content/node()" mode="rich-text-json"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Fallback to original if no current revision -->
                        <xsl:apply-templates select="$parent/revision-history/original/node()" mode="rich-text-json"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <!-- No revision history, process normally -->
                <xsl:apply-templates select="node()" mode="rich-text-json"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- EQUATION PROCESSING FOR JSON                                       -->
    <!-- ================================================================== -->
    
    <!-- Convert equation element to JSON object with multiple formats -->
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
            
            <xsl:choose>
                <!-- MathML-based equation -->
                <xsl:when test="*[local-name()='math']">
                    <!-- LaTeX representation (converted from MathML) -->
                    <fn:string key="latex"><xsl:apply-templates select="*[local-name()='math']" mode="mathml-to-latex"/></fn:string>
                    
                    <!-- Plain text representation -->
                    <fn:string key="plainText"><xsl:apply-templates select="*[local-name()='math']" mode="mathml-to-plaintext"/></fn:string>
                    
                    <!-- MathML (optional - can be large) -->
                    <fn:string key="mathml"><xsl:value-of select="fn:serialize(*[local-name()='math'])"/></fn:string>
                </xsl:when>
                <!-- LaTeX equation (direct latex child) -->
                <xsl:when test="latex">
                    <fn:string key="latex"><xsl:value-of select="latex"/></fn:string>
                    <fn:string key="plainText"><xsl:value-of select="latex"/></fn:string>
                </xsl:when>
                <!-- Plain text equation (from eqtxt) -->
                <xsl:when test="text">
                    <fn:string key="plainText"><xsl:apply-templates select="text" mode="rich-text-json"/></fn:string>
                </xsl:when>
            </xsl:choose>
            
            <!-- Image reference for fallback rendering -->
            <xsl:if test="@image">
                <fn:string key="image"><xsl:value-of select="@image"/></fn:string>
            </xsl:if>
            <xsl:if test="@html-src or @image-src">
                <fn:string key="htmlSrc"><xsl:value-of select="if (@html-src) then @html-src else @image-src"/></fn:string>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- MATHML TO LATEX CONVERSION                                         -->
    <!-- ================================================================== -->
    
    <!-- Match MathML math element (in MathML namespace) -->
    <xsl:template match="*[namespace-uri()='http://www.w3.org/1998/Math/MathML' and local-name()='math']" mode="mathml-to-latex">
        <xsl:apply-templates select="*" mode="mathml-to-latex"/>
    </xsl:template>
    
    <!-- Numbers (in no namespace due to xmlns="") -->
    <xsl:template match="*[local-name()='mn' and namespace-uri()='']" mode="mathml-to-latex">
        <xsl:value-of select="."/>
    </xsl:template>
    
    <!-- Identifiers/variables (in no namespace) -->
    <xsl:template match="*[local-name()='mi' and namespace-uri()='']" mode="mathml-to-latex">
        <xsl:value-of select="."/>
    </xsl:template>
    
    <!-- Operators (in no namespace) -->
    <xsl:template match="*[local-name()='mo' and namespace-uri()='']" mode="mathml-to-latex">
        <xsl:choose>
            <xsl:when test=". = '∑'">\\sum</xsl:when>
            <xsl:when test=". = '∫'">\\int</xsl:when>
            <xsl:when test=". = '≤'">\\leq</xsl:when>
            <xsl:when test=". = '≥'">\\geq</xsl:when>
            <xsl:when test=". = '±'">\\pm</xsl:when>
            <xsl:when test=". = '×'">\\times</xsl:when>
            <xsl:when test=". = '÷'">\\div</xsl:when>
            <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Text (in no namespace) -->
    <xsl:template match="*[local-name()='mtext' and namespace-uri()='']" mode="mathml-to-latex">
        <xsl:text>\text{</xsl:text>
        <xsl:value-of select="."/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Fractions (in no namespace) -->
    <xsl:template match="*[local-name()='mfrac' and namespace-uri()='']" mode="mathml-to-latex">
        <xsl:text>\frac{</xsl:text>
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
        <xsl:text>}{</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Square root -->
    <xsl:template match="*:msqrt | msqrt | *[local-name()='msqrt']" mode="mathml-to-latex">
        <xsl:text>\sqrt{</xsl:text>
        <xsl:apply-templates select="*" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Nth root -->
    <xsl:template match="*:mroot | mroot | *[local-name()='mroot']" mode="mathml-to-latex">
        <xsl:text>\sqrt[</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-latex"/>
        <xsl:text>]{</xsl:text>
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Superscript -->
    <xsl:template match="*:msup | msup | *[local-name()='msup']" mode="mathml-to-latex">
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
        <xsl:text>^{</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Subscript -->
    <xsl:template match="*:msub | msub | *[local-name()='msub']" mode="mathml-to-latex">
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
        <xsl:text>_{</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Subsuperscript -->
    <xsl:template match="*:msubsup | msubsup | *[local-name()='msubsup']" mode="mathml-to-latex">
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
        <xsl:text>_{</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-latex"/>
        <xsl:text>}^{</xsl:text>
        <xsl:apply-templates select="*[3]" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Row (grouping) -->
    <xsl:template match="*:mrow | mrow | *[local-name()='mrow']" mode="mathml-to-latex">
        <xsl:apply-templates select="*" mode="mathml-to-latex"/>
    </xsl:template>
    
    <!-- Fenced (parentheses, brackets, etc.) -->
    <xsl:template match="*:mfenced | mfenced | *[local-name()='mfenced']" mode="mathml-to-latex">
        <xsl:text>\left(</xsl:text>
        <xsl:apply-templates select="*" mode="mathml-to-latex"/>
        <xsl:text>\right)</xsl:text>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- MATHML TO PLAIN TEXT CONVERSION                                    -->
    <!-- ================================================================== -->
    
    <!-- Match MathML elements with or without namespace -->
    <xsl:template match="*[namespace-uri()='http://www.w3.org/1998/Math/MathML'] | math | *[local-name()='math']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*" mode="mathml-to-plaintext"/>
    </xsl:template>
    
    <xsl:template match="*:mn | mn | *[local-name()='mn'] | *:mi | mi | *[local-name()='mi'] | *:mo | mo | *[local-name()='mo'] | *:mtext | mtext | *[local-name()='mtext']" mode="mathml-to-plaintext">
        <xsl:value-of select="."/>
    </xsl:template>
    
    <xsl:template match="*:mfrac | mfrac | *[local-name()='mfrac']" mode="mathml-to-plaintext">
        <xsl:text>(</xsl:text>
        <xsl:apply-templates select="*[1]" mode="mathml-to-plaintext"/>
        <xsl:text>)/(</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-plaintext"/>
        <xsl:text>)</xsl:text>
    </xsl:template>
    
    <xsl:template match="*:msqrt | msqrt | *[local-name()='msqrt']" mode="mathml-to-plaintext">
        <xsl:text>√(</xsl:text>
        <xsl:apply-templates select="*" mode="mathml-to-plaintext"/>
        <xsl:text>)</xsl:text>
    </xsl:template>
    
    <xsl:template match="*:msup | msup | *[local-name()='msup']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*[1]" mode="mathml-to-plaintext"/>
        <xsl:text>^</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-plaintext"/>
    </xsl:template>
    
    <xsl:template match="*:msub | msub | *[local-name()='msub']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*[1]" mode="mathml-to-plaintext"/>
        <xsl:text>_</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-plaintext"/>
    </xsl:template>
    
    <xsl:template match="*:mrow | mrow | *[local-name()='mrow']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*" mode="mathml-to-plaintext"/>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- TEXT-ONLY MODE (for titles, etc.)                                  -->
    <!-- ================================================================== -->
    
    <xsl:template match="*" mode="text-only">
        <xsl:apply-templates select="text() | *" mode="text-only"/>
    </xsl:template>
    
    <xsl:template match="text()" mode="text-only">
        <xsl:value-of select="normalize-space(.)"/>
    </xsl:template>

    <xsl:template match="lb" mode="text-only">
        <xsl:text>&#10;</xsl:text>
    </xsl:template>
    
    <xsl:template match="emphasis | super | sub | ref | measurement" mode="text-only">
        <xsl:apply-templates select="text()" mode="text-only"/>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- CROSS-REFERENCE INDEX BUILDING                                     -->
    <!-- ================================================================== -->
    
    <xsl:template name="build-reference-index">
        <fn:array key="internal_references">
            <xsl:for-each select=".//ref[@type = 'internal']">
                <fn:map>
                    <fn:string key="source_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                    <fn:string key="target_id"><xsl:value-of select="@target"/></fn:string>
                    <fn:string key="display_type"><xsl:value-of select="@display-type"/></fn:string>
                    <xsl:if test="@pretext">
                        <fn:string key="pretext"><xsl:value-of select="@pretext"/></fn:string>
                    </xsl:if>
                </fn:map>
            </xsl:for-each>
        </fn:array>
        
        <fn:array key="external_references">
            <xsl:for-each select=".//ref[@type = 'external']">
                <fn:map>
                    <fn:string key="source_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                    <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                    <fn:string key="text"><xsl:value-of select="."/></fn:string>
                </fn:map>
            </xsl:for-each>
        </fn:array>
        
        <fn:array key="standard_references">
            <xsl:for-each select=".//ref[@type = 'standard']">
                <fn:map>
                    <fn:string key="source_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                    <fn:string key="standard_id"><xsl:value-of select="@target"/></fn:string>
                    <fn:string key="text"><xsl:value-of select="."/></fn:string>
                </fn:map>
            </xsl:for-each>
        </fn:array>
        
        <fn:array key="term_references">
            <xsl:for-each select=".//ref[@type = 'term']">
                <fn:map>
                    <fn:string key="source_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                    <fn:string key="term_id"><xsl:value-of select="@target"/></fn:string>
                    <fn:string key="text"><xsl:value-of select="."/></fn:string>
                </fn:map>
            </xsl:for-each>
        </fn:array>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- BC AMENDMENTS EXTRACTION                                           -->
    <!-- ================================================================== -->
    
    <xsl:template name="extract-bc-amendments">
        <!-- Extract change tracking elements -->
        <xsl:for-each select=".//change[@type != '']">
            <fn:map>
                <fn:string key="location_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                <xsl:if test="@amendment-id">
                    <fn:string key="amendment_id"><xsl:value-of select="@amendment-id"/></fn:string>
                </xsl:if>
                <xsl:if test="@effective-date">
                    <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                </xsl:if>
                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
            </fn:map>
        </xsl:for-each>
        
        <!-- Extract BC annotations -->
        <xsl:for-each select=".//bc-annotation">
            <fn:map>
                <fn:string key="location_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
                <fn:string key="type">annotation</fn:string>
                <fn:string key="annotation_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
            </fn:map>
        </xsl:for-each>
        
        <!-- Extract revision history entries (snapshot approach for date-based versioning) -->
        <xsl:for-each select=".//revision-history">
            <xsl:variable name="location-id" select="ancestor::*[@xml:id][1]/@xml:id"/>
            <!-- Output original baseline -->
            <fn:map>
                <fn:string key="location_id"><xsl:value-of select="$location-id"/></fn:string>
                <fn:string key="type">original</fn:string>
                <fn:string key="effective_date"><xsl:value-of select="original/@effective-date"/></fn:string>
                <fn:string key="content"><xsl:apply-templates select="original" mode="rich-text-json"/></fn:string>
            </fn:map>
            <!-- Output each revision snapshot -->
            <xsl:for-each select="revision">
                <fn:map>
                    <fn:string key="location_id"><xsl:value-of select="$location-id"/></fn:string>
                    <fn:string key="type">revision</fn:string>
                    <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                    <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                    <xsl:choose>
                        <xsl:when test="@seq and @seq != ''">
                            <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                        </xsl:when>
                        <xsl:otherwise>
                            <fn:null key="sequence"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                    <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                    <fn:string key="content"><xsl:apply-templates select="content" mode="rich-text-json"/></fn:string>
                    <xsl:if test="change-summary">
                        <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                    </xsl:if>
                    <xsl:if test="note">
                        <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                    </xsl:if>
                </fn:map>
            </xsl:for-each>
        </xsl:for-each>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- GLOSSARY BUILDING                                                  -->
    <!-- ================================================================== -->
    
    <xsl:template name="build-glossary">
        <xsl:for-each select=".//list[@type = 'definition']/item[@xml:id]">
            <fn:map key="{@xml:id}">
                <xsl:call-template name="emit-definition-item-fields">
                    <xsl:with-param name="item" select="."/>
                </xsl:call-template>
                <fn:string key="location_id"><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></fn:string>
            </fn:map>
        </xsl:for-each>
    </xsl:template>

    <xsl:template name="emit-definition-item-fields">
        <xsl:param name="item"/>
        <xsl:variable name="current-revision" select="$item/revision-history/revision[@status='current'][last()]"/>
        <xsl:variable name="content-node" select="
            if ($item/@revised='yes' and $item/revision-history) then
                if ($current-revision/content) then $current-revision/content else $item/revision-history/original
            else
                $item"/>
        <fn:string key="term"><xsl:apply-templates select="$content-node/term" mode="text-only"/></fn:string>
        <fn:string key="definition"><xsl:apply-templates select="$content-node/definition" mode="rich-text-json"/></fn:string>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- STANDARDS REFERENCE MAPPING                                        -->
    <!-- ================================================================== -->
    
    <xsl:template name="build-standards-reference">
        <!-- Build a mapping of standard-ref-id to standard details from table entries -->
        <xsl:for-each-group select=".//entry[@standard-ref-id]" group-by="@standard-ref-id">
            <xsl:sort select="@standard-ref-id"/>
            <fn:map key="{current-grouping-key()}">
                <fn:string key="standard_id"><xsl:value-of select="@standard-id"/></fn:string>
                <fn:string key="standard_ref_id"><xsl:value-of select="@standard-ref-id"/></fn:string>
                <fn:string key="title"><xsl:value-of select="@standard-ref-title"/></fn:string>
                <fn:string key="full_title"><xsl:apply-templates select="." mode="text-only"/></fn:string>
                
                <!-- Get agency and number from sibling entries in the same row -->
                <xsl:variable name="row" select="parent::row"/>
                <xsl:if test="$row/entry[@standard-ref-number]">
                    <fn:string key="number"><xsl:value-of select="$row/entry[@standard-ref-number]/@standard-ref-number"/></fn:string>
                    <fn:string key="full_number"><xsl:apply-templates select="$row/entry[@standard-ref-number]" mode="text-only"/></fn:string>
                </xsl:if>
                <xsl:if test="$row/entry[position() = 1 and not(@standard-ref-id) and not(@standard-ref-number)]">
                    <fn:string key="agency"><xsl:apply-templates select="$row/entry[1]" mode="text-only"/></fn:string>
                </xsl:if>
                
                <!-- Location information -->
                <fn:string key="table_id"><xsl:value-of select="ancestor::table[1]/@xml:id"/></fn:string>
                <fn:string key="location_id"><xsl:value-of select="(ancestor::article | ancestor::appendix-article | ancestor::note-division | ancestor::appendix)[last()]/@xml:id"/></fn:string>
            </fn:map>
        </xsl:for-each-group>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- REVISION HISTORY BUILDING TEMPLATES                               -->
    <!-- ================================================================== -->
    
    <!-- Build sentence revisions with consistent structure -->
    <xsl:template name="build-sentence-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="text"><xsl:apply-templates select="revision-history/original/text" mode="rich-text-json"/></fn:string>
            
            <!-- Clauses in original -->
            <xsl:if test="revision-history/original/clause">
                <fn:array key="clauses">
                    <xsl:apply-templates select="revision-history/original/clause" mode="json"/>
                </fn:array>
            </xsl:if>
            
            <xsl:if test="revision-history/original/see-also">
                <fn:array key="see_also">
                    <xsl:for-each select="revision-history/original/see-also">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or normalize-space(content) = ''">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="text"><xsl:apply-templates select="content/text" mode="rich-text-json"/></fn:string>
                
                <!-- Clauses in revision -->
                <xsl:if test="content/clause">
                    <fn:array key="clauses">
                        <xsl:apply-templates select="content/clause" mode="json"/>
                    </fn:array>
                </xsl:if>
                
                <xsl:if test="content/see-also">
                    <fn:array key="see_also">
                        <xsl:for-each select="content/see-also">
                            <fn:map>
                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build article revisions with consistent structure -->
    <xsl:template name="build-article-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="title"><xsl:apply-templates select="revision-history/original/title" mode="text-only"/></fn:string>
            <xsl:if test="revision-history/original/see-also">
                <fn:string key="see_also"><xsl:apply-templates select="revision-history/original/see-also" mode="rich-text-json"/></fn:string>
            </xsl:if>
            <fn:array key="content">
                <xsl:apply-templates select="revision-history/original/sentence | revision-history/original/table | revision-history/original/figure" mode="json"/>
            </fn:array>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or (not(content/sentence) and not(content/table) and not(content/figure) and normalize-space(content) = '')">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="title"><xsl:apply-templates select="content/title" mode="text-only"/></fn:string>
                <xsl:if test="content/see-also">
                    <fn:string key="see_also"><xsl:apply-templates select="content/see-also" mode="rich-text-json"/></fn:string>
                </xsl:if>
                <fn:array key="content">
                    <xsl:apply-templates select="content/sentence | content/table | content/figure" mode="json"/>
                </fn:array>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build table revisions with consistent structure -->
    <xsl:template name="build-table-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="title"><xsl:apply-templates select="revision-history/original/title" mode="rich-text-json"/></fn:string>
            <xsl:if test="revision-history/original/forming-part">
                <fn:array key="forming_part">
                    <xsl:for-each select="revision-history/original/forming-part/ref">
                        <fn:map>
                            <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                            <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                            <xsl:if test="@display-type">
                                <fn:string key="display_type"><xsl:value-of select="@display-type"/></fn:string>
                            </xsl:if>
                            <xsl:if test="text()">
                                <fn:string key="text"><xsl:value-of select="text()"/></fn:string>
                            </xsl:if>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            <xsl:if test="revision-history/original/table-notes/note or revision-history/original/title/note or revision-history/original/tgroup//note">
                <fn:array key="table_notes">
                    <xsl:for-each-group select="revision-history/original/table-notes/note | revision-history/original/title/note | revision-history/original/tgroup//note" group-by="@xml:id">
                        <xsl:sort select="current-grouping-key()"/>
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="current-grouping-key()"/></fn:string>
                            <xsl:if test="current-group()[1]/@vendor-id">
                                <fn:string key="vendor_id"><xsl:value-of select="current-group()[1]/@vendor-id"/></fn:string>
                            </xsl:if>
                            <xsl:call-template name="render-note-content">
                                <xsl:with-param name="note" select="current-group()[1]"/>
                            </xsl:call-template>
                        </fn:map>
                    </xsl:for-each-group>
                </fn:array>
            </xsl:if>
            <fn:map key="structure">
                <xsl:choose>
                    <xsl:when test="revision-history/original/tgroup/@cols and revision-history/original/tgroup/@cols != ''">
                        <fn:number key="columns"><xsl:value-of select="revision-history/original/tgroup/@cols"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="columns"/>
                    </xsl:otherwise>
                </xsl:choose>
                <xsl:if test="revision-history/original/tgroup/@colsep">
                    <fn:string key="colsep"><xsl:value-of select="revision-history/original/tgroup/@colsep"/></fn:string>
                </xsl:if>
                <xsl:if test="revision-history/original/tgroup/@rowsep">
                    <fn:string key="rowsep"><xsl:value-of select="revision-history/original/tgroup/@rowsep"/></fn:string>
                </xsl:if>
                
                <xsl:if test="revision-history/original/tgroup/colspec">
                    <fn:array key="column_specs">
                        <xsl:for-each select="revision-history/original/tgroup/colspec">
                            <fn:map>
                                <fn:string key="name"><xsl:value-of select="@colname"/></fn:string>
                                <fn:string key="width"><xsl:value-of select="@colwidth"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                
                <xsl:if test="revision-history/original/tgroup/thead">
                    <fn:array key="header_rows">
                        <xsl:apply-templates select="revision-history/original/tgroup/thead/row" mode="json"/>
                    </fn:array>
                </xsl:if>
                
                <fn:array key="body_rows">
                    <xsl:apply-templates select="revision-history/original/tgroup/tbody/row" mode="json"/>
                </fn:array>
            </fn:map>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or (not(content/tgroup) and normalize-space(content) = '')">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="title"><xsl:apply-templates select="content/title" mode="rich-text-json"/></fn:string>
                <xsl:if test="content/forming-part">
                    <fn:array key="forming_part">
                        <xsl:for-each select="content/forming-part/ref">
                            <fn:map>
                                <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                                <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
                                <xsl:if test="@display-type">
                                    <fn:string key="display_type"><xsl:value-of select="@display-type"/></fn:string>
                                </xsl:if>
                                <xsl:if test="text()">
                                    <fn:string key="text"><xsl:value-of select="text()"/></fn:string>
                                </xsl:if>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                <xsl:if test="content/table-notes/note or content/title/note or content/tgroup//note">
                    <fn:array key="table_notes">
                        <xsl:for-each-group select="content/table-notes/note | content/title/note | content/tgroup//note" group-by="@xml:id">
                            <xsl:sort select="current-grouping-key()"/>
                            <fn:map>
                                <fn:string key="id"><xsl:value-of select="current-grouping-key()"/></fn:string>
                                <xsl:if test="current-group()[1]/@vendor-id">
                                    <fn:string key="vendor_id"><xsl:value-of select="current-group()[1]/@vendor-id"/></fn:string>
                                </xsl:if>
                                <xsl:call-template name="render-note-content">
                                    <xsl:with-param name="note" select="current-group()[1]"/>
                                </xsl:call-template>
                            </fn:map>
                        </xsl:for-each-group>
                    </fn:array>
                </xsl:if>
                <fn:map key="structure">
                    <xsl:choose>
                        <xsl:when test="content/tgroup/@cols and content/tgroup/@cols != ''">
                            <fn:number key="columns"><xsl:value-of select="content/tgroup/@cols"/></fn:number>
                        </xsl:when>
                        <xsl:otherwise>
                            <fn:null key="columns"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:if test="content/tgroup/@colsep">
                        <fn:string key="colsep"><xsl:value-of select="content/tgroup/@colsep"/></fn:string>
                    </xsl:if>
                    <xsl:if test="content/tgroup/@rowsep">
                        <fn:string key="rowsep"><xsl:value-of select="content/tgroup/@rowsep"/></fn:string>
                    </xsl:if>
                    
                    <xsl:if test="content/tgroup/colspec">
                        <fn:array key="column_specs">
                            <xsl:for-each select="content/tgroup/colspec">
                                <fn:map>
                                    <fn:string key="name"><xsl:value-of select="@colname"/></fn:string>
                                    <fn:string key="width"><xsl:value-of select="@colwidth"/></fn:string>
                                </fn:map>
                            </xsl:for-each>
                        </fn:array>
                    </xsl:if>
                    
                    <xsl:if test="content/tgroup/thead">
                        <fn:array key="header_rows">
                            <xsl:apply-templates select="content/tgroup/thead/row" mode="json"/>
                        </fn:array>
                    </xsl:if>
                    
                    <fn:array key="body_rows">
                        <xsl:apply-templates select="content/tgroup/tbody/row" mode="json"/>
                    </fn:array>
                </fn:map>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build entry revisions with consistent structure -->
    <xsl:template name="build-entry-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="content"><xsl:apply-templates select="revision-history/original" mode="rich-text-json"/></fn:string>
            <xsl:if test="revision-history/original/@align">
                <fn:string key="align"><xsl:value-of select="revision-history/original/@align"/></fn:string>
            </xsl:if>
            <xsl:if test="revision-history/original/@valign">
                <fn:string key="valign"><xsl:value-of select="revision-history/original/@valign"/></fn:string>
            </xsl:if>
            <xsl:if test="revision-history/original/@colsep">
                <fn:string key="colsep"><xsl:value-of select="revision-history/original/@colsep"/></fn:string>
            </xsl:if>
            <xsl:if test="revision-history/original/@rowsep">
                <fn:string key="rowsep"><xsl:value-of select="revision-history/original/@rowsep"/></fn:string>
            </xsl:if>
            <xsl:if test="revision-history/original/@colname">
                <fn:string key="colname"><xsl:value-of select="revision-history/original/@colname"/></fn:string>
            </xsl:if>
            <xsl:if test="revision-history/original/@rowspan and revision-history/original/@rowspan != ''">
                <fn:number key="rowspan"><xsl:value-of select="revision-history/original/@rowspan"/></fn:number>
            </xsl:if>
            <xsl:if test="revision-history/original/@colspan and revision-history/original/@colspan != ''">
                <fn:number key="colspan"><xsl:value-of select="revision-history/original/@colspan"/></fn:number>
            </xsl:if>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or normalize-space(content) = ''">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="content"><xsl:apply-templates select="content" mode="rich-text-json"/></fn:string>
                <xsl:if test="content/@align">
                    <fn:string key="align"><xsl:value-of select="content/@align"/></fn:string>
                </xsl:if>
                <xsl:if test="content/@valign">
                    <fn:string key="valign"><xsl:value-of select="content/@valign"/></fn:string>
                </xsl:if>
                <xsl:if test="content/@colsep">
                    <fn:string key="colsep"><xsl:value-of select="content/@colsep"/></fn:string>
                </xsl:if>
                <xsl:if test="content/@rowsep">
                    <fn:string key="rowsep"><xsl:value-of select="content/@rowsep"/></fn:string>
                </xsl:if>
                <xsl:if test="content/@colname">
                    <fn:string key="colname"><xsl:value-of select="content/@colname"/></fn:string>
                </xsl:if>
                <xsl:if test="content/@rowspan and content/@rowspan != ''">
                    <fn:number key="rowspan"><xsl:value-of select="content/@rowspan"/></fn:number>
                </xsl:if>
                <xsl:if test="content/@colspan and content/@colspan != ''">
                    <fn:number key="colspan"><xsl:value-of select="content/@colspan"/></fn:number>
                </xsl:if>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build application note revisions with consistent structure -->
    <xsl:template name="build-appnote-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="number"><xsl:value-of select="revision-history/original/number"/></fn:string>
            <fn:string key="title"><xsl:apply-templates select="revision-history/original/title" mode="text-only"/></fn:string>
            <xsl:if test="revision-history/original/paragraph">
                <fn:array key="paragraphs">
                    <xsl:for-each select="revision-history/original/paragraph">
                        <fn:map>
                            <xsl:if test="@xml:id">
                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            </xsl:if>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or (not(content/number) and not(content/title) and not(content/paragraph) and normalize-space(content) = '')">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="number"><xsl:value-of select="content/number"/></fn:string>
                <fn:string key="title"><xsl:apply-templates select="content/title" mode="text-only"/></fn:string>
                <xsl:if test="content/paragraph">
                    <fn:array key="paragraphs">
                        <xsl:for-each select="content/paragraph">
                            <fn:map>
                                <xsl:if test="@xml:id">
                                    <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                </xsl:if>
                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build subsection revisions with consistent structure -->
    <xsl:template name="build-subsection-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="title"><xsl:apply-templates select="revision-history/original/title" mode="text-only"/></fn:string>
            <xsl:if test="revision-history/original/see-also">
                <fn:string key="see_also"><xsl:apply-templates select="revision-history/original/see-also" mode="rich-text-json"/></fn:string>
            </xsl:if>
            <fn:array key="articles">
                <xsl:apply-templates select="revision-history/original/article" mode="json"/>
            </fn:array>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or (not(content/title) and not(content/article) and normalize-space(content) = '')">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="title"><xsl:apply-templates select="content/title" mode="text-only"/></fn:string>
                <xsl:if test="content/see-also">
                    <fn:string key="see_also"><xsl:apply-templates select="content/see-also" mode="rich-text-json"/></fn:string>
                </xsl:if>
                <fn:array key="articles">
                    <xsl:apply-templates select="content/article" mode="json"/>
                </fn:array>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build title revisions (for child-element amendments) -->
    <xsl:template name="build-title-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="title/revision-history/original/@effective-date"/></fn:string>
            <fn:string key="text"><xsl:value-of select="normalize-space(title/revision-history/original)"/></fn:string>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="title/revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <fn:string key="text"><xsl:value-of select="normalize-space(content)"/></fn:string>
                
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build clause revisions with consistent structure -->
    <xsl:template name="build-clause-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="text"><xsl:apply-templates select="revision-history/original/text" mode="rich-text-json"/></fn:string>
            <xsl:if test="revision-history/original/see-also">
                <fn:array key="see_also">
                    <xsl:for-each select="revision-history/original/see-also">
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            <xsl:if test="revision-history/original/subclause">
                <fn:array key="subclauses">
                    <xsl:apply-templates select="revision-history/original/subclause" mode="json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or normalize-space(content) = ''">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="text"><xsl:apply-templates select="content/text" mode="rich-text-json"/></fn:string>
                <xsl:if test="content/see-also">
                    <fn:array key="see_also">
                        <xsl:for-each select="content/see-also">
                            <fn:map>
                                <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
                            </fn:map>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
                <xsl:if test="content/subclause">
                    <fn:array key="subclauses">
                        <xsl:apply-templates select="content/subclause" mode="json"/>
                    </fn:array>
                </xsl:if>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build subclause revisions with consistent structure -->
    <xsl:template name="build-subclause-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="text"><xsl:apply-templates select="revision-history/original/text" mode="rich-text-json"/></fn:string>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or normalize-space(content) = ''">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="text"><xsl:apply-templates select="content/text" mode="rich-text-json"/></fn:string>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build paragraph revisions with consistent structure -->
    <xsl:template name="build-paragraph-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:string key="content"><xsl:apply-templates select="revision-history/original/node()" mode="rich-text-json"/></fn:string>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or normalize-space(content) = ''">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <fn:string key="content"><xsl:apply-templates select="content/node()" mode="rich-text-json"/></fn:string>
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Build row revisions with consistent structure -->
    <xsl:template name="build-row-revisions">
        <!-- Original baseline -->
        <fn:map>
            <fn:string key="type">original</fn:string>
            <fn:string key="effective_date"><xsl:value-of select="revision-history/original/@effective-date"/></fn:string>
            <fn:array key="cells">
                <xsl:apply-templates select="revision-history/original/entry" mode="json"/>
            </fn:array>
        </fn:map>
        
        <!-- Each revision -->
        <xsl:for-each select="revision-history/revision">
            <fn:map>
                <fn:string key="type">revision</fn:string>
                <fn:string key="revision_type"><xsl:value-of select="@type"/></fn:string>
                <fn:string key="revision_id"><xsl:value-of select="@id"/></fn:string>
                <xsl:choose>
                    <xsl:when test="@seq and @seq != ''">
                        <fn:number key="sequence"><xsl:value-of select="@seq"/></fn:number>
                    </xsl:when>
                    <xsl:otherwise>
                        <fn:null key="sequence"/>
                    </xsl:otherwise>
                </xsl:choose>
                <fn:string key="effective_date"><xsl:value-of select="@effective-date"/></fn:string>
                <fn:string key="status"><xsl:value-of select="@status"/></fn:string>
                
                <!-- Deleted flag for revision (check if content is empty indicating deletion) -->
                <xsl:choose>
                    <xsl:when test="not(content/node()) or (not(content/entry) and normalize-space(content) = '')">
                        <fn:boolean key="deleted">true</fn:boolean>
                    </xsl:when>
                </xsl:choose>
                
                <!-- Cells array -->
                <fn:array key="cells">
                    <xsl:apply-templates select="content/entry" mode="json"/>
                </fn:array>
                
                <xsl:if test="change-summary">
                    <fn:string key="change_summary"><xsl:value-of select="change-summary"/></fn:string>
                </xsl:if>
                <xsl:if test="note">
                    <fn:string key="note"><xsl:value-of select="note"/></fn:string>
                </xsl:if>
            </fn:map>
        </xsl:for-each>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- INDEX AND CONVERSIONS PROCESSING (NOW IN VOLUMES)                 -->
    <!-- ================================================================== -->
    
    <!-- Index JSON output -->
    <xsl:template match="index" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">index</fn:string>
        
        <!-- Introduction note if present -->
        <xsl:if test="note">
            <fn:string key="introduction"><xsl:apply-templates select="note" mode="rich-text-json"/></fn:string>
        </xsl:if>
        
        <!-- Letter groupings (A-Z) -->
        <fn:array key="letters">
            <xsl:apply-templates select="index-letter" mode="json"/>
        </fn:array>
    </xsl:template>
    
    <!-- Index letter groupings -->
    <xsl:template match="index-letter" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="letter"><xsl:value-of select="@letter"/></fn:string>
            
            <!-- Index groups within this letter -->
            <fn:array key="groups">
                <xsl:apply-templates select="index-group" mode="json"/>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- Index groups -->
    <xsl:template match="index-group" mode="json">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            
            <!-- Main term -->
            <fn:string key="term_id"><xsl:value-of select="index-term-group[1]/@xml:id"/></fn:string>
            <fn:string key="term"><xsl:apply-templates select="index-term-group[1]/index-term" mode="rich-text-json"/></fn:string>
            
            <!-- References for main term -->
            <xsl:if test="index-term-group[1]/index-ref">
                <fn:array key="references">
                    <xsl:apply-templates select="index-term-group[1]/index-ref" mode="json"/>
                </fn:array>
            </xsl:if>
            
            <!-- Sub-terms if present -->
            <xsl:if test="index-subterm-group">
                <fn:array key="subterms">
                    <xsl:apply-templates select="index-subterm-group/index-term-group" mode="json-subterm"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- Sub-term -->
    <xsl:template match="index-term-group" mode="json-subterm">
        <fn:map>
            <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
            <fn:string key="term"><xsl:apply-templates select="index-term" mode="rich-text-json"/></fn:string>
            
            <!-- References for sub-term -->
            <xsl:if test="index-ref">
                <fn:array key="references">
                    <xsl:apply-templates select="index-ref" mode="json"/>
                </fn:array>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- Index reference -->
    <xsl:template match="index-ref" mode="json">
        <fn:map>
            <fn:string key="target"><xsl:value-of select="@target"/></fn:string>
            <xsl:if test="@division">
                <fn:string key="division"><xsl:value-of select="@division"/></fn:string>
            </xsl:if>
            <xsl:if test="@vendor-target">
                <fn:string key="vendor_target"><xsl:value-of select="@vendor-target"/></fn:string>
            </xsl:if>
        </fn:map>
    </xsl:template>
    
    <!-- Conversions JSON output -->
    <xsl:template match="conversions" mode="json">
        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
        <fn:string key="type">conversions</fn:string>
        
        <!-- Conversion factors table - extract table properties without nesting the full table object -->
        <xsl:variable name="conv-table" select="table"/>
        <fn:string key="table_id"><xsl:value-of select="$conv-table/@xml:id"/></fn:string>
        <fn:string key="table_title"><xsl:apply-templates select="$conv-table/title" mode="rich-text-json"/></fn:string>
        
        <fn:map key="table_structure">
            <xsl:choose>
                <xsl:when test="$conv-table/tgroup/@cols and $conv-table/tgroup/@cols != ''">
                    <fn:number key="columns"><xsl:value-of select="$conv-table/tgroup/@cols"/></fn:number>
                </xsl:when>
                <xsl:otherwise>
                    <fn:null key="columns"/>
                </xsl:otherwise>
            </xsl:choose>
            
            <xsl:if test="$conv-table/tgroup/colspec">
                <fn:array key="column_specs">
                    <xsl:for-each select="$conv-table/tgroup/colspec">
                        <fn:map>
                            <fn:string key="name"><xsl:value-of select="@colname"/></fn:string>
                            <fn:string key="width"><xsl:value-of select="@colwidth"/></fn:string>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:if>
            
            <xsl:if test="$conv-table/tgroup/thead">
                <fn:array key="header_rows">
                    <xsl:apply-templates select="$conv-table/tgroup/thead/row" mode="json"/>
                </fn:array>
            </xsl:if>
            
            <fn:array key="body_rows">
                <xsl:apply-templates select="$conv-table/tgroup/tbody/row" mode="json"/>
            </fn:array>
        </fn:map>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- GENERIC LIST EXTRACTION                                            -->
    <!-- Extracts all list types as structured "lists" array                -->
    <!-- Called with context node being the element containing lists         -->
    <!-- Parameter: content-root - the node whose descendant lists to extract -->
    <!-- ================================================================== -->
    
    <xsl:template name="extract-lists">
        <xsl:param name="content-root"/>
        <xsl:if test="$content-root//list">
            <fn:array key="lists">
                <xsl:for-each select="$content-root//list">
                    <fn:map>
                        <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                        <xsl:if test="header">
                            <fn:string key="header"><xsl:value-of select="header"/></fn:string>
                        </xsl:if>
                        <fn:array key="items">
                            <xsl:for-each select="item">
                                <fn:map>
                                    <xsl:if test="@xml:id">
                                        <fn:string key="id"><xsl:value-of select="@xml:id"/></fn:string>
                                    </xsl:if>
                                    <xsl:choose>
                                        <!-- Variable list: symbol + description -->
                                        <xsl:when test="parent::list/@type = 'variable'">
                                            <fn:string key="symbol"><xsl:apply-templates select="variable" mode="rich-text-json"/></fn:string>
                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                        </xsl:when>
                                        <!-- Symbol list: symbol + description -->
                                        <xsl:when test="parent::list/@type = 'symbol'">
                                            <fn:string key="symbol"><xsl:apply-templates select="symbol" mode="rich-text-json"/></fn:string>
                                            <fn:string key="description"><xsl:apply-templates select="description" mode="rich-text-json"/></fn:string>
                                        </xsl:when>
                                        <!-- Definition list: term + definition -->
                                        <xsl:when test="parent::list/@type = 'definition'">
                                            <xsl:call-template name="emit-definition-item-fields">
                                                <xsl:with-param name="item" select="."/>
                                            </xsl:call-template>
                                        </xsl:when>
                                        <!-- Organization list: abbreviation + fullName + website -->
                                        <xsl:when test="parent::list/@type = 'organization'">
                                            <fn:string key="abbreviation"><xsl:apply-templates select="organization" mode="text-only"/></fn:string>
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
                                        <!-- All other list types (bulleted, numbered, alphabetic): content -->
                                        <xsl:otherwise>
                                            <fn:string key="content"><xsl:apply-templates select="." mode="rich-text-json"/></fn:string>
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
