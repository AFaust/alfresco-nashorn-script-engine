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
import java.io.Serializable;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileChannel.MapMode;
import java.nio.file.StandardOpenOption;
import java.sql.Date;
import java.text.MessageFormat;

import org.alfresco.model.ContentModel;
import org.alfresco.repo.transaction.RetryingTransactionHelper;
import org.alfresco.repo.transaction.RetryingTransactionHelper.RetryingTransactionCallback;
import org.alfresco.scripts.ScriptException;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.service.cmr.repository.datatype.DefaultTypeConverter;
import org.alfresco.util.ParameterCheck;
import org.alfresco.util.TempFileProvider;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Axel Faust
 */
public abstract class AbstractNodeScriptFile implements ScriptFile
{

    private static final Logger LOGGER = LoggerFactory.getLogger(AbstractNodeScriptFile.class);

    private static final String CACHE_DIRECTORY_NAME = "Alfresco-Nashorn-NodeScriptCache";

    private static final File CACHE_DIRECTORY = TempFileProvider.getTempDir(CACHE_DIRECTORY_NAME + "-" + System.currentTimeMillis());
    static {
        CACHE_DIRECTORY.deleteOnExit();
    }

    protected final NodeRef nodeRef;

    protected final NodeService nodeService;

    protected final RetryingTransactionHelper retryingTransactionHelper;

    protected transient long cacheLastModified = -1;

    protected transient long size = -1;

    protected transient File cacheFile;

    protected transient MappedByteBuffer byteBuffer;

    public AbstractNodeScriptFile(final NodeRef nodeRef, final NodeService nodeService,
            final RetryingTransactionHelper retryingTransactionHelper)
    {
        ParameterCheck.mandatory("nodeRef", nodeRef);
        ParameterCheck.mandatory("nodeService", nodeService);
        ParameterCheck.mandatory("retryingTransactionHelper", retryingTransactionHelper);

        this.nodeRef = nodeRef;
        this.nodeService = nodeService;
        this.retryingTransactionHelper = retryingTransactionHelper;

        this.cacheFile = new File(CACHE_DIRECTORY, MessageFormat.format("{0}-{1}-{2}.js", nodeRef.getStoreRef().getProtocol(), nodeRef
                .getStoreRef().getIdentifier(), nodeRef.getId()));
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean exists(final boolean force)
    {
        final Boolean exists = this.retryingTransactionHelper.doInTransaction(new RetryingTransactionCallback<Boolean>()
        {

            /**
             * {@inheritDoc}
             */
            @Override
            public Boolean execute()
            {
                final boolean exists = AbstractNodeScriptFile.this.nodeService.exists(AbstractNodeScriptFile.this.nodeRef);
                return Boolean.valueOf(exists);
            }
        });
        return Boolean.TRUE.equals(exists);
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public long getSize(final boolean force)
    {
        long size = -1;

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

        return size;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified(final boolean force)
    {
        final Date modified = this.retryingTransactionHelper.doInTransaction(new RetryingTransactionCallback<Date>()
        {

            /**
             * {@inheritDoc}
             */
            @Override
            public Date execute()
            {
                final Serializable value = AbstractNodeScriptFile.this.nodeService.getProperty(AbstractNodeScriptFile.this.nodeRef,
                        ContentModel.PROP_MODIFIED);
                final Date modified = DefaultTypeConverter.INSTANCE.convert(Date.class, value);
                return modified;
            }
        });

        final long lastModified = modified != null ? modified.getTime() : System.currentTimeMillis();

        if (this.cacheLastModified != -1 && lastModified > this.cacheLastModified)
        {
            synchronized (this)
            {
                this.size = -1;
                this.byteBuffer = null;
                this.cacheFile.delete();
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
     * {@inheritDoc}
     */
    @Override
    public synchronized void reset()
    {
        this.size = -1;
        this.byteBuffer = null;
        this.cacheFile.delete();

    }

    protected abstract InputStream getInputStreamInternal();

    protected synchronized void cacheScriptFile()
    {
        try
        {
            try (final InputStream is = new StrictScriptEnforcingSourceInputStream(this.getInputStreamInternal()))
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
            LOGGER.debug("Error caching script file", ioex);

            this.byteBuffer = null;
            this.cacheFile.delete();
            this.size = -1;

            throw new ScriptException("Script can't be loaded", ioex);
        }
    }
}
