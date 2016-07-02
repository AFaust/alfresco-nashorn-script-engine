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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.alfresco.repo.transaction.RetryingTransactionHelper;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.util.ParameterCheck;
import org.alfresco.util.PropertyCheck;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.extensions.webscripts.MultiScriptLoader;
import org.springframework.extensions.webscripts.ScriptContent;
import org.springframework.extensions.webscripts.ScriptLoader;
import org.springframework.extensions.webscripts.SearchPath;

import de.axelfaust.alfresco.nashorn.repo.processor.ResettableScriptProcessorElement;

/**
 * @author Axel Faust
 */
public class WebScriptURLStreamHandler extends URLStreamHandler implements InitializingBean, DisposableBean,
        ResettableScriptProcessorElement
{

    private static final List<String> SUFFIX_PRECEDENCE_LIST = Arrays.asList(null, ".nashornjs", ".js");

    private static final String CLASSPATH_PATH_DESCRIPTION_PREFIX = "classpath*:";

    protected Registry registry;

    protected NodeService nodeService;

    protected SearchPath searchPath;

    protected RetryingTransactionHelper retryingTransactionHelper;

    protected MultiScriptLoader scriptLoader;

    protected final Map<String, ScriptFile> scriptHandles = new HashMap<String, ScriptFile>();

    protected final ThreadLocal<Map<URL, ScriptContent>> boundScriptContents = new ThreadLocal<Map<URL, ScriptContent>>()
    {

        /**
         * {@inheritedDoc}
         */
        @Override
        protected Map<URL, ScriptContent> initialValue()
        {
            return new HashMap<URL, ScriptContent>();
        }
    };

    /**
     * {@inheritDoc}
     */
    @Override
    public void afterPropertiesSet()
    {
        PropertyCheck.mandatory(this, "nodeService", this.nodeService);
        PropertyCheck.mandatory(this, "searchPath", this.searchPath);
        PropertyCheck.mandatory(this, "retryingTransactionHelper", this.retryingTransactionHelper);

        PropertyCheck.mandatory(this, "registry", this.registry);

        this.registry.register(this);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void destroy()
    {
        this.reset();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void reset()
    {
        this.scriptHandles.values().forEach(x -> x.reset());
    }

    /**
     * @param registry
     *            the registry to set
     */
    public void setRegistry(final Registry registry)
    {
        this.registry = registry;
    }

    /**
     * @param nodeService
     *            the nodeService to set
     */
    public void setNodeService(final NodeService nodeService)
    {
        this.nodeService = nodeService;
    }

    /**
     * @param searchPath
     *            the searchPath to set
     */
    public void setSearchPath(final SearchPath searchPath)
    {
        this.searchPath = searchPath;
    }

    /**
     * @param retryingTransactionHelper
     *            the retryingTransactionHelper to set
     */
    public void setRetryingTransactionHelper(final RetryingTransactionHelper retryingTransactionHelper)
    {
        this.retryingTransactionHelper = retryingTransactionHelper;
    }

    /**
     * Binds an URL to a script content to avoid re-resolving when {@link #openConnection(URL) opening the connection}.
     *
     * @param url
     *            the URL of the script
     * @param scriptContent
     *            the pre-resolved script content
     */
    public void bindScriptContent(final URL url, final ScriptContent scriptContent)
    {
        ParameterCheck.mandatory("url", url);
        ParameterCheck.mandatory("scriptContent", scriptContent);
        this.boundScriptContents.get().put(url, scriptContent);
    }

    /**
     * Resolves a module ID to a script content.
     *
     * @param moduleId
     *            the module ID to resolve
     * @return the resolved script content or {@code null} if it could not be resolved
     */
    public ScriptContent resolveScriptContent(final String moduleId)
    {
        ParameterCheck.mandatoryString("moduleId", moduleId);

        // lazy init since we might have only partially initialized searchPath during afterPropertiesSet
        if (this.scriptLoader == null)
        {
            final List<ScriptLoader> loaders = new ArrayList<ScriptLoader>();
            this.searchPath.getStores().forEach(x -> loaders.add(x.getScriptLoader()));
            this.scriptLoader = new MultiScriptLoader(loaders.toArray(new ScriptLoader[0]));
        }

        ScriptContent scriptContent = null;
        for (final String suffix : SUFFIX_PRECEDENCE_LIST)
        {
            String script;
            if (suffix != null)
            {
                script = moduleId + suffix;
            }
            else
            {
                script = moduleId;
            }

            scriptContent = this.scriptLoader.getScript(script);
            if (scriptContent != null)
            {
                break;
            }
        }

        return scriptContent;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL url) throws IOException
    {
        ScriptContent scriptContent = this.boundScriptContents.get().get(url);
        if (scriptContent == null)
        {
            final String moduleId = url.getPath();

            scriptContent = this.resolveScriptContent(moduleId);

            if (scriptContent == null)
            {
                throw new IOException("Script " + url + " does not exist");
            }
        }
        else
        {
            this.boundScriptContents.get().remove(url);
        }

        ScriptFile scriptFile;
        final String pathDescription = scriptContent.getPathDescription();
        if (pathDescription.startsWith(CLASSPATH_PATH_DESCRIPTION_PREFIX))
        {
            final String path = pathDescription.substring(CLASSPATH_PATH_DESCRIPTION_PREFIX.length());
            final String lookup = "classpath:" + path;
            scriptFile = this.scriptHandles.get(lookup);
            if (scriptFile == null)
            {
                scriptFile = new ClasspathScriptFile(path);
                this.scriptHandles.put(lookup, scriptFile);
            }
            // no need to check scriptFile.exists() since the scriptLoader found it to be existing
        }
        else
        {
            final NodeRef scriptNode = this.tryGetNodeRef(scriptContent);
            if (scriptNode != null)
            {
                final String lookup = "node:" + scriptNode;
                scriptFile = this.scriptHandles.get(lookup);
                if (scriptFile == null)
                {
                    scriptFile = new NodeScriptContentFile(scriptNode, scriptContent, this.nodeService, this.retryingTransactionHelper);
                    this.scriptHandles.put(lookup, scriptFile);
                }
            }
            else
            {
                scriptFile = new ScriptContentFile(scriptContent);
            }
        }

        return new ScriptFileURLConnection(url, scriptFile);
    }

    protected NodeRef tryGetNodeRef(final ScriptContent scriptContent)
    {
        NodeRef result;
        try
        {
            // TODO Cache field for better performance
            final Field nodeRefField = scriptContent.getClass().getDeclaredField("nodeRef");
            nodeRefField.setAccessible(true);
            result = (NodeRef) nodeRefField.get(scriptContent);
        }
        catch (final IllegalAccessException | NoSuchFieldException e)
        {
            result = null;
        }

        return result;
    }
}
