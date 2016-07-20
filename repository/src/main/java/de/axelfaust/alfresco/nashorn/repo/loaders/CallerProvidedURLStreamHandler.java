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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Axel Faust
 */
public class CallerProvidedURLStreamHandler extends URLStreamHandler
{

    private static final Logger LOGGER = LoggerFactory.getLogger(CallerProvidedURLStreamHandler.class);

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
        return new CallerProvidedURLConnection(u);
    }

}
