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

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.Arrays;

import org.alfresco.error.AlfrescoRuntimeException;

/**
 *
 * @author Axel Faust
 */
public class AlfrescoClasspathURLConnection extends URLConnection
{

    protected URLConnection realConnection;

    protected String basePath = "alfresco";

    protected String extensionPath = "extension";

    protected boolean allowExtension;

    public AlfrescoClasspathURLConnection(final URL url, final boolean allowExtension)
    {
        super(url);

        this.allowExtension = allowExtension;
    }

    public AlfrescoClasspathURLConnection(final URL url, final boolean allowExtension, final String extensionPath)
    {
        this(url, allowExtension);

        this.extensionPath = extensionPath;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath, final boolean allowExtension, final String extensionPath)
    {
        this(url, allowExtension);

        this.basePath = basePath;
        this.extensionPath = extensionPath;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        this.ensureRealConnection();

        if (!this.connected)
        {
            this.realConnection.connect();
            this.connected = true;
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getContentLengthLong()
    {
        this.ensureRealConnection();
        return this.realConnection.getContentLengthLong();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        this.ensureRealConnection();
        return this.realConnection.getLastModified();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        this.connect();
        return this.realConnection.getInputStream();
    }

    protected void ensureRealConnection()
    {
        if (this.realConnection == null)
        {
            final StringBuilder pathBuilder = new StringBuilder();

            if (this.basePath != null)
            {
                pathBuilder.append(this.basePath);
                pathBuilder.append('/');
            }
            pathBuilder.append(this.url.getPath());

            final ClassLoader classLoader = this.getClass().getClassLoader();

            URL resource = null;

            for (final String suffix : Arrays.asList(null, ".nashornjs", ".js"))
            {
                if (resource == null)
                {
                    if (suffix != null)
                    {
                        pathBuilder.append(suffix);
                    }

                    if (this.allowExtension && this.extensionPath != null)
                    {
                        if (this.basePath != null)
                        {
                            pathBuilder.insert(this.basePath.length(), '/');
                            pathBuilder.insert(this.basePath.length() + 1, this.extensionPath);
                        }
                        else
                        {
                            pathBuilder.insert(0, this.extensionPath);
                            pathBuilder.insert(this.extensionPath.length(), '/');
                        }

                        resource = classLoader.getResource(pathBuilder.toString());

                        if (this.basePath != null)
                        {
                            pathBuilder.delete(this.basePath.length(), this.extensionPath.length() + 1);
                        }
                        else
                        {
                            pathBuilder.delete(0, this.extensionPath.length() + 1);
                        }
                    }

                    if (resource == null)
                    {
                        resource = classLoader.getResource(pathBuilder.toString());
                    }

                    if (suffix != null)
                    {
                        pathBuilder.delete(pathBuilder.length() - suffix.length(), pathBuilder.length());
                    }
                }
            }

            if (resource == null)
            {
                throw new IllegalStateException("No resource found for classpath: " + pathBuilder);
            }

            try
            {
                this.realConnection = resource.openConnection();
            }
            catch (final IOException ioex)
            {
                throw new AlfrescoRuntimeException("Error handling classpath script URL", ioex);
            }
        }
    }
}
