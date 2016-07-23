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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

import org.alfresco.scripts.ScriptException;
import org.alfresco.service.cmr.repository.ScriptLocation;
import org.alfresco.util.MD5;
import org.alfresco.util.Pair;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Axel Faust
 */
public class CallerProvidedURLConnection extends URLConnection
{

    private static final Logger LOGGER = LoggerFactory.getLogger(CallerProvidedURLConnection.class);

    private static final Map<String, Pair<Long, Long>> STRING_SCRIPT_META_CACHE = new LinkedHashMap<String, Pair<Long, Long>>();

    private static final int STRING_SCRIPT_META_MAX_CACHE_SIZE = 250;

    protected transient String script;

    protected transient byte[] byteBuffer;

    protected long lastModified;

    protected long contentLength;

    public CallerProvidedURLConnection(final URL url, final String script)
    {
        super(url);

        // we use MD5 hashing to store some metadata about inline scripts
        // this avoids repeated compilation of same script (and injection of use strict)
        try
        {
            final String digest = MD5.Digest(script.getBytes(StandardCharsets.UTF_8.name()));
            final Pair<Long, Long> cachedMeta = STRING_SCRIPT_META_CACHE.get(digest);
            if (cachedMeta != null)
            {
                this.contentLength = cachedMeta.getFirst().longValue();
                this.lastModified = cachedMeta.getSecond().longValue();
                this.script = script;
            }
            else
            {
                this.cacheScriptFile(script);

                // simply use "now" (first occurrence) as lastModified
                this.lastModified = System.currentTimeMillis();
                this.contentLength = this.byteBuffer.length;

                this.cacheMetaData(digest);
            }
        }
        catch (final UnsupportedEncodingException e)
        {
            this.cacheScriptFile(script);

            this.lastModified = System.currentTimeMillis();
            this.contentLength = this.byteBuffer.length;

            final String digest = MD5.Digest(this.byteBuffer);
            this.cacheMetaData(digest);
        }
    }

    public CallerProvidedURLConnection(final URL url, final ScriptLocation script)
    {
        super(url);

        this.cacheScriptFile(script);

        // we use MD5 hashing to store some metadata about inline scripts
        // this avoids repeated compilation of same script (and injection of use strict)
        final String digest = MD5.Digest(this.byteBuffer);
        final Pair<Long, Long> cachedMeta = STRING_SCRIPT_META_CACHE.get(digest);
        if (cachedMeta != null)
        {
            this.contentLength = cachedMeta.getFirst().longValue();
            this.lastModified = cachedMeta.getSecond().longValue();
        }
        else
        {
            // simply use "now" (first occurrence) as lastModified
            this.lastModified = System.currentTimeMillis();
            this.contentLength = this.byteBuffer.length;
            this.cacheMetaData(digest);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        if (!this.connected)
        {
            this.connected = true;
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getContentLengthLong()
    {
        return this.contentLength;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        return this.lastModified;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        final InputStream is;

        if (this.byteBuffer == null && this.script != null)
        {
            // apparently Nashorn cache did not contain script with same URL and metadata
            this.cacheScriptFile(this.script);
        }

        is = new ByteArrayInputStream(this.byteBuffer);
        return is;
    }

    protected synchronized void cacheScriptFile(final String script)
    {
        try
        {
            try (final InputStream is = new StrictScriptEnforcingSourceInputStream(new ByteArrayInputStream(
                    script.getBytes(StandardCharsets.UTF_8))))
            {
                try (final ByteArrayOutputStream os = new ByteArrayOutputStream())
                {
                    IOUtils.copy(is, os);
                    this.byteBuffer = os.toByteArray();
                }
            }
        }
        catch (final IOException ioex)
        {
            LOGGER.debug("Error caching script file", ioex);
            throw new ScriptException("Script can't be loaded", ioex);
        }
    }

    protected synchronized void cacheScriptFile(final ScriptLocation script)
    {
        try
        {
            try (final InputStream is = new StrictScriptEnforcingSourceInputStream(script.getInputStream()))
            {
                try (final ByteArrayOutputStream os = new ByteArrayOutputStream())
                {
                    IOUtils.copy(is, os);
                    this.byteBuffer = os.toByteArray();
                }
            }
        }
        catch (final IOException ioex)
        {
            LOGGER.debug("Error caching script file", ioex);
            throw new ScriptException("Script can't be loaded", ioex);
        }
    }

    protected void cacheMetaData(final String digest)
    {
        synchronized (STRING_SCRIPT_META_CACHE)
        {
            STRING_SCRIPT_META_CACHE.put(digest, new Pair<Long, Long>(Long.valueOf(this.contentLength), Long.valueOf(this.lastModified)));

            if (STRING_SCRIPT_META_CACHE.size() > STRING_SCRIPT_META_MAX_CACHE_SIZE)
            {
                final Iterator<String> iterator = STRING_SCRIPT_META_CACHE.keySet().iterator();
                while (STRING_SCRIPT_META_CACHE.size() > STRING_SCRIPT_META_MAX_CACHE_SIZE && iterator.hasNext())
                {
                    iterator.next();
                    iterator.remove();
                }
            }
        }
    }
}
