<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:fn="http://www.w3.org/2005/xpath-functions"
                xmlns:bc="http://bc.gov.ca/building-code"
                exclude-result-prefixes="xs fn bc">
    
    <!-- ================================================================== -->
    <!-- BC BUILDING CODE JSON OUTPUT VALIDATION ENGINE                     -->
    <!-- Validates JSON output against canonical XML source                 -->
    <!-- ================================================================== -->
    
    <xsl:output method="html" indent="yes" encoding="UTF-8"/>
    
    <!-- Input parameters -->
    <xsl:param name="json-output" required="yes"/>
    <xsl:param name="hide-success" select="'false'"/>
    
    <!-- Load documents - XML source is the input document -->
    <xsl:variable name="xml-doc" select="/"/>
    <xsl:variable name="json-text" select="unparsed-text(resolve-uri($json-output, static-base-uri()))"/>
    <xsl:variable name="json-doc" select="fn:json-to-xml($json-text)"/>
    
    <!-- ================================================================== -->
    <!-- HELPER FUNCTIONS                                                   -->
    <!-- ================================================================== -->
    
    <!-- Function to find JSON node by ID -->
    <!-- Returns first match only (IDs may appear in both main content and revisions array) -->
    <xsl:function name="bc:find-json-node" as="element()?">
        <xsl:param name="json-root"/>
        <xsl:param name="target-id" as="xs:string?"/>
        
        <xsl:choose>
            <xsl:when test="exists($target-id) and string-length($target-id) > 0">
                <!-- Return first match - prefer main content over revisions -->
                <xsl:sequence select="($json-root//*[@key='id'][string(.) = $target-id]/parent::*)[1]"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:sequence select="()"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Function to check if JSON node has property -->
    <xsl:function name="bc:has-property" as="xs:boolean">
        <xsl:param name="json-node"/>
        <xsl:param name="property-name" as="xs:string"/>
        
        <xsl:sequence select="exists($json-node/*[@key=$property-name])"/>
    </xsl:function>
    
    <!-- Function to get property value -->
    <xsl:function name="bc:get-property" as="xs:string?">
        <xsl:param name="json-node"/>
        <xsl:param name="property-name" as="xs:string"/>
        
        <xsl:sequence select="string($json-node/*[@key=$property-name])"/>
    </xsl:function>



    
    <!-- ================================================================== -->
    <!-- ROOT TEMPLATE - GENERATE HTML REPORT                               -->
    <!-- ================================================================== -->
    
    <xsl:template match="/">
        <html>
            <head>
                <title>BC Building Code JSON Validation Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background-color: #f5f5f5;
                    }
                    h1 {
                        color: #003366;
                        border-bottom: 3px solid #003366;
                        padding-bottom: 10px;
                    }
                    h2 {
                        color: #0066cc;
                        margin-top: 30px;
                        border-bottom: 2px solid #0066cc;
                        padding-bottom: 5px;
                    }
                    h3 {
                        color: #0088cc;
                        margin-top: 20px;
                    }
                    .summary {
                        background-color: white;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                    }
                    .summary-stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-top: 15px;
                    }
                    .stat-box {
                        background-color: #f8f9fa;
                        padding: 15px;
                        border-radius: 5px;
                        border-left: 4px solid #0066cc;
                    }
                    .stat-box.success {
                        border-left-color: #28a745;
                    }
                    .stat-box.warning {
                        border-left-color: #ffc107;
                    }
                    .stat-box.error {
                        border-left-color: #dc3545;
                    }
                    .stat-label {
                        font-size: 12px;
                        color: #666;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #333;
                    }
                    .validation-section {
                        background-color: white;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                    }
                    .issue {
                        padding: 10px;
                        margin: 10px 0;
                        border-radius: 3px;
                        border-left: 4px solid;
                    }
                    .issue.error {
                        background-color: #f8d7da;
                        border-left-color: #dc3545;
                        color: #721c24;
                    }
                    .issue.warning {
                        background-color: #fff3cd;
                        border-left-color: #ffc107;
                        color: #856404;
                    }
                    .issue.success {
                        background-color: #d4edda;
                        border-left-color: #28a745;
                        color: #155724;
                    }
                    .issue-id {
                        font-family: monospace;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .issue-details {
                        font-size: 14px;
                        margin-top: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        padding: 8px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        background-color: #f8f9fa;
                        font-weight: bold;
                    }
                    tr.error {
                        background-color: #f8d7da;
                    }
                    tr.warning {
                        background-color: #fff3cd;
                    }
                    tr.success {
                        background-color: #d4edda;
                    }
                    td.id-cell {
                        font-family: monospace;
                        font-size: 12px;
                    }
                    td.status-cell {
                        font-weight: bold;
                    }
                    td.status-cell.error {
                        color: #dc3545;
                    }
                    td.status-cell.warning {
                        color: #856404;
                    }
                    td.status-cell.success {
                        color: #28a745;
                    }
                    .timestamp {
                        color: #666;
                        font-size: 14px;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <h1>BC Building Code JSON Validation Report</h1>
                
                <div class="summary">
                    <h2>Validation Summary</h2>
                    <div class="timestamp">
                        Generated: <xsl:value-of select="current-dateTime()"/>
                    </div>
                    
                    <xsl:call-template name="generate-summary"/>
                </div>
                
                <xsl:call-template name="validate-revised-nodes"/>
                <xsl:call-template name="validate-structure"/>
                <xsl:call-template name="validate-content-completeness"/>
                <xsl:call-template name="validate-cross-references"/>
                
            </body>
        </html>
    </xsl:template>



    
    <!-- ================================================================== -->
    <!-- SUMMARY GENERATION                                                 -->
    <!-- ================================================================== -->
    
    <xsl:template name="generate-summary">
        <xsl:variable name="revised-nodes" select="$xml-doc//*[@revised='yes']"/>
        <xsl:variable name="revised-count" select="count($revised-nodes)"/>
        
        <xsl:variable name="revised-with-history" as="xs:integer">
            <xsl:variable name="count" as="xs:integer">
                <xsl:iterate select="$revised-nodes">
                    <xsl:param name="total" select="0" as="xs:integer"/>
                    <xsl:on-completion select="$total"/>
                    
                    <xsl:variable name="xml-id" select="@xml:id"/>
                    <xsl:variable name="json-node" select="bc:find-json-node($json-doc, $xml-id)"/>
                    
                    <xsl:choose>
                        <xsl:when test="$json-node and bc:has-property($json-node, 'revisions')">
                            <xsl:next-iteration>
                                <xsl:with-param name="total" select="$total + 1"/>
                            </xsl:next-iteration>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:next-iteration>
                                <xsl:with-param name="total" select="$total"/>
                            </xsl:next-iteration>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:iterate>
            </xsl:variable>
            <xsl:sequence select="$count"/>
        </xsl:variable>
        
        <xsl:variable name="total-elements" select="count($xml-doc//*[@xml:id])"/>
        <xsl:variable name="json-elements" select="count($json-doc//*[@key='id'])"/>
        
        <div class="summary-stats">
            <div class="stat-box">
                <div class="stat-label">Total XML Elements</div>
                <div class="stat-value"><xsl:value-of select="$total-elements"/></div>
            </div>
            <div class="stat-box">
                <div class="stat-label">JSON Objects with IDs</div>
                <div class="stat-value"><xsl:value-of select="$json-elements"/></div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Revised Elements</div>
                <div class="stat-value"><xsl:value-of select="$revised-count"/></div>
            </div>
            <div class="stat-box {if ($revised-with-history = $revised-count) then 'success' else 'error'}">
                <div class="stat-label">With Revision History</div>
                <div class="stat-value"><xsl:value-of select="$revised-with-history"/></div>
            </div>
        </div>
    </xsl:template>



    
    <!-- ================================================================== -->
    <!-- VALIDATION 1: REVISED NODES                                        -->
    <!-- ================================================================== -->
    
    <xsl:template name="validate-revised-nodes">
        <div class="validation-section">
            <h2>Validation 1: Revised Nodes and Revision History</h2>
            <p>Checking that all elements with revised="yes" have proper revision history in JSON...</p>
            
            <xsl:variable name="revised-nodes" select="$xml-doc//*[@revised='yes' and @xml:id]"/>
            
            <xsl:choose>
                <xsl:when test="count($revised-nodes) = 0">
                    <xsl:if test="$hide-success = 'false'">
                        <div class="issue success">
                            <div class="issue-details">No revised nodes found in XML.</div>
                        </div>
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <!-- Count errors and warnings -->
                    <xsl:variable name="error-count" as="xs:integer">
                        <xsl:variable name="count" as="xs:integer">
                            <xsl:iterate select="$revised-nodes">
                                <xsl:param name="total" select="0" as="xs:integer"/>
                                <xsl:on-completion select="$total"/>
                                
                                <xsl:variable name="xml-id" select="@xml:id"/>
                                <xsl:variable name="element-type" select="local-name()"/>
                                <xsl:variable name="json-node" select="bc:find-json-node($json-doc, $xml-id)"/>
                                
                                <xsl:choose>
                                    <xsl:when test="$json-node">
                                        <xsl:variable name="has-revised-flag" select="bc:has-property($json-node, 'revised')"/>
                                        <xsl:variable name="has-revisions" select="bc:has-property($json-node, 'revisions')"/>
                                        <!-- Check if element is deleted - deleted elements are allowed to have empty content -->
                                        <xsl:variable name="is-deleted" select="bc:has-property($json-node, 'deleted') and bc:get-property($json-node, 'deleted') = 'true'"/>
                                        <xsl:variable name="has-content" as="xs:boolean">
                                            <xsl:choose>
                                                <!-- Deleted elements are allowed to have empty content -->
                                                <xsl:when test="$is-deleted">
                                                    <xsl:sequence select="true()"/>
                                                </xsl:when>
                                                <xsl:when test="$element-type = 'row'">
                                                    <xsl:sequence select="bc:has-property($json-node, 'cells')"/>
                                                </xsl:when>
                                                <xsl:when test="bc:has-property($json-node, 'text')">
                                                    <xsl:sequence select="string-length(bc:get-property($json-node, 'text')) > 0"/>
                                                </xsl:when>
                                                <xsl:when test="bc:has-property($json-node, 'content')">
                                                    <xsl:sequence select="string-length(bc:get-property($json-node, 'content')) > 0"/>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <xsl:sequence select="true()"/>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </xsl:variable>
                                        <xsl:variable name="all-valid" select="$has-revised-flag and $has-revisions and $has-content"/>
                                        <xsl:next-iteration>
                                            <xsl:with-param name="total" select="if (not($all-valid)) then $total + 1 else $total"/>
                                        </xsl:next-iteration>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:next-iteration>
                                            <xsl:with-param name="total" select="$total"/>
                                        </xsl:next-iteration>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:iterate>
                        </xsl:variable>
                        <xsl:sequence select="$count"/>
                    </xsl:variable>
                    
                    <xsl:variable name="warning-count" as="xs:integer">
                        <xsl:variable name="count" as="xs:integer">
                            <xsl:iterate select="$revised-nodes">
                                <xsl:param name="total" select="0" as="xs:integer"/>
                                <xsl:on-completion select="$total"/>
                                
                                <xsl:variable name="json-node" select="bc:find-json-node($json-doc, @xml:id)"/>
                                <xsl:next-iteration>
                                    <xsl:with-param name="total" select="if (not($json-node)) then $total + 1 else $total"/>
                                </xsl:next-iteration>
                            </xsl:iterate>
                        </xsl:variable>
                        <xsl:sequence select="$count"/>
                    </xsl:variable>
                    
                    <p>Found <strong><xsl:value-of select="count($revised-nodes)"/></strong> revised elements in XML.</p>
                    <p style="margin-top: 10px;">
                        <span style="color: #dc3545; font-weight: bold;">Errors: <xsl:value-of select="$error-count"/></span>
                        <span style="margin-left: 20px; color: #856404; font-weight: bold;">Warnings: <xsl:value-of select="$warning-count"/></span>
                    </p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Element ID</th>
                                <th>Type</th>
                                <th>Revised Flag</th>
                                <th>Revisions Array</th>
                                <th>Content</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="$revised-nodes">
                                <xsl:variable name="xml-id" select="@xml:id"/>
                                <xsl:variable name="element-type" select="local-name()"/>
                                <xsl:variable name="json-node" select="bc:find-json-node($json-doc, $xml-id)"/>
                                
                                <xsl:choose>
                                    <xsl:when test="not($json-node)">
                                        <xsl:if test="$hide-success = 'false'">
                                            <tr class="warning">
                                                <td class="status-cell warning">⚠</td>
                                                <td class="id-cell"><xsl:value-of select="$xml-id"/></td>
                                                <td><xsl:value-of select="$element-type"/></td>
                                                <td colspan="3">Node not found in JSON (may be inline element)</td>
                                            </tr>
                                        </xsl:if>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:variable name="has-revised-flag" select="bc:has-property($json-node, 'revised')"/>
                                        <xsl:variable name="has-revisions" select="bc:has-property($json-node, 'revisions')"/>
                                        
                                        <!-- Check if element is deleted - deleted elements are allowed to have empty content -->
                                        <xsl:variable name="is-deleted" select="bc:has-property($json-node, 'deleted') and bc:get-property($json-node, 'deleted') = 'true'"/>
                                        
                                        <!-- Check content based on element type -->
                                        <xsl:variable name="has-content" as="xs:boolean">
                                            <xsl:choose>
                                                <!-- Deleted elements are allowed to have empty content -->
                                                <xsl:when test="$is-deleted">
                                                    <xsl:sequence select="true()"/>
                                                </xsl:when>
                                                <!-- For rows, check cells array -->
                                                <xsl:when test="$element-type = 'row'">
                                                    <xsl:sequence select="bc:has-property($json-node, 'cells')"/>
                                                </xsl:when>
                                                <!-- For text-based elements -->
                                                <xsl:when test="bc:has-property($json-node, 'text')">
                                                    <xsl:sequence select="string-length(bc:get-property($json-node, 'text')) > 0"/>
                                                </xsl:when>
                                                <xsl:when test="bc:has-property($json-node, 'content')">
                                                    <xsl:sequence select="string-length(bc:get-property($json-node, 'content')) > 0"/>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <xsl:sequence select="true()"/>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </xsl:variable>
                                        
                                        <xsl:variable name="all-valid" select="$has-revised-flag and $has-revisions and $has-content"/>
                                        
                                        <xsl:if test="not($all-valid) or $hide-success = 'false'">
                                            <tr class="{if ($all-valid) then 'success' else 'error'}">
                                                <td class="status-cell {if ($all-valid) then 'success' else 'error'}">
                                                    <xsl:value-of select="if ($all-valid) then '✓' else '✗'"/>
                                                </td>
                                                <td class="id-cell"><xsl:value-of select="$xml-id"/></td>
                                                <td><xsl:value-of select="$element-type"/></td>
                                                <td><xsl:value-of select="if ($has-revised-flag) then '✓' else '✗'"/></td>
                                                <td><xsl:value-of select="if ($has-revisions) then '✓' else '✗'"/></td>
                                                <td>
                                                    <xsl:value-of select="if ($has-content) then '✓' else '✗'"/>
                                                    <xsl:if test="$element-type = 'row'"> (cells)</xsl:if>
                                                </td>
                                            </tr>
                                        </xsl:if>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>



    
    <!-- ================================================================== -->
    <!-- VALIDATION 2: STRUCTURE COMPLETENESS                               -->
    <!-- ================================================================== -->
    
    <xsl:template name="validate-structure">
        <div class="validation-section">
            <h2>Validation 2: Structure Completeness</h2>
            <p>Checking that major structural elements are present in JSON...</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Element Type</th>
                        <th>XML Count</th>
                        <th>JSON Count</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">division</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">part</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">section</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">subsection</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">article</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">sentence</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">table</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">figure</xsl:with-param>
                    </xsl:call-template>
                    <xsl:call-template name="compare-element-counts">
                        <xsl:with-param name="element-name">application-note</xsl:with-param>
                    </xsl:call-template>
                </tbody>
            </table>
        </div>
    </xsl:template>
    
    <xsl:template name="compare-element-counts">
        <xsl:param name="element-name"/>
        
        <xsl:variable name="xml-count" select="count($xml-doc//*[local-name() = $element-name][@xml:id])"/>
        <xsl:variable name="json-type" select="replace($element-name, '-', '_')"/>
        <xsl:variable name="json-count" select="count($json-doc//*[@key='type'][string(.) = $json-type])"/>
        
        <tr>
            <td><xsl:value-of select="$element-name"/></td>
            <td><xsl:value-of select="$xml-count"/></td>
            <td><xsl:value-of select="$json-count"/></td>
            <td>
                <xsl:choose>
                    <xsl:when test="$xml-count = $json-count">
                        <span style="color: green;">✓ Match</span>
                    </xsl:when>
                    <xsl:otherwise>
                        <span style="color: orange;">⚠ Difference: <xsl:value-of select="$xml-count - $json-count"/></span>
                    </xsl:otherwise>
                </xsl:choose>
            </td>
        </tr>
    </xsl:template>



    
    <!-- ================================================================== -->
    <!-- VALIDATION 3: CONTENT COMPLETENESS                                 -->
    <!-- ================================================================== -->
    
    <xsl:template name="validate-content-completeness">
        <div class="validation-section">
            <h2>Validation 3: Content Completeness</h2>
            <p>Checking for empty or missing content in JSON...</p>
            
            <xsl:variable name="empty-text-nodes" select="$json-doc//*[@key='text'][string(.) = '']"/>
            <!-- For string content nodes (not array content like table cells) -->
            <xsl:variable name="empty-content-nodes" select="$json-doc//*[@key='content'][not(fn:array)][string(.) = '']"/>
            <!-- For array content nodes (table cells), check for empty arrays -->
            <xsl:variable name="empty-array-content-nodes" select="$json-doc//*[@key='content'][fn:array][count(fn:array/*) = 0]"/>
            
            <xsl:variable name="total-errors" select="count($empty-text-nodes) + count($empty-content-nodes) + count($empty-array-content-nodes)"/>
            
            <xsl:choose>
                <xsl:when test="$total-errors = 0">
                    <xsl:if test="$hide-success = 'false'">
                        <div class="issue success">
                            <div class="issue-details">✓ No empty text or content fields found in JSON.</div>
                        </div>
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <p style="margin-top: 10px;">
                        <span style="color: #dc3545; font-weight: bold;">Total Errors: <xsl:value-of select="$total-errors"/></span>
                        <span style="margin-left: 20px;">Empty Text Fields: <xsl:value-of select="count($empty-text-nodes)"/></span>
                        <span style="margin-left: 20px;">Empty Content Fields: <xsl:value-of select="count($empty-content-nodes)"/></span>
                        <xsl:if test="count($empty-array-content-nodes) > 0">
                            <span style="margin-left: 20px;">Empty Cell Content: <xsl:value-of select="count($empty-array-content-nodes)"/></span>
                        </xsl:if>
                    </p>
                    
                    <xsl:if test="count($empty-text-nodes) > 0">
                        <h3>Empty Text Fields (<xsl:value-of select="count($empty-text-nodes)"/>)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Element ID</th>
                                    <th>Parent ID</th>
                                    <th>Element Type</th>
                                    <th>Issue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <xsl:for-each select="$empty-text-nodes">
                                    <xsl:variable name="parent-node" select="parent::*"/>
                                    <xsl:variable name="parent-id" select="$parent-node/*[@key='id']/string()"/>
                                    <xsl:variable name="element-type" select="$parent-node/*[@key='type']/string()"/>
                                    
                                    <!-- Find parent object with ID by traversing up -->
                                    <xsl:variable name="ancestor-with-id" select="$parent-node/ancestor::*[*[@key='id']][1]"/>
                                    <xsl:variable name="ancestor-id" select="$ancestor-with-id/*[@key='id']/string()"/>
                                    
                                    <xsl:variable name="display-id">
                                        <xsl:choose>
                                            <xsl:when test="string-length($parent-id) > 0">
                                                <xsl:value-of select="$parent-id"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:text>[No ID]</xsl:text>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    
                                    <xsl:variable name="parent-display">
                                        <xsl:choose>
                                            <xsl:when test="string-length($ancestor-id) > 0">
                                                <xsl:value-of select="$ancestor-id"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:text>[No parent ID found]</xsl:text>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    
                                    <xsl:variable name="type-display">
                                        <xsl:choose>
                                            <xsl:when test="string-length($element-type) > 0">
                                                <xsl:value-of select="$element-type"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:text>[unknown]</xsl:text>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    
                                    <tr class="error">
                                        <td class="status-cell error">✗</td>
                                        <td class="id-cell"><xsl:value-of select="$display-id"/></td>
                                        <td class="id-cell"><xsl:value-of select="$parent-display"/></td>
                                        <td><xsl:value-of select="$type-display"/></td>
                                        <td>Text field is empty</td>
                                    </tr>
                                </xsl:for-each>
                            </tbody>
                        </table>
                    </xsl:if>
                    
                    <xsl:if test="count($empty-content-nodes) > 0">
                        <h3>Empty Content Fields (<xsl:value-of select="count($empty-content-nodes)"/>)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Element ID</th>
                                    <th>Parent ID</th>
                                    <th>Element Type</th>
                                    <th>Issue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <xsl:for-each select="$empty-content-nodes">
                                    <xsl:variable name="parent-node" select="parent::*"/>
                                    <xsl:variable name="parent-id" select="$parent-node/*[@key='id']/string()"/>
                                    <xsl:variable name="element-type" select="$parent-node/*[@key='type']/string()"/>
                                    
                                    <!-- Find parent object with ID by traversing up -->
                                    <xsl:variable name="ancestor-with-id" select="$parent-node/ancestor::*[*[@key='id']][1]"/>
                                    <xsl:variable name="ancestor-id" select="$ancestor-with-id/*[@key='id']/string()"/>
                                    
                                    <xsl:variable name="display-id">
                                        <xsl:choose>
                                            <xsl:when test="string-length($parent-id) > 0">
                                                <xsl:value-of select="$parent-id"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:text>[No ID]</xsl:text>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    
                                    <xsl:variable name="parent-display">
                                        <xsl:choose>
                                            <xsl:when test="string-length($ancestor-id) > 0">
                                                <xsl:value-of select="$ancestor-id"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:text>[No parent ID found]</xsl:text>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    
                                    <xsl:variable name="type-display">
                                        <xsl:choose>
                                            <xsl:when test="string-length($element-type) > 0">
                                                <xsl:value-of select="$element-type"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:text>[unknown]</xsl:text>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    
                                    <tr class="error">
                                        <td class="status-cell error">✗</td>
                                        <td class="id-cell"><xsl:value-of select="$display-id"/></td>
                                        <td class="id-cell"><xsl:value-of select="$parent-display"/></td>
                                        <td><xsl:value-of select="$type-display"/></td>
                                        <td>Content field is empty</td>
                                    </tr>
                                </xsl:for-each>
                            </tbody>
                        </table>
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>



    
    <!-- ================================================================== -->
    <!-- VALIDATION 4: CROSS-REFERENCES                                     -->
    <!-- ================================================================== -->
    
    <xsl:template name="validate-cross-references">
        <div class="validation-section">
            <h2>Validation 4: Cross-References</h2>
            <p>Checking that internal references point to valid targets...</p>
            
            <xsl:variable name="all-xml-ids" select="$xml-doc//*/@xml:id"/>
            <xsl:variable name="broken-refs" as="element()*">
                <xsl:for-each select="$xml-doc//ref[@type='internal']">
                    <xsl:variable name="target" select="@target"/>
                    <xsl:if test="not($target = $all-xml-ids)">
                        <broken-ref>
                            <source><xsl:value-of select="ancestor::*[@xml:id][1]/@xml:id"/></source>
                            <target><xsl:value-of select="$target"/></target>
                        </broken-ref>
                    </xsl:if>
                </xsl:for-each>
            </xsl:variable>
            
            <!-- Generate separate text file with all broken references -->
            <xsl:if test="count($broken-refs) > 0">
                <xsl:result-document href="broken-references-full.txt" method="text">
                    <xsl:text>BC BUILDING CODE - BROKEN CROSS-REFERENCES REPORT&#10;</xsl:text>
                    <xsl:text>Generated: </xsl:text>
                    <xsl:value-of select="current-dateTime()"/>
                    <xsl:text>&#10;&#10;</xsl:text>
                    <xsl:text>Total Broken References: </xsl:text>
                    <xsl:value-of select="count($broken-refs)"/>
                    <xsl:text>&#10;</xsl:text>
                    <xsl:text>Total Internal References: </xsl:text>
                    <xsl:value-of select="count($xml-doc//ref[@type='internal'])"/>
                    <xsl:text>&#10;</xsl:text>
                    <xsl:text>================================================================&#10;&#10;</xsl:text>
                    
                    <xsl:for-each select="$broken-refs">
                        <xsl:value-of select="position()"/>
                        <xsl:text>. Source: </xsl:text>
                        <xsl:value-of select="source"/>
                        <xsl:text>&#10;   Target (Not Found): </xsl:text>
                        <xsl:value-of select="target"/>
                        <xsl:text>&#10;&#10;</xsl:text>
                    </xsl:for-each>
                </xsl:result-document>
            </xsl:if>
            
            <xsl:choose>
                <xsl:when test="count($broken-refs) = 0">
                    <xsl:if test="$hide-success = 'false'">
                        <div class="issue success">
                            <div class="issue-details">
                                ✓ All <xsl:value-of select="count($xml-doc//ref[@type='internal'])"/> internal references are valid.
                            </div>
                        </div>
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <p style="margin-top: 10px;">
                        <span style="color: #dc3545; font-weight: bold;">Total Errors: <xsl:value-of select="count($broken-refs)"/></span>
                        <span style="margin-left: 20px;">Total Internal References: <xsl:value-of select="count($xml-doc//ref[@type='internal'])"/></span>
                    </p>
                    
                    <p style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 3px;">
                        <strong>📄 Full Report:</strong> All <xsl:value-of select="count($broken-refs)"/> broken references have been exported to 
                        <a href="broken-references-full.txt" style="color: #0066cc; text-decoration: underline;">broken-references-full.txt</a>
                    </p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Source Element ID</th>
                                <th>Target ID (Not Found)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="$broken-refs[position() &lt;= 50]">
                                <tr class="error">
                                    <td class="status-cell error">✗</td>
                                    <td class="id-cell"><xsl:value-of select="source"/></td>
                                    <td class="id-cell"><xsl:value-of select="target"/></td>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                    
                    <xsl:if test="count($broken-refs) > 50">
                        <p style="color: #666; font-style: italic;">
                            Showing first 50 of <xsl:value-of select="count($broken-refs)"/> broken references. 
                            <a href="broken-references-full.txt" style="color: #0066cc;">View complete list</a>
                        </p>
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>
    
</xsl:stylesheet>
