/*
 * Copyright 2015, 2016 Axel Faust
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

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;

import org.springframework.extensions.webscripts.ScriptContent;

/**
 *
 * @author Axel Faust
 */
public class WebScriptURLConnection extends URLConnection
{

    protected final ScriptContent scriptContent;

    protected WebScriptURLConnection(final URL url, final ScriptContent scriptContent)
    {
        super(url);
        this.scriptContent = scriptContent;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        // NO-OP
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getContentLengthLong()
    {
        // unable to check length - use current time to avoid false-positive cache hit
        return System.currentTimeMillis();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        // we can't really reliably determine lastModified
        // Nashorn will still check script digest against cache
        return 0;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        // this assumes UTF-8 encoding
        return new StrictScriptEnforcingSourceInputStream(this.scriptContent.getInputStream());
    }
}