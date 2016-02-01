/*
 * Copyright 2015 Axel Faust
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
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;

import org.alfresco.error.AlfrescoRuntimeException;
import org.alfresco.service.cmr.repository.ScriptLocation;
import org.alfresco.util.Pair;

/**
 *
 * @author Axel Faust
 */
public class CallerProvidedURLConnection extends URLConnection
{

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

    protected transient long contentLength = -1;

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
        if (this.contentLength == -1)
        {
            final ScriptLocation scriptLocation = CURRENT_CALLER_PROVIDED_LOCATION.get();
            final Pair<String, Boolean> script = CURRENT_CALLER_PROVIDED_SCRIPT.get();

            if (script != null)
            {
                this.contentLength = script.getFirst().length();
            }
            else if (scriptLocation != null)
            {
                try
                {
                    try (InputStream sis = scriptLocation.getInputStream())
                    {
                        final byte[] buf = new byte[10240];
                        long length = 0;
                        int bytesRead = -1;
                        while ((bytesRead = sis.read(buf)) != -1)
                        {
                            length += bytesRead;
                        }
                        this.contentLength = length;
                    }
                }
                catch (final IOException ioex)
                {
                    throw new AlfrescoRuntimeException("Error trying to determine size of script", ioex);
                }
            }
            else
            {
                throw new IllegalStateException(
                        "No caller provided script has been registered with the ThreadLocal of CallerProvidedURLConnection");
            }
        }

        return this.contentLength;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        // we can't really reliably determine lastModified from either source or location
        // Nashorn will still check script digest against cache
        return 0;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        final ScriptLocation scriptLocation = CURRENT_CALLER_PROVIDED_LOCATION.get();
        final Pair<String, Boolean> script = CURRENT_CALLER_PROVIDED_SCRIPT.get();

        final InputStream is;
        if (script != null)
        {
            is = new ByteArrayInputStream(script.getFirst().getBytes(StandardCharsets.UTF_8));
        }
        else if (scriptLocation != null)
        {
            is = scriptLocation.getInputStream();
        }
        else
        {
            throw new IllegalStateException(
                    "No caller provided script has been registered with the ThreadLocal of CallerProvidedURLConnection");
        }

        return is;
    }
}
