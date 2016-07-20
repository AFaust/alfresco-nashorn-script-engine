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
package de.axelfaust.alfresco.nashorn.jdk8wa;

import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * This class and its sub-classes became necessary due to Nashorn {@code Source.baseURL()} operation attempting to resolve a parent URL from
 * a script URL, which does not work correctly with URL instance-specific stream handlers and results in repeated attempts to resolve
 * globally registered protocol handlers via reflection. In order to avoid the associated performance impact it is necessary (in JDK 8) to
 * register our URL stream handlers globally while still ensuring that they are only used within a valid script load context (which is why
 * URL instance-specific handlers are used in the first place).
 *
 * @author Axel Faust
 */
public abstract class GloballyRegisteredURLStreamHandler extends URLStreamHandler
{

    protected static final ThreadLocal<AtomicInteger> IN_SCRIPT_LOAD = new ThreadLocal<AtomicInteger>()
    {

        /**
         * {@inheritDoc}
         */
        @Override
        protected AtomicInteger initialValue()
        {
            return new AtomicInteger(0);
        }

    };

    protected static final Method OPEN_CONNECTION;

    static
    {
        try
        {
            final Method openConnection = URLStreamHandler.class.getDeclaredMethod("openConnection", URL.class);
            openConnection.setAccessible(true);
            OPEN_CONNECTION = openConnection;
        }
        catch (final Throwable e)
        {
            throw new RuntimeException(e);
        }
    }

    public static void startScriptLoad()
    {
        IN_SCRIPT_LOAD.get().incrementAndGet();
    }

    public static void endScriptLoad()
    {
        IN_SCRIPT_LOAD.get().decrementAndGet();
    }

    @Override
    protected URLConnection openConnection(final URL url)
    {
        if (IN_SCRIPT_LOAD.get().intValue() > 0)
        {
            return this.realOpenConnection(url);
        }
        throw new IllegalStateException("Not allowed to use this stream handler outside of an Alfresco Nashorn Script Engine load use case");
    }

    protected abstract URLConnection realOpenConnection(URL url);
}
