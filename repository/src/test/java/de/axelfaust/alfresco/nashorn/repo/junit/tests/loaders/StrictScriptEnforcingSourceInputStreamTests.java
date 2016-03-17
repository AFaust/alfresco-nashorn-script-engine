/*
 * Copyright 2016 Axel Faust
 *
 * Licensed under the Eclipse Public License (EPL), Version 1.0 (the "License"); you may not use
 * this file except in compliance with the License. You may obtain a copy of the License at
 *
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
package de.axelfaust.alfresco.nashorn.repo.junit.tests.loaders;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import org.junit.Assert;
import org.junit.Test;

import de.axelfaust.alfresco.nashorn.repo.loaders.StrictScriptEnforcingSourceInputStream;

/**
 * @author Axel Faust
 */
public class StrictScriptEnforcingSourceInputStreamTests
{

    private static final String LINE_BREAK_PATTERN = "((\\r)?\\n|\\r)";

    private static final String USE_STRICT_PREFIX = "'use strict'; ";

    @Test
    public void emptyScript() throws Exception
    {
        final String singleLineEmptyScript = " ";
        this.testScript(singleLineEmptyScript, -1);

        final String multiLineEmptyScript = "\n \r\n\t\n ";
        this.testScript(multiLineEmptyScript, -1);
    }

    @Test
    public void simpleExpressionScript() throws Exception
    {
        final String singleExpressionScript = "print(typeof Function);";
        this.testScript(singleExpressionScript, 0);

        final String singleExpressionWithExistingDirectiveDoubleQuotedScript = "\"use strict\"; print(typeof Function);";
        this.testScript(singleExpressionWithExistingDirectiveDoubleQuotedScript, -1);

        final String singleExpressionWithExistingDirectiveSingleQuotedScript = "'use strict'; print(typeof Function);";
        this.testScript(singleExpressionWithExistingDirectiveSingleQuotedScript, -1);

        final String multiLineLeadingExpressionScript = "print(typeof Function);\n// just a line comment";
        this.testScript(multiLineLeadingExpressionScript, 0);

        final String multiLineTrailingExpressionScript = "// just a line comment\nprint(typeof Function);";
        this.testScript(multiLineTrailingExpressionScript, 1);

        final String blockCommentTrailingExpressionScript = "/* just a block comment\nspanning multiple lines\n**/\nprint(typeof Function);";
        this.testScript(blockCommentTrailingExpressionScript, 3);

        final String multipleCommentsTrailingExpressionScript = "/* just a block comment\nspanning multiple lines\n**/\n//line comment\n\n/** another block comment */\nprint(typeof Function);";
        this.testScript(multipleCommentsTrailingExpressionScript, 6);
    }

    @Test
    public void lineCommentsWithoutScriptExpressions() throws Exception
    {
        final String lineCommentAtStartScript = "// This is a simple line comment";
        this.testScript(lineCommentAtStartScript, -1);

        final String lineCommentAfterWhiteSpacesScript = " \t // This is a simple line comment";
        this.testScript(lineCommentAfterWhiteSpacesScript, -1);
    }

    @Test
    public void blockCommentsWithoutScriptExpressions() throws Exception
    {
        final String oneLineBlockCommentScript = "/* This is a one-line block comment */";
        this.testScript(oneLineBlockCommentScript, -1);

        final String multiLineBlockCommentWithWhiteSpacesScript = " \t /* This is a multi-line block comment\nspanning four-lines\t*\n//\n*/\t";
        this.testScript(multiLineBlockCommentWithWhiteSpacesScript, -1);
    }

    protected void testScript(final String script, final int expectedLineWithUseStrict) throws IOException
    {
        final String[] lines = script.split(LINE_BREAK_PATTERN);
        int linesRead = 0;
        try (final BufferedReader reader = this.asScriptReader(script))
        {
            String line;
            while ((line = reader.readLine()) != null)
            {
                if (linesRead == expectedLineWithUseStrict)
                {
                    Assert.assertEquals(USE_STRICT_PREFIX, line.substring(0, USE_STRICT_PREFIX.length()));
                    Assert.assertEquals(USE_STRICT_PREFIX.length() + lines[linesRead].length(), line.length());
                    Assert.assertEquals(lines[linesRead], line.substring(USE_STRICT_PREFIX.length()));
                }
                else
                {
                    Assert.assertEquals(lines[linesRead], line);
                }
                linesRead++;
            }
        }
        Assert.assertEquals(lines.length, linesRead);
    }

    protected BufferedReader asScriptReader(final String script)
    {
        final InputStream is = new ByteArrayInputStream(script.getBytes(StandardCharsets.UTF_8));
        final InputStream ssis = new StrictScriptEnforcingSourceInputStream(is);
        final BufferedReader reader = new BufferedReader(new InputStreamReader(ssis, StandardCharsets.UTF_8));
        return reader;
    }
}
