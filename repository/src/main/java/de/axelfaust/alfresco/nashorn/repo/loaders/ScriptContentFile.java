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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import org.alfresco.scripts.ScriptException;
import org.alfresco.util.ParameterCheck;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.extensions.webscripts.ScriptContent;

/**
 * @author Axel Faust
 */
public class ScriptContentFile implements ScriptFile
{

    private static final Logger LOGGER = LoggerFactory.getLogger(ScriptContentFile.class);

    protected final ScriptContent scriptContent;

    protected transient byte[] byteBuffer;

    protected transient long size = -1;

    public ScriptContentFile(final ScriptContent scriptContent)
    {
        ParameterCheck.mandatory("scriptContent", scriptContent);
        this.scriptContent = scriptContent;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean exists(final boolean force)
    {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public synchronized long getSize(final boolean force)
    {
        if (this.size == -1)
        {
            this.cacheScriptFile();
        }
        return this.size;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified(final boolean force)
    {
        // no way to determine lastModified
        return System.currentTimeMillis();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public synchronized InputStream getInputStream()
    {
        InputStream is;

        if (this.byteBuffer == null)
        {
            this.cacheScriptFile();
        }

        is = new ByteArrayInputStream(this.byteBuffer);
        return is;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public synchronized void reset()
    {
        this.byteBuffer = null;
        this.size = -1;
    }

    protected synchronized void cacheScriptFile()
    {
        try
        {
            try (final InputStream is = new StrictScriptEnforcingSourceInputStream(this.scriptContent.getInputStream()))
            {
                try (final ByteArrayOutputStream os = new ByteArrayOutputStream())
                {
                    IOUtils.copy(is, os);

                    this.byteBuffer = os.toByteArray();
                }
            }

            this.size = this.byteBuffer.length;
        }
        catch (final IOException ioex)
        {
            LOGGER.debug("Error caching script file", ioex);

            this.size = -1;

            throw new ScriptException("Script can't be loaded", ioex);
        }
    }
}
