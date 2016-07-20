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
package de.axelfaust.alfresco.nashorn.jdk8wa.classpath;

import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;

import de.axelfaust.alfresco.nashorn.jdk8wa.GloballyRegisteredURLStreamHandler;

/**
 * @author Axel Faust, <a href="http://www.prodyna.com">PRODYNA AG</a>
 */
public class Handler extends GloballyRegisteredURLStreamHandler
{

    private static URLStreamHandler REAL_HANDLER;

    public static void setRealHandler(final URLStreamHandler realHandler)
    {
        REAL_HANDLER = realHandler;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection realOpenConnection(final URL url)
    {
        try
        {
            return (URLConnection) OPEN_CONNECTION.invoke(REAL_HANDLER, url);
        }
        catch (final Throwable e)
        {
            throw new RuntimeException(e);
        }
    }

}
