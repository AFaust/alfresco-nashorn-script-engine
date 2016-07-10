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
import java.net.URL;
import java.net.URLConnection;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

import org.alfresco.scripts.ScriptException;
import org.alfresco.service.cmr.repository.ScriptLocation;
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

    private static final ThreadLocal<Pair<String, Boolean>> CURRENT_CALLER_PROVIDED_SCRIPT = new ThreadLocal<Pair<String, Boolean>>();

    private static final ThreadLocal<ScriptLocation> CURRENT_CALLER_PROVIDED_LOCATION = new ThreadLocal<ScriptLocation>();

    public static void clearCallerProvidedScript()
    {
        CURRENT_CALLER_PROVIDED_LOCATION.remove();
        CURRENT_CALLER_PROVIDED_SCRIPT.remove();
    }

    public static void registerCallerProvidedScript(final String script, final boolean secure)
    {
        CURRENT_CALLER_PROVIDED_LOCATION.remove();
        CURRENT_CALLER_PROVIDED_SCRIPT.set(new Pair<>(script, Boolean.valueOf(secure)));
    }

    public static void registerCallerProvidedScript(final ScriptLocation scriptLocation)
    {
        CURRENT_CALLER_PROVIDED_LOCATION.set(scriptLocation);
        CURRENT_CALLER_PROVIDED_SCRIPT.remove();
    }

    public static boolean isCallerProvidedScriptSecure()
    {
        final boolean result;
        final ScriptLocation scriptLocation = CURRENT_CALLER_PROVIDED_LOCATION.get();
        final Pair<String, Boolean> script = CURRENT_CALLER_PROVIDED_SCRIPT.get();
        result = (scriptLocation != null && scriptLocation.isSecure()) || (script != null && Boolean.TRUE.equals(script.getSecond()));
        return result;
    }

    protected transient ByteBuffer byteBuffer;

    public CallerProvidedURLConnection(final URL url)
    {
        super(url);
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
        if (this.byteBuffer == null)
        {
            this.cacheScriptFile();
        }

        return this.byteBuffer.limit();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        // we can't really reliably determine lastModified from either source or location
        // Nashorn will still check script digest against cache
        return System.currentTimeMillis();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        InputStream is;
        if (this.byteBuffer == null)
        {
            this.cacheScriptFile();
        }

        is = new ByteBufferInputStream(this.byteBuffer);
        return is;
    }

    protected synchronized void cacheScriptFile()
    {
        final ScriptLocation scriptLocation = CURRENT_CALLER_PROVIDED_LOCATION.get();
        final Pair<String, Boolean> script = CURRENT_CALLER_PROVIDED_SCRIPT.get();

        try
        {
            try (final InputStream is = new StrictScriptEnforcingSourceInputStream(scriptLocation != null ? scriptLocation.getInputStream()
                    : new ByteArrayInputStream(script.getFirst().getBytes(StandardCharsets.UTF_8))))
            {
                try (final ByteArrayOutputStream os = new ByteArrayOutputStream())
                {
                    IOUtils.copy(is, os);

                    final byte[] bytes = os.toByteArray();
                    this.byteBuffer = ByteBuffer.allocate(bytes.length);
                    this.byteBuffer.put(bytes);
                    this.byteBuffer.position(0);
                }
            }
        }
        catch (final IOException ioex)
        {
            LOGGER.debug("Error caching script file", ioex);
            throw new ScriptException("Script can't be loaded", ioex);
        }
    }
}
