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
package de.axelfaust.alfresco.nashorn.repo.loaders;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * @author Axel Faust
 */
public class StrictScriptEnforcingSourceInputStream extends InputStream
{

    public static final String USE_STRICT_INJECTION = "'use strict'; ";

    protected volatile boolean strictFoundOrInjected = false;

    protected volatile boolean inBlockComment = false;

    protected volatile boolean endOfSourceReached = false;

    protected transient byte[] buffer;

    protected transient int bufPos = -1;

    protected final Charset charset;

    protected final BufferedReader reader;

    public StrictScriptEnforcingSourceInputStream(final InputStream in)
    {
        this.charset = StandardCharsets.UTF_8;
        this.reader = new BufferedReader(new InputStreamReader(in, this.charset));
    }

    public StrictScriptEnforcingSourceInputStream(final InputStream in, final Charset charset)
    {
        this.charset = charset;
        this.reader = new BufferedReader(new InputStreamReader(in, charset));
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int read() throws IOException
    {
        int read;
        if ((this.bufPos == -1 || this.buffer == null || this.bufPos >= this.buffer.length) && !this.endOfSourceReached)
        {
            this.fillBufferWithNextLine();
        }

        if (this.buffer != null && this.bufPos < this.buffer.length)
        {
            read = this.buffer[this.bufPos++];
        }
        else
        {
            read = -1;
        }

        return read;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public synchronized void close() throws IOException
    {
        this.endOfSourceReached = true;
        this.reader.close();
    }

    protected synchronized void fillBufferWithNextLine() throws IOException
    {
        final String line = this.reader.readLine();
        if (line != null)
        {
            final StringBuilder lineBuilder = new StringBuilder(line.length());
            if (!this.strictFoundOrInjected)
            {
                char last = '\n';
                for (int idx = 0; idx < line.length(); idx++)
                {
                    char c = line.charAt(idx);
                    if (Character.isWhitespace(c))
                    {
                        if (Character.isWhitespace(last) || this.inBlockComment)
                        {
                            lineBuilder.append(c);
                        }
                        else
                        {
                            // whitespace after any non-comment content
                            // inject 'use strict';
                            lineBuilder.insert(lineBuilder.length() - 2, "'use strict';");
                            lineBuilder.append(line.substring(idx));
                            this.strictFoundOrInjected = true;
                            break;
                        }
                    }
                    else if (c == '/')
                    {
                        if (Character.isWhitespace(last))
                        {
                            lineBuilder.append(c);
                        }
                        else if (this.inBlockComment)
                        {
                            lineBuilder.append(c);
                            if (last == '*')
                            {
                                this.inBlockComment = false;
                                // dummy line break to avoid misinterpreting *// as */ and //
                                c = '\n';
                            }
                        }
                        else if (last != '/')
                        {
                            // potentially a regex literal
                            // inject 'use strict';
                            lineBuilder.insert(lineBuilder.length() - 2, USE_STRICT_INJECTION);
                            lineBuilder.append(line.substring(idx));
                            this.strictFoundOrInjected = true;
                            break;
                        }
                        else
                        {
                            // line comment
                            lineBuilder.append(line.substring(idx));
                            break;
                        }
                    }
                    else if (!this.inBlockComment && last == '/')
                    {
                        if (c != '*')
                        {
                            // potentially a regex literal
                            // inject 'use strict';
                            lineBuilder.insert(lineBuilder.length() - 2, USE_STRICT_INJECTION);
                            lineBuilder.append(line.substring(idx));
                            this.strictFoundOrInjected = true;
                            break;
                        }
                        lineBuilder.append(c);
                        this.inBlockComment = true;
                    }
                    else if (this.inBlockComment)
                    {
                        lineBuilder.append(c);
                    }
                    else
                    {
                        final String remainder = line.substring(idx);
                        if (c == '"' || c == '\'')
                        {
                            if (!remainder.matches("(['\"])use strict\\1\\s*;.*"))
                            {
                                // some arbitrary literal expression
                                // inject 'use strict';
                                lineBuilder.append(USE_STRICT_INJECTION);
                            }
                            lineBuilder.append(remainder);
                            this.strictFoundOrInjected = true;
                        }
                        else
                        {
                            // non-whitespace, non-quote character outside of a block or line comment
                            // inject 'use strict';
                            lineBuilder.append(USE_STRICT_INJECTION);
                            lineBuilder.append(remainder);
                            this.strictFoundOrInjected = true;
                        }
                        break;
                    }

                    last = c;
                }
            }
            else
            {
                lineBuilder.append(line);
            }

            lineBuilder.append('\n');
            this.buffer = lineBuilder.toString().getBytes(this.charset);
            this.bufPos = 0;
        }
        else
        {
            this.reader.close();
            this.endOfSourceReached = true;
        }
    }
}
