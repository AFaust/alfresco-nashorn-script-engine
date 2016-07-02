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
import java.lang.reflect.Field;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;

import org.alfresco.repo.transaction.RetryingTransactionHelper;
import org.alfresco.service.cmr.repository.ContentService;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.util.ParameterCheck;
import org.springframework.extensions.webscripts.ScriptContent;

/**
 * @author Axel Faust
 */
public class WebScriptURLStreamHandler extends URLStreamHandler
{

    private static final String CLASSPATH_PATH_DESCRIPTION_PREFIX = "classpath*:";

    protected final ScriptContent scriptContent;

    protected final NodeService nodeService;

    protected final ContentService contentService;

    protected final RetryingTransactionHelper retryingTransactionHelper;

    public WebScriptURLStreamHandler(final ScriptContent scriptContent, final NodeService nodeService, final ContentService contentService,
            final RetryingTransactionHelper retryingTransactionHelper)
    {
        ParameterCheck.mandatory("scriptContent", scriptContent);
        ParameterCheck.mandatory("nodeService", nodeService);
        ParameterCheck.mandatory("contentService", contentService);
        ParameterCheck.mandatory("retryingTransactionHelper", retryingTransactionHelper);

        this.scriptContent = scriptContent;
        this.nodeService = nodeService;
        this.contentService = contentService;
        this.retryingTransactionHelper = retryingTransactionHelper;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL url) throws IOException
    {
        final NodeRef scriptNode = this.tryGetNodeRef();
        URLConnection connection;

        if (scriptNode != null)
        {
            connection = new NodeURLConnection(url, this.nodeService, this.contentService, scriptNode);
        }
        else
        {
            // unfortunately no ScriptContent implementation exposes modified/size metadata, so we have to resort to path-check to try
            // and get to this ourselves

            final String pathDescription = WebScriptURLStreamHandler.this.scriptContent.getPathDescription();
            if (pathDescription.startsWith(CLASSPATH_PATH_DESCRIPTION_PREFIX))
            {
                connection = new AlfrescoClasspathURLConnection(new URL("raw-classpath", null, -1,
                        pathDescription.substring(CLASSPATH_PATH_DESCRIPTION_PREFIX.length()), this), null, false, null);
            }
            else
            {
                connection = new WebScriptURLConnection(url, this.scriptContent);
            }
        }
        return connection;
    }

    protected NodeRef tryGetNodeRef()
    {
        NodeRef result;
        try
        {
            // TODO Cache field for better performance
            final Field nodeRefField = this.scriptContent.getClass().getDeclaredField("nodeRef");
            nodeRefField.setAccessible(true);
            result = (NodeRef) nodeRefField.get(this.scriptContent);
        }
        catch (final IllegalAccessException | NoSuchFieldException e)
        {
            result = null;
        }

        return result;
    }
}
