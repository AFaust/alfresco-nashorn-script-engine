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

    protected transient URL resource;

    // sun.net.www.protocol.file.FileURLConnection may hold some unclosed FileInputStream(s) open that we want to see GCed (implicitly
    // closed) as soon as possible but aggressively clearing realConnection does not help either
    // TODO Implement optimisations to avoid FileURLConnection when possible (e.g. exploded source files via regular File)
    protected transient URLConnection realConnection;

    protected String basePath = "alfresco";

    protected int basePathLength = this.basePath.length();

    protected String extensionPath = "extension";

    protected int extensionPathLength = this.extensionPath.length();

    protected boolean allowExtension;

    protected transient long contentLength = -1;

    protected transient long lastModified = -1;

    public AlfrescoClasspathURLConnection(final URL url)
    {
        super(url);
    }

    public AlfrescoClasspathURLConnection(final URL url, final boolean allowExtension)
    {
        this(url);
        this.allowExtension = allowExtension;
    }

    public AlfrescoClasspathURLConnection(final URL url, final boolean allowExtension, final String extensionPath)
    {
        this(url, allowExtension);
        this.extensionPath = extensionPath;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath)
    {
        this(url);
        this.basePath = basePath;
        this.basePathLength = basePath != null ? basePath.length() : -1;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath, final boolean allowExtension)
    {
        this(url, allowExtension);
        this.basePath = basePath;
        this.basePathLength = basePath != null ? basePath.length() : -1;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath, final boolean allowExtension, final String extensionPath)
    {
        this(url, basePath, allowExtension);
        this.extensionPath = extensionPath;
        this.extensionPathLength = basePath != null ? extensionPath.length() : -1;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        if (!this.connected)
        {
            // this is primarily a validation step
            this.ensureRealConnection();

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
            this.ensureRealConnection();
            this.contentLength = this.realConnection.getContentLengthLong();
        }

        return this.contentLength;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        if (this.lastModified == -1)
        {
            this.ensureRealConnection();
            this.lastModified = this.realConnection.getLastModified();
        }
        return this.lastModified;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream() throws IOException
    {
        this.connect();
        this.ensureRealConnection();

        // this assumes UTF-8
        final InputStream result = new StrictScriptEnforcingSourceInputStream(this.realConnection.getInputStream());
        return result;
    }

    protected void ensureRealConnection()
    {
        if (this.realConnection == null)
        {
            if (this.resource == null)
            {
                final StringBuilder pathBuilder = new StringBuilder();

                if (this.basePathLength > 0)
                {
                    pathBuilder.append(this.basePath);
                    pathBuilder.append('/');
                }
                pathBuilder.append(this.url.getPath());

                final ClassLoader classLoader = this.getClass().getClassLoader();

                for (final String suffix : Arrays.asList(null, ".nashornjs", ".js"))
                {
                    if (this.resource == null)
                    {
                        if (suffix != null)
                        {
                            pathBuilder.append(suffix);
                        }

                        if (this.allowExtension && this.extensionPathLength > 0)
                        {
                            if (this.basePathLength > 0)
                            {
                                pathBuilder.insert(this.basePathLength, '/');
                                pathBuilder.insert(this.basePathLength + 1, this.extensionPath);
                            }
                            else
                            {
                                pathBuilder.insert(0, this.extensionPath);
                                pathBuilder.insert(this.extensionPathLength, '/');
                            }

                            this.resource = classLoader.getResource(pathBuilder.toString());

                            if (this.basePathLength > 0)
                            {

                                pathBuilder.delete(this.basePathLength, this.basePathLength + this.extensionPathLength + 1);
                            }
                            else
                            {
                                pathBuilder.delete(0, this.extensionPathLength + 1);
                            }
                        }

                        if (this.resource == null)
                        {
                            this.resource = classLoader.getResource(pathBuilder.toString());
                        }

                        if (suffix != null)
                        {
                            pathBuilder.delete(pathBuilder.length() - suffix.length(), pathBuilder.length());
                        }
                    }
                }

                if (this.resource == null)
                {
                    throw new IllegalStateException("No resource found for classpath: " + pathBuilder);
                }
            }

            try
            {
                this.realConnection = this.resource.openConnection();
            }
            catch (final IOException ioex)
            {
                throw new AlfrescoRuntimeException("Error handling classpath script URL", ioex);
            }
        }
    }
}
