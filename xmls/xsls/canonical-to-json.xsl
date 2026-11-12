<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:fn="http://www.w3.org/2005/xpath-functions"
                xmlns:bcf="urn:bcbc:json-functions"
                exclude-result-prefixes="xs fn bcf">
    
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
                        <!-- CLAUDE-AUTOFIX CL-026 CF-01777 | issue 1017 | Note markers in tables inside an appendix Note are written as short note references, so they show as (3) as in the PDF. -->
                        <xsl:when test="self::note[@xml:id][contains(@xml:id, '.appnote')]">
                            <fn:map>
                                <fn:string key="type">text</fn:string>
                                <fn:string key="value"> [REF:internal:<xsl:value-of select="@xml:id"/>:short] </fn:string>
                            </fn:map>
                        </xsl:when>
                        <!-- CLAUDE-AUTOFIX CL-036 CF-05801 | issue 9972 | Inline header notes with ids ending fnN (Tables 9.36.2.7.-A/-B/-D) are written as short note references labelled (N), so they show as (1) as in the PDF, not (fn1). -->
                        <xsl:when test="self::note[@xml:id][matches(@xml:id, '\.fn\d+$')]">
                            <fn:map>
                                <fn:string key="type">text</fn:string>
                                <fn:string key="value"> [REF:internal:<xsl:value-of select="@xml:id"/>:short:(<xsl:value-of select="replace(@xml:id, '^.*\.fn', '')"/>)] </fn:string>
                            </fn:map>
                        </xsl:when>
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
                                <!-- CLAUDE-AUTOFIX CL-007 CF-07500 | issue 4844 | The Part 9 span tables print no title above their drawings in the PDF: keep the description as alt text only. -->
                                <xsl:if test="@alt and not(ancestor::table[starts-with(@xml:id, 'nbc.divBV2.part9.spectables1.')])">
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
                            <xsl:variable name="text-content-raw">
                                <xsl:apply-templates select="." mode="rich-text-json"/>
                            </xsl:variable>
                            <!-- CLAUDE-AUTOFIX CL-034 CF-04985 | issue 8938 | In a table cell with figures, a defined term followed by a comma or other closing punctuation gets no trailing space, as in the PDF (braced wall band, partially clad). -->
                            <xsl:variable name="text-content" select="if (self::ref and following-sibling::node()[1][self::text()][matches(., '^[,.;:)]')]) then replace($text-content-raw, '\s+$', '') else $text-content-raw"/>
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
                            <!-- CLAUDE-AUTOFIX CL-026 CF-01777 | issue 1017 | Note markers in tables inside an appendix Note are written as short note references, so they show as (3) as in the PDF. -->
                            <xsl:when test="self::note[@xml:id][contains(@xml:id, '.appnote')]">
                                <xsl:text>[REF:internal:</xsl:text>
                                <xsl:value-of select="@xml:id"/>
                                <xsl:text>:short]</xsl:text>
                            </xsl:when>
                            <!-- CLAUDE-AUTOFIX CL-036 CF-05801 | issue 9972 | Inline header notes with ids ending fnN (Tables 9.36.2.7.-A/-B/-D) are written as short note references labelled (N), so they show as (1) as in the PDF, not (fn1). -->
                            <xsl:when test="self::note[@xml:id][matches(@xml:id, '\.fn\d+$')]">
                                <xsl:text>[REF:internal:</xsl:text>
                                <xsl:value-of select="@xml:id"/>
                                <xsl:text>:short:(</xsl:text>
                                <xsl:value-of select="replace(@xml:id, '^.*\.fn', '')"/>
                                <xsl:text>)]</xsl:text>
                            </xsl:when>
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
        <!-- BBC-311: drop an "of Division X" that the preceding reference took into its link -->
        <xsl:variable name="txt" select="
            if (preceding-sibling::node()[1][self::ref][exists(bcf:div-suffix(.))])
            then replace(., '^\s*\.?\s*of Division [A-C]', '') else string(.)"/>
        <!-- Normalize whitespace but preserve word boundaries -->
        <!-- CLAUDE-AUTOFIX CL-017 CF-01112 | issue 9346 | Straight double quotes in the text print as curly quotes, as in the PDF (merged with develop: works on $txt, BBC-311). -->
        <xsl:variable name="q-open" select="replace($txt, '([\s(\[&#8212;&#8211;])&quot;', '$1&#8220;')"/>
        <xsl:variable name="q-first" select="if (starts-with($q-open, '&quot;') and not(preceding-sibling::node())) then concat('&#8220;', substring($q-open, 2)) else $q-open"/>
        <!-- CLAUDE-AUTOFIX CL-017 CF-01112 | issue 9346 | The PDF prints straight quotes in Division C appendix note appnote12 (Letters of Assurance guidance), Table 9.23.13.7 note (3) and Division A Table 1.1.1.1 row 4, so those keep them (approved by user 2026-11-10). -->
        <xsl:variable name="keep-straight" as="xs:boolean" select="matches(string((ancestor::*[@xml:id])[last()]/@xml:id), '^(nbc\.divC\.part2\.appendix\.appnote12|nbc\.divBV2\.part9\.sect23\.subsect13\.art7\.table4\.note4|nbc\.divA\.part1\.sect1\.subsect1\.art1\.table1\.row4)(\.|$)')"/>
        <xsl:variable name="normalized" select="if ($keep-straight) then normalize-space($txt) else normalize-space(replace($q-first, '&quot;', '&#8221;'))"/>
        <xsl:if test="$normalized != ''">
            <!-- Add leading space if original text started with whitespace and we're not first -->
            <xsl:if test="preceding-sibling::node() and matches($txt, '^\s')">
                <xsl:text> </xsl:text>
            </xsl:if>
            <xsl:value-of select="$normalized"/>
            <!-- Add trailing space if original text ended with whitespace and we're not last -->
            <xsl:if test="following-sibling::node() and matches($txt, '\s$')">
                <xsl:text> </xsl:text>
            </xsl:if>
        </xsl:if>
    </xsl:template>

    <xsl:template match="lb" mode="rich-text-json">
        <xsl:text>&#10;</xsl:text>
    </xsl:template>
    
    <!-- CLAUDE-AUTOFIX CL-033 CF-02294 | issue 10097 | A bold title at the start of a table cell, joined straight to the text, goes on its own line, as in the PDF (Table 4.1.8.6.). -->
    <xsl:template match="entry/emphasis[@style = 'bold'][not(preceding-sibling::node()[self::* or self::text()[normalize-space()]])][following-sibling::node()[1][self::text()][matches(., '^\S')]]" mode="rich-text-json" priority="1">
        <xsl:next-match/>
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
    
    <!-- CLAUDE-AUTOFIX CL-001 | CF-00900 issue 8016 | Print standard references as the PDF does: curly quotes, comma or period inside the closing quote, and the style of the base XML. -->
    <xsl:key name="standard-entry-by-ref-id" match="entry[@standard-ref-id]" use="@standard-ref-id"/>

    <!-- CLAUDE-AUTOFIX CL-055 CF-00045 | issue 27 | A standard reference in abbreviated style prints its abbreviation, as in the PDF (the NFC, the NECB, the NPC, the NBC 2015). -->
    <xsl:template match="ref[@type = 'standard'][@ref-style = 'abbr']" mode="rich-text-json" priority="3">
        <xsl:variable name="abbr" select="if (@target = 'nrcc-nfc') then 'NFC' else if (@target = 'nrcc-necb') then 'NECB' else if (@target = 'nrcc-npc') then 'NPC' else if (@target = 'nrcc56190') then 'NBC 2015' else ''"/>
        <xsl:choose>
            <xsl:when test="$abbr != ''">
                <xsl:variable name="prev" select="preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
                <xsl:if test="$prev[self::ref] or $prev[self::text() and not(matches(., '[\s(&#8220;]$'))]"><xsl:text> </xsl:text></xsl:if>
                <xsl:value-of select="$abbr"/>
            </xsl:when>
            <xsl:otherwise><xsl:next-match/></xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- CLAUDE-AUTOFIX CL-013 CF-00914 | issue 8022 | Standard references from the BC amendments (no ref-style) print as in the PDF: curly quotes, punctuation inside, agency only when not already in the number. -->
    <xsl:template match="ref[@type = 'standard'][not(@ref-style = 'abbr')]" mode="rich-text-json" priority="2">
        <xsl:variable name="entry" select="(key('standard-entry-by-ref-id', @target), key('standard-entry-by-ref-id', concat('d-', @target)), key('standard-entry-by-ref-id', replace(@target, '^d-', '')))[1]"/>
        <xsl:variable name="row" select="$entry/parent::row"/>
        <xsl:variable name="number" select="normalize-space($row/entry[@standard-ref-number][1]/@standard-ref-number)"/>
        <xsl:variable name="agency" select="normalize-space($row/entry[1][not(@standard-ref-id) and not(@standard-ref-number)])"/>
        <xsl:variable name="title" select="normalize-space($entry/@standard-ref-title)"/>
        <xsl:variable name="bare" as="xs:boolean" select="not(@ref-style) and normalize-space(.) = '' and not(matches($number, '^NRCC-|Edition'))"/>
        <xsl:variable name="next-node" select="following-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
        <xsl:variable name="next-text" select="string($next-node[self::text()])"/>
        <xsl:variable name="title-written" as="xs:boolean" select="$bare and matches($next-text, '^\s*,\s*[&#8220;&quot;]')"/>
        <xsl:variable name="bare-punc" select="if (not($next-node)) then (if (parent::entry or parent::title or parent::caption) then '' else if (parent::text/parent::*[self::clause or self::subclause][following-sibling::clause or following-sibling::subclause]) then ',' else '.') else if (matches($next-text, '^\s*(\.|\(See\s)')) then '.' else if (matches($next-text, '^\s*[;:()\]]')) then '' else ','"/>
        <xsl:variable name="punc" select="if ($bare and not(@ref-punc)) then $bare-punc else if (@ref-style = ('notitle', 'number') or @ref-punc = 'none') then '' else if (@ref-punc = 'period') then '.' else ','"/>
        <!-- CLAUDE-AUTOFIX CL-039 CF-10141 | issue 3760 | A standard printed as agency plus number leaves out the agency when the number already contains it, as in the PDF (CAN/CSA A82.27-M, not CSA CAN/CSA A82.27-M). -->
        <xsl:variable name="full-number" select="normalize-space(concat(if ($agency != '' and not(contains($number, $agency))) then concat($agency, ' ') else '', $number))"/>
        <xsl:variable name="text" select="
            if ($bare) then concat(if ($agency != '' and not(contains($number, $agency))) then concat($agency, ' ') else '', $number, ', &#8220;', $title, $punc, '&#8221;')
            else if (@ref-style = 'noagency') then concat($number, ', &#8220;', $title, $punc, '&#8221;')
            else if (@ref-style = 'notitle') then $full-number
            else if (@ref-style = 'number') then $number
            else if (@ref-style = 'title') then concat('&#8220;', $title, $punc, '&#8221;')
            else if (@ref-style = 'nqtitle') then concat($title, $punc)
            else concat($full-number, ', &#8220;', $title, $punc, '&#8221;')"/>
        <xsl:choose>
            <xsl:when test="not($entry) or $number = '' or $title = '' or $title-written or (not(@ref-style) and not($bare))">
                <xsl:next-match/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="next-significant" select="following-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
                <xsl:variable name="prev-significant" select="preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
                <xsl:if test="$prev-significant[self::text() and not(matches(., '[\s(\[&#8220;&#8216;]$'))] or $prev-significant[self::ref]">
                    <xsl:text> </xsl:text>
                </xsl:if>
                <xsl:value-of select="$text"/>
                <xsl:if test="$next-significant[self::text() and not(matches(., '^[\s,.;:)\]]'))] or $next-significant[self::ref]">
                    <xsl:text> </xsl:text>
                </xsl:if>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- CLAUDE-AUTOFIX CL-013 CF-00914 | issue 8022 | The comma or period after a BC amendment standard reference now sits inside its closing quote, so drop it from the following text. -->
    <xsl:template match="text()[matches(., '^\s*[,.]')][preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'standard'][not(@ref-style)][not(@ref-punc)][normalize-space(.) = '']]]" mode="rich-text-json" priority="2">
        <xsl:variable name="ref" select="preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
        <xsl:variable name="entry" select="(key('standard-entry-by-ref-id', $ref/@target), key('standard-entry-by-ref-id', concat('d-', $ref/@target)), key('standard-entry-by-ref-id', replace($ref/@target, '^d-', '')))[1]"/>
        <xsl:choose>
            <xsl:when test="not($entry) or normalize-space($entry/parent::row/entry[@standard-ref-number][1]/@standard-ref-number) = '' or matches(normalize-space($entry/parent::row/entry[@standard-ref-number][1]/@standard-ref-number), '^NRCC-|Edition') or normalize-space($entry/@standard-ref-title) = '' or matches(., '^\s*,\s*[&#8220;&quot;]')">
                <xsl:next-match/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="rest" select="replace(., '^\s*[,.]', '')"/>
                <xsl:if test="normalize-space($rest) != ''">
                    <xsl:if test="matches($rest, '^\s')">
                        <xsl:text> </xsl:text>
                    </xsl:if>
                    <xsl:value-of select="normalize-space($rest)"/>
                    <xsl:if test="following-sibling::node() and matches(., '\s$')">
                        <xsl:text> </xsl:text>
                    </xsl:if>
                </xsl:if>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- CLAUDE-AUTOFIX CL-002 CF-02489 | issue 1305 | Title rows of the attribution tables are bold in the PDF: bold a spanning cell that holds only a title cross-reference. -->
    <xsl:template match="row/entry[@colspan]/ref[@type = 'internal'][@display-type = 'title'][not(preceding-sibling::node()[self::* or self::text()[normalize-space()]] or following-sibling::node()[self::* or self::text()[normalize-space()]])]" mode="rich-text-json" priority="1">
        <xsl:text>&lt;bold&gt;</xsl:text>
        <xsl:next-match/>
        <xsl:text>&lt;/bold&gt;</xsl:text>
    </xsl:template>
    <!-- ================================================================== -->
    <!-- BBC-310 / BBC-311: reference label helpers                          -->
    <!--  - BBC-310: second reference of a range ("Sentences (2) to (7)")    -->
    <!--    gets its short label baked in, so the site does not repeat the   -->
    <!--    type word ("to Sentence (7)").                                  -->
    <!--  - BBC-311: a plain-text "of Division X" right after a reference   -->
    <!--    is moved inside the link label.                                 -->
    <!-- ================================================================== -->
    <xsl:key name="bcf-by-id" match="*[@xml:id]" use="string(@xml:id)"/>

    <xsl:function name="bcf:target" as="element()?">
        <xsl:param name="ref" as="element()"/>
        <xsl:sequence select="if ($ref/@target and root($ref) instance of document-node())
                              then key('bcf-by-id', string($ref/@target), root($ref))[1] else ()"/>
    </xsl:function>

    <!-- Full number of a code element, e.g. 3.2.1.4. / 1.3.3.3.(2) / 2.2.7.2.(1)(a)(iv).
         Empty for appendix / spec-table content and anything without a complete number. -->
    <xsl:function name="bcf:full-number" as="xs:string?">
        <xsl:param name="e" as="element()?"/>
        <xsl:variable name="pt" select="string($e/ancestor-or-self::part[1]/@number)"/>
        <xsl:variable name="sc" select="string($e/ancestor-or-self::section[1]/@number)"/>
        <xsl:variable name="ss" select="string($e/ancestor-or-self::subsection[1]/@number)"/>
        <xsl:variable name="ar" select="string($e/ancestor-or-self::article[1]/@number)"/>
        <xsl:variable name="art" select="if ($pt != '' and $sc != '' and $ss != '' and $ar != '') then concat($pt, '.', $sc, '.', $ss, '.', $ar, '.') else ''"/>
        <xsl:variable name="snt" select="$e/ancestor-or-self::sentence[1]"/>
        <xsl:variable name="sent" select="if ($art != '' and $snt/@number) then concat($art, '(', $snt/@number, ')') else ''"/>
        <xsl:variable name="cl" select="$e/ancestor-or-self::clause[1]"/>
        <xsl:variable name="clause" select="if ($sent != '' and $cl/@letter) then concat($sent, '(', $cl/@letter, ')') else ''"/>
        <xsl:variable name="n" select="local-name($e)"/>
        <xsl:variable name="r" select="
            if (empty($e) or matches(string($e/@xml:id), 'appendix|spectables')) then ''
            else if ($n = 'part') then $pt
            else if ($n = 'section' and $pt != '' and $sc != '') then concat($pt, '.', $sc, '.')
            else if ($n = 'subsection' and $pt != '' and $sc != '' and $ss != '') then concat($pt, '.', $sc, '.', $ss, '.')
            else if ($n = 'article') then $art
            else if ($n = 'sentence') then $sent
            else if ($n = 'clause') then $clause
            else if ($n = 'subclause' and $clause != '' and $e/@number castable as xs:integer)
                then concat($clause, '(', format-integer(xs:integer($e/@number), 'i'), ')')
            else ''"/>
        <xsl:sequence select="if ($r != '') then $r else ()"/>
    </xsl:function>

    <!-- Type word for a code element -->
    <xsl:function name="bcf:type-word" as="xs:string">
        <xsl:param name="e" as="element()?"/>
        <xsl:variable name="n" select="local-name($e)"/>
        <xsl:sequence select="
            if ($n = 'part') then 'Part' else if ($n = 'section') then 'Section'
            else if ($n = 'subsection') then 'Subsection' else if ($n = 'article') then 'Article'
            else if ($n = 'sentence') then 'Sentence' else if ($n = 'clause') then 'Clause'
            else if ($n = 'subclause') then 'Subclause' else ''"/>
    </xsl:function>

    <!-- Text that sits immediately before a reference (its pretext, or the preceding text node) -->
    <xsl:function name="bcf:text-before" as="xs:string">
        <xsl:param name="ref" as="element()"/>
        <xsl:sequence select="if ($ref/@pretext) then string($ref/@pretext)
                              else string($ref/preceding-sibling::node()[1][self::text()])"/>
    </xsl:function>

    <!-- BBC-310: short label for the second reference of a range "X to Y" / "X through Y" -->
    <xsl:function name="bcf:range-label" as="xs:string?">
        <xsl:param name="ref" as="element()"/>
        <xsl:variable name="prev-ref" select="$ref/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref]
                                              | $ref/preceding-sibling::*[1][self::ref][not($ref/preceding-sibling::node()[1][self::text() and normalize-space(.) != ''])]"/>
        <xsl:variable name="before" select="bcf:text-before($ref)"/>
        <xsl:variable name="between" select="string($ref/preceding-sibling::node()[1][self::text()])"/>
        <xsl:variable name="is-range" select="$ref/@type = 'internal' and normalize-space($ref) = ''
            and exists($ref/preceding-sibling::*[1][self::ref])
            and (
                (not($ref/@pretext) and matches($between, '^\s*(to|through)\s*$'))
                or ($ref/@pretext and matches(string($ref/@pretext), '^\s*(to|through)\s*$') and normalize-space($between) = '')
            )"/>
        <!-- CLAUDE-AUTOFIX CL-041 CF-10451 | issue 2621 | Range label only when both ends are the same kind (Clause ... to Article is not a range), and a sentence is numbered from its id, as in the PDF (Sentences (3) to (6)). -->
        <xsl:variable name="t" select="if ($is-range and local-name(bcf:target($ref/preceding-sibling::*[1][self::ref])) = local-name(bcf:target($ref))) then bcf:target($ref) else ()"/>
        <xsl:variable name="n" select="local-name($t)"/>
        <xsl:variable name="full" select="bcf:full-number($t)"/>
        <!-- CLAUDE-AUTOFIX CL-059 CF-09869 | issue 3018 | A short reference to a Subclause prints its Clause letter too, as in the PDF ((a)(ii) to (a)(iv), (d)(i)). -->
        <xsl:sequence select="
            if (empty($full)) then ()
            else if ($n = 'sentence') then concat('(', replace(string($ref/@target), '^.*\.sent(\d+).*$', '$1'), ')')
            else if ($n = 'clause') then concat('(', $t/@letter, ')')
            else if ($n = 'subclause') then (if ($ref/preceding-sibling::*[1][self::ref]/@display-type = 'short') then replace($full, '^.*(\([a-z]+\)\([^)]+\))$', '$1') else replace($full, '^.*(\([^)]+\))$', '$1'))
            else if ($n = ('article', 'subsection', 'section')) then $full
            else ()"/>
    </xsl:function>

    <!-- BBC-311: Division letter when the reference is directly followed by "of Division X"
         and a link label can be built for it -->
    <xsl:function name="bcf:div-suffix" as="xs:string?">
        <xsl:param name="ref" as="element()"/>
        <xsl:variable name="next" select="$ref/following-sibling::node()[1][self::text()]"/>
        <xsl:variable name="ok" select="$ref/@type = 'internal' and exists($next)
            and matches(string($next), '^\s*\.?\s*of Division [A-C]([^A-Za-z].*)?$', 's')
            and not(contains(string($ref), 'of Division'))
            and (normalize-space($ref) != '' or exists(bcf:full-number(bcf:target($ref))))"/>
        <xsl:sequence select="if ($ok) then replace(string($next), '^\s*\.?\s*of Division ([A-C])([^A-Za-z].*)?$', '$1', 's') else ()"/>
    </xsl:function>

    <!-- BBC-311: full link label for a reference whose "of Division X" is moved into the link -->
    <xsl:function name="bcf:division-label" as="xs:string">
        <xsl:param name="ref" as="element()"/>
        <xsl:param name="div" as="xs:string"/>
        <xsl:variable name="t" select="bcf:target($ref)"/>
        <xsl:variable name="word" select="bcf:type-word($t)"/>
        <xsl:variable name="typed" select="$word != '' and matches(bcf:text-before($ref), concat('(^|\W)', $word, 's?\s*$'))"/>
        <xsl:variable name="base" select="
            if (normalize-space($ref) != '') then normalize-space($ref)
            else if ($typed or $word = '') then bcf:full-number($t)
            else concat($word, ' ', bcf:full-number($t))"/>
        <!-- CLAUDE-AUTOFIX CL-050 CF-10463 | issue 3730 | A period typed between the reference and "of Division X" is kept when the number does not already end in one, as in the PDF (Sentence 10.2.3.4.(3). of Division B). -->
        <xsl:sequence select="concat($base, if (matches(string($ref/following-sibling::node()[1][self::text()]), '^\s*\.') and not(ends-with($base, '.'))) then '.' else '', ' of Division ', $div)"/>
    </xsl:function>

    <xsl:template match="ref" mode="rich-text-json">
        <!-- Determine the next significant sibling (skipping whitespace-only text nodes) -->
        <xsl:variable name="next-significant" select="following-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
        <!-- Determine the previous significant sibling (skipping whitespace-only text nodes) -->
        <xsl:variable name="prev-significant" select="preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1]"/>
        
        <!-- Add leading space if preceded by non-whitespace text OR another ref element -->
        <!-- BUT: Don't add leading space if this ref has pretext (pretext will provide the separation) -->
        <!-- CLAUDE-AUTOFIX CL-006 CF-00255 | issue 9829 | No space between a hyphen or slash and a defined term, as in the PDF (part-storey, non-loadbearing). -->
        <!-- CLAUDE-AUTOFIX CL-031 CF-02248 | issue 9912 | No space between "inter" and the defined term storey, as in the PDF (interstorey). -->
        <!-- CLAUDE-AUTOFIX CL-032 CF-07755 | issue 9983 | No space after an opening bracket before a reference without pretext, as in the PDF ((Subsection 9.29.2.)); external links keep it, as the PDF prints ( https://...). -->
        <!-- CLAUDE-AUTOFIX CL-037 CF-08197 | issue 9993 | The same applies after an opening square bracket before an internal reference without pretext ([Article 9.23.13.4.]). -->
        <!-- CLAUDE-AUTOFIX CL-038 CF-10018 | issue 3796 | No space between an opening quotation mark and a defined term, as in the PDF (“heritage building.”). -->
        <xsl:if test="not(@pretext) and ($prev-significant[self::text() and not(matches(., '\s$')) and not(current()/@type = 'term' and matches(., '[\-/]$|(^|\W)inter$|(^|\s)[&quot;“‘]$')) and not(matches(., '\($') and current()/@type != 'external') and not(matches(., '\[$') and current()/@type = 'internal')] or $prev-significant[self::ref])">
            <xsl:text> </xsl:text>
        </xsl:if>
        
        <!-- Include pretext if present (with leading space only if preceded by something) -->
        <xsl:if test="@pretext">
            <!-- CLAUDE-AUTOFIX CL-037 CF-08197 | issue 9993 | No space between an opening square bracket and a reference with pretext, as in the PDF ([Clauses 9.23.13.4.(1)(b)...]). -->
            <xsl:if test="$prev-significant and not(@type = 'internal' and $prev-significant[self::text()][matches(., '\[$')])">
                <xsl:text> </xsl:text>
            </xsl:if>
            <xsl:value-of select="@pretext"/>
            <xsl:text> </xsl:text>
        </xsl:if>
        
        <!-- CLAUDE-AUTOFIX CL-008 CF-00314 | issue 6323 | Second reference of a range such as Sentences (2) to (4) prints no word, as in the PDF. -->
        <!-- CLAUDE-AUTOFIX CL-022 CF-01021 | issue 677 | Ranges ending on a Clause, or on a Sentence in the same Article, print only the end number, as in the PDF (Clauses (a) to (d), Sentences 3.1.5.1.(2) to (4)). -->
        <xsl:variable name="range-start" select="($prev-significant[self::ref[@type = 'internal']], $prev-significant[self::text()][normalize-space(.) = 'to']/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal']])[1]"/>
        <xsl:variable name="is-range-end" as="xs:boolean" select="@type = 'internal' and @display-type = ('short', 'long') and not(contains(@target, '.subclause')) and (not(contains(@target, '.clause')) or @display-type = 'short') and (not(@display-type = 'long' and contains(@target, '.sent')) or (exists($range-start) and replace(string($range-start/@target), '\.sent\d+.*$', '') = replace(@target, '\.sent\d+.*$', ''))) and ((normalize-space(@pretext) = 'to' and exists($prev-significant[self::ref[@type = 'internal'][@pretext = ('Sentences', 'Articles', 'Subsections', 'Sections', 'Clauses', 'Subclauses')]])) or (not(@pretext) and exists($prev-significant[self::text()][normalize-space(.) = 'to']/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal']]/preceding-sibling::node()[1][self::text()][matches(., '(Sentences|Articles|Subsections|Sections|Clauses|Subclauses)\s*$')])))"/>
        <!-- CLAUDE-AUTOFIX CL-008 CF-09846 | issue 5078 | Article and Subsection range ends keep their final period, as in the PDF. -->
        <xsl:variable name="range-end-label" select="if ($is-range-end and not(contains(@target, '.sent')) and normalize-space(.) = '') then string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.') else ''"/>
        <xsl:text>[REF:</xsl:text>
        <!-- CLAUDE-AUTOFIX CL-026 CF-01777 | issue 1017 | A table-note reference to a note in a table inside an appendix Note is written as a short internal note reference, so it shows as (3) as in the PDF. -->
        <xsl:variable name="appnote-table-note" as="xs:boolean" select="@type = 'table-note' and contains(@target, '.appnote') and not(@display-type) and normalize-space(.) = ''"/>
        <xsl:value-of select="if ($appnote-table-note) then 'internal' else @type"/>
        <xsl:text>:</xsl:text>
        <xsl:value-of select="@target"/>
        <xsl:if test="$appnote-table-note">
            <xsl:text>:short</xsl:text>
        </xsl:if>
        <xsl:if test="@display-type">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="if ($is-range-end) then (if (@display-type = 'short') then 'shortNum' else 'number') else @display-type"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-025 CF-08103 | issue 5145 | A table-note reference without a display type is written as a short note marker, so it shows as (8) as in the PDF. -->
        <xsl:if test="not(@display-type) and @type = 'internal' and normalize-space(.) = '' and matches(@target, '\.table\d+\.note\d+$')">
            <xsl:text>:short</xsl:text>
        </xsl:if>
        <xsl:if test="$range-end-label != ''">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="$range-end-label"/>
            <xsl:text>.</xsl:text>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-010 CF-00376 | issue 145 | Table references to a Note print only its number, as in the PDF. -->
        <xsl:if test="@type = 'internal' and @display-type = 'number' and normalize-space(.) = '' and contains(@target, '.appnote') and ancestor::entry and id(@target)/number">
            <xsl:text>:A-</xsl:text>
            <xsl:value-of select="normalize-space(id(@target)/number[1])"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-023 CF-07867 | issue 5007 | Note references in running text print as in the PDF: "Note A-9.10.3.1." without its title, and just "A-9.8.8.5.(1) and (3)" in a list after "Notes". -->
        <xsl:if test="@type = 'internal' and @display-type = ('long', 'number') and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '\.appnote[^.]+$') and not(ancestor::entry) and id(@target)/number and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1)">
            <xsl:variable name="note-in-list" as="xs:boolean" select="exists($prev-significant[self::text()][matches(., 'Notes\s*$')]) or normalize-space(@pretext) = 'Notes' or exists($prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', ', and', ', or')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.appnote[^.]+$')]]) or (normalize-space(@pretext) = ('and', 'or', ',') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, '\.appnote[^.]+$')]]))"/>
            <xsl:text>:</xsl:text>
            <xsl:if test="not($note-in-list) and @display-type = 'long'">
                <xsl:text>Note </xsl:text>
            </xsl:if>
            <xsl:text>A-</xsl:text>
            <xsl:value-of select="normalize-space(id(@target)/number[1])"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-030 CF-04502 | issue 10165 | Short-format Note references in a list after "Notes" print just "A-9.15.1.1.", as in the PDF (no "Note" before each one). -->
        <xsl:if test="@type = 'internal' and @display-type = 'short' and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '\.appnote[^.]+$') and not(ancestor::entry) and id(@target)/number and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1) and (normalize-space(@pretext) = 'Notes' or exists($prev-significant[self::text()][matches(., 'Notes\s*$')]) or (normalize-space(@pretext) = ('and', 'or', ',', 'to') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, '\.appnote[^.]+$')]])) or exists($prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', ', and', ', or', 'to')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.appnote[^.]+$')]]))">
            <xsl:text>:A-</xsl:text>
            <xsl:value-of select="normalize-space(id(@target)/number[1])"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-024 CF-07869 | issue 5009 | References to a figure or table inside a Note print its PDF number (Figure A-9.8.8.1., Table A-9.25.5.1.(1), Figure A-9.8.4.-B). -->
        <xsl:if test="@type = 'internal' and normalize-space(.) = '' and $range-end-label = '' and not(@display-type = 'number' and ancestor::entry and id(@target)/number) and matches(@target, '\.appnote[^.]+(\.div\d+)*\.(figure|table)\d+$') and id(replace(@target, '(\.div\d+)*\.(figure|table)\d+$', ''))/number and id(@target) and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1)">
            <xsl:variable name="nf-kind" select="replace(@target, '^.*\.(figure|table)\d+$', '$1')"/>
            <xsl:variable name="nf-note-id" select="replace(@target, '(\.div\d+)*\.(figure|table)\d+$', '')"/>
            <xsl:variable name="nf-self" select="id(@target)"/>
            <xsl:variable name="nf-all" select="id($nf-note-id)//*[local-name() = $nf-kind][@xml:id][matches(@xml:id, '\.(figure|table)\d+$')][not(matches(@xml:id, '\.example\d+\.'))]"/>
            <xsl:variable name="nf-index" select="(for $p in 1 to count($nf-all) return if ($nf-all[$p] is $nf-self) then $p else ())[1]"/>
            <xsl:variable name="nf-count" select="count($nf-all)"/>
            <xsl:variable name="nf-number" select="concat('A-', normalize-space(id($nf-note-id)/number[1]), if ($nf-count gt 1 and exists($nf-index)) then concat('-', codepoints-to-string(64 + $nf-index)) else '')"/>
            <xsl:variable name="nf-same" select="concat('\.appnote[^.]+(\.div\d+)*\.', $nf-kind, '\d+$')"/>
            <xsl:variable name="nf-in-list" as="xs:boolean" select="exists($prev-significant[self::text()][matches(., '(Figures|Tables)\s*$')]) or normalize-space(@pretext) = ('Figures', 'Tables') or (normalize-space(@pretext) = ('and', 'or', ',', 'to') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, $nf-same)]])) or exists($prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', ', and', ', or', 'to')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, $nf-same)]])"/>
            <xsl:text>:</xsl:text>
            <xsl:if test="not($nf-in-list)">
                <xsl:value-of select="if ($nf-kind = 'figure') then 'Figure ' else 'Table '"/>
            </xsl:if>
            <xsl:value-of select="$nf-number"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-021 CF-00384 | issue 153 | Sentence and Clause references in number format inside a table cell print the full number, as in the PDF (4.3.6.1.(1)); in running text the PDF keeps the short form. -->
        <xsl:if test="@type = 'internal' and @display-type = 'number' and ancestor::entry and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '^nbc\.div[A-Z0-9]+\.part\d+\.sect\d+\.subsect\d+\.art\d+\.sent\d+(\.clause\d+)?$') and id(@target)">
            <xsl:variable name="num-sent" select="id(@target)/ancestor-or-self::sentence[1]"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="string-join(id(@target)/ancestor::*[self::part or self::section or self::subsection or self::article]/@number, '.')"/>
            <xsl:value-of select="concat('.(', $num-sent/@number, ')')"/>
            <xsl:if test="contains(@target, '.clause')">
                <xsl:value-of select="concat('(', id(@target)/@letter, ')')"/>
            </xsl:if>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-042 CF-10418 | issue 521 | A long reference to a Subclause prints its full number, as in the PDF (Subclauses 3.8.2.3.(2)(g)(ii); Subclause 3.1.5.5.(1)(b)(i)), not just (ii) of Division B. -->
        <xsl:if test="@type = 'internal' and @display-type = 'long' and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '\.subclause\d+$') and exists(bcf:full-number(id(@target)))">
            <xsl:text>:</xsl:text>
            <xsl:if test="not(matches(bcf:text-before(.), 'Subclauses?\s*$'))">
                <xsl:text>Subclause </xsl:text>
            </xsl:if>
            <xsl:value-of select="bcf:full-number(id(@target))"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-015 CF-01285 | issue 9842 | Article, Subsection and Section numbers keep their final period, as in the PDF (3.2.2.49.). -->
        <xsl:if test="@type = 'internal' and @display-type = ('number', 'shortNum') and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '^nbc\.div[A-Z0-9]+\.part\d+\.sect\d+(\.subsect\d+(\.art\d+)?)?$') and id(@target) and not($next-significant[self::text() and matches(., '^\s*\.')])">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.')"/>
            <xsl:text>.</xsl:text>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-020 CF-01130 | issue 6337 | A reference joined to the previous one of the same kind by its pretext (or / and) prints only its number, as in the PDF (Article 3.2.2.51. or 3.2.2.60.). -->
        <xsl:variable name="list-prev-ref" select="$prev-significant[self::ref[@type = 'internal']]"/>
        <xsl:variable name="list-level" select="replace(@target, '^.*\.([a-z]+)\d+$', '$1')"/>
        <xsl:if test="@type = 'internal' and @display-type = ('long', 'short') and normalize-space(.) = '' and @pretext = ('or', 'and', ',', ', or', ', and') and not($is-range-end) and $list-prev-ref and $list-prev-ref/@display-type = @display-type and replace($list-prev-ref/@target, '^.*\.([a-z]+)\d+$', '$1') = $list-level and $list-level = ('art', 'subsect', 'sect', 'sent', 'clause') and matches(@target, '^nbc\.div[A-Z][A-Z0-9]*\.part\d+\.') and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1) and substring($list-prev-ref/@target, 8, 1) = substring(@target, 8, 1) and id(@target)">
            <xsl:variable name="list-art" select="string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.')"/>
            <xsl:variable name="list-label" select="
                if ($list-level = ('art', 'subsect', 'sect') and @display-type = 'long') then concat($list-art, '.')
                else if ($list-level = 'sent' and @display-type = 'long') then concat($list-art, '.(', id(@target)/@number, ')')
                else if ($list-level = 'sent' and @display-type = 'short') then concat('(', id(@target)/@number, ')')
                else if ($list-level = 'clause' and @display-type = 'short' and id(@target)/@letter) then concat('(', id(@target)/@letter, ')')
                else ''"/>
            <xsl:if test="$list-label != ''">
                <xsl:text>:</xsl:text>
                <xsl:value-of select="$list-label"/>
            </xsl:if>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-01052 | issue 690 | A short Sentence reference listed after a Sentence of the same Article (", ", "and", "or" as plain text, or a pretext the CL-020 rule does not handle such as pretext=" and" after a long Sentence) prints only (N), as in the PDF (Sentences 3.1.6.4.(1) and (2)). -->
        <!-- CLAUDE-AUTOFIX CL-068 CF-05625 | issue 6536 | The same rule also covers a medium Sentence reference (Sentence 9.32.3.4.(2) or (3)), as in the PDF. -->
        <xsl:variable name="sent-list-prev" select="if (@pretext) then (if (normalize-space(@pretext) = ('and', 'or', ',', ', and', ', or') and not(@pretext = normalize-space(@pretext) and $list-prev-ref/@display-type = @display-type and @display-type = ('long', 'short'))) then $list-prev-ref else ()) else $prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', ', and', ', or')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal']]"/>
        <!-- CLAUDE-AUTOFIX CL-068 CF-10644 | issue 2018 | A Sentence joined only by a comma is a list item only when the list goes on after it; in "Sentences (9) to (12), Sentence (6) shall not apply" the comma ends a phrase, so the word stays, as in the PDF. -->
        <xsl:if test="@type = 'internal' and @display-type = ('short', 'medium') and normalize-space(.) = '' and not($is-range-end) and not((normalize-space(@pretext) = ',' or (not(@pretext) and normalize-space(string($prev-significant[self::text()])) = ',')) and not($next-significant[self::ref] or $next-significant[self::text()][matches(., '^\s*(,|and(\s|$)|or(\s|$)|to(\s|$))')])) and matches(@target, '\.art\d+\.sent\d+$') and $sent-list-prev and matches($sent-list-prev/@target, '\.art\d+\.sent\d+$') and replace($sent-list-prev/@target, '\.sent\d+$', '') = replace(@target, '\.sent\d+$', '') and id(@target)/@number">
            <xsl:text>:(</xsl:text>
            <xsl:value-of select="id(@target)/@number"/>
            <xsl:text>)</xsl:text>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-01388 | issue 808 | A medium reference to a Clause in the same Article prints "Clause (1)(b)" (or only "(1)(b)" when it follows another Clause of that Article in a list), as in the PDF. -->
        <xsl:variable name="ctx-art" select="replace(string((ancestor::*[@xml:id][matches(@xml:id, '\.art\d+')])[last()]/@xml:id), '^(.*?\.art\d+).*$', '$1')"/>
        <xsl:variable name="clause-list-prev" select="if (@pretext) then (if (normalize-space(@pretext) = ('and', 'or', ',', ', and', ', or')) then $list-prev-ref else ()) else $prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', ', and', ', or')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal']]"/>
        <xsl:if test="@type = 'internal' and @display-type = 'medium' and normalize-space(.) = '' and not($is-range-end) and $ctx-art != '' and matches(@target, '\.art\d+\.sent\d+\.clause\d+$') and replace(@target, '\.sent\d+\.clause\d+$', '') = $ctx-art and id(@target)/@letter">
            <xsl:text>:</xsl:text>
            <xsl:if test="not($clause-list-prev and matches($clause-list-prev/@target, '\.clause\d+$') and replace($clause-list-prev/@target, '\.sent\d+\.clause\d+$', '') = $ctx-art)">
                <xsl:text>Clause </xsl:text>
            </xsl:if>
            <xsl:value-of select="concat('(', id(@target)/ancestor::sentence[1]/@number, ')(', id(@target)/@letter, ')')"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-05817 | issue 3049 | A short Clause reference (or a medium one into another Article) listed after a Clause of the same Sentence prints only its letter, as in the PDF (Clause 9.36.2.7.(9)(a) or (b); Clauses 3.8.3.12.(1)(f) and (g)). -->
        <xsl:if test="@type = 'internal' and normalize-space(.) = '' and (@display-type = 'short' or (@display-type = 'medium' and replace(@target, '\.sent\d+\.clause\d+$', '') != $ctx-art)) and not($is-range-end) and $range-end-label = '' and matches(@target, '\.art\d+\.sent\d+\.clause\d+$') and $clause-list-prev and matches($clause-list-prev/@target, '\.sent\d+\.clause\d+$') and replace($clause-list-prev/@target, '\.clause\d+$', '') = replace(@target, '\.clause\d+$', '') and not(@pretext = normalize-space(@pretext) and $list-prev-ref/@display-type = @display-type and @display-type = ('long', 'short')) and not((normalize-space(@pretext) = ',' or (not(@pretext) and normalize-space(string($prev-significant[self::text()])) = ',')) and not($next-significant[self::ref] or $next-significant[self::text()][matches(., '^\s*(,|and(\s|$)|or(\s|$)|to(\s|$))')])) and id(@target)/@letter">
            <xsl:text>:(</xsl:text>
            <xsl:value-of select="id(@target)/@letter"/>
            <xsl:text>)</xsl:text>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-01215 | issue 745 | An Article, Subsection or Section reference joined by a pretext (and / or / ,) to a reference of the same level prints only its number, as in the PDF (Article 3.1.5.5. or 3.1.5.6.), also when the pretext has a leading space or the two display types differ (cases the CL-020 rule leaves out). -->
        <xsl:if test="@type = 'internal' and normalize-space(.) = '' and @display-type = ('long', 'short', 'medium') and normalize-space(@pretext) = ('and', 'or', ',', ', and', ', or') and not(@pretext = normalize-space(@pretext) and $list-prev-ref/@display-type = @display-type and @display-type = ('long', 'short')) and not($is-range-end) and $range-end-label = '' and $list-prev-ref and $list-level = ('art', 'subsect', 'sect') and replace($list-prev-ref/@target, '^.*\.([a-z]+)\d+$', '$1') = $list-level and matches(@target, '^nbc\.div[A-Z][A-Z0-9]*\.part\d+\.') and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1) and substring($list-prev-ref/@target, 8, 1) = substring(@target, 8, 1) and id(@target)">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="concat(string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.'), '.')"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-10139 | issue 896 | The last Article, Subsection or Section of a list whose "or" / "and" pretext follows a separate comma also prints only its number, as in the PDF (9.27.9., or 9.27.10.). -->
        <xsl:variable name="cl-comma-prev" select="$prev-significant[self::text()][normalize-space(.) = ',']/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal']]"/>
        <xsl:if test="@type = 'internal' and normalize-space(.) = '' and @display-type = ('long', 'short', 'medium') and normalize-space(@pretext) = ('or', 'and') and not($is-range-end) and $range-end-label = '' and $cl-comma-prev and $list-level = ('art', 'subsect', 'sect') and replace($cl-comma-prev/@target, '^.*\.([a-z]+)\d+$', '$1') = $list-level and matches(@target, '^nbc\.div[A-Z][A-Z0-9]*\.part\d+\.') and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1) and substring($cl-comma-prev/@target, 8, 1) = substring(@target, 8, 1) and id(@target)">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="concat(string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.'), '.')"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-04478 | issue 2464 | Two Article, Subsection or Section references joined by plain "and" / "or" (no pretext) print as in the PDF: "Articles 5.4.1.1. and 6.2.1.1." (plural first, bare second) and "Article X or Y". -->
        <xsl:variable name="pl-level" select="replace(@target, '^.*\.([a-z]+)\d+$', '$1')"/>
        <xsl:variable name="pl-prev" select="$prev-significant[self::text()][normalize-space(.) = ('and', 'or', ', and', ', or')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][@display-type = 'long'][normalize-space(.) = '']]"/>
        <xsl:variable name="pl-next" select="$next-significant[self::text()][normalize-space(.) = 'and']/following-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][@display-type = 'long'][not(@pretext)][normalize-space(.) = '']]"/>
        <xsl:variable name="pl-ok" as="xs:boolean" select="@type = 'internal' and @display-type = 'long' and normalize-space(.) = '' and not($is-range-end) and $range-end-label = '' and $pl-level = ('art', 'subsect', 'sect') and matches(@target, '^nbc\.div[A-Z][A-Z0-9]*\.part\d+\.') and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1) and exists(id(@target))"/>
        <xsl:variable name="pl-head" select="if ($pl-prev) then $pl-prev else ."/>
        <xsl:variable name="pl-head-before" select="$pl-head/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::text()][matches(normalize-space(.), ',$')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal']]"/>
        <xsl:variable name="pl-mixed-list" as="xs:boolean" select="exists($pl-head-before) and replace($pl-head-before/@target, '^.*\.([a-z]+)\d+$', '$1') != $pl-level"/>
        <xsl:if test="$pl-ok and not($pl-mixed-list) and not(@pretext) and $pl-prev and replace($pl-prev/@target, '^.*\.([a-z]+)\d+$', '$1') = $pl-level and substring($pl-prev/@target, 8, 1) = substring(@target, 8, 1)">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="concat(string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.'), '.')"/>
        </xsl:if>
        <xsl:if test="$pl-ok and not($pl-mixed-list) and not(@pretext) and not($pl-prev) and $pl-next and exists(id($pl-next/@target)) and replace($pl-next/@target, '^.*\.([a-z]+)\d+$', '$1') = $pl-level and substring($pl-next/@target, 8, 1) = substring(@target, 8, 1)">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="concat(if ($pl-level = 'art') then 'Articles ' else if ($pl-level = 'subsect') then 'Subsections ' else 'Sections ', string-join(id(@target)/ancestor-or-self::*[self::part or self::section or self::subsection or self::article]/@number, '.'), '.')"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-07918 | issue 5034 | In an appendix Note, a standalone long reference to a Sentence, Article, Subsection or Section of another Division prints "of Division X", as in the PDF (Sentence 1.4.1.2.(1) of Division A). -->
        <xsl:variable name="xd-ctx" select="string((ancestor::*[@xml:id])[last()]/@xml:id)"/>
        <!-- CLAUDE-AUTOFIX CL-068 CF-08223 | issue 5222 | A neighbouring list reference only blocks the label when it is also in another Division (Subsection 4.3.1. and Sentence 2.2.1.2.(1) of Division C). -->
        <xsl:if test="@type = 'internal' and @display-type = 'long' and normalize-space(.) = '' and not(@pretext) and not(ancestor::entry) and contains($xd-ctx, '.appendix.appnote') and matches(@target, '^nbc\.div[A-Z][A-Z0-9]*\.part\d+\.sect\d+(\.subsect\d+(\.art\d+(\.sent\d+)?)?)?$') and substring(@target, 8, 1) != substring($xd-ctx, 8, 1) and not($prev-significant[self::ref]) and not($next-significant[self::ref]) and not($prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', 'to', ', and', ', or')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][substring(@target, 8, 1) != substring($xd-ctx, 8, 1)]]) and not($next-significant[self::text()][normalize-space(.) = (',', 'and', 'or', 'to', ', and', ', or')]/following-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][substring(@target, 8, 1) != substring($xd-ctx, 8, 1)]]) and not(following-sibling::node()[1][self::text()][matches(., '^\s*\.?\s*of Division')]) and id(@target)">
            <xsl:variable name="xd-t" select="id(@target)"/>
            <xsl:variable name="xd-art" select="string-join(($xd-t/ancestor-or-self::*[self::part or self::section or self::subsection or self::article])/@number, '.')"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="concat(if (contains(@target, '.sent')) then 'Sentence ' else if (contains(@target, '.art')) then 'Article ' else if (contains(@target, '.subsect')) then 'Subsection ' else 'Section ', $xd-art, '.', if (contains(@target, '.sent')) then concat('(', $xd-t/@number, ')') else '', ' of Division ', substring(@target, 8, 1))"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-068 CF-09482 | issue 5600 | A reference to an Appendix D table or figure prints its PDF label: the letter (-A, -B ...) only when its Article has more than one table (or figure), as in the PDF (Table D-2.1.1., Tables D-2.3.4.-A); without the word after another such reference in a list or as the end of a range. -->
        <xsl:variable name="appd-art" select="replace(@target, '\.(table|figure)\d+$', '')"/>
        <xsl:variable name="appd-kind" select="replace(@target, '^.*\.(table|figure)\d+$', '$1')"/>
        <xsl:if test="@type = 'internal' and normalize-space(.) = '' and @display-type = ('long', 'medium') and matches(@target, '^nbc\.div[A-Z]\.appendixD\.appsect\d+(\.subsect\d+)?(\.article\d+)?\.(table|figure)\d+$') and id(@target)">
            <xsl:variable name="appd-count" select="count(id($appd-art)//*[local-name() = $appd-kind][starts-with(@xml:id, concat($appd-art, '.', $appd-kind))][matches(substring-after(@xml:id, concat($appd-art, '.', $appd-kind)), '^\d+$')])"/>
            <xsl:variable name="appd-no" select="xs:integer(replace(@target, '^.*\.(table|figure)(\d+)$', '$2'))"/>
            <xsl:text>:</xsl:text>
            <!-- CLAUDE-AUTOFIX CL-068 CF-09625 | issue 5663 | The end of an Appendix D range (Tables D-2.6.1.-A to D-2.6.1.-D) also prints without the word, as in the PDF. -->
            <xsl:if test="not($is-range-end) and not($clause-list-prev and matches($clause-list-prev/@target, '\.appendixD\..*\.(table|figure)\d+$')) and not(exists($prev-significant[self::text()][normalize-space(.) = 'to']/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.appendixD\..*\.(table|figure)\d+$')]]) or (normalize-space(@pretext) = 'to' and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, '\.appendixD\..*\.(table|figure)\d+$')]])))">
                <xsl:value-of select="if ($appd-kind = 'table') then 'Table ' else 'Figure '"/>
            </xsl:if>
            <xsl:value-of select="concat('D-', string-join(for $t in tokenize(replace($appd-art, '^.*\.appendixD\.', ''), '\.') return replace($t, '^[a-z]+', ''), '.'), '.')"/>
            <xsl:if test="$appd-count gt 1">
                <xsl:value-of select="concat('-', codepoints-to-string(64 + $appd-no))"/>
            </xsl:if>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-019 CF-01368 | issue 802 | A Part reference inside the same Division prints as "Part 6", without "of Division B", as in the PDF. -->
        <xsl:if test="@type = 'internal' and @display-type = 'long' and normalize-space(.) = '' and matches(@target, '^nbc\.div[A-Z][A-Z0-9]*\.part\d+$') and substring(@target, 8, 1) = substring(string((ancestor::*[@xml:id])[last()]/@xml:id), 8, 1)">
            <xsl:text>:Part </xsl:text>
            <xsl:value-of select="replace(@target, '^.*\.part', '')"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-018 CF-01980 | issue 1135 | Table and Figure references carry the table/figure number as in the PDF (Table 4.1.3.2.-A). -->
        <!-- CLAUDE-AUTOFIX CL-068 CF-10180 | issue 1298 | A short or medium table/figure reference listed after another one (or / and / ,) also gets its number label, so it shows as 9.36.2.6.-B as in the PDF. -->
        <xsl:if test="@type = 'internal' and (@display-type = ('long', 'number', 'shortNum') or (@display-type = ('short', 'medium') and (exists($prev-significant[self::text()][normalize-space(.) = (',', 'or', 'and', ', or', ', and')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.(table|figure)\d+$')]]) or (normalize-space(@pretext) = ('or', 'and', ',', ', or', ', and') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, '\.(table|figure)\d+$')]]))))) and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '^nbc\.div[A-Z0-9]+\.part\d+\.sect\d+\.subsect\d+\.art\d+\.(table|figure)\d+$') and id(@target)">
            <xsl:variable name="tf-kind" select="replace(@target, '^.*\.(table|figure)\d+$', '$1')"/>
            <xsl:variable name="tf-art-id" select="replace(@target, '\.(table|figure)\d+$', '')"/>
            <xsl:variable name="tf-sibs" select="id($tf-art-id)/*[local-name() = $tf-kind][matches(@xml:id, '\.(table|figure)\d+$')]"/>
            <xsl:variable name="tf-self" select="id(@target)"/>
            <!-- CLAUDE-AUTOFIX CL-029 CF-03052 | issue 1593 | A table listed after another table reference (… or / and / to / , …) prints only its number, as in the PDF (Table 9.10.3.1.-A or 9.10.3.1.-B). -->
            <xsl:variable name="tf-in-list" as="xs:boolean" select="$tf-kind = 'table' and @display-type = ('long', 'short', 'medium') and (exists($prev-significant[self::text()][normalize-space(.) = (',', 'or', 'and', 'to', ', or', ', and')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.table\d+$')]]) or (normalize-space(@pretext) = ('or', 'and', 'to', ',') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, '\.table\d+$')]])))"/>
            <xsl:if test="count($tf-sibs) gt 1 and $tf-sibs[. is $tf-self]">
                <xsl:variable name="tf-pos" select="count($tf-self/preceding-sibling::*[local-name() = $tf-kind][matches(@xml:id, '\.(table|figure)\d+$')]) + 1"/>
                <xsl:variable name="tf-art-number" select="string-join($tf-self/ancestor::*[self::part or self::section or self::subsection or self::article]/@number, '.')"/>
                <!-- CLAUDE-AUTOFIX CL-018 CF-01980 | issue 1135 | BC deleted Table 9.23.11.4.-B and kept the NBC letters, so the second table of that Article is -C in the PDF. -->
                <xsl:variable name="tf-number" select="if (@target = 'nbc.divBV2.part9.sect23.subsect11.art4.table2') then '9.23.11.4.-C' else concat($tf-art-number, '.-', codepoints-to-string(64 + $tf-pos))"/>
                <xsl:text>:</xsl:text>
                <xsl:value-of select="if (@display-type = 'long' and not($tf-in-list)) then concat(if ($tf-kind = 'table') then 'Table ' else 'Figure ', $tf-number) else $tf-number"/>
            </xsl:if>
            <xsl:if test="count($tf-sibs) le 1 and $tf-in-list">
                <xsl:text>:</xsl:text>
                <xsl:value-of select="concat(string-join($tf-self/ancestor::*[self::part or self::section or self::subsection or self::article]/@number, '.'), '.')"/>
            </xsl:if>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-029 CF-03052 | issue 1593 | A span table listed after another table reference (… or / and / to / , …) prints only its number, as in the PDF (Table 9.10.3.1.-A or 9.10.3.1.-B). -->
        <!-- CLAUDE-AUTOFIX CL-040 CF-04737 | issue 2568 | A span table reference with the lead words Span Table prints only its number, as in the PDF (Span Table 9.23.4.2.-A). -->
        <!-- CLAUDE-AUTOFIX CL-068 CF-10294 | issue 773 | A span table reference with the lead word Table / Tables also prints only its number, as in the PDF (Tables 9.10.3.1.-A and 9.10.3.1.-B). -->
        <xsl:if test="@type = 'internal' and @display-type = 'long' and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '\.spectables\d+\.table\d+$') and normalize-space(id(@target)/number[1]) != '' and (exists($prev-significant[self::text()][normalize-space(.) = (',', 'or', 'and', 'to', ', or', ', and')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.table\d+$')]]) or (normalize-space(@pretext) = ('or', 'and', 'to', ',') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, '\.table\d+$')]])) or normalize-space(@pretext) = ('Span Table', 'Span Tables', 'Table', 'Tables'))">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="normalize-space(id(@target)/number[1])"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-027 CF-09419 | issue 5561 | References to an Appendix Sentence print as in the PDF: Sentence (5), or Sentence D-1.6.1.(5) in long form, without the extra period. -->
        <xsl:if test="@type = 'internal' and @display-type = ('short', 'long') and normalize-space(.) = '' and not($is-range-end) and matches(@target, '^nbc\.div[A-Z0-9]+\.appendix[A-Z]\.appsect\d+(\.subsect\d+)?(\.article\d+)?\.para\d+$')">
            <xsl:variable name="ap-same" select="'^nbc\.div[A-Z0-9]+\.appendix[A-Z]\.appsect\d+(\.subsect\d+)?(\.article\d+)?\.para\d+$'"/>
            <xsl:variable name="ap-bare" as="xs:boolean" select="exists($prev-significant[self::text()][matches(., 'Sentences?\s*$')]) or normalize-space(@pretext) = ('Sentence', 'Sentences') or exists($prev-significant[self::text()][normalize-space(.) = (',', 'and', 'or', ', and', ', or')]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, $ap-same)]]) or (normalize-space(@pretext) = ('and', 'or', ',') and exists($prev-significant[self::ref[@type = 'internal'][matches(@target, $ap-same)]]))"/>
            <xsl:variable name="ap-para" select="replace(@target, '^.*\.para(\d+)$', '$1')"/>
            <xsl:variable name="ap-number" select="concat(replace(@target, '^nbc\.div[A-Z0-9]+\.appendix([A-Z])\..*$', '$1'), '-', string-join(for $t in tokenize(replace(replace(@target, '^nbc\.div[A-Z0-9]+\.appendix[A-Z]\.', ''), '\.para\d+$', ''), '\.') return replace($t, '^\D+', ''), '.'), '.(', $ap-para, ')')"/>
            <xsl:text>:</xsl:text>
            <xsl:if test="not($ap-bare)">
                <xsl:text>Sentence </xsl:text>
            </xsl:if>
            <xsl:value-of select="if (@display-type = 'short') then concat('(', $ap-para, ')') else $ap-number"/>
        </xsl:if>
        <!-- CLAUDE-AUTOFIX CL-014 CF-09365 | issue 10304 | Appendix D references print as in the PDF: Article and Subsection numbers end with a period, a Section reference does not. -->
        <xsl:if test="@type = 'internal' and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '^nbc\.div[A-Z0-9]+\.appendix[A-Z]\.appsect\d+(\.subsect\d+(\.article\d+)?)?$') and not($next-significant[self::text() and matches(., '^\s*\.')])">
            <xsl:variable name="appx-number" select="concat(replace(@target, '^nbc\.div[A-Z0-9]+\.appendix([A-Z])\..*$', '$1'), '-', string-join(for $t in tokenize(replace(@target, '^nbc\.div[A-Z0-9]+\.appendix[A-Z]\.', ''), '\.') return replace($t, '^\D+', ''), '.'))"/>
            <xsl:choose>
                <xsl:when test="(@display-type = ('number', 'shortNum') or $is-range-end) and contains(@target, '.subsect')">
                    <xsl:text>:</xsl:text>
                    <xsl:value-of select="$appx-number"/>
                    <xsl:text>.</xsl:text>
                </xsl:when>
                <xsl:when test="@display-type = 'long' and not($is-range-end) and not(contains(@target, '.subsect'))">
                    <xsl:text>:Section </xsl:text>
                    <xsl:value-of select="$appx-number"/>
                </xsl:when>
            </xsl:choose>
        </xsl:if>
        <!-- Include display text if present, preserving trailing space -->
        <xsl:variable name="has-trailing-space" select="matches(., '\s$')"/>
        <!-- BBC-311: trailing "of Division X" moved into the label; BBC-310: range label -->
        <xsl:variable name="div-suffix" select="bcf:div-suffix(.)"/>
        <xsl:variable name="range-label" select="bcf:range-label(.)"/>
        <!-- CLAUDE-AUTOFIX merge-develop | BBC-310 x CL-015 | The range label is not written again when our range-end label (CL-008/CL-022) or the CL-015 number label is already written, so the reference keeps one label (develop merge 2026-11-11). -->
        <!-- CLAUDE-AUTOFIX CL-041 CF-10451 | issue 2621 | No range label where our range-end rule (CL-008/CL-022) already handles the range, so the plural Sentences and the list after it stay as in the PDF. -->
        <!-- CLAUDE-AUTOFIX CL-049 CF-10452 | issue 1117 | The first reference of a range with no word typed before it is labelled Sentences, as in the PDF (Sentences (1) to (3), Sentences 3.2.7.1.(4) to (7)). -->
        <xsl:variable name="range-start-label" select="if (@type = 'internal' and normalize-space(.) = '' and not(@pretext) and @display-type = ('short', 'long') and matches(@target, '\.sent\d+$') and not(matches(string(preceding-sibling::node()[1][self::text()]), '(Sentences?|Clauses?)\s*$')) and exists($next-significant[self::text()][matches(., '^\s*(to|through)\s*$')]/following-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][matches(@target, '\.sent\d+$')]]) and exists(bcf:full-number(id(@target)))) then concat('Sentences ', if (@display-type = 'short' and replace(@target, '\.sent\d+$', '') = string(ancestor::*[self::article][1]/@xml:id)) then concat('(', replace(@target, '^.*\.sent(\d+)$', '$1'), ')') else bcf:full-number(id(@target))) else ''"/>
        <!-- CLAUDE-AUTOFIX CL-051 CF-10417 | issue 471 | A Sentence listed after a "Sentences X to Y" range carries the plural, so it prints only its number when it is itself a range or follows a comma, as in the PDF (Sentences 9.10.14.5.(5) to (7) and 9.10.15.5.(5) to (7)). -->
        <xsl:variable name="list-after-range-label" select="if (@type = 'internal' and @display-type = 'long' and normalize-space(.) = '' and matches(@target, '\.sent\d+$') and normalize-space(@pretext) = (',', 'and') and exists($prev-significant[self::ref[@type = 'internal'][normalize-space(@pretext) = 'to']]/preceding-sibling::node()[not(self::text() and normalize-space(.) = '')][1][self::ref[@type = 'internal'][normalize-space(@pretext) = 'Sentences']]) and (normalize-space(@pretext) = ',' or exists($next-significant[self::ref[@type = 'internal'][normalize-space(@pretext) = 'to']])) and exists(bcf:full-number(id(@target)))) then bcf:full-number(id(@target)) else ''"/>
        <!-- CLAUDE-AUTOFIX CL-059 CF-09869 | issue 3018 | A short reference to a Subclause prints its Clause letter too, as in the PDF ((a)(ii) to (a)(iv), (d)(i)). -->
        <xsl:variable name="label" select="
            if (exists($div-suffix)) then bcf:division-label(., $div-suffix)
            else if (exists($range-label) and $range-end-label = '' and not($is-range-end) and not(@type = 'internal' and @display-type = ('number', 'shortNum') and normalize-space(.) = '' and $range-end-label = '' and matches(@target, '^nbc\.div[A-Z0-9]+\.part\d+\.sect\d+(\.subsect\d+(\.art\d+)?)?$') and id(@target) and not($next-significant[self::text() and matches(., '^\s*\.')]))) then $range-label
            else if ($range-start-label != '') then $range-start-label
            else if ($list-after-range-label != '') then $list-after-range-label
            else if (@type = 'internal' and @display-type = 'short' and normalize-space(.) = '' and not(ancestor::entry) and not($is-range-end) and matches(@target, '\.clause\d+\.subclause\d+$') and exists(bcf:full-number(id(@target)))) then concat(if (@pretext or matches(bcf:text-before(.), 'Subclauses?\s*$')) then '' else 'Subclause ', replace(bcf:full-number(id(@target)), '^.*(\([a-z]+\)\([^)]+\))$', '$1'))
            else normalize-space(.)"/>
        <xsl:if test="$label != ''">
            <xsl:text>:</xsl:text>
            <xsl:value-of select="$label"/>
            <!-- Preserve trailing space if original text had one -->
            <xsl:if test="$has-trailing-space">
                <xsl:text> </xsl:text>
            </xsl:if>
        </xsl:if>
        <xsl:text>]</xsl:text>
        
        <!-- Add trailing space if followed by non-whitespace text OR another ref WITHOUT pretext -->
        <!-- BUT: Don't add trailing space if the ref content already had a trailing space -->
        <!-- CLAUDE-AUTOFIX CL-031 CF-02248 | issue 9912 | No space between a defined term and a following 's or plural s, as in the PDF (building's, fire compartments). -->
        <xsl:if test="not($has-trailing-space) and ($next-significant[self::text() and not(matches(., '^\s')) and not(current()/@type = 'term' and matches(., '^([''’]s|s)(\W|$)'))] or $next-significant[self::ref and not(@pretext)])">
            <xsl:text> </xsl:text>
        </xsl:if>
    </xsl:template>

    
    <xsl:template match="measurement" mode="rich-text-json">
        <!-- Add leading space if preceded by text without trailing space -->
        <!-- BUT: not after an opening bracket or quote, e.g. "(38 mm)" -->
        <xsl:if test="preceding-sibling::node()[1][self::text() and not(matches(., '[\s(\[&#8220;&#8216;]$'))]">
            <xsl:text> </xsl:text>
        </xsl:if>
        <!-- Process child nodes to handle super/sub elements -->
        <xsl:apply-templates select="node()" mode="rich-text-json"/>
        <!-- Add trailing space if followed by text without leading space -->
        <!-- BUT: not before punctuation, e.g. "13 mm," or "13 mm." -->
        <!-- CLAUDE-AUTOFIX CF-09433 | issue 10341 | No space between a measurement and a plural s typed after it, as in the PDF (3 parts). -->
        <xsl:if test="following-sibling::node()[1][self::text() and not(matches(., '^[\s,.;:!?)\]&#8221;&#8217;]')) and not(matches(., '^s(\W|$)'))]">
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
    
    <!-- CLAUDE-AUTOFIX CL-054 CF-00045 | issue 27 | A list inside a definition is written out item by item (• or (a), (b) …), as in the PDF, instead of an empty [LIST] placeholder. -->
    <xsl:template match="definition//list" mode="rich-text-json" priority="3">
        <xsl:for-each select="item">
            <xsl:text>&#10;</xsl:text>
            <xsl:value-of select="if (../@type = 'alphabetic') then concat('(', codepoints-to-string(96 + position()), ') ') else if (../@type = 'roman') then concat('(', ('i','ii','iii','iv','v','vi','vii','viii','ix','x')[position()], ') ') else if (../@type = 'numbered') then concat(position(), '. ') else '&#8226; '"/>
            <xsl:apply-templates select="node()" mode="rich-text-json"/>
        </xsl:for-each>
        <xsl:text>&#10;</xsl:text>
    </xsl:template>

    <!-- CLAUDE-AUTOFIX CL-066 CF-00860 | issue 862 | A list inside a figure note is written out line by line, as in the PDF (AHJ = ..., NPARC = ...), instead of an empty [LIST] placeholder. -->
    <xsl:template match="figure/note//list" mode="rich-text-json" priority="3">
        <xsl:for-each select="item">
            <xsl:text>&#10;</xsl:text>
            <xsl:choose>
                <xsl:when test="../@type = 'variable'">
                    <xsl:apply-templates select="variable/node()" mode="rich-text-json"/>
                    <xsl:text> </xsl:text>
                    <xsl:variable name="desc"><xsl:apply-templates select="description/node()" mode="rich-text-json"/></xsl:variable>
                    <xsl:value-of select="replace(string($desc), '(\S)= ', '$1&#10;= ')"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="node()" mode="rich-text-json"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
        <xsl:if test="following-sibling::node()[normalize-space(.) != '']"><xsl:text>&#10;</xsl:text></xsl:if>
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
    
    <!-- Numbers (BBC-319: MathML children may be in the MathML namespace or in no namespace) -->
    <xsl:template match="*[local-name()='mn']" mode="mathml-to-latex">
        <xsl:value-of select="."/>
    </xsl:template>
    
    <!-- Identifiers/variables (in no namespace) -->
    <xsl:template match="*[local-name()='mi']" mode="mathml-to-latex">
        <xsl:value-of select="."/>
    </xsl:template>
    
    <!-- Operators (in no namespace) -->
    <xsl:template match="*[local-name()='mo']" mode="mathml-to-latex">
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
    <xsl:template match="*[local-name()='mtext']" mode="mathml-to-latex">
        <xsl:text>\text{</xsl:text>
        <xsl:value-of select="."/>
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <!-- Fractions (in no namespace) -->
    <xsl:template match="*[local-name()='mfrac']" mode="mathml-to-latex">
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
    
    <!-- BBC-319: summation with limits (munderover) -> \sum_{i=1}^{n} -->
    <xsl:template match="*[local-name()='munderover']" mode="mathml-to-latex">
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
        <xsl:text>_{</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-latex"/>
        <xsl:text>}^{</xsl:text>
        <xsl:apply-templates select="*[3]" mode="mathml-to-latex"/>
        <xsl:text>}</xsl:text>
    </xsl:template>

    <!-- BBC-318: accent (mover), e.g. N with a bar -> \bar{N} -->
    <xsl:template match="*[local-name()='mover']" mode="mathml-to-latex">
        <xsl:variable name="acc" select="normalize-space(*[2])"/>
        <xsl:choose>
            <xsl:when test="$acc = ('&#xAF;', '&#x304;', '&#x305;', '&#x203E;')"><xsl:text>\bar{</xsl:text></xsl:when>
            <xsl:when test="$acc = '^'"><xsl:text>\hat{</xsl:text></xsl:when>
            <xsl:when test="$acc = '~'"><xsl:text>\tilde{</xsl:text></xsl:when>
            <xsl:otherwise><xsl:text>\overset{</xsl:text><xsl:value-of select="$acc"/><xsl:text>}{</xsl:text></xsl:otherwise>
        </xsl:choose>
        <xsl:apply-templates select="*[1]" mode="mathml-to-latex"/>
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
    
    <!-- Match MathML elements with or without namespace (fallback: lower priority than the specific templates below, BBC-319) -->
    <xsl:template match="*[namespace-uri()='http://www.w3.org/1998/Math/MathML'] | math | *[local-name()='math']" mode="mathml-to-plaintext" priority="-1">
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
    
    <!-- BBC-318/319: summation limits, sub+superscript and accent in plain text -->
    <xsl:template match="*[local-name()='munderover']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*[1]" mode="mathml-to-plaintext"/>
        <xsl:text>_(</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-plaintext"/>
        <xsl:text>)^(</xsl:text>
        <xsl:apply-templates select="*[3]" mode="mathml-to-plaintext"/>
        <xsl:text>)</xsl:text>
    </xsl:template>

    <xsl:template match="*[local-name()='msubsup']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*[1]" mode="mathml-to-plaintext"/>
        <xsl:text>_</xsl:text>
        <xsl:apply-templates select="*[2]" mode="mathml-to-plaintext"/>
        <xsl:text>^</xsl:text>
        <xsl:apply-templates select="*[3]" mode="mathml-to-plaintext"/>
    </xsl:template>

    <xsl:template match="*[local-name()='mover']" mode="mathml-to-plaintext">
        <xsl:apply-templates select="*[1]" mode="mathml-to-plaintext"/>
        <xsl:if test="normalize-space(*[2]) = ('&#xAF;', '&#x304;', '&#x305;', '&#x203E;')"><xsl:text>&#x304;</xsl:text></xsl:if>
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

    <!-- CLAUDE-AUTOFIX CL-068 CF-08304 | issue 5257 | An empty long Sentence or Clause reference inside a title written as plain text prints its number, as in the PDF (Performance Approach [Clause 9.32.3.1.(1)(a)]), instead of disappearing. -->
    <xsl:template match="title//ref[@type = 'internal'][@display-type = 'long'][normalize-space(.) = ''][matches(@target, '\.art\d+\.sent\d+(\.clause\d+)?$')][id(@target)]" mode="text-only" priority="2">
        <xsl:variable name="tt" select="id(@target)"/>
        <xsl:variable name="ts" select="$tt/ancestor-or-self::sentence[1]"/>
        <xsl:value-of select="concat(if (contains(@target, '.clause')) then 'Clause ' else 'Sentence ', string-join($ts/ancestor::*[self::part or self::section or self::subsection or self::article]/@number, '.'), '.(', $ts/@number, ')', if (contains(@target, '.clause')) then concat('(', $tt/@letter, ')') else '')"/>
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
