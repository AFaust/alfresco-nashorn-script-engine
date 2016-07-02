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

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;

import org.alfresco.util.ParameterCheck;

/**
 * @author Axel Faust
 */
public class ScriptFileURLConnection extends URLConnection
{

    protected final ScriptFile scriptFile;

    public ScriptFileURLConnection(final URL url, final ScriptFile scriptFile)
    {
        super(url);

        ParameterCheck.mandatory("scriptFile", scriptFile);
        this.scriptFile = scriptFile;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        // NO-OP
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public long getContentLengthLong()
    {
        return this.scriptFile.getSize(false);
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        return this.scriptFile.getLastModified(false);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        return this.scriptFile.getInputStream();
    }
}
