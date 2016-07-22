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
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;

import org.alfresco.scripts.ScriptException;
import org.alfresco.service.cmr.repository.ScriptLocation;
import org.alfresco.util.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Axel Faust
 */
public class CallerProvidedURLStreamHandler extends URLStreamHandler
{

    private static final Logger LOGGER = LoggerFactory.getLogger(CallerProvidedURLStreamHandler.class);

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

    {
        try
        {
            final Class<?> cls = Class.forName("de.axelfaust.alfresco.nashorn.jdk8wa.callerProvided.Handler");
            final Method setRealHandler = cls.getDeclaredMethod("setRealHandler", URLStreamHandler.class);
            setRealHandler.invoke(null, this);

            LOGGER.info("Registered {} as global callerProvided URL stream handler", this);
        }
        catch (ClassNotFoundException | NoSuchMethodException | InvocationTargetException | IllegalAccessException e)
        {
            LOGGER.info("JDK 8 workarounds library not available - {} not registered as global callerProvided URL stream handler", this);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL u) throws IOException
    {
        final URLConnection con;

        final Pair<String, Boolean> script = CURRENT_CALLER_PROVIDED_SCRIPT.get();
        if (script != null)
        {
            con = new CallerProvidedURLConnection(u, script.getFirst());
        }
        else
        {
            final ScriptLocation scriptLocation = CURRENT_CALLER_PROVIDED_LOCATION.get();
            if (scriptLocation != null)
            {
                con = new CallerProvidedURLConnection(u, scriptLocation);
            }
            else
            {
                throw new ScriptException("No caller-provided script has been registered");
            }
        }

        return con;
    }

}
