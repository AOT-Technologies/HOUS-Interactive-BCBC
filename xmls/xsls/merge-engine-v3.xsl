<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:map="http://www.w3.org/2005/xpath-functions/map"
    xmlns:array="http://www.w3.org/2005/xpath-functions/array"
    xmlns:bc="http://bc.gov.ca/building-code"
    exclude-result-prefixes="xs fn map array bc">

    <!-- ================================================================== -->
    <!-- BC OVERLAY MERGE ENGINE - V3 SINGLE-PASS OPTIMIZED                 -->
    <!-- ================================================================== -->
    <!-- Key optimization: Single document traversal with pre-indexed maps  -->
    <!-- Instead of N passes (one per amendment), we do 1 pass with O(1)    -->
    <!-- map lookups at each element.                                       -->
    <!-- ================================================================== -->

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <!-- Input parameters -->
    <xsl:param name="overlay-document" required="yes"/>
    <xsl:param name="validate-references" select="false()"/>
    <xsl:param name="preserve-nbc-ids" select="true()"/>

    <!-- Load overlay document -->
    <xsl:variable name="overlay" select="document($overlay-document, /)"/>

    <!-- Store the source document root for auto-population of revision history -->
    <!-- This is needed because when processing amendment content in bc-to-canonical mode, -->
    <!-- the context changes and we need a stable reference to the original source document -->
    <xsl:variable name="source-doc-root" select="/"/>

    <!-- All amendments sorted by sequence -->
    <xsl:variable name="all-amendments" select="$overlay//amendment"/>
    <xsl:variable name="sorted-amendments" as="element()*">
        <xsl:perform-sort select="$all-amendments">
            <xsl:sort select="xs:integer(@sequence)"/>
        </xsl:perform-sort>
    </xsl:variable>

    <!-- ================================================================== -->
    <!-- PRE-COMPUTED AMENDMENT INDEXES (O(1) lookups)                      -->
    <!-- ================================================================== -->

    <!-- Map: canonical-id -> list of amendments targeting that ID -->
    <xsl:variable name="amendments-by-canonical-id" as="map(xs:string, element()*)">
        <xsl:map>
            <xsl:for-each-group select="$sorted-amendments[target/@type = 'canonical-id']"
                               group-by="string(target/@id)">
                <xsl:map-entry key="current-grouping-key()" select="current-group()"/>
            </xsl:for-each-group>
        </xsl:map>
    </xsl:variable>

    <!-- Map: parent-id -> list of position-based amendments -->
    <xsl:variable name="amendments-by-parent-id" as="map(xs:string, element()*)">
        <xsl:map>
            <xsl:for-each-group select="$sorted-amendments[target/@type = 'position' and target/@parent-id]"
                               group-by="string(target/@parent-id)">
                <xsl:map-entry key="current-grouping-key()" select="current-group()"/>
            </xsl:for-each-group>
        </xsl:map>
    </xsl:variable>

    <!-- Map: reference-id -> list of position-based amendments (for after/before sibling) -->
    <xsl:variable name="amendments-by-reference-id" as="map(xs:string, element()*)">
        <xsl:map>
            <xsl:for-each-group select="$sorted-amendments[target/@type = 'position' and target/@reference-id]"
                               group-by="string(target/@reference-id)">
                <xsl:map-entry key="current-grouping-key()" select="current-group()"/>
            </xsl:for-each-group>
        </xsl:map>
    </xsl:variable>

    <!-- Map: table-id -> list of table-row-insert amendments -->
    <xsl:variable name="amendments-by-table-id" as="map(xs:string, element()*)">
        <xsl:map>
            <xsl:for-each-group select="$sorted-amendments[target/@type = 'table-row-insert']"
                               group-by="string(target/@table-id)">
                <xsl:map-entry key="current-grouping-key()" select="current-group()"/>
            </xsl:for-each-group>
        </xsl:map>
    </xsl:variable>

    <!-- Map: appnote-id -> list of list-item-insert amendments -->
    <xsl:variable name="amendments-by-appnote-id" as="map(xs:string, element()*)">
        <xsl:map>
            <xsl:for-each-group select="$sorted-amendments[target/@type = 'list-item-insert']"
                               group-by="string(target/@parent-id)">
                <xsl:map-entry key="current-grouping-key()" select="current-group()"/>
            </xsl:for-each-group>
        </xsl:map>
    </xsl:variable>

    <!-- Map: parent-id -> list of child-element amendments -->
    <xsl:variable name="amendments-by-child-element-parent" as="map(xs:string, element()*)">
        <xsl:map>
            <xsl:for-each-group select="$sorted-amendments[target/@type = 'child-element']"
                               group-by="string(target/@parent-id)">
                <xsl:map-entry key="current-grouping-key()" select="current-group()"/>
            </xsl:for-each-group>
        </xsl:map>
    </xsl:variable>

    <!-- XPath-based amendments (need special handling) -->
    <xsl:variable name="xpath-amendments" select="$sorted-amendments[target/@type = 'xpath']"/>

    <!-- Reference updates map -->
    <xsl:variable name="reference-updates" as="map(xs:string, xs:string)">
        <xsl:map>
            <xsl:for-each select="$overlay//reference-updates/update">
                <xsl:map-entry key="string(@from-id)" select="string(@to-id)"/>
            </xsl:for-each>
        </xsl:map>
    </xsl:variable>

    <!-- Global text replacements - applied to all text content in post-process -->
    <xsl:variable name="global-text-replacements" as="element()*">
        <xsl:sequence select="$overlay//text-replacements/replace"/>
    </xsl:variable>
    
    <!-- Check if we have any global text replacements -->
    <xsl:variable name="has-global-text-replacements" as="xs:boolean" 
        select="exists($global-text-replacements)"/>

    <!-- ================================================================== -->
    <!-- ROOT TEMPLATE - SINGLE PASS                                        -->
    <!-- ================================================================== -->

    <xsl:template match="/">
        <xsl:variable name="amendment-count" select="count($all-amendments)"/>

        <xsl:message>BC Merge Engine V3 - Single Pass Mode</xsl:message>
        <xsl:message>Processing <xsl:value-of select="$amendment-count"/> amendments...</xsl:message>
        <xsl:message>  - By canonical-id: <xsl:value-of select="map:size($amendments-by-canonical-id)"/> targets</xsl:message>
        <xsl:message>  - By parent-id: <xsl:value-of select="map:size($amendments-by-parent-id)"/> targets</xsl:message>
        <xsl:message>  - By reference-id: <xsl:value-of select="map:size($amendments-by-reference-id)"/> targets</xsl:message>
        <xsl:message>  - XPath-based: <xsl:value-of select="count($xpath-amendments)"/> amendments</xsl:message>
        <xsl:message>  - Global text replacements: <xsl:value-of select="count($global-text-replacements)"/> rules</xsl:message>

        <xsl:choose>
            <xsl:when test="$amendment-count = 0">
                <xsl:message terminate="yes">Error: No amendments found in overlay document.</xsl:message>
            </xsl:when>
            <xsl:otherwise>
                <!-- PRE-PROCESS: Apply global text replacements to source document FIRST -->
                <!-- This allows subsequent amendments to reference the new IDs -->
                <xsl:variable name="preprocessed-doc">
                    <xsl:choose>
                        <xsl:when test="$has-global-text-replacements">
                            <xsl:message>  Applying global text replacements to source document...</xsl:message>
                            <xsl:apply-templates select="." mode="pre-process"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:copy-of select="."/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>

                <!-- MERGE: Single pass through pre-processed document -->
                <xsl:variable name="merged-doc">
                    <xsl:apply-templates select="$preprocessed-doc" mode="merge">
                        <xsl:with-param name="source-document" select="$preprocessed-doc" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:variable>

                <!-- POST-PROCESS: Resolve cross-references -->
                <xsl:apply-templates select="$merged-doc" mode="post-process"/>
            </xsl:otherwise>
        </xsl:choose>

        <xsl:message>Merge complete.</xsl:message>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- PRE-PROCESS MODE - GLOBAL TEXT REPLACEMENTS                        -->
    <!-- ================================================================== -->
    <!-- Applied to source document BEFORE merge, so amendments can         -->
    <!-- reference the new/updated IDs.                                     -->
    <!-- ================================================================== -->

    <!-- Default element handling for pre-process -->
    <xsl:template match="*" mode="pre-process">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" mode="pre-process"/>
        </xsl:copy>
    </xsl:template>

    <!-- Apply global text replacements to ALL attributes in pre-process -->
    <xsl:template match="@*" mode="pre-process">
        <xsl:attribute name="{name()}">
            <xsl:value-of select="bc:apply-global-text-replacements(string(.))"/>
        </xsl:attribute>
    </xsl:template>
    
    <!-- Smart number attribute update for structural elements -->
    <!-- When xml:id changes (e.g., sect36 -> sect37), automatically update number attribute -->
    <xsl:template match="section/@number | subsection/@number | article/@number" mode="pre-process" priority="10">
        <xsl:variable name="original-id" select="../@xml:id"/>
        <xsl:variable name="updated-id" select="bc:apply-global-text-replacements(string($original-id))"/>
        
        <xsl:choose>
            <!-- If ID changed, extract new number from the FINAL updated ID -->
            <xsl:when test="$original-id != $updated-id">
                <xsl:variable name="new-number" select="bc:extract-number-from-id($updated-id, local-name(..))"/>
                <xsl:attribute name="number">
                    <xsl:value-of select="$new-number"/>
                </xsl:attribute>
                <!-- Debug message -->
                <xsl:message>Smart number update: <xsl:value-of select="local-name(..)"/> ID changed from <xsl:value-of select="$original-id"/> to <xsl:value-of select="$updated-id"/>, number updated to <xsl:value-of select="$new-number"/></xsl:message>
            </xsl:when>
            <!-- Otherwise, apply normal text replacements -->
            <xsl:otherwise>
                <xsl:attribute name="number">
                    <xsl:value-of select="bc:apply-global-text-replacements(string(.))"/>
                </xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Apply global text replacements to ALL text nodes in pre-process -->
    <xsl:template match="text()" mode="pre-process">
        <xsl:value-of select="bc:apply-global-text-replacements(string(.))"/>
    </xsl:template>

    <!-- EXCLUSIONS: Don't apply text replacements to certain elements -->
    <!-- Application note numbers should not be affected by section renumbering -->
    <xsl:template match="application-note/number/text() | note-division/number/text()" mode="pre-process" priority="10">
        <xsl:copy-of select="."/>
    </xsl:template>

    <!-- Preserve comments and processing instructions in pre-process -->
    <xsl:template match="comment() | processing-instruction()" mode="pre-process">
        <xsl:copy/>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- MERGE MODE - SINGLE PASS TRAVERSAL                                 -->
    <!-- ================================================================== -->

    <!-- Default: copy everything -->
    <xsl:template match="node() | @*" mode="merge">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" mode="merge"/>
        </xsl:copy>
    </xsl:template>

    <!-- Elements with xml:id - check for amendments -->
    <xsl:template match="*[@xml:id]" mode="merge">
        <xsl:param name="source-document" tunnel="yes"/>

        <xsl:variable name="element-id" select="string(@xml:id)"/>
        <xsl:variable name="element-name" select="local-name()"/>

        <!-- O(1) lookup: Get amendments targeting this element directly -->
        <xsl:variable name="direct-amendments" select="bc:get-amendments-for-id($element-id)"/>

        <!-- O(1) lookup: Get position-based amendments where this is the parent -->
        <!-- For row elements, exclude amendments that insert rows (handled by tbody template) -->
        <xsl:variable name="parent-amendments-raw" select="map:get($amendments-by-parent-id, $element-id)"/>
        <xsl:variable name="parent-amendments" select="
            if ($element-name = 'row') 
            then $parent-amendments-raw[not(.//new-content/row)]
            else $parent-amendments-raw"/>

        <!-- O(1) lookup: Get amendments referencing this element for sibling insertion -->
        <xsl:variable name="reference-amendments" select="bc:get-reference-amendments-for-id($element-id)"/>

        <!-- O(1) lookup: Get child-element amendments for this parent -->
        <xsl:variable name="child-element-amendments" select="map:get($amendments-by-child-element-parent, $element-id)"/>

        <!-- Check for XPath matches (still needs iteration but only over xpath amendments) -->
        <xsl:variable name="xpath-matches" select="$xpath-amendments[bc:xpath-target-matches($element-id, target/@xpath)]"/>

        <!-- Determine what to do with this element -->
        <xsl:variable name="replace-amendment" select="($direct-amendments[replace], $xpath-matches[replace])[1]"/>
        <xsl:variable name="delete-amendment" select="$direct-amendments[delete][1]"/>
        <xsl:variable name="modify-amendments" select="$direct-amendments[modify]"/>

        <xsl:choose>
            <!-- DELETE: Skip this element entirely -->
            <xsl:when test="$delete-amendment">
                <!-- Output nothing - element is deleted -->
            </xsl:when>

            <!-- REPLACE: Output new content instead -->
            <xsl:when test="$replace-amendment">
                <xsl:apply-templates select="$replace-amendment/replace/new-content/*" mode="bc-to-canonical">
                    <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                    <xsl:with-param name="source-value" select="$replace-amendment/replace/new-content/@source" tunnel="yes"/>
                </xsl:apply-templates>
            </xsl:when>

            <!-- MODIFY or has child amendments: Process with modifications -->
            <xsl:when test="$modify-amendments or $parent-amendments or $child-element-amendments">
                <xsl:call-template name="process-element-with-amendments">
                    <xsl:with-param name="element" select="."/>
                    <xsl:with-param name="modify-amendments" select="$modify-amendments"/>
                    <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                    <xsl:with-param name="child-element-amendments" select="$child-element-amendments"/>
                </xsl:call-template>
            </xsl:when>

            <!-- No direct amendments but may have reference-based sibling inserts -->
            <xsl:otherwise>
                <xsl:copy>
                    <xsl:apply-templates select="@*" mode="merge"/>
                    <xsl:call-template name="process-children">
                        <xsl:with-param name="parent-id" select="$element-id"/>
                        <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                    </xsl:call-template>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Process element with modifications -->
    <xsl:template name="process-element-with-amendments">
        <xsl:param name="element"/>
        <xsl:param name="modify-amendments"/>
        <xsl:param name="parent-amendments"/>
        <xsl:param name="child-element-amendments"/>

        <xsl:variable name="element-id" select="string($element/@xml:id)"/>

        <!-- Apply modifications to the element -->
        <xsl:choose>
            <xsl:when test="$modify-amendments">
                <xsl:call-template name="apply-all-modifications">
                    <xsl:with-param name="element" select="$element"/>
                    <xsl:with-param name="modifications" select="$modify-amendments"/>
                    <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                    <xsl:with-param name="child-element-amendments" select="$child-element-amendments"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy select="$element">
                    <xsl:apply-templates select="$element/@*" mode="merge"/>
                    <xsl:call-template name="process-children">
                        <xsl:with-param name="parent-id" select="$element-id"/>
                        <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                        <xsl:with-param name="child-element-amendments" select="$child-element-amendments"/>
                    </xsl:call-template>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Apply all modifications to an element -->
    <xsl:template name="apply-all-modifications">
        <xsl:param name="element"/>
        <xsl:param name="modifications"/>
        <xsl:param name="parent-amendments"/>
        <xsl:param name="child-element-amendments"/>

        <xsl:variable name="element-id" select="string($element/@xml:id)"/>

        <!-- Check if any modification comes from BC (has source="bc" on new-content) -->
        <xsl:variable name="has-bc-modification" select="exists($modifications//new-content[@source='bc'])" as="xs:boolean"/>

        <!-- Apply modifications in sequence order -->
        <xsl:variable name="modified-element">
            <xsl:for-each select="$modifications">
                <xsl:sort select="xs:integer(@sequence)"/>
                <xsl:if test="position() = 1">
                    <xsl:apply-templates select="$element" mode="apply-modification">
                        <xsl:with-param name="operation" select="modify" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:if>
            </xsl:for-each>
        </xsl:variable>

        <!-- If modified element exists, we need to process its children for amendments -->
        <xsl:choose>
            <xsl:when test="$modified-element/*">
                <!-- Copy the modified element but process children for amendments -->
                <xsl:for-each select="$modified-element/*">
                    <xsl:copy>
                        <!-- Copy existing attributes -->
                        <xsl:copy-of select="@*[not(name() = 'source')]"/>
                        <!-- Add source="bc" if modification comes from BC -->
                        <xsl:if test="$has-bc-modification">
                            <xsl:attribute name="source">bc</xsl:attribute>
                        </xsl:if>
                        <!-- Process children through process-children to handle child amendments -->
                        <xsl:call-template name="process-children">
                            <xsl:with-param name="parent-id" select="$element-id"/>
                            <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                            <xsl:with-param name="child-element-amendments" select="$child-element-amendments"/>
                        </xsl:call-template>
                    </xsl:copy>
                </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy select="$element">
                    <xsl:apply-templates select="$element/@*" mode="merge"/>
                    <xsl:call-template name="process-children">
                        <xsl:with-param name="parent-id" select="$element-id"/>
                        <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                        <xsl:with-param name="child-element-amendments" select="$child-element-amendments"/>
                    </xsl:call-template>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Process children with position-based insertions -->
    <xsl:template name="process-children">
        <xsl:param name="parent-id"/>
        <xsl:param name="parent-amendments" select="()"/>
        <xsl:param name="child-element-amendments" select="()"/>
        <xsl:param name="source-document" tunnel="yes"/>

        <!-- Check if current element is a table (row inserts are handled by tbody template) -->
        <xsl:variable name="is-table" select="local-name() = 'table'"/>

        <!-- Separate amendments by position type -->
        <xsl:variable name="first-child-inserts" select="$parent-amendments[target/@position = 'first-child']"/>
        
        <!-- For tables, exclude row inserts from last-child (handled by tbody template) -->
        <xsl:variable name="last-child-inserts" select="
            if ($is-table) 
            then $parent-amendments[target/@position = 'last-child' and not(.//new-content/row)]
            else $parent-amendments[target/@position = 'last-child']"/>
        
        <!-- After inserts without reference-id (insert after existing children, before last-child) -->
        <xsl:variable name="after-inserts-no-ref" select="$parent-amendments[target/@position = 'after' and not(target/@reference-id)]"/>
        
        <!-- After inserts with reference-id (need to check if reference points to newly inserted content) -->
        <xsl:variable name="after-inserts-with-ref" select="$parent-amendments[target/@position = 'after' and target/@reference-id]"/>
        
        <!-- Before inserts without reference-id -->
        <xsl:variable name="before-inserts-no-ref" select="$parent-amendments[target/@position = 'before' and not(target/@reference-id)]"/>

        <!-- Before insertions without reference-id (insert before first child) -->
        <xsl:for-each select="$before-inserts-no-ref">
            <xsl:sort select="xs:integer(@sequence)"/>
            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
            </xsl:apply-templates>
        </xsl:for-each>

        <!-- First-child insertions -->
        <xsl:for-each select="$first-child-inserts">
            <xsl:sort select="xs:integer(@sequence)"/>
            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
            </xsl:apply-templates>
        </xsl:for-each>

        <!-- Process existing children -->
        <xsl:for-each select="node()">
            <xsl:variable name="current-node" select="."/>
            <xsl:variable name="current-id" select="@xml:id"/>
            <xsl:variable name="current-name" select="local-name()"/>
            <xsl:variable name="current-position" select="count(preceding-sibling::*[local-name() = $current-name]) + 1"/>

            <!-- Before insertions by reference-id (from global map) -->
            <xsl:if test="$current-id">
                <xsl:variable name="before-inserts" select="bc:get-reference-amendments-for-id($current-id)[target/@position = 'before']"/>
                <xsl:for-each select="$before-inserts">
                    <xsl:sort select="xs:integer(@sequence)"/>
                    <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                        <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                        <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:for-each>
            </xsl:if>

            <!-- Check for direct replacement of this child (to know the new IDs) -->
            <xsl:variable name="child-direct-amendments" select="if ($current-id) then bc:get-amendments-for-id($current-id) else ()"/>
            <xsl:variable name="child-replace-amendment" select="$child-direct-amendments[replace][1]"/>
            
            <!-- Check for child-element replacement (by element name/position) -->
            <xsl:variable name="child-element-replace" select="$child-element-amendments[
                target/@element-name = $current-name and
                (not(target/@position) or xs:integer(target/@position) = $current-position)
            ][1]"/>

            <xsl:choose>
                <!-- Child-element replacement (by element name/position) -->
                <xsl:when test="$child-element-replace">
                    <xsl:apply-templates select="$child-element-replace/replace/new-content/*" mode="bc-to-canonical">
                        <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:when>
                <xsl:otherwise>
                    <!-- Process the child normally (may be replaced by its own template) -->
                    <xsl:apply-templates select="$current-node" mode="merge"/>
                </xsl:otherwise>
            </xsl:choose>

            <!-- After insertions by reference-id (from global map, for original ID) -->
            <!-- Skip if this child was replaced - those inserts are handled separately below -->
            <xsl:if test="$current-id and not($child-replace-amendment)">
                <xsl:variable name="after-inserts" select="bc:get-reference-amendments-for-id($current-id)[target/@position = 'after']"/>
                <xsl:for-each select="$after-inserts">
                    <xsl:sort select="xs:integer(@sequence)"/>
                    <!-- Insert the content and then check for dependent amendments -->
                    <xsl:call-template name="insert-with-dependents">
                        <xsl:with-param name="amendment" select="."/>
                        <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                    </xsl:call-template>
                </xsl:for-each>
            </xsl:if>
            
            <!-- If this child was replaced, check for amendments that reference the NEW IDs -->
            <xsl:if test="$child-replace-amendment">
                <xsl:variable name="new-ids" select="$child-replace-amendment/replace/new-content//*/@xml:id"/>
                
                <xsl:for-each select="$new-ids">
                    <xsl:variable name="new-id" select="string(.)"/>
                    
                    <!-- Find amendments in parent-amendments that reference this new ID -->
                    <xsl:variable name="dependent-inserts" select="$after-inserts-with-ref[
                        bc:ids-match(string(target/@reference-id), $new-id)
                    ]"/>
                    
                    <xsl:for-each select="$dependent-inserts">
                        <xsl:sort select="xs:integer(@sequence)"/>
                        <xsl:call-template name="insert-with-dependents">
                            <xsl:with-param name="amendment" select="."/>
                            <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                            <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                        </xsl:call-template>
                    </xsl:for-each>
                </xsl:for-each>
            </xsl:if>
        </xsl:for-each>

        <!-- After insertions without reference-id (insert after all existing children) -->
        <xsl:for-each select="$after-inserts-no-ref">
            <xsl:sort select="xs:integer(@sequence)"/>
            <!-- Insert the content and then check for dependent amendments -->
            <xsl:call-template name="insert-with-dependents">
                <xsl:with-param name="amendment" select="."/>
                <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
            </xsl:call-template>
        </xsl:for-each>

        <!-- Last-child insertions -->
        <xsl:for-each select="$last-child-inserts">
            <xsl:sort select="xs:integer(@sequence)"/>
            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
            </xsl:apply-templates>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Insert content and recursively insert any dependent amendments -->
    <xsl:template name="insert-with-dependents">
        <xsl:param name="amendment"/>
        <xsl:param name="parent-amendments"/>
        <xsl:param name="source-document" tunnel="yes"/>
        
        <!-- Get the IDs of content being inserted -->
        <xsl:variable name="inserted-ids" select="$amendment/insert/new-content//*/@xml:id"/>
        
        <!-- Insert the main content -->
        <xsl:apply-templates select="$amendment/insert/new-content/*" mode="bc-to-canonical">
            <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
            <xsl:with-param name="source-value" select="$amendment/insert/new-content/@source" tunnel="yes"/>
        </xsl:apply-templates>
        
        <!-- Check for dependent amendments that reference the inserted content -->
        <xsl:for-each select="$inserted-ids">
            <xsl:variable name="inserted-id" select="string(.)"/>
            
            <!-- Find amendments in parent-amendments that have reference-id pointing to this inserted content -->
            <xsl:variable name="dependent-amendments" select="$parent-amendments[
                target/@position = 'after' and 
                target/@reference-id and
                bc:ids-match(string(target/@reference-id), $inserted-id) and
                xs:integer(@sequence) > xs:integer($amendment/@sequence)
            ]"/>
            
            <xsl:for-each select="$dependent-amendments">
                <xsl:sort select="xs:integer(@sequence)"/>
                <!-- Recursively insert dependent content -->
                <xsl:call-template name="insert-with-dependents">
                    <xsl:with-param name="amendment" select="."/>
                    <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                    <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                </xsl:call-template>
            </xsl:for-each>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- SPECIAL HANDLERS: TBODY (Table Rows)                               -->
    <!-- ================================================================== -->

    <xsl:template match="tbody" mode="merge">
        <xsl:param name="source-document" tunnel="yes"/>
        <xsl:variable name="table-id" select="ancestor::table[1]/@xml:id"/>

        <!-- O(1) lookup for table-specific amendments -->
        <xsl:variable name="table-row-inserts" select="map:get($amendments-by-table-id, string($table-id))"/>
        <xsl:variable name="table-level-row-inserts" select="map:get($amendments-by-parent-id, string($table-id))[.//new-content/row]"/>

        <xsl:copy>
            <xsl:apply-templates select="@*" mode="merge"/>

            <xsl:choose>
                <xsl:when test="$table-row-inserts or $table-level-row-inserts or row/@xml:id">
                    <xsl:for-each select="row">
                        <xsl:variable name="current-row" select="."/>
                        <xsl:variable name="current-row-id" select="@xml:id"/>

                        <!-- O(1) lookup for row-specific position amendments -->
                        <xsl:variable name="row-amendments" select="map:get($amendments-by-parent-id, string($current-row-id))[.//new-content/row]"/>

                        <!-- Content-based before insertions -->
                        <xsl:for-each select="$table-row-inserts[target/@position = 'before' and
                                              bc:row-contains-ref($current-row, target/@match-row-containing)]">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Position-based before insertions targeting this row -->
                        <xsl:for-each select="$row-amendments[target/@position = 'before']">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Process the row -->
                        <xsl:apply-templates select="$current-row" mode="merge"/>

                        <!-- Content-based after insertions -->
                        <xsl:for-each select="$table-row-inserts[target/@position = 'after' and
                                              bc:row-contains-ref($current-row, target/@match-row-containing)]">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Position-based after insertions targeting this row -->
                        <xsl:for-each select="$row-amendments[target/@position = 'after']">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="node()" mode="merge"/>
                </xsl:otherwise>
            </xsl:choose>

            <!-- Last-child row insertions at table level -->
            <xsl:for-each select="$table-level-row-inserts[target/@position = 'last-child']">
                <xsl:sort select="xs:integer(@sequence)"/>
                <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                    <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                    <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                </xsl:apply-templates>
            </xsl:for-each>
        </xsl:copy>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- SPECIAL HANDLERS: LIST (Items)                                     -->
    <!-- ================================================================== -->

    <xsl:template match="list" mode="merge">
        <xsl:param name="source-document" tunnel="yes"/>
        <xsl:variable name="sentence-id" select="ancestor::sentence[1]/@xml:id"/>
        <xsl:variable name="appnote-id" select="ancestor::application-note[1]/@xml:id"/>

        <!-- O(1) lookups — check appnote first, then fall back to sentence for list-item-insert -->
        <xsl:variable name="list-item-inserts" select="(map:get($amendments-by-appnote-id, string($appnote-id)), map:get($amendments-by-appnote-id, string($sentence-id)))"/>
        <xsl:variable name="sentence-level-item-inserts" select="map:get($amendments-by-parent-id, string($sentence-id))[.//new-content/item]"/>

        <xsl:copy>
            <xsl:apply-templates select="@*" mode="merge"/>

            <xsl:choose>
                <xsl:when test="$list-item-inserts or $sentence-level-item-inserts or item/@xml:id">
                    <xsl:for-each select="item">
                        <xsl:variable name="current-item" select="."/>
                        <xsl:variable name="item-id" select="@xml:id"/>

                        <!-- O(1) lookup for item-specific position amendments (by parent-id) -->
                        <xsl:variable name="item-amendments" select="if ($item-id) then map:get($amendments-by-parent-id, string($item-id))[.//new-content/item] else ()"/>

                        <!-- O(1) lookup for reference-based amendments targeting this item -->
                        <xsl:variable name="item-ref-amendments" select="if ($item-id) then bc:get-reference-amendments-for-id($item-id) else ()"/>

                        <!-- Content-based before insertions -->
                        <xsl:for-each select="$list-item-inserts[target/@position = 'before' and
                                              bc:item-contains-text($current-item, target/@match-item-containing)]">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Position-based before insertions targeting this item (parent-id) -->
                        <xsl:for-each select="$item-amendments[target/@position = 'before']">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Reference-based before insertions targeting this item (reference-id) -->
                        <xsl:for-each select="$item-ref-amendments[target/@position = 'before']">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Process the item -->
                        <xsl:apply-templates select="$current-item" mode="merge"/>

                        <!-- Content-based after insertions -->
                        <xsl:for-each select="$list-item-inserts[target/@position = 'after' and
                                              bc:item-contains-text($current-item, target/@match-item-containing)]">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Position-based after insertions targeting this item (parent-id) -->
                        <xsl:for-each select="$item-amendments[target/@position = 'after']">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:for-each>

                        <!-- Reference-based after insertions targeting this item (reference-id) -->
                        <!-- Use insert-with-dependents to handle chained inserts -->
                        <xsl:for-each select="$item-ref-amendments[target/@position = 'after']">
                            <xsl:sort select="xs:integer(@sequence)"/>
                            <xsl:call-template name="insert-with-dependents">
                                <xsl:with-param name="amendment" select="."/>
                                <xsl:with-param name="parent-amendments" select="$sentence-level-item-inserts"/>
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                            </xsl:call-template>
                        </xsl:for-each>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="node()" mode="merge"/>
                </xsl:otherwise>
            </xsl:choose>

            <!-- Last-child item insertions at sentence level -->
            <xsl:for-each select="$sentence-level-item-inserts[target/@position = 'last-child']">
                <xsl:sort select="xs:integer(@sequence)"/>
                <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                    <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                    <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                </xsl:apply-templates>
            </xsl:for-each>
        </xsl:copy>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- MODIFICATION MODE                                                  -->
    <!-- ================================================================== -->

    <xsl:template match="*" mode="apply-modification" priority="10">
        <xsl:param name="operation" tunnel="yes"/>

        <xsl:variable name="direct-text-changes"
            select="$operation/text-change[@xpath-within-target = 'text()' or @xpath-within-target = './/text()']"/>
        <xsl:variable name="element-text-changes"
            select="$operation/text-change[starts-with(@xpath-within-target, './/') and not(@xpath-within-target = './/text()')]"/>
        <xsl:variable name="element-replaces" select="$operation/element-replace"/>

        <xsl:choose>
            <xsl:when test="$element-replaces">
                <xsl:copy>
                    <xsl:apply-templates select="@*" mode="apply-modification"/>
                    <xsl:call-template name="apply-element-replaces">
                        <xsl:with-param name="nodes" select="node()"/>
                        <xsl:with-param name="replaces" select="$element-replaces"/>
                    </xsl:call-template>
                </xsl:copy>
            </xsl:when>
            <xsl:when test="$direct-text-changes">
                <xsl:copy>
                    <xsl:apply-templates select="@*" mode="apply-modification"/>
                    <xsl:apply-templates select="node()" mode="apply-text-change-recursive">
                        <xsl:with-param name="text-changes" select="$direct-text-changes" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:copy>
            </xsl:when>
            <xsl:when test="$element-text-changes">
                <xsl:copy>
                    <xsl:apply-templates select="@*" mode="apply-modification"/>
                    <xsl:apply-templates select="node()" mode="apply-element-text-change">
                        <xsl:with-param name="text-changes" select="$element-text-changes" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:copy>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy>
                    <xsl:apply-templates select="@* | node()" mode="apply-modification"/>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Apply element-replace operations -->
    <xsl:template name="apply-element-replaces">
        <xsl:param name="nodes"/>
        <xsl:param name="replaces"/>
        <xsl:param name="source-document" tunnel="yes"/>

        <xsl:for-each select="$nodes">
            <xsl:variable name="current-node" select="."/>
            <xsl:variable name="current-name" select="local-name()"/>
            <xsl:variable name="current-position"
                select="count(preceding-sibling::*[local-name() = $current-name]) + 1"/>

            <xsl:choose>
                <xsl:when test="self::*">
                    <xsl:variable name="matching-replace" select="$replaces[
                        @element = $current-name and
                        (not(@position) or xs:integer(@position) = $current-position)
                    ][1]"/>

                    <xsl:choose>
                        <xsl:when test="$matching-replace">
                            <xsl:apply-templates select="$matching-replace/new-content/node()" mode="bc-to-canonical">
                                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                            </xsl:apply-templates>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:copy-of select="."/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:copy-of select="."/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
    </xsl:template>

    <!-- Recursive text change application -->
    <xsl:template match="*" mode="apply-text-change-recursive">
        <xsl:param name="text-changes" tunnel="yes"/>

        <xsl:copy>
            <xsl:apply-templates select="@*" mode="apply-modification"/>
            <xsl:apply-templates select="node()" mode="apply-text-change-recursive">
                <xsl:with-param name="text-changes" select="$text-changes" tunnel="yes"/>
            </xsl:apply-templates>
        </xsl:copy>
    </xsl:template>

    <!-- Apply text changes to text nodes -->
    <xsl:template match="text()" mode="apply-text-change-recursive">
        <xsl:param name="text-changes" tunnel="yes"/>

        <xsl:variable name="original-text" select="string(.)"/>

        <xsl:variable name="final-result" select="
            fold-left($text-changes, $original-text, function($text, $change) {
                if ($change/find-replace) then
                    let $find := string($change/find-replace/find),
                        $replace := string($change/find-replace/replace),
                        $is-regex := ($change/find-replace/@regex = 'true')
                    return
                        if ($is-regex) then replace($text, $find, $replace)
                        else replace($text, $find, $replace, 'q')
                else $text
            })"/>

        <xsl:value-of select="$final-result"/>
    </xsl:template>

    <!-- Element text change mode -->
    <xsl:template match="*" mode="apply-element-text-change">
        <xsl:param name="text-changes" tunnel="yes"/>

        <xsl:variable name="current-element" select="."/>
        <xsl:variable name="current-name" select="local-name()"/>
        <xsl:variable name="current-position"
            select="count(preceding-sibling::*[local-name() = $current-name]) + 1"/>

        <xsl:variable name="matching-changes"
            select="$text-changes[bc:element-matches-xpath-with-position($current-element, $current-position, @xpath-within-target)]"/>

        <xsl:choose>
            <xsl:when test="$matching-changes">
                <xsl:call-template name="apply-cross-node-text-change">
                    <xsl:with-param name="element" select="."/>
                    <xsl:with-param name="changes" select="$matching-changes"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy>
                    <xsl:apply-templates select="@*" mode="apply-modification"/>
                    <xsl:apply-templates select="node()" mode="apply-element-text-change">
                        <xsl:with-param name="text-changes" select="$text-changes" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="text() | comment() | processing-instruction()" mode="apply-element-text-change">
        <xsl:copy-of select="."/>
    </xsl:template>

    <!-- Apply text change across multiple text nodes -->
    <xsl:template name="apply-cross-node-text-change">
        <xsl:param name="element"/>
        <xsl:param name="changes"/>

        <xsl:copy select="$element">
            <xsl:apply-templates select="$element/@*" mode="apply-modification"/>
            <xsl:call-template name="rebuild-with-text-changes">
                <xsl:with-param name="nodes" select="$element/node()"/>
                <xsl:with-param name="changes" select="$changes"/>
            </xsl:call-template>
        </xsl:copy>
    </xsl:template>

    <!-- Rebuild element content with text changes -->
    <xsl:template name="rebuild-with-text-changes">
        <xsl:param name="nodes"/>
        <xsl:param name="changes"/>

        <xsl:for-each select="$nodes">
            <xsl:choose>
                <xsl:when test="self::text()">
                    <xsl:variable name="original" select="string(.)"/>
                    <xsl:variable name="result" select="
                        fold-left($changes, $original, function($text, $change) {
                            if ($change/find-replace) then
                                let $find := string($change/find-replace/find),
                                    $replace := string($change/find-replace/replace),
                                    $is-regex := ($change/find-replace/@regex = 'true'),
                                    $normalized-find := replace($find, '\s+', '\\s+')
                                return
                                    if ($is-regex) then replace($text, $find, $replace)
                                    else replace($text, $normalized-find, $replace)
                            else $text
                        })"/>
                    <xsl:value-of select="$result"/>
                </xsl:when>
                <xsl:when test="self::*">
                    <xsl:copy>
                        <xsl:apply-templates select="@*" mode="apply-modification"/>
                        <xsl:call-template name="rebuild-with-text-changes">
                            <xsl:with-param name="nodes" select="node()"/>
                            <xsl:with-param name="changes" select="$changes"/>
                        </xsl:call-template>
                    </xsl:copy>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:copy-of select="."/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
    </xsl:template>

    <!-- Standard node matching for modifications -->
    <xsl:template match="node() | @*" mode="apply-modification">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" mode="apply-modification"/>
        </xsl:copy>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- BC TO CANONICAL CONVERSION MODE                                    -->
    <!-- ================================================================== -->

    <xsl:template match="*" mode="bc-to-canonical">
        <xsl:param name="source-document" tunnel="yes"/>
        <xsl:param name="source-value" tunnel="yes" select="''"/>
        
        <xsl:variable name="new-id" select="@xml:id"/>
        
        <!-- Check if there are amendments targeting this new element for child insertions -->
        <xsl:variable name="new-parent-amendments" select="if ($new-id) then map:get($amendments-by-parent-id, string($new-id)) else ()"/>
        <xsl:variable name="new-child-element-amendments" select="if ($new-id) then map:get($amendments-by-child-element-parent, string($new-id)) else ()"/>
        
        <xsl:element name="{local-name()}">
            <!-- Copy xml:id as-is (whether it starts with nbc. or bc.) -->
            <xsl:if test="@xml:id">
                <xsl:copy-of select="@xml:id"/>
            </xsl:if>

            <xsl:apply-templates select="@*[not(name() = 'xml:id')]" mode="bc-to-canonical"/>
            
            <!-- Add source attribute if provided via tunnel parameter and this is a structural element -->
            <xsl:if test="$source-value != '' and 
                          (self::division or self::part or self::section or 
                           self::subsection or self::article or self::sentence or 
                           self::clause or self::subclause or self::table or 
                           self::figure or self::application-note or self::note-division or
                           self::spectables)">
                <xsl:attribute name="source" select="$source-value"/>
            </xsl:if>
            
            <!-- Add revised="yes" if element has revision-history child -->
            <xsl:if test="revision-history">
                <xsl:attribute name="revised">yes</xsl:attribute>
            </xsl:if>
            
            <!-- Always process children through process-new-content-children to handle delete amendments -->
            <xsl:call-template name="process-new-content-children">
                <xsl:with-param name="parent-id" select="string($new-id)"/>
                <xsl:with-param name="parent-amendments" select="$new-parent-amendments"/>
                <xsl:with-param name="child-element-amendments" select="$new-child-element-amendments"/>
            </xsl:call-template>
        </xsl:element>
    </xsl:template>
    
    <!-- Process children of newly inserted content with amendments -->
    <xsl:template name="process-new-content-children">
        <xsl:param name="parent-id"/>
        <xsl:param name="parent-amendments" select="()"/>
        <xsl:param name="child-element-amendments" select="()"/>
        <xsl:param name="source-document" tunnel="yes"/>
        
        <!-- Separate amendments by position type -->
        <xsl:variable name="first-child-inserts" select="$parent-amendments[target/@position = 'first-child']"/>
        <xsl:variable name="last-child-inserts" select="$parent-amendments[target/@position = 'last-child']"/>
        <xsl:variable name="after-inserts-with-ref" select="$parent-amendments[target/@position = 'after' and target/@reference-id]"/>
        <xsl:variable name="before-inserts-with-ref" select="$parent-amendments[target/@position = 'before' and target/@reference-id]"/>
        
        <!-- First-child insertions -->
        <xsl:for-each select="$first-child-inserts">
            <xsl:sort select="xs:integer(@sequence)"/>
            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
            </xsl:apply-templates>
        </xsl:for-each>
        
        <!-- Process existing children with before/after inserts -->
        <xsl:for-each select="node()">
            <xsl:variable name="current-node" select="."/>
            <xsl:variable name="current-id" select="@xml:id"/>
            
            <!-- Check for delete amendment targeting this child -->
            <xsl:variable name="delete-amendment" select="if ($current-id) then bc:get-amendments-for-id(string($current-id))[delete][1] else ()"/>
            
            <!-- Before insertions by reference-id -->
            <xsl:if test="$current-id and not($delete-amendment)">
                <xsl:variable name="before-inserts" select="$before-inserts-with-ref[bc:ids-match(string(target/@reference-id), string($current-id))]"/>
                <xsl:for-each select="$before-inserts">
                    <xsl:sort select="xs:integer(@sequence)"/>
                    <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                        <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                        <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:for-each>
            </xsl:if>
            
            <!-- Process the child (skip if deleted) -->
            <xsl:if test="not($delete-amendment)">
                <xsl:apply-templates select="$current-node" mode="bc-to-canonical"/>
            </xsl:if>
            
            <!-- After insertions by reference-id -->
            <xsl:if test="$current-id and not($delete-amendment)">
                <xsl:variable name="after-inserts" select="$after-inserts-with-ref[bc:ids-match(string(target/@reference-id), string($current-id))]"/>
                <xsl:for-each select="$after-inserts">
                    <xsl:sort select="xs:integer(@sequence)"/>
                    <!-- Insert and check for dependent amendments -->
                    <xsl:call-template name="insert-new-content-with-dependents">
                        <xsl:with-param name="amendment" select="."/>
                        <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                        <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                    </xsl:call-template>
                </xsl:for-each>
            </xsl:if>
        </xsl:for-each>
        
        <!-- Last-child insertions -->
        <xsl:for-each select="$last-child-inserts">
            <xsl:sort select="xs:integer(@sequence)"/>
            <xsl:apply-templates select="insert/new-content/*" mode="bc-to-canonical">
                <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                <xsl:with-param name="source-value" select="insert/new-content/@source" tunnel="yes"/>
            </xsl:apply-templates>
        </xsl:for-each>
    </xsl:template>
    
    <!-- Insert new content and recursively insert dependent amendments (for bc-to-canonical mode) -->
    <xsl:template name="insert-new-content-with-dependents">
        <xsl:param name="amendment"/>
        <xsl:param name="parent-amendments"/>
        <xsl:param name="source-document" tunnel="yes"/>
        
        <!-- Get the IDs of content being inserted -->
        <xsl:variable name="inserted-ids" select="$amendment/insert/new-content//*/@xml:id"/>
        
        <!-- Insert the main content -->
        <xsl:apply-templates select="$amendment/insert/new-content/*" mode="bc-to-canonical">
            <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
            <xsl:with-param name="source-value" select="$amendment/insert/new-content/@source" tunnel="yes"/>
        </xsl:apply-templates>
        
        <!-- Check for dependent amendments that reference the inserted content -->
        <xsl:for-each select="$inserted-ids">
            <xsl:variable name="inserted-id" select="string(.)"/>
            
            <!-- Find amendments in parent-amendments that have reference-id pointing to this inserted content -->
            <xsl:variable name="dependent-amendments" select="$parent-amendments[
                target/@position = 'after' and 
                target/@reference-id and
                bc:ids-match(string(target/@reference-id), $inserted-id) and
                xs:integer(@sequence) > xs:integer($amendment/@sequence)
            ]"/>
            
            <xsl:for-each select="$dependent-amendments">
                <xsl:sort select="xs:integer(@sequence)"/>
                <!-- Recursively insert dependent content -->
                <xsl:call-template name="insert-new-content-with-dependents">
                    <xsl:with-param name="amendment" select="."/>
                    <xsl:with-param name="parent-amendments" select="$parent-amendments"/>
                    <xsl:with-param name="source-document" select="$source-document" tunnel="yes"/>
                </xsl:call-template>
            </xsl:for-each>
        </xsl:for-each>
    </xsl:template>

    <xsl:template match="bc-ref" mode="bc-to-canonical">
        <ref type="{
            if (@type = 'bc-fire-code') then 'external'
            else if (@type = 'bc-building-code') then 'internal'
            else 'external'
        }" target="{@target}">
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </ref>
    </xsl:template>

    <xsl:template match="bc-note" mode="bc-to-canonical">
        <note type="bc-{@type}">
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </note>
    </xsl:template>

    <xsl:template match="bc-change" mode="bc-to-canonical">
        <change type="{substring-after(@type, 'bc-')}">
            <xsl:if test="@amendment-id">
                <xsl:attribute name="pcf-number" select="@amendment-id"/>
            </xsl:if>
            <xsl:if test="@effective-date">
                <xsl:attribute name="pr-year" select="substring(@effective-date, 1, 4)"/>
            </xsl:if>
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </change>
    </xsl:template>

    <xsl:template match="standard" mode="bc-to-canonical">
        <xsl:copy>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="web-addr" mode="bc-to-canonical">
        <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
    </xsl:template>

    <xsl:template match="note" mode="bc-to-canonical">
        <note>
            <!-- Copy xml:id as-is (whether it starts with nbc. or bc.) -->
            <xsl:if test="@xml:id">
                <xsl:copy-of select="@xml:id"/>
            </xsl:if>
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </note>
    </xsl:template>

    <xsl:template match="organization | address" mode="bc-to-canonical">
        <xsl:copy>
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </xsl:copy>
    </xsl:template>

    <!-- Revision history with auto-population -->
    <xsl:template match="revision-history" mode="bc-to-canonical">
        <xsl:param name="source-document" select="/" tunnel="yes"/>

        <revision-history>
            <xsl:choose>
                <xsl:when test="original/node()[not(self::comment())][normalize-space()]">
                    <xsl:apply-templates select="original" mode="bc-to-canonical"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:call-template name="auto-populate-original">
                        <xsl:with-param name="original-element" select="original"/>
                        <xsl:with-param name="source-document" select="$source-document"/>
                    </xsl:call-template>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:apply-templates select="revision" mode="bc-to-canonical"/>
        </revision-history>
    </xsl:template>

    <!-- Auto-populate original content -->
    <xsl:template name="auto-populate-original">
        <xsl:param name="original-element"/>
        <xsl:param name="source-document"/>

        <xsl:variable name="target-id" select="ancestor::*[@xml:id][1]/@xml:id"/>
        
        <!-- Use the global source document reference for reliable lookup -->
        <xsl:variable name="lookup-doc" select="$source-doc-root"/>
        
        <!-- Try to find the element with the original ID first -->
        <xsl:variable name="source-element-direct" select="($lookup-doc//*[@xml:id = $target-id])[1]"/>
        
        <!-- If not found, try converting between bc. and nbc. prefixes -->
        <xsl:variable name="lookup-id-converted">
            <xsl:choose>
                <xsl:when test="starts-with($target-id, 'bc.')">
                    <xsl:value-of select="concat('nbc.', substring-after($target-id, 'bc.'))"/>
                </xsl:when>
                <xsl:when test="starts-with($target-id, 'nbc.')">
                    <xsl:value-of select="concat('bc.', substring-after($target-id, 'nbc.'))"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="''"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <xsl:variable name="source-element-converted" select="
            if ($lookup-id-converted != '') 
            then ($lookup-doc//*[@xml:id = $lookup-id-converted])[1] 
            else ()"/>
        
        <!-- Use direct match first, then converted match -->
        <xsl:variable name="source-element" select="
            if ($source-element-direct) then $source-element-direct
            else $source-element-converted"/>

        <original effective-date="{$original-element/@effective-date}">
            <xsl:choose>
                <xsl:when test="$source-element">
                    <xsl:call-template name="extract-matching-content">
                        <xsl:with-param name="source-element" select="$source-element"/>
                        <xsl:with-param name="revision-history-context" select="."/>
                    </xsl:call-template>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:choose>
                        <xsl:when test="$original-element/comment()">
                            <xsl:copy-of select="$original-element/comment()"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:comment>Content auto populated by merge engine</xsl:comment>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:otherwise>
            </xsl:choose>
        </original>
    </xsl:template>

    <!-- Extract content matching revision history context -->
    <xsl:template name="extract-matching-content">
        <xsl:param name="source-element"/>
        <xsl:param name="revision-history-context"/>

        <xsl:variable name="revision-parent" select="$revision-history-context/parent::*"/>
        <xsl:variable name="parent-name" select="local-name($revision-parent)"/>

        <xsl:choose>
            <xsl:when test="$parent-name = 'entry'">
                <xsl:variable name="entry-position" select="count($revision-parent/preceding-sibling::entry) + 1"/>
                <xsl:variable name="source-entry" select="$source-element/entry[position() = $entry-position]"/>
                <xsl:apply-templates select="$source-entry/node()" mode="extract-original"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="extract-original-content">
                    <xsl:with-param name="source-element" select="$source-element"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Extract original content based on element type -->
    <xsl:template name="extract-original-content">
        <xsl:param name="source-element"/>

        <xsl:choose>
            <xsl:when test="local-name($source-element) = 'table'">
                <xsl:apply-templates select="$source-element/title" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/ref" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/tgroup" mode="extract-original"/>
            </xsl:when>
            <xsl:when test="local-name($source-element) = 'sentence'">
                <xsl:apply-templates select="$source-element/intent-ref" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/text" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/clause" mode="extract-original"/>
            </xsl:when>
            <xsl:when test="local-name($source-element) = 'article'">
                <xsl:apply-templates select="$source-element/title" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/sentence" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/table" mode="extract-original"/>
                <xsl:apply-templates select="$source-element/figure" mode="extract-original"/>
            </xsl:when>
            <xsl:when test="local-name($source-element) = 'row'">
                <xsl:apply-templates select="$source-element/entry" mode="extract-original"/>
            </xsl:when>
            <xsl:when test="local-name($source-element) = 'entry'">
                <xsl:apply-templates select="$source-element/node()[not(self::text()[normalize-space() = ''])]" mode="extract-original"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates select="$source-element/node()[not(self::text()[normalize-space() = ''])]" mode="extract-original"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="node() | @*" mode="extract-original">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" mode="extract-original"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="revision-history/original" mode="bc-to-canonical">
        <original effective-date="{@effective-date}">
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </original>
    </xsl:template>

    <xsl:template match="revision" mode="bc-to-canonical">
        <revision>
            <xsl:copy-of select="@seq | @type | @effective-date | @id | @status"/>
            <xsl:apply-templates select="content | change-summary | note" mode="bc-to-canonical"/>
        </revision>
    </xsl:template>

    <xsl:template match="revision/content" mode="bc-to-canonical">
        <content>
            <xsl:apply-templates select="node()" mode="bc-to-canonical"/>
        </content>
    </xsl:template>

    <xsl:template match="revision/change-summary | revision/note" mode="bc-to-canonical">
        <xsl:element name="{local-name()}">
            <xsl:value-of select="."/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="@revised" mode="bc-to-canonical">
        <xsl:copy-of select="."/>
    </xsl:template>

    <xsl:template match="item[organization]" mode="bc-to-canonical">
        <item>
            <!-- Copy xml:id as-is (whether it starts with nbc. or bc.) -->
            <xsl:if test="@xml:id">
                <xsl:copy-of select="@xml:id"/>
            </xsl:if>
            <xsl:apply-templates select="organization | address" mode="bc-to-canonical"/>
        </item>
    </xsl:template>

    <xsl:template match="@* | text()" mode="bc-to-canonical">
        <xsl:copy-of select="."/>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- POST-PROCESSING MODE                                               -->
    <!-- ================================================================== -->
    <!-- Handles reference-updates map for cross-reference resolution.      -->
    <!-- Global text replacements are now done in PRE-PROCESS mode.         -->
    <!-- ================================================================== -->

    <!-- Default: copy everything -->
    <xsl:template match="node() | @*" mode="post-process">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" mode="post-process"/>
        </xsl:copy>
    </xsl:template>

    <!-- Special handling for internal refs - apply reference-updates map -->
    <xsl:template match="ref[@type = 'internal']" mode="post-process">
        <xsl:variable name="original-target" select="@target"/>
        <xsl:variable name="updated-target" select="
            if (map:contains($reference-updates, $original-target))
            then map:get($reference-updates, $original-target)
            else $original-target"/>

        <ref type="internal" target="{$updated-target}">
            <xsl:copy-of select="@*[not(name() = 'target')]"/>
            <xsl:apply-templates select="node()" mode="post-process"/>
        </ref>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- UTILITY FUNCTIONS                                                  -->
    <!-- ================================================================== -->

    <!-- Apply all global text replacements to a string -->
    <xsl:function name="bc:apply-global-text-replacements" as="xs:string">
        <xsl:param name="text" as="xs:string"/>
        
        <xsl:sequence select="
            fold-left($global-text-replacements, $text, function($current-text, $replacement) {
                let $from := string($replacement/@from),
                    $to := string($replacement/@to),
                    $is-regex := ($replacement/@regex = 'true')
                return
                    if ($is-regex) then replace($current-text, $from, $to)
                    else replace($current-text, $from, $to, 'q')
            })"/>
    </xsl:function>
    
    <!-- Extract number from canonical ID for structural elements -->
    <!-- Examples: 
         nbc.divBV2.part9.sect36 -> 36
         nbc.divBV2.part9.sect36.subsect7 -> 7
         nbc.divBV2.part9.sect36.subsect7.art5 -> 5
    -->
    <xsl:function name="bc:extract-number-from-id" as="xs:string">
        <xsl:param name="id" as="xs:string"/>
        <xsl:param name="element-type" as="xs:string"/>
        
        <xsl:variable name="pattern">
            <xsl:choose>
                <xsl:when test="$element-type = 'section'">sect(\d+)</xsl:when>
                <xsl:when test="$element-type = 'subsection'">subsect(\d+)</xsl:when>
                <xsl:when test="$element-type = 'article'">art(\d+)</xsl:when>
                <xsl:otherwise>(\d+)</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <xsl:variable name="matches" select="analyze-string($id, $pattern)"/>
        <xsl:variable name="all-groups" select="$matches//fn:group[@nr='1']"/>
        
        <xsl:sequence select="if (exists($all-groups)) then string($all-groups[last()]) else ''"/>
    </xsl:function>

    <!-- Helper function to get amendments for an ID (handles bc/nbc conversion) -->
    <xsl:function name="bc:get-amendments-for-id" as="element()*">
        <xsl:param name="element-id" as="xs:string"/>

        <xsl:variable name="direct-match" select="map:get($amendments-by-canonical-id, $element-id)"/>

        <!-- Also check with bc/nbc conversion (only if ID starts with bc. or nbc. or bc-) -->
        <xsl:variable name="converted-id">
            <xsl:choose>
                <xsl:when test="starts-with($element-id, 'bc.')">
                    <xsl:value-of select="replace($element-id, '^bc\.', 'nbc.')"/>
                </xsl:when>
                <xsl:when test="starts-with($element-id, 'nbc.')">
                    <xsl:value-of select="replace($element-id, '^nbc\.', 'bc.')"/>
                </xsl:when>
                <!-- Handle bc- prefix for term IDs (e.g., bc-scnd-t vs scnd-t) -->
                <xsl:when test="starts-with($element-id, 'bc-')">
                    <xsl:value-of select="substring-after($element-id, 'bc-')"/>
                </xsl:when>
                <xsl:otherwise>
                    <!-- No conversion needed - return empty string to avoid duplicate lookup -->
                    <xsl:value-of select="''"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <!-- Also check with bc- prefix added (for term IDs) -->
        <xsl:variable name="bc-prefixed-id" select="
            if (not(starts-with($element-id, 'bc-')) and not(starts-with($element-id, 'bc.')) and not(starts-with($element-id, 'nbc.')))
            then concat('bc-', $element-id)
            else ''"/>

        <!-- Only do converted lookup if we have a different ID -->
        <xsl:variable name="converted-match" select="if ($converted-id != '' and $converted-id != $element-id) then map:get($amendments-by-canonical-id, $converted-id) else ()"/>
        <xsl:variable name="bc-prefixed-match" select="if ($bc-prefixed-id != '' and $bc-prefixed-id != $element-id) then map:get($amendments-by-canonical-id, $bc-prefixed-id) else ()"/>

        <xsl:sequence select="($direct-match, $converted-match, $bc-prefixed-match)"/>
    </xsl:function>

    <!-- Helper function to get reference-based amendments (handles bc/nbc conversion) -->
    <xsl:function name="bc:get-reference-amendments-for-id" as="element()*">
        <xsl:param name="element-id" as="xs:string"/>

        <xsl:variable name="direct-match" select="map:get($amendments-by-reference-id, $element-id)"/>

        <!-- Also check with bc/nbc conversion (only if ID starts with bc. or nbc.) -->
        <xsl:variable name="converted-id">
            <xsl:choose>
                <xsl:when test="starts-with($element-id, 'bc.')">
                    <xsl:value-of select="replace($element-id, '^bc\.', 'nbc.')"/>
                </xsl:when>
                <xsl:when test="starts-with($element-id, 'nbc.')">
                    <xsl:value-of select="replace($element-id, '^nbc\.', 'bc.')"/>
                </xsl:when>
                <xsl:otherwise>
                    <!-- No conversion needed - return empty string to avoid duplicate lookup -->
                    <xsl:value-of select="''"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <!-- Only do converted lookup if we have a different ID -->
        <xsl:variable name="converted-match" select="if ($converted-id != '' and $converted-id != $element-id) then map:get($amendments-by-reference-id, $converted-id) else ()"/>

        <xsl:sequence select="($direct-match, $converted-match)"/>
    </xsl:function>

    <!-- Check if element matches amendment target -->
    <xsl:function name="bc:is-amendment-target" as="xs:boolean">
        <xsl:param name="amendment" as="element()"/>
        <xsl:param name="element-id" as="xs:string"/>

        <xsl:variable name="target" select="$amendment/target"/>

        <xsl:choose>
            <xsl:when test="$target/@type = 'canonical-id'">
                <xsl:sequence select="$target/@id = $element-id"/>
            </xsl:when>
            <xsl:when test="$target/@type = 'xpath'">
                <xsl:sequence select="false()"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:sequence select="false()"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>

    <!-- XPath matching within target -->
    <xsl:function name="bc:xpath-matches" as="xs:boolean">
        <xsl:param name="node" as="node()"/>
        <xsl:param name="xpath-expr" as="xs:string"/>

        <xsl:choose>
            <xsl:when test="$xpath-expr = '.'">
                <xsl:sequence select="true()"/>
            </xsl:when>
            <xsl:when test="$xpath-expr = 'text()'">
                <xsl:sequence select="boolean($node/self::text())"/>
            </xsl:when>
            <xsl:when test="starts-with($xpath-expr, '@')">
                <xsl:sequence select="boolean($node/self::attribute()[name() = substring($xpath-expr, 2)])"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^[a-zA-Z][\w\-]*$')">
                <xsl:sequence select="boolean($node/self::*[local-name() = $xpath-expr])"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^\.//')">
                <xsl:variable name="element-name" select="substring-after($xpath-expr, './/')"/>
                <xsl:sequence select="boolean($node/descendant-or-self::*[local-name() = $element-name])"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^\.//.+\[\d+\]$')">
                <xsl:variable name="element-part" select="substring-before(substring-after($xpath-expr, './/'), '[')"/>
                <xsl:variable name="position-str" select="substring-before(substring-after($xpath-expr, '['), ']')"/>
                <xsl:choose>
                    <xsl:when test="matches($position-str, '^\d+$')">
                        <xsl:variable name="position" select="xs:integer($position-str)"/>
                        <xsl:sequence select="boolean($node/descendant-or-self::*[local-name() = $element-part][$position])"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:sequence select="false()"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:when test="$xpath-expr = './/text()'">
                <xsl:sequence select="boolean($node/descendant-or-self::text())"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^\.//.+//text\(\)$')">
                <xsl:variable name="element-name" select="substring-before(substring-after($xpath-expr, './/'), '//text')"/>
                <xsl:sequence select="boolean($node/descendant-or-self::*[local-name() = $element-name]/text())"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^[a-zA-Z][\w\-]*/text\(\)$')">
                <xsl:variable name="element-name" select="substring-before($xpath-expr, '/text')"/>
                <xsl:sequence select="boolean($node/self::*[local-name() = $element-name]/text())"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^\.//.+\[\d+\]//text\(\)$')">
                <xsl:variable name="element-part" select="substring-before(substring-after($xpath-expr, './/'), '[')"/>
                <xsl:variable name="position-str" select="substring-before(substring-after($xpath-expr, '['), ']')"/>
                <xsl:choose>
                    <xsl:when test="matches($position-str, '^\d+$')">
                        <xsl:variable name="position" select="xs:integer($position-str)"/>
                        <xsl:sequence select="boolean($node/descendant-or-self::*[local-name() = $element-part][$position]/text())"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:sequence select="false()"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^[a-zA-Z][\w\-]*\[\d+\]$')">
                <xsl:variable name="element-name" select="substring-before($xpath-expr, '[')"/>
                <xsl:variable name="position-str" select="substring-before(substring-after($xpath-expr, '['), ']')"/>
                <xsl:choose>
                    <xsl:when test="matches($position-str, '^\d+$')">
                        <xsl:variable name="position" select="xs:integer($position-str)"/>
                        <xsl:sequence select="boolean($node/self::*[local-name() = $element-name][$position])"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:sequence select="false()"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:sequence select="false()"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>

    <!-- Check if row contains reference -->
    <xsl:function name="bc:row-contains-ref" as="xs:boolean">
        <xsl:param name="row" as="element(row)"/>
        <xsl:param name="target-id" as="xs:string"/>
        <xsl:sequence select="exists($row//ref[@target = $target-id])"/>
    </xsl:function>

    <!-- Check if item contains text -->
    <xsl:function name="bc:item-contains-text" as="xs:boolean">
        <xsl:param name="item" as="element(item)"/>
        <xsl:param name="search-text" as="xs:string"/>
        <xsl:sequence select="contains(string-join($item//text(), ''), $search-text)"/>
    </xsl:function>

    <!-- ID matching with bc/nbc conversion -->
    <xsl:function name="bc:ids-match" as="xs:boolean">
        <xsl:param name="reference-id" as="xs:string"/>
        <xsl:param name="element-id" as="xs:string"/>

        <xsl:variable name="direct-match" select="$reference-id = $element-id"/>

        <!-- Convert bc. to nbc. for comparison -->
        <xsl:variable name="bc-to-nbc-ref" select="
            if (starts-with($reference-id, 'bc.'))
            then replace($reference-id, '^bc\.', 'nbc.')
            else $reference-id"/>
        <xsl:variable name="bc-to-nbc-match" select="$bc-to-nbc-ref = $element-id"/>

        <!-- Convert nbc. to bc. for comparison -->
        <xsl:variable name="nbc-to-bc-ref" select="
            if (starts-with($reference-id, 'nbc.'))
            then replace($reference-id, '^nbc\.', 'bc.')
            else $reference-id"/>
        <xsl:variable name="nbc-to-bc-match" select="$nbc-to-bc-ref = $element-id"/>

        <xsl:sequence select="$direct-match or $bc-to-nbc-match or $nbc-to-bc-match"/>
    </xsl:function>

    <!-- Check if element matches XPath with position -->
    <xsl:function name="bc:element-matches-xpath-with-position" as="xs:boolean">
        <xsl:param name="element" as="element()"/>
        <xsl:param name="sibling-position" as="xs:integer"/>
        <xsl:param name="xpath-expr" as="xs:string"/>

        <xsl:choose>
            <xsl:when test="matches($xpath-expr, '^\.//.+$') and not(contains($xpath-expr, '['))">
                <xsl:variable name="element-name" select="substring-after($xpath-expr, './/')"/>
                <xsl:sequence select="local-name($element) = $element-name"/>
            </xsl:when>
            <xsl:when test="matches($xpath-expr, '^\.//.+\[\d+\]$')">
                <xsl:variable name="element-name" select="substring-before(substring-after($xpath-expr, './/'), '[')"/>
                <xsl:variable name="position-str" select="substring-before(substring-after($xpath-expr, '['), ']')"/>
                <xsl:choose>
                    <xsl:when test="matches($position-str, '^\d+$')">
                        <xsl:variable name="required-position" select="xs:integer($position-str)"/>
                        <xsl:sequence select="local-name($element) = $element-name and $sibling-position = $required-position"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- XPath contains a function or complex predicate, not a simple position -->
                        <xsl:sequence select="false()"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:sequence select="false()"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>

    <!-- XPath target matching -->
    <xsl:function name="bc:xpath-target-matches" as="xs:boolean">
        <xsl:param name="element-id" as="xs:string?"/>
        <xsl:param name="xpath-expr" as="xs:string"/>

        <xsl:choose>
            <xsl:when test="not($element-id)">
                <xsl:sequence select="false()"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="id-pattern" select="'@xml:id=''([^'']+)'''"/>
                <xsl:variable name="matches" select="analyze-string($xpath-expr, $id-pattern)"/>

                <xsl:choose>
                    <xsl:when test="$matches//fn:group[@nr='1']">
                        <xsl:variable name="target-id" select="string($matches//fn:group[@nr='1'][1])"/>
                        <xsl:sequence select="$element-id = $target-id"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:sequence select="false()"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>

</xsl:stylesheet>
