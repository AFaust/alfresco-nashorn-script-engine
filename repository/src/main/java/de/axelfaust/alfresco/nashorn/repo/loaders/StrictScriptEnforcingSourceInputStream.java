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
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * @author Axel Faust
 */
public class StrictScriptEnforcingSourceInputStream extends InputStream
{

    protected volatile boolean strictFoundOrInjected = false;

    protected volatile boolean inBlockComment = false;

    protected volatile boolean endOfSourceReached = false;

    // allocate enough for a 1MiB script line
    // (highly unexpected, even if using purely multi-byte characters in an unformatted block comment)
    protected final transient ByteBuffer scriptSourceBytes = ByteBuffer.allocate(1024 * 1024);

    protected final transient Charset charset;

    protected final transient BufferedReader reader;

    public StrictScriptEnforcingSourceInputStream(final InputStream in)
    {
        this.charset = StandardCharsets.UTF_8;
        this.reader = new BufferedReader(new InputStreamReader(in, this.charset));
        this.scriptSourceBytes.limit(0);
    }

    public StrictScriptEnforcingSourceInputStream(final InputStream in, final Charset charset)
    {
        this.charset = charset;
        this.reader = new BufferedReader(new InputStreamReader(in, charset));
        this.scriptSourceBytes.limit(0);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int read() throws IOException
    {
        int read;
        if (!this.scriptSourceBytes.hasRemaining() && !this.endOfSourceReached)
        {
            this.fillBufferWithNextLine();
        }

        if (this.scriptSourceBytes.hasRemaining())
        {
            read = this.scriptSourceBytes.get();
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
        this.scriptSourceBytes.rewind();
        this.scriptSourceBytes.limit(0);

        final String line = this.reader.readLine();
        if (line != null)
        {
            String lineToWrite;
            if (!this.strictFoundOrInjected)
            {
                final StringBuilder lineBuilder = new StringBuilder(line.length());
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
                            lineBuilder.insert(lineBuilder.length() - 2, "'use strict'; ");
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
                            lineBuilder.insert(lineBuilder.length() - 2, "'use strict'; ");
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
                                lineBuilder.append("'use strict'; ");
                            }
                            lineBuilder.append(remainder);
                            this.strictFoundOrInjected = true;
                        }
                        else
                        {
                            // non-whitespace, non-quote character outside of a block or line comment
                            // inject 'use strict';
                            lineBuilder.append("'use strict'; ");
                            lineBuilder.append(remainder);
                            this.strictFoundOrInjected = true;
                        }
                        break;
                    }

                    last = c;
                }
                lineToWrite = lineBuilder.toString();
            }
            else
            {
                lineToWrite = line;
            }

            final byte[] lineBytes = lineToWrite.getBytes(this.charset);
            this.scriptSourceBytes.limit(lineBytes.length + 1);
            this.scriptSourceBytes.put(lineBytes);
            this.scriptSourceBytes.put(String.valueOf('\n').getBytes());
            this.scriptSourceBytes.rewind();
        }
        else
        {
            this.reader.close();
            this.endOfSourceReached = true;
        }
    }
}
