<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:fn="http://www.w3.org/2005/xpath-functions"
                xmlns:bc="http://bc.gov.ca/building-code"
                exclude-result-prefixes="xs fn bc">
    
    <!-- ================================================================== -->
    <!-- BC AMENDMENT VALIDATION ENGINE                                     -->
    <!-- Validates that all amendments are properly applied to BC code      -->
    <!-- ================================================================== -->
    
    <xsl:output method="html" indent="yes" encoding="UTF-8"/>
    
    <!-- Input parameters -->
    <xsl:param name="combined-amendments" required="yes"/>
    <xsl:param name="bc-building-code" required="yes"/>
    
    <!-- Load documents -->
    <xsl:variable name="amendments-doc" select="document($combined-amendments, /)"/>
    <xsl:variable name="bc-code-doc" select="document($bc-building-code, /)"/>
    
    <!-- Count total amendments -->
    <xsl:variable name="total-amendments" select="count($amendments-doc//amendment)"/>
    
    <!-- ================================================================== -->
    <!-- HELPER FUNCTIONS                                                   -->
    <!-- ================================================================== -->
    
    <!-- Function to get source filename from index -->
    <xsl:function name="bc:get-source-filename" as="xs:string">
        <xsl:param name="source-file-index"/>
        
        <xsl:choose>
            <xsl:when test="not($source-file-index) or $source-file-index = ''">
                <xsl:value-of select="'N/A'"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="source-files" select="$amendments-doc//source-files/source-file"/>
                <xsl:variable name="index-num" select="xs:integer($source-file-index)"/>
                
                <xsl:choose>
                    <xsl:when test="$index-num &gt; 0 and $index-num &lt;= count($source-files)">
                        <!-- Extract just the filename from the path -->
                        <xsl:variable name="full-path" select="$source-files[$index-num]"/>
                        <xsl:choose>
                            <xsl:when test="contains($full-path, '/')">
                                <xsl:value-of select="tokenize($full-path, '/')[last()]"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:value-of select="$full-path"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="concat('Unknown (index: ', $source-file-index, ')')"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- ================================================================== -->
    <!-- ROOT TEMPLATE - GENERATE HTML REPORT                               -->
    <!-- ================================================================== -->
    
    <xsl:template match="/">
        <html>
            <head>
                <title>BC Building Code Amendment Validation Report</title>
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
                    }
                    .summary {
                        background-color: white;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                    }
                    .summary-stats {
                        display: flex;
                        gap: 20px;
                        margin-top: 15px;
                    }
                    .stat-box {
                        flex: 1;
                        padding: 15px;
                        border-radius: 5px;
                        text-align: center;
                    }
                    .stat-box.success {
                        background-color: #d4edda;
                        border: 1px solid #c3e6cb;
                    }
                    .stat-box.warning {
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                    }
                    .stat-box.error {
                        background-color: #f8d7da;
                        border: 1px solid #f5c6cb;
                    }
                    .stat-number {
                        font-size: 36px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    .stat-label {
                        font-size: 14px;
                        color: #666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background-color: white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                    }
                    th {
                        background-color: #003366;
                        color: white;
                        padding: 12px;
                        text-align: left;
                        font-weight: bold;
                    }
                    td {
                        padding: 10px 12px;
                        border-bottom: 1px solid #ddd;
                    }
                    tr:hover {
                        background-color: #f5f5f5;
                    }
                    .status {
                        padding: 4px 8px;
                        border-radius: 3px;
                        font-weight: bold;
                        font-size: 12px;
                    }
                    .status.success {
                        background-color: #28a745;
                        color: white;
                    }
                    .status.error {
                        background-color: #dc3545;
                        color: white;
                    }
                    .status.warning {
                        background-color: #ffc107;
                        color: #333;
                    }
                    .details {
                        font-size: 12px;
                        color: #666;
                        margin-top: 5px;
                    }
                    .error-message {
                        color: #dc3545;
                        font-style: italic;
                    }
                    .timestamp {
                        text-align: right;
                        color: #666;
                        font-size: 12px;
                        margin-top: 20px;
                    }
                    .amendment-id {
                        font-family: monospace;
                        background-color: #f0f0f0;
                        padding: 2px 6px;
                        border-radius: 3px;
                    }
                </style>
            </head>
            <body>
                <h1>BC Building Code Amendment Validation Report</h1>

                <!-- Validate all amendments - store results for use in multiple sections -->
                <xsl:variable name="validation-results" select="bc:validate-all-amendments()"/>
                <xsl:variable name="passed" select="count($validation-results[@status='success'])"/>
                <xsl:variable name="failed" select="count($validation-results[@status='error'])"/>
                <xsl:variable name="warnings" select="count($validation-results[@status='warning'])"/>

                <!-- Summary Section -->
                <div class="summary">
                    <h2>Validation Summary</h2>
                    
                    <div class="summary-stats">
                        <div class="stat-box">
                            <div class="stat-label">Total Amendments</div>
                            <div class="stat-number"><xsl:value-of select="$total-amendments"/></div>
                        </div>
                        <div class="stat-box success">
                            <div class="stat-label">Passed</div>
                            <div class="stat-number"><xsl:value-of select="$passed"/></div>
                        </div>
                        <div class="stat-box warning">
                            <div class="stat-label">Warnings</div>
                            <div class="stat-number"><xsl:value-of select="$warnings"/></div>
                        </div>
                        <div class="stat-box error">
                            <div class="stat-label">Failed</div>
                            <div class="stat-number"><xsl:value-of select="$failed"/></div>
                        </div>
                    </div>
                </div>
                
                <!-- Detailed Results -->
                <h2>Detailed Validation Results</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Amendment ID</th>
                            <th>Original ID</th>
                            <th>Source File</th>
                            <th>Sequence</th>
                            <th>Operation</th>
                            <th>Target</th>
                            <th>Status</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <xsl:for-each select="$validation-results">
                            <xsl:sort select="@sequence" data-type="number"/>
                            <tr>
                                <td><span class="amendment-id"><xsl:value-of select="@id"/></span></td>
                                <td><span class="amendment-id"><xsl:value-of select="@original-id"/></span></td>
                                <td><xsl:value-of select="bc:get-source-filename(@source-file-index)"/></td>
                                <td><xsl:value-of select="@sequence"/></td>
                                <td><xsl:value-of select="@operation"/></td>
                                <td><xsl:value-of select="@target"/></td>
                                <td>
                                    <span class="status {@status}">
                                        <xsl:choose>
                                            <xsl:when test="@status='success'">✓ PASSED</xsl:when>
                                            <xsl:when test="@status='error'">✗ FAILED</xsl:when>
                                            <xsl:when test="@status='warning'">⚠ WARNING</xsl:when>
                                        </xsl:choose>
                                    </span>
                                </td>
                                <td>
                                    <xsl:value-of select="@message"/>
                                    <xsl:if test="@error">
                                        <div class="error-message"><xsl:value-of select="@error"/></div>
                                    </xsl:if>
                                </td>
                            </tr>
                        </xsl:for-each>
                    </tbody>
                </table>
                
                <div class="timestamp">
                    Report generated: <xsl:value-of select="format-dateTime(current-dateTime(), '[Y0001]-[M01]-[D01] [H01]:[m01]:[s01]')"/>
                </div>
            </body>
        </html>
    </xsl:template>
    
    <!-- ================================================================== -->
    <!-- VALIDATION FUNCTIONS                                               -->
    <!-- ================================================================== -->
    
    <!-- Main validation function -->
    <xsl:function name="bc:validate-all-amendments">
        <xsl:for-each select="$amendments-doc//amendment">
            <xsl:variable name="amendment" select="."/>
            <xsl:variable name="result" select="bc:validate-amendment($amendment)"/>
            <xsl:copy-of select="$result"/>
        </xsl:for-each>
    </xsl:function>
    
    <!-- Validate individual amendment -->
    <xsl:function name="bc:validate-amendment">
        <xsl:param name="amendment"/>
        
        <xsl:variable name="amendment-id" select="$amendment/@id"/>
        <xsl:variable name="original-id" select="$amendment/@original-id"/>
        <xsl:variable name="source-file-index" select="$amendment/@source-file-index"/>
        <xsl:variable name="sequence" select="$amendment/@sequence"/>
        <xsl:variable name="operation" select="local-name($amendment/*[2])"/>
        <!-- Get target: use @id for canonical-id type, @parent-id for position type, child-element for child-element type, or @xpath for xpath type -->
        <xsl:variable name="target" select="
            if ($amendment/target/@type = 'position') then
                concat($amendment/target/@parent-id, ' (', $amendment/target/@position, ')')
            else if ($amendment/target/@type = 'child-element') then
                concat($amendment/target/@parent-id, '/', $amendment/target/@element-name, '[', 
                       if ($amendment/target/@position) then $amendment/target/@position else '1', ']')
            else if ($amendment/target/@type = 'xpath') then
                concat('XPath: ', $amendment/target/@xpath, ' (', $amendment/target/@position, ')')
            else
                $amendment/target/@id
        "/>
        
        <result id="{$amendment-id}" original-id="{$original-id}" source-file-index="{$source-file-index}" sequence="{$sequence}" operation="{$operation}" target="{$target}">
            <xsl:choose>
                <!-- Validate REPLACE operation -->
                <xsl:when test="$operation = 'replace'">
                    <xsl:copy-of select="bc:validate-replace($amendment)"/>
                </xsl:when>
                
                <!-- Validate INSERT operation -->
                <xsl:when test="$operation = 'insert'">
                    <xsl:copy-of select="bc:validate-insert($amendment)"/>
                </xsl:when>
                
                <!-- Validate MODIFY operation -->
                <xsl:when test="$operation = 'modify'">
                    <xsl:copy-of select="bc:validate-modify($amendment)"/>
                </xsl:when>
                
                <!-- Validate DELETE operation -->
                <xsl:when test="$operation = 'delete'">
                    <xsl:copy-of select="bc:validate-delete($amendment)"/>
                </xsl:when>
                
                <!-- Unknown operation -->
                <xsl:otherwise>
                    <xsl:attribute name="status">error</xsl:attribute>
                    <xsl:attribute name="message">Unknown operation type</xsl:attribute>
                    <xsl:attribute name="error">Operation '<xsl:value-of select="$operation"/>' is not recognized</xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
        </result>
    </xsl:function>
    
    <!-- Validate REPLACE operation -->
    <xsl:function name="bc:validate-replace">
        <xsl:param name="amendment"/>
        
        <xsl:variable name="target" select="$amendment/target"/>
        <xsl:variable name="target-id" select="$target/@id"/>
        <xsl:variable name="new-content" select="$amendment/replace/new-content/*"/>
        
        <xsl:choose>
            <!-- Handle child-element target type -->
            <xsl:when test="$target/@type = 'child-element'">
                <xsl:variable name="parent-id" select="$target/@parent-id"/>
                <xsl:variable name="element-name" select="$target/@element-name"/>
                <xsl:variable name="position" select="if ($target/@position) then xs:integer($target/@position) else 1"/>
                
                <xsl:variable name="parent-element" select="($bc-code-doc//*[@xml:id = $parent-id or @xml:id = replace($parent-id, '^nbc\.', 'bc.')])[1]"/>
                
                <xsl:choose>
                    <xsl:when test="not($parent-element)">
                        <xsl:attribute name="status">error</xsl:attribute>
                        <xsl:attribute name="message">Parent element not found</xsl:attribute>
                        <xsl:attribute name="error">Parent with ID '<xsl:value-of select="$parent-id"/>' does not exist</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Find the target child element by name and position -->
                        <xsl:variable name="child-elements" select="$parent-element/*[local-name() = $element-name]"/>
                        <xsl:variable name="target-child" select="$child-elements[$position]"/>
                        
                        <xsl:choose>
                            <xsl:when test="not($target-child)">
                                <xsl:attribute name="status">error</xsl:attribute>
                                <xsl:attribute name="message">Child element not found</xsl:attribute>
                                <xsl:attribute name="error">Child element '<xsl:value-of select="$element-name"/>' at position <xsl:value-of select="$position"/> not found in parent</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <!-- Check if the child element has revision-history -->
                                <xsl:variable name="has-revision" select="exists($target-child[@revised='yes']/revision-history)"/>
                                <!-- Use original-id if available (from combined amendments), otherwise use id -->
                                <xsl:variable name="revision-id" select="if ($amendment/@original-id) then $amendment/@original-id else $amendment/@id"/>
                                <xsl:variable name="revision-matches" select="exists($target-child//revision[@id = $revision-id])"/>
                                
                                <xsl:choose>
                                    <xsl:when test="$has-revision and $revision-matches">
                                        <xsl:attribute name="status">success</xsl:attribute>
                                        <xsl:attribute name="message">Child element successfully replaced with revision history</xsl:attribute>
                                    </xsl:when>
                                    <xsl:when test="$has-revision">
                                        <xsl:attribute name="status">warning</xsl:attribute>
                                        <xsl:attribute name="message">Child element has revision history but revision ID doesn't match</xsl:attribute>
                                        <xsl:attribute name="error">Expected revision ID '<xsl:value-of select="$revision-id"/>' not found in revision-history</xsl:attribute>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:attribute name="status">warning</xsl:attribute>
                                        <xsl:attribute name="message">Child element found but no revision history present</xsl:attribute>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            
            <!-- Handle canonical-id target type (existing logic) -->
            <xsl:when test="$new-content">
                <!-- For replace operations, check if the NEW content exists (not the original target) -->
                <xsl:variable name="new-id" select="($new-content/@xml:id, $new-content/@bc-id)[1]"/>
                <xsl:variable name="new-element" select="$bc-code-doc//*[@xml:id = $new-id]"/>
                
                <xsl:choose>
                    <xsl:when test="$new-element">
                        <!-- Check if content matches -->
                        <xsl:variable name="content-matches" select="bc:content-matches($new-element, $new-content)"/>
                        <xsl:choose>
                            <xsl:when test="$content-matches">
                                <xsl:attribute name="status">success</xsl:attribute>
                                <xsl:attribute name="message">Content successfully replaced</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="status">warning</xsl:attribute>
                                <xsl:attribute name="message">Content replaced but may not match exactly</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- If new element doesn't exist, check if original target still exists -->
                        <xsl:variable name="original-element" select="($bc-code-doc//*[@xml:id = $target-id or @xml:id = replace($target-id, '^nbc\.', 'bc.')])[1]"/>
                        <xsl:choose>
                            <xsl:when test="$original-element">
                                <xsl:attribute name="status">error</xsl:attribute>
                                <xsl:attribute name="message">Replace operation failed - original element still exists</xsl:attribute>
                                <xsl:attribute name="error">Original element with ID '<xsl:value-of select="$target-id"/>' was not replaced</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="status">error</xsl:attribute>
                                <xsl:attribute name="message">Replace operation failed - neither original nor new element found</xsl:attribute>
                                <xsl:attribute name="error">New element with ID '<xsl:value-of select="$new-id"/>' does not exist</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <!-- No new content specified - just check if original target was removed -->
                <xsl:variable name="target-element" select="($bc-code-doc//*[@xml:id = $target-id or @xml:id = replace($target-id, '^nbc\.', 'bc.')])[1]"/>
                <xsl:choose>
                    <xsl:when test="$target-element">
                        <xsl:attribute name="status">error</xsl:attribute>
                        <xsl:attribute name="message">Target element still exists (should have been replaced)</xsl:attribute>
                        <xsl:attribute name="error">Element with ID '<xsl:value-of select="$target-id"/>' was not replaced</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:attribute name="status">success</xsl:attribute>
                        <xsl:attribute name="message">Element successfully replaced</xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Validate INSERT operation -->
    <xsl:function name="bc:validate-insert">
        <xsl:param name="amendment"/>
        
        <xsl:variable name="target" select="$amendment/target"/>
        <xsl:variable name="new-content" select="$amendment/insert/new-content/*"/>
        
        <xsl:choose>
            <!-- XPath-based insert -->
            <xsl:when test="$target/@type = 'xpath'">
                <xsl:variable name="xpath-expr" select="$target/@xpath"/>
                <xsl:variable name="position" select="$target/@position"/>
                
                <!-- Extract target ID from XPath expression -->
                <xsl:variable name="id-pattern" select="'@xml:id=''([^'']+)'''"/>
                <xsl:variable name="matches" select="analyze-string($xpath-expr, $id-pattern)"/>
                <xsl:variable name="target-id" select="
                    if ($matches//fn:group[@nr='1']) then
                        string($matches//fn:group[@nr='1'][1])
                    else
                        ''
                "/>
                
                <xsl:variable name="target-element" select="$bc-code-doc//*[@xml:id = $target-id]"/>
                
                <xsl:choose>
                    <xsl:when test="not($target-element)">
                        <xsl:attribute name="status">error</xsl:attribute>
                        <xsl:attribute name="message">Target element not found via XPath</xsl:attribute>
                        <xsl:attribute name="error">Element with ID '<xsl:value-of select="$target-id"/>' does not exist</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Check if new content was inserted before or after the target -->
                        <xsl:variable name="parent-element" select="$target-element/parent::*"/>
                        <xsl:variable name="content-exists" select="bc:check-inserted-content-near-target($parent-element, $target-element, $new-content, $position)"/>
                        
                        <xsl:choose>
                            <xsl:when test="$content-exists">
                                <xsl:attribute name="status">success</xsl:attribute>
                                <xsl:attribute name="message">Content successfully inserted <xsl:value-of select="$position"/> target element</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="status">error</xsl:attribute>
                                <xsl:attribute name="message">Inserted content not found <xsl:value-of select="$position"/> target element</xsl:attribute>
                                <xsl:attribute name="error">Expected content not found in correct position relative to target</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            
            <!-- Position-based insert -->
            <xsl:when test="$target/@type = 'position'">
                <xsl:variable name="parent-id" select="$target/@parent-id"/>
                <xsl:variable name="reference-id" select="$target/@reference-id"/>
                <xsl:variable name="position" select="$target/@position"/>
                <xsl:variable name="parent-element" select="($bc-code-doc//*[@xml:id = $parent-id or @xml:id = replace($parent-id, '^nbc\.', 'bc.')])[1]"/>
                
                <xsl:choose>
                    <xsl:when test="not($parent-element)">
                        <xsl:attribute name="status">error</xsl:attribute>
                        <xsl:attribute name="message">Parent element not found</xsl:attribute>
                        <xsl:attribute name="error">Parent with ID '<xsl:value-of select="$parent-id"/>' does not exist</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Determine where to look for inserted content -->
                        <xsl:variable name="search-context" select="
                            if ($position = ('before', 'after') and $reference-id) then
                                (: When we have reference-id, parent-id is the actual parent container :)
                                $parent-element
                            else if ($position = ('before', 'after')) then
                                (: When no reference-id, parent-id is the sibling reference :)
                                $parent-element/parent::*
                            else
                                (: first-child or last-child - parent-id is the container :)
                                $parent-element
                        "/>
                        
                        <!-- Check if new content exists in the appropriate context -->
                        <xsl:variable name="content-exists" select="bc:check-inserted-content($search-context, $new-content)"/>
                        <xsl:choose>
                            <xsl:when test="$content-exists">
                                <xsl:attribute name="status">success</xsl:attribute>
                                <xsl:attribute name="message">Content successfully inserted</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="status">error</xsl:attribute>
                                <xsl:attribute name="message">Inserted content not found in parent</xsl:attribute>
                                <xsl:attribute name="error">Expected content not found in parent element</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            
            <!-- List-item-insert -->
            <xsl:when test="$target/@type = 'list-item-insert'">
                <xsl:variable name="parent-id" select="$target/@parent-id"/>
                <xsl:variable name="match-text" select="$target/@match-item-containing"/>
                <xsl:variable name="position" select="$target/@position"/>
                <xsl:variable name="parent-element" select="($bc-code-doc//*[@xml:id = $parent-id or @xml:id = replace($parent-id, '^nbc\.', 'bc.')])[1]"/>

                <xsl:choose>
                    <xsl:when test="not($parent-element)">
                        <xsl:attribute name="status">error</xsl:attribute>
                        <xsl:attribute name="message">Parent element not found</xsl:attribute>
                        <xsl:attribute name="error">Parent with ID '<xsl:value-of select="$parent-id"/>' does not exist</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Check if the new item content exists inside a list under the parent -->
                        <xsl:variable name="new-item-text" select="normalize-space(string-join($new-content//text(), ' '))"/>
                        <xsl:variable name="content-found" select="
                            some $item in $parent-element//list/item satisfies
                                contains(normalize-space(string-join($item//text(), ' ')), substring($new-item-text, 1, 50))
                        "/>
                        <xsl:choose>
                            <xsl:when test="$content-found">
                                <xsl:attribute name="status">success</xsl:attribute>
                                <xsl:attribute name="message">List item successfully inserted <xsl:value-of select="$position"/> item containing '<xsl:value-of select="$match-text"/>'</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="status">error</xsl:attribute>
                                <xsl:attribute name="message">Inserted list item not found</xsl:attribute>
                                <xsl:attribute name="error">Expected item content not found in any list under parent '<xsl:value-of select="$parent-id"/>'</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>

            <xsl:otherwise>
                <xsl:attribute name="status">warning</xsl:attribute>
                <xsl:attribute name="message">Insert validation not fully implemented for this target type</xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Validate MODIFY operation -->
    <xsl:function name="bc:validate-modify">
        <xsl:param name="amendment"/>
        
        <xsl:variable name="target-id" select="$amendment/target/@id"/>
        <xsl:variable name="target-element" select="($bc-code-doc//*[@xml:id = $target-id or @xml:id = replace($target-id, '^nbc\.', 'bc.')])[1]"/>
        
        <xsl:choose>
            <xsl:when test="not($target-element)">
                <xsl:attribute name="status">error</xsl:attribute>
                <xsl:attribute name="message">Target element not found</xsl:attribute>
                <xsl:attribute name="error">Element with ID '<xsl:value-of select="$target-id"/>' does not exist</xsl:attribute>
            </xsl:when>
            <xsl:when test="$amendment/modify/text-change">
                <!-- Validate text change - check ALL replacement texts -->
                <xsl:variable name="all-replacements-found" select="
                    every $text-change in $amendment/modify/text-change satisfies
                        (every $find-replace in $text-change/find-replace satisfies
                            bc:check-text-in-element($target-element, $find-replace/replace))
                "/>
                
                <xsl:choose>
                    <xsl:when test="$all-replacements-found">
                        <xsl:attribute name="status">success</xsl:attribute>
                        <xsl:attribute name="message">Text modification applied successfully</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:attribute name="status">warning</xsl:attribute>
                        <xsl:attribute name="message">Modified text not found exactly (may have been further processed)</xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:when test="$amendment/modify/element-change">
                <!-- Validate element change - check if replaced child elements exist -->
                <xsl:variable name="all-elements-found" select="
                    every $element-change in $amendment/modify/element-change satisfies
                        (if ($element-change/replace-child) then
                            bc:check-replaced-child-exists($target-element, $element-change/replace-child)
                        else true())
                "/>
                
                <xsl:choose>
                    <xsl:when test="$all-elements-found">
                        <xsl:attribute name="status">success</xsl:attribute>
                        <xsl:attribute name="message">Element modification applied successfully</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:attribute name="status">warning</xsl:attribute>
                        <xsl:attribute name="message">Modified element not found exactly (may have been further processed)</xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:attribute name="status">success</xsl:attribute>
                <xsl:attribute name="message">Modification applied</xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Validate DELETE operation -->
    <xsl:function name="bc:validate-delete">
        <xsl:param name="amendment"/>
        
        <xsl:variable name="target-id" select="$amendment/target/@id"/>
        <xsl:variable name="target-element" select="($bc-code-doc//*[@xml:id = $target-id or @xml:id = replace($target-id, '^nbc\.', 'bc.')])[1]"/>
        
        <xsl:choose>
            <xsl:when test="$target-element">
                <xsl:attribute name="status">error</xsl:attribute>
                <xsl:attribute name="message">Element still exists (should have been deleted)</xsl:attribute>
                <xsl:attribute name="error">Element with ID '<xsl:value-of select="$target-id"/>' was not deleted</xsl:attribute>
            </xsl:when>
            <xsl:otherwise>
                <xsl:attribute name="status">success</xsl:attribute>
                <xsl:attribute name="message">Element successfully deleted</xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Helper: Check if content matches -->
    <xsl:function name="bc:content-matches" as="xs:boolean">
        <xsl:param name="target-element"/>
        <xsl:param name="new-content"/>
        
        <!-- Check multiple criteria for a match -->
        <xsl:variable name="target-text" select="normalize-space(string-join($target-element//text(), ' '))"/>
        <xsl:variable name="new-text" select="normalize-space(string-join($new-content//text(), ' '))"/>
        
        <!-- Check if element names match -->
        <xsl:variable name="names-match" select="local-name($target-element[1]) = local-name($new-content[1])"/>
        
        <!-- Check if IDs match (for replace with preserve-references) -->
        <xsl:variable name="ids-match" select="$target-element/@xml:id = $new-content/@xml:id"/>
        
        <!-- Check text content overlap (at least 50 chars or 80% match) -->
        <xsl:variable name="text-overlap" select="
            contains($target-text, substring($new-text, 1, 50)) or 
            contains($new-text, substring($target-text, 1, 50))"/>
        
        <!-- Return true if names match AND (ids match OR text overlaps) -->
        <xsl:sequence select="$names-match and ($ids-match or $text-overlap)"/>
    </xsl:function>
    
    <!-- Helper: Check if inserted content exists -->
    <xsl:function name="bc:check-inserted-content" as="xs:boolean">
        <xsl:param name="parent-element"/>
        <xsl:param name="new-content"/>

        <!-- Check if any child matches the new content -->
        <!-- Handle both single element and sequence of elements -->
        <xsl:variable name="new-element-name" select="local-name($new-content[1])"/>
        <xsl:variable name="new-text" select="normalize-space(string-join($new-content//text(), ' '))"/>

        <xsl:choose>
            <xsl:when test="count($new-content) &gt; 1">
                <!-- Multiple elements inserted - check if all elements exist with matching IDs or content -->
                <xsl:variable name="all-found" select="
                    every $item in $new-content satisfies
                        (exists($parent-element//*[@xml:id = $item/@xml:id]) or
                         exists($parent-element//*[local-name() = local-name($item) and 
                                contains(normalize-space(string-join(.//text(), ' ')), 
                                        substring(normalize-space(string-join($item//text(), ' ')), 1, 30))]))
                "/>
                <xsl:sequence select="$all-found"/>
            </xsl:when>
            <xsl:otherwise>
                <!-- Single element - check for matching content or ID -->
                <xsl:sequence select="
                    exists($parent-element//*[@xml:id = $new-content/@xml:id]) or
                    (some $child in $parent-element/* satisfies
                        (local-name($child) = $new-element-name and
                         contains(normalize-space(string-join($child//text(), ' ')), substring($new-text, 1, 50))))
                "/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Helper: Check if text exists in element -->
    <xsl:function name="bc:check-text-in-element" as="xs:boolean">
        <xsl:param name="element"/>
        <xsl:param name="search-text"/>

        <xsl:variable name="element-text" select="normalize-space(string-join($element//text(), ' '))"/>
        <xsl:variable name="search-normalized" select="normalize-space(string-join($search-text, ' '))"/>

        <xsl:sequence select="contains($element-text, $search-normalized)"/>
    </xsl:function>
    
    <!-- Helper: Check if replaced child element exists -->
    <xsl:function name="bc:check-replaced-child-exists" as="xs:boolean">
        <xsl:param name="target-element"/>
        <xsl:param name="replace-child"/>
        
        <xsl:variable name="child-name" select="$replace-child/@element-name"/>
        <xsl:variable name="new-child-content" select="$replace-child/*"/>
        
        <!-- Check if a child element with the same name exists -->
        <xsl:variable name="matching-children" select="$target-element/*[local-name() = $child-name]"/>
        
        <xsl:choose>
            <xsl:when test="not($matching-children)">
                <!-- No child with that name exists -->
                <xsl:sequence select="false()"/>
            </xsl:when>
            <xsl:otherwise>
                <!-- Check if the content matches -->
                <xsl:variable name="new-text" select="normalize-space(string-join($new-child-content//text(), ' '))"/>
                <xsl:sequence select="
                    some $child in $matching-children satisfies
                        contains(normalize-space(string-join($child//text(), ' ')), substring($new-text, 1, 30))
                "/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Helper: Check if revision-history element exists and is valid -->
    <xsl:function name="bc:check-revision-history" as="xs:boolean">
        <xsl:param name="element"/>
        <xsl:param name="expected-revision-id"/>
        
        <xsl:variable name="revision-history" select="$element//revision-history"/>
        
        <xsl:choose>
            <xsl:when test="not($revision-history)">
                <xsl:sequence select="false()"/>
            </xsl:when>
            <xsl:otherwise>
                <!-- Check if any revision matches the expected ID -->
                <xsl:sequence select="
                    exists($revision-history/revision[@id = $expected-revision-id])
                "/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
    <!-- Helper: Check if content was inserted before or after target element -->
    <xsl:function name="bc:check-inserted-content-near-target" as="xs:boolean">
        <xsl:param name="parent-element"/>
        <xsl:param name="target-element"/>
        <xsl:param name="new-content"/>
        <xsl:param name="position"/>
        
        <xsl:variable name="new-element-name" select="local-name($new-content[1])"/>
        <xsl:variable name="new-text" select="normalize-space(string-join($new-content//text(), ' '))"/>
        <xsl:variable name="new-id" select="($new-content/@xml:id | $new-content/@bc-id)[1]"/>
        
        <xsl:choose>
            <xsl:when test="$position = 'before'">
                <!-- Check if new content exists immediately before target -->
                <xsl:variable name="preceding-sibling" select="$target-element/preceding-sibling::*[1]"/>
                <xsl:sequence select="
                    local-name($preceding-sibling) = $new-element-name and
                    (($preceding-sibling/@xml:id = $new-id) or 
                     ($preceding-sibling/@bc-id = $new-id) or
                     contains(normalize-space(string-join($preceding-sibling//text(), ' ')), substring($new-text, 1, 30)))
                "/>
            </xsl:when>
            <xsl:when test="$position = 'after'">
                <!-- Check if new content exists immediately after target -->
                <xsl:variable name="following-sibling" select="$target-element/following-sibling::*[1]"/>
                <xsl:sequence select="
                    local-name($following-sibling) = $new-element-name and
                    (($following-sibling/@xml:id = $new-id) or 
                     ($following-sibling/@bc-id = $new-id) or
                     contains(normalize-space(string-join($following-sibling//text(), ' ')), substring($new-text, 1, 30)))
                "/>
            </xsl:when>
            <xsl:otherwise>
                <!-- For other positions, just check if content exists in parent -->
                <xsl:sequence select="bc:check-inserted-content($parent-element, $new-content)"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>
    
</xsl:stylesheet>
