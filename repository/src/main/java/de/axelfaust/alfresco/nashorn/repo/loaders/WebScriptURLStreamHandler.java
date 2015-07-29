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
import java.lang.reflect.Field;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;

import org.alfresco.error.AlfrescoRuntimeException;
import org.alfresco.model.ContentModel;
import org.alfresco.repo.security.authentication.AuthenticationUtil;
import org.alfresco.repo.security.authentication.AuthenticationUtil.RunAsWork;
import org.alfresco.repo.transaction.RetryingTransactionHelper;
import org.alfresco.repo.transaction.RetryingTransactionHelper.RetryingTransactionCallback;
import org.alfresco.service.cmr.repository.ContentReader;
import org.alfresco.service.cmr.repository.ContentService;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.util.ParameterCheck;
import org.springframework.extensions.webscripts.ScriptContent;

/**
 * @author Axel Faust
 */
public class WebScriptURLStreamHandler extends URLStreamHandler
{

    protected class WebScriptURLConnection extends URLConnection
    {

        private static final String CLASSPATH_PATH_DESCRIPTION_PREFIX = "classpath*:";

        protected transient URLConnection realConnection;

        protected transient NodeRef realNode;

        protected WebScriptURLConnection(final URL url)
        {
            super(url);
        }

        /**
         *
         * {@inheritDoc}
         */
        @Override
        public void connect() throws IOException
        {
            this.ensureRealConnection();

            if (!this.connected)
            {
                if (this.realConnection != this)
                {
                    this.realConnection.connect();
                }
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

            final long contentLength;
            if (this.realConnection != this)
            {
                contentLength = this.realConnection.getLastModified();
            }
            else if (this.realNode != null)
            {
                final ContentReader reader = WebScriptURLStreamHandler.this.contentService.getReader(this.realNode,
                        ContentModel.PROP_CONTENT);
                contentLength = reader.getSize();
            }
            else
            {
                // unable to check length - use current time to avoid false-positive cache hit
                contentLength = System.currentTimeMillis();
            }

            return contentLength;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public long getLastModified()
        {
            this.ensureRealConnection();

            final long lastModified;
            if (this.realConnection != this)
            {
                lastModified = this.realConnection.getLastModified();
            }
            else if (this.realNode != null)
            {
                final ContentReader reader = WebScriptURLStreamHandler.this.contentService.getReader(this.realNode,
                        ContentModel.PROP_CONTENT);
                lastModified = reader.getLastModified();
            }
            else
            {
                // unable to check lastModified - use current time to avoid false-positive cache hit
                lastModified = System.currentTimeMillis();
            }

            return lastModified;
        }

        /**
         * {@inheritDoc}
         */
        @SuppressWarnings("resource")
        @Override
        public InputStream getInputStream() throws IOException
        {
            this.connect();

            final InputStream inputStream;
            if (this.realNode != null)
            {
                // there is a bug in RepoScriptContent which always opens a read-write txn to retrieve input stream - even if script is
                // read-only
                inputStream = AuthenticationUtil.runAsSystem(new RunAsWork<InputStream>()
                {

                    /**
                     *
                     * {@inheritDoc}
                     */
                    @Override
                    public InputStream doWork() throws Exception
                    {
                        return WebScriptURLStreamHandler.this.retryingTransactionHelper.doInTransaction(
                                new RetryingTransactionCallback<InputStream>()
                                {

                                    /**
                                     *
                                     * {@inheritDoc}
                                     */
                                    @Override
                                    public InputStream execute() throws Throwable
                                    {
                                        return WebScriptURLStreamHandler.this.contentService.getReader(
                                                WebScriptURLConnection.this.realNode, ContentModel.PROP_CONTENT).getContentInputStream();
                                    }
                                }, true, false);
                    }

                });
            }
            else
            {
                inputStream = WebScriptURLStreamHandler.this.scriptContent.getInputStream();
            }

            return inputStream;
        }

        protected void ensureRealConnection()
        {
            if (this.realConnection == null)
            {
                // unfortunately no ScriptContent implementation exposes modified/size metadata, so we have to resort to path-check /
                // reflection stuff to try and get to this ourselves

                final String pathDescription = WebScriptURLStreamHandler.this.scriptContent.getPathDescription();
                if (pathDescription.startsWith(CLASSPATH_PATH_DESCRIPTION_PREFIX))
                {
                    try
                    {
                        this.realConnection = new AlfrescoClasspathURLConnection(new URL("classpath", null, -1,
                                pathDescription.substring(CLASSPATH_PATH_DESCRIPTION_PREFIX.length()), new URLStreamHandler()
                                {

                                    /**
                                     *
                                     * {@inheritDoc}
                                     */
                                    @Override
                                    protected URLConnection openConnection(final URL u) throws IOException
                                    {
                                        return WebScriptURLConnection.this.realConnection;
                                    }
                                }), null, false, null);
                    }
                    catch (final MalformedURLException me)
                    {
                        throw new AlfrescoRuntimeException("Error handling web script URL", me);
                    }
                }
                else
                {
                    this.realNode = this.tryGetNodeRef();
                    this.realConnection = this;
                }
            }
        }

        protected NodeRef tryGetNodeRef()
        {
            NodeRef result;
            try
            {
                final Field nodeRefField = WebScriptURLStreamHandler.this.scriptContent.getClass().getDeclaredField("nodeRef");
                nodeRefField.setAccessible(true);
                result = (NodeRef) nodeRefField.get(WebScriptURLStreamHandler.this.scriptContent);
            }
            catch (final IllegalAccessException | NoSuchFieldException e)
            {
                result = null;
            }

            return result;
        }
    }

    protected final ScriptContent scriptContent;

    protected final ContentService contentService;

    protected final RetryingTransactionHelper retryingTransactionHelper;

    public WebScriptURLStreamHandler(final ScriptContent scriptContent, final ContentService contentService,
            final RetryingTransactionHelper retryingTransactionHelper)
    {
        ParameterCheck.mandatory("scriptContent", scriptContent);
        ParameterCheck.mandatory("contentService", contentService);
        ParameterCheck.mandatory("retryingTransactionHelper", retryingTransactionHelper);

        this.scriptContent = scriptContent;
        this.contentService = contentService;
        this.retryingTransactionHelper = retryingTransactionHelper;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL url) throws IOException
    {
        return new WebScriptURLConnection(url);
    }

}
