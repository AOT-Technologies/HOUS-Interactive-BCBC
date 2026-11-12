<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:fn="http://www.w3.org/2005/xpath-functions"
                exclude-result-prefixes="xs fn">
    
    <xsl:output method="html" indent="yes" encoding="UTF-8"/>
    
    <xsl:param name="json-file" required="yes"/>
    
    <!-- Load JSON as XML (resolve relative to source document) -->
    <xsl:variable name="json-text" select="unparsed-text(resolve-uri($json-file, base-uri(/)))"/>
    <xsl:variable name="json-xml" select="fn:json-to-xml($json-text)"/>
    
    <!-- XML document is the input -->
    <xsl:variable name="xml-doc" select="/"/>
    
    <!-- Extract IDs from XML by element type -->
    <xsl:variable name="xml-articles" select="$xml-doc//article/@xml:id"/>
    <xsl:variable name="xml-sentences" select="$xml-doc//sentence/@xml:id"/>
    <xsl:variable name="xml-tables" select="$xml-doc//table/@xml:id"/>
    <xsl:variable name="xml-figures" select="$xml-doc//figure/@xml:id"/>
    <xsl:variable name="xml-app-notes" select="$xml-doc//application-note/@xml:id"/>
    
    <!-- Extract IDs from JSON by type -->
    <xsl:variable name="json-articles" select="$json-xml//*[@key='type'][.='article']/../*[@key='id']/string()"/>
    <xsl:variable name="json-sentences" select="$json-xml//*[@key='type'][.='sentence']/../*[@key='id']/string()"/>
    <xsl:variable name="json-tables" select="$json-xml//*[@key='type'][.='table']/../*[@key='id']/string()"/>
    <xsl:variable name="json-figures" select="$json-xml//*[@key='type'][.='figure']/../*[@key='id']/string()"/>
    <xsl:variable name="json-app-notes" select="$json-xml//*[@key='type'][.='application_note']/../*[@key='id']/string()"/>
    
    <xsl:template match="/">
        <html>
            <head>
                <title>XML vs JSON Structure Difference Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                    h1 { color: #003366; border-bottom: 3px solid #003366; padding-bottom: 10px; }
                    h2 { color: #0066cc; margin-top: 30px; }
                    h3 { color: #0088cc; margin-top: 20px; }
                    .summary { background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; background-color: white; margin-bottom: 20px; }
                    th { background-color: #003366; color: white; padding: 12px; text-align: left; }
                    td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
                    tr:hover { background-color: #f5f5f5; }
                    tr.warning { background-color: #fff3cd; }
                    tr.success { background-color: #d4edda; }
                    .id-cell { font-family: monospace; font-size: 12px; }
                    .section { background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
                    .count-box { display: inline-block; padding: 5px 10px; border-radius: 3px; margin: 5px; font-weight: bold; }
                    .missing { background-color: #f8d7da; color: #721c24; }
                    .extra { background-color: #cce5ff; color: #004085; }
                    .timestamp { color: #666; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <h1>XML vs JSON Structure Difference Report</h1>
                
                <div class="summary">
                    <h2>Summary</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Element Type</th>
                                <th>XML Count</th>
                                <th>JSON Count</th>
                                <th>Missing in JSON</th>
                                <th>Extra in JSON</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:call-template name="summary-row">
                                <xsl:with-param name="type">article</xsl:with-param>
                                <xsl:with-param name="xml-ids" select="$xml-articles"/>
                                <xsl:with-param name="json-ids" select="$json-articles"/>
                            </xsl:call-template>
                            <xsl:call-template name="summary-row">
                                <xsl:with-param name="type">sentence</xsl:with-param>
                                <xsl:with-param name="xml-ids" select="$xml-sentences"/>
                                <xsl:with-param name="json-ids" select="$json-sentences"/>
                            </xsl:call-template>
                            <xsl:call-template name="summary-row">
                                <xsl:with-param name="type">table</xsl:with-param>
                                <xsl:with-param name="xml-ids" select="$xml-tables"/>
                                <xsl:with-param name="json-ids" select="$json-tables"/>
                            </xsl:call-template>
                            <xsl:call-template name="summary-row">
                                <xsl:with-param name="type">figure</xsl:with-param>
                                <xsl:with-param name="xml-ids" select="$xml-figures"/>
                                <xsl:with-param name="json-ids" select="$json-figures"/>
                            </xsl:call-template>
                            <xsl:call-template name="summary-row">
                                <xsl:with-param name="type">application-note</xsl:with-param>
                                <xsl:with-param name="xml-ids" select="$xml-app-notes"/>
                                <xsl:with-param name="json-ids" select="$json-app-notes"/>
                            </xsl:call-template>
                        </tbody>
                    </table>
                </div>
                
                <!-- Detailed sections -->
                <xsl:call-template name="detail-section">
                    <xsl:with-param name="type">article</xsl:with-param>
                    <xsl:with-param name="xml-ids" select="$xml-articles"/>
                    <xsl:with-param name="json-ids" select="$json-articles"/>
                </xsl:call-template>
                
                <xsl:call-template name="detail-section">
                    <xsl:with-param name="type">sentence</xsl:with-param>
                    <xsl:with-param name="xml-ids" select="$xml-sentences"/>
                    <xsl:with-param name="json-ids" select="$json-sentences"/>
                </xsl:call-template>
                
                <xsl:call-template name="detail-section">
                    <xsl:with-param name="type">table</xsl:with-param>
                    <xsl:with-param name="xml-ids" select="$xml-tables"/>
                    <xsl:with-param name="json-ids" select="$json-tables"/>
                </xsl:call-template>
                
                <xsl:call-template name="detail-section">
                    <xsl:with-param name="type">figure</xsl:with-param>
                    <xsl:with-param name="xml-ids" select="$xml-figures"/>
                    <xsl:with-param name="json-ids" select="$json-figures"/>
                </xsl:call-template>
                
                <xsl:call-template name="detail-section">
                    <xsl:with-param name="type">application-note</xsl:with-param>
                    <xsl:with-param name="xml-ids" select="$xml-app-notes"/>
                    <xsl:with-param name="json-ids" select="$json-app-notes"/>
                </xsl:call-template>
                
                <div class="timestamp">
                    Report generated: <xsl:value-of select="format-dateTime(current-dateTime(), '[Y0001]-[M01]-[D01] [H01]:[m01]:[s01]')"/>
                </div>
            </body>
        </html>
    </xsl:template>
    
    <xsl:template name="summary-row">
        <xsl:param name="type"/>
        <xsl:param name="xml-ids"/>
        <xsl:param name="json-ids"/>
        
        <xsl:variable name="missing" select="$xml-ids[not(. = $json-ids)]"/>
        <xsl:variable name="extra" select="$json-ids[not(. = $xml-ids)]"/>
        <xsl:variable name="has-diff" select="count($missing) > 0 or count($extra) > 0"/>
        
        <tr class="{if ($has-diff) then 'warning' else 'success'}">
            <td><strong><xsl:value-of select="$type"/></strong></td>
            <td><xsl:value-of select="count($xml-ids)"/></td>
            <td><xsl:value-of select="count($json-ids)"/></td>
            <td><span class="count-box missing"><xsl:value-of select="count($missing)"/></span></td>
            <td><span class="count-box extra"><xsl:value-of select="count($extra)"/></span></td>
        </tr>
    </xsl:template>
    
    <xsl:template name="detail-section">
        <xsl:param name="type"/>
        <xsl:param name="xml-ids"/>
        <xsl:param name="json-ids"/>
        
        <xsl:variable name="missing" select="$xml-ids[not(. = $json-ids)]"/>
        <xsl:variable name="extra" select="$json-ids[not(. = $xml-ids)]"/>
        
        <xsl:if test="count($missing) > 0 or count($extra) > 0">
            <div class="section">
                <h2><xsl:value-of select="$type"/> Details</h2>
                
                <xsl:if test="count($missing) > 0">
                    <h3>Missing in JSON (<xsl:value-of select="count($missing)"/>)</h3>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Element ID</th></tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="$missing">
                                <xsl:sort select="."/>
                                <tr>
                                    <td><xsl:value-of select="position()"/></td>
                                    <td class="id-cell"><xsl:value-of select="."/></td>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </xsl:if>
                
                <xsl:if test="count($extra) > 0">
                    <h3>Extra in JSON (<xsl:value-of select="count($extra)"/>)</h3>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Element ID</th></tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="$extra">
                                <xsl:sort select="."/>
                                <tr>
                                    <td><xsl:value-of select="position()"/></td>
                                    <td class="id-cell"><xsl:value-of select="."/></td>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </xsl:if>
            </div>
        </xsl:if>
    </xsl:template>
    
</xsl:stylesheet>
