<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                exclude-result-prefixes="xs">
    
    <!-- ================================================================== -->
    <!-- COMBINE MULTIPLE BC AMENDMENT FILES                                -->
    <!-- Merges multiple overlay files into a single overlay document       -->
    <!-- Input: amendment-list.xml containing list of files to combine      -->
    <!--                                                                    -->
    <!-- IMPORTANT: This script handles duplicate amendment IDs             -->
    <!-- - Individual amendment files can reuse IDs (bc-001, bc-002, etc.) -->
    <!-- - When combining, all IDs are renumbered sequentially              -->
    <!-- - Original IDs are preserved in 'original-id' attribute            -->
    <!-- - New IDs are generated as bc-001, bc-002, ..., bc-999, etc.      -->
    <!--                                                                    -->
    <!-- Usage:                                                             -->
    <!--   saxon -s:amendment-list.xml \                                    -->
    <!--          -xsl:combine-amendments.xsl \                             -->
    <!--          -o:bc-amendments-combined.xml                             -->
    <!-- ================================================================== -->
    
    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>
    
    <!-- Template to add processing instructions -->
    <xsl:template name="add-processing-instructions">
        <xsl:processing-instruction name="xml-stylesheet">type="text/css" href="bcbc-amendments.css"</xsl:processing-instruction>
        <xsl:text>&#10;</xsl:text>
        <xsl:processing-instruction name="xml-model">href="schema/bc-overlay.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"</xsl:processing-instruction>
        <xsl:text>&#10;</xsl:text>
    </xsl:template>
    
    <!-- Load all amendment documents from the input file list -->
    <xsl:variable name="amendment-docs" as="document-node()*">
        <xsl:for-each select="/amendment-files/file">
            <xsl:variable name="file" select="normalize-space(.)"/>
            <xsl:if test="$file != ''">
                <!-- Resolve path relative to the source XML document (amendment-list.xml) -->
                <xsl:variable name="resolved-uri" select="resolve-uri($file, base-uri(/))"/>
                <xsl:message>Loading: <xsl:value-of select="$resolved-uri"/></xsl:message>
                <xsl:sequence select="doc($resolved-uri)"/>
            </xsl:if>
        </xsl:for-each>
    </xsl:variable>
    
    <!-- ================================================================== -->
    <!-- ROOT TEMPLATE                                                      -->
    <!-- ================================================================== -->
    
    <xsl:template match="/amendment-files">
        <xsl:message>Combining <xsl:value-of select="count($amendment-docs)"/> amendment file(s)...</xsl:message>
        
        <!-- Add processing instructions -->
        <xsl:call-template name="add-processing-instructions"/>
        
        <bc-overlay version="1.0" 
                    target-nbc-version="2020"
                    combined="true">
            <xsl:attribute name="generated" select="current-dateTime()"/>
            <xsl:attribute name="source-count" select="count($amendment-docs)"/>
            
            <!-- Metadata from all source files -->
            <metadata>
                <title>Combined BC Building Code Amendments</title>
                <description>
                    <xsl:text>Combined from </xsl:text>
                    <xsl:value-of select="count($amendment-docs)"/>
                    <xsl:text> amendment file(s)</xsl:text>
                </description>
                
                <source-files>
                    <xsl:for-each select="file">
                        <source-file>
                            <xsl:value-of select="normalize-space(.)"/>
                        </source-file>
                    </xsl:for-each>
                </source-files>
                
                <!-- Preserve original metadata from each file -->
                <xsl:for-each select="$amendment-docs">
                    <xsl:variable name="pos" select="position()"/>
                    <original-metadata source-index="{$pos}">
                        <xsl:copy-of select="//metadata/*"/>
                    </original-metadata>
                </xsl:for-each>
            </metadata>
            
            <!-- Combine all text-replacements from all files (applied in file order) -->
            <xsl:variable name="all-text-replacements" select="$amendment-docs//text-replacements/replace"/>
            <xsl:if test="$all-text-replacements">
                <xsl:message>Combining <xsl:value-of select="count($all-text-replacements)"/> text replacement rule(s)...</xsl:message>
                <text-replacements>
                    <xsl:for-each select="$amendment-docs">
                        <xsl:variable name="doc-index" select="position()"/>
                        <xsl:for-each select=".//text-replacements/replace">
                            <xsl:copy>
                                <xsl:attribute name="source-file-index" select="$doc-index"/>
                                <xsl:copy-of select="@*"/>
                            </xsl:copy>
                        </xsl:for-each>
                    </xsl:for-each>
                </text-replacements>
            </xsl:if>
            
            <!-- Combine all amendments with sequence renumbering -->
            <amendments>
                <xsl:call-template name="combine-amendments"/>
            </amendments>
        </bc-overlay>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- COMBINE AMENDMENTS                                                 -->
    <!-- ================================================================== -->
    
    <xsl:template name="combine-amendments">
        <xsl:variable name="all-amendments" as="element()*">
            <xsl:for-each select="$amendment-docs">
                <xsl:variable name="doc-index" select="position()"/>
                <xsl:message>Processing document <xsl:value-of select="$doc-index"/>: <xsl:value-of select="count(.//amendment)"/> amendments found</xsl:message>
                <xsl:for-each select=".//amendment">
                    <xsl:copy>
                        <!-- Add source tracking -->
                        <xsl:attribute name="source-file-index" select="$doc-index"/>
                        <xsl:attribute name="original-sequence" select="@sequence"/>
                        <xsl:attribute name="original-id" select="@id"/>

                        <!-- Copy all other attributes except id and sequence (will be renumbered) -->
                        <xsl:copy-of select="@* except (@sequence, @id)"/>

                        <!-- Copy all child elements -->
                        <xsl:copy-of select="node()"/>
                    </xsl:copy>
                </xsl:for-each>
            </xsl:for-each>
        </xsl:variable>

        <xsl:message>Total amendments collected: <xsl:value-of select="count($all-amendments)"/></xsl:message>

        <!-- Sort amendments by original file order first, then by original sequence -->
        <xsl:variable name="sorted-amendments" as="element()*">
            <xsl:for-each select="$all-amendments">
                <xsl:sort select="xs:integer(@source-file-index)" data-type="number"/>
                <xsl:sort select="xs:decimal(@original-sequence)" data-type="number"/>
                <xsl:copy-of select="."/>
            </xsl:for-each>
        </xsl:variable>

        <!-- Generate new sequential IDs and sequences -->
        <xsl:for-each select="$sorted-amendments">
            <xsl:variable name="new-sequence" select="position()"/>
            <xsl:variable name="new-id" select="concat('bc-combined-', format-number($new-sequence, '000'))"/>
            
            <xsl:message>Amendment <xsl:value-of select="$new-sequence"/>: <xsl:value-of select="@original-id"/> -> <xsl:value-of select="$new-id"/></xsl:message>
            
            <xsl:copy>
                <!-- Set new sequence and ID -->
                <xsl:attribute name="sequence" select="$new-sequence"/>
                <xsl:attribute name="id" select="$new-id"/>
                
                <!-- Copy all other attributes (including our tracking attributes) -->
                <xsl:copy-of select="@*"/>
                
                <!-- Copy all child elements -->
                <xsl:copy-of select="node()"/>
            </xsl:copy>
        </xsl:for-each>
    </xsl:template>
    
</xsl:stylesheet>
