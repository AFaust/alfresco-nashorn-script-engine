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

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileChannel.MapMode;
import java.nio.file.StandardOpenOption;
import java.text.MessageFormat;
import java.util.UUID;

import org.alfresco.scripts.ScriptException;
import org.alfresco.util.ParameterCheck;
import org.alfresco.util.TempFileProvider;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.ResourceUtils;

/**
 * @author Axel Faust
 */
public class ClasspathScriptFile implements ScriptFile
{

    private static final Logger LOGGER = LoggerFactory.getLogger(ClasspathScriptFile.class);

    private static final String CACHE_DIRECTORY_NAME = "Alfresco-Nashorn-ClasspathScriptCache";

    private static final File CACHE_DIRECTORY = TempFileProvider.getTempDir(CACHE_DIRECTORY_NAME + "-" + System.currentTimeMillis());
    static {
        CACHE_DIRECTORY.deleteOnExit();
    }

    protected static final long DEFAULT_EXISTENCE_CHECK_INTERVAL = 30000;

    protected static final long DEFAULT_LAST_MODIFIED_CHECK_INTERVAL = 30000;

    protected final String filePath;

    protected transient boolean exists = false;

    protected transient boolean existsInJarFile = false;

    protected transient long lastExistenceCheck = -1;

    protected transient long lastModified = -1;

    protected transient long lastModifiedCheck = -1;

    protected transient long size = -1;

    protected transient ClassPathResource resource;

    protected transient File cacheFile;

    protected transient MappedByteBuffer byteBuffer;

    public ClasspathScriptFile(final String filePath)
    {
        ParameterCheck.mandatoryString("filePath", filePath);

        this.filePath = filePath;
        this.resource = new ClassPathResource(filePath, this.getClass().getClassLoader());

        this.cacheFile = new File(CACHE_DIRECTORY, MessageFormat.format("{0}-{1}.js", this.resource.getFilename(), UUID.randomUUID()
                .toString()));
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean exists(final boolean force)
    {
        boolean exists = this.exists;

        // JAR files "should never" cease to exist during runtime
        if (!this.existsInJarFile || force)
        {
            final long currentTimeMillis = System.currentTimeMillis();
            if (force || currentTimeMillis - this.lastExistenceCheck > DEFAULT_EXISTENCE_CHECK_INTERVAL)
            {
                synchronized (this)
                {
                    exists = this.exists;
                    if (force || currentTimeMillis - this.lastExistenceCheck > DEFAULT_EXISTENCE_CHECK_INTERVAL)
                    {
                        final boolean doesExist = this.resource.exists();

                        if (!doesExist && this.exists)
                        {
                            this.lastModifiedCheck = -1;

                            this.byteBuffer = null;
                            this.cacheFile.delete();
                            this.size = -1;
                        }
                        else if (doesExist && !this.existsInJarFile)
                        {
                            try
                            {
                                final URL url = this.resource.getURL();
                                this.existsInJarFile = ResourceUtils.isJarURL(url);
                            }
                            catch (final IOException ioex)
                            {
                                LOGGER.debug("Error retrieving resource URL despite proven existence", ioex);
                            }
                        }

                        exists = this.exists = doesExist;
                        this.lastExistenceCheck = currentTimeMillis;
                    }
                }
            }
        }

        return exists;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public long getSize(final boolean force)
    {
        long size = -1;

        if (this.exists)
        {
            if (force || this.size == -1)
            {
                synchronized (this)
                {
                    if (force || this.size == -1)
                    {
                        this.cacheScriptFile();
                    }
                }

            }
            size = this.size;
        }

        return size;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public long getLastModified(final boolean force)
    {
        long lastModified = -1;
        if (this.exists)
        {
            lastModified = this.lastModified;

            final long currentTimeMillis = System.currentTimeMillis();
            if (force || currentTimeMillis - this.lastModifiedCheck > DEFAULT_LAST_MODIFIED_CHECK_INTERVAL)
            {
                synchronized (this)
                {
                    if (this.exists)
                    {
                        lastModified = this.lastModified;
                        if (force || currentTimeMillis - this.lastModifiedCheck > DEFAULT_LAST_MODIFIED_CHECK_INTERVAL)
                        {
                            try
                            {
                                lastModified = this.resource.lastModified();

                                if (this.lastModified != -1 && lastModified != this.lastModified)
                                {
                                    this.byteBuffer = null;
                                    this.cacheFile.delete();
                                    this.size = -1;
                                }
                            }
                            catch (final IOException ioex)
                            {
                                LOGGER.debug("Resource could not be resolved - treating as no longer existing", ioex);

                                lastModified = this.lastModified = -1;
                                this.exists = this.existsInJarFile = false;

                                this.byteBuffer = null;
                                this.cacheFile.delete();
                                this.size = -1;
                            }

                            this.lastModifiedCheck = currentTimeMillis;
                        }
                    }
                    else
                    {
                        lastModified = -1;
                    }
                }
            }
        }

        return lastModified;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream()
    {
        InputStream is;

        if (this.byteBuffer == null)
        {
            synchronized (this)
            {
                if (this.byteBuffer == null)
                {
                    this.cacheScriptFile();
                }
            }
        }

        if (this.byteBuffer == null)
        {
            throw new ScriptException("Script can't be loaded");
        }

        is = new ByteBufferInputStream(this.byteBuffer);

        return is;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public synchronized void reset()
    {
        this.exists = this.existsInJarFile = false;
        this.lastExistenceCheck = -1;
        this.lastModified = -1;
        this.lastModifiedCheck = -1;

        this.byteBuffer = null;
        this.cacheFile.delete();
        this.size = -1;
    }

    protected synchronized void cacheScriptFile()
    {
        try
        {
            try (final InputStream is = new StrictScriptEnforcingSourceInputStream(this.resource.getInputStream()))
            {
                try (final OutputStream os = new FileOutputStream(this.cacheFile, false))
                {
                    IOUtils.copy(is, os);
                }
            }

            this.size = this.cacheFile.length();
            this.byteBuffer = FileChannel.open(this.cacheFile.toPath(), StandardOpenOption.READ).map(MapMode.READ_ONLY, 0, this.size);
        }
        catch (final IOException ioex)
        {
            LOGGER.debug("Error caching script file - treating as no longer existing", ioex);

            this.exists = this.existsInJarFile = false;

            this.byteBuffer = null;
            this.cacheFile.delete();
            this.size = -1;

            throw new ScriptException("Script can't be loaded", ioex);
        }
    }
}
