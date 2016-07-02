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
import java.nio.charset.Charset;

import org.alfresco.model.ContentModel;
import org.alfresco.service.cmr.repository.ContentReader;
import org.alfresco.service.cmr.repository.ContentService;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.service.namespace.QName;
import org.alfresco.util.ParameterCheck;

/**
 *
 * @author Axel Faust
 */
public class NodeURLConnection extends URLConnection
{

    protected final NodeService nodeService;

    protected final ContentService contentService;

    protected final NodeRef nodeRef;

    protected final QName contentPropertyQName;

    protected transient long contentLength = -1;

    protected transient long lastModified = -1;

    public NodeURLConnection(final URL url, final NodeService nodeService, final ContentService contentService, final NodeRef nodeRef)
    {
        this(url, nodeService, contentService, nodeRef, ContentModel.PROP_CONTENT);
    }

    public NodeURLConnection(final URL url, final NodeService nodeService, final ContentService contentService, final NodeRef nodeRef,
            final QName contentPropertyQName)
    {
        super(url);

        ParameterCheck.mandatory("nodeService", nodeService);
        ParameterCheck.mandatory("contentService", contentService);
        ParameterCheck.mandatory("nodeRef", nodeRef);
        ParameterCheck.mandatory("contentPropertyQName", contentPropertyQName);

        this.nodeService = nodeService;
        this.contentService = contentService;
        this.nodeRef = nodeRef;
        this.contentPropertyQName = contentPropertyQName;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        if (!this.connected)
        {
            final ContentReader reader = this.contentService.getReader(this.nodeRef, this.contentPropertyQName);
            if (reader == null || !reader.exists())
            {
                throw new IOException("Node has no content");
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
        if (this.contentLength == -1)
        {
            final ContentReader reader = this.contentService.getReader(this.nodeRef, this.contentPropertyQName);
            this.contentLength = reader != null && reader.exists() ? reader.getSize() : -1;
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
            final ContentReader reader = this.contentService.getReader(this.nodeRef, this.contentPropertyQName);
            if (reader != null && reader.exists())
            {
                this.lastModified = reader.getLastModified();
            }
            else
            {
                // no content available now and we don't expect any to magically appear
                this.lastModified = 0;
            }
        }
        return this.lastModified;
    }

    /**
     * {@inheritDoc}
     */
    @SuppressWarnings("resource")
    @Override
    public InputStream getInputStream() throws IOException
    {
        this.connect();

        final ContentReader reader = this.contentService.getReader(this.nodeRef, this.contentPropertyQName);
        if (reader == null || !reader.exists())
        {
            throw new IOException("Node has no content");
        }

        // TODO Need to compensate StrictScriptEnforcingSourceInputStream adding to script content to support Nashorn cache
        final InputStream contentInputStream = reader.getContentInputStream();
        final InputStream result;
        if (reader.getEncoding() != null)
        {
            result = new StrictScriptEnforcingSourceInputStream(contentInputStream, Charset.forName(reader.getEncoding()));
        }
        else
        {
            // this assumes UTF-8
            result = new StrictScriptEnforcingSourceInputStream(contentInputStream);
        }

        return result;
    }
}
