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
package de.axelfaust.alfresco.nashorn.repo.web.scripts;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.alfresco.service.cmr.repository.ScriptService;
import org.alfresco.util.PropertyCheck;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.extensions.webscripts.MultiScriptLoader;
import org.springframework.extensions.webscripts.ScriptContent;
import org.springframework.extensions.webscripts.ScriptLoader;
import org.springframework.extensions.webscripts.ScriptProcessor;
import org.springframework.extensions.webscripts.SearchPath;
import org.springframework.extensions.webscripts.Store;
import org.springframework.extensions.webscripts.WebScriptException;

/**
 * @author Axel Faust
 */
public class RepositoryNashornScriptProcessor implements ScriptProcessor, InitializingBean
{

    protected ScriptService scriptService;

    protected ScriptLoader scriptLoader;

    protected SearchPath searchPath;

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void afterPropertiesSet()
    {
        PropertyCheck.mandatory(this, "scriptService", this.scriptService);
        PropertyCheck.mandatory(this, "searchPath", this.searchPath);

        this.reset();
    }

    /**
     * @param scriptService
     *            the scriptService to set
     */
    public void setScriptService(final ScriptService scriptService)
    {
        this.scriptService = scriptService;
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
     * {@inheritDoc}
     */
    @Override
    public ScriptContent findScript(final String path)
    {
        return this.scriptLoader.getScript(path);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object executeScript(final String path, final Map<String, Object> model)
    {
        // copied from RepositoryScriptProcessor - no need for differen approach
        // apparently this method is not even called by any client

        // locate script within web script stores
        final ScriptContent scriptContent = this.findScript(path);
        if (scriptContent == null)
        {
            throw new WebScriptException("Unable to locate script " + path);
        }
        // execute script
        return this.executeScript(scriptContent, model);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object executeScript(final ScriptContent location, final Map<String, Object> model)
    {
        return this.scriptService.executeScript("nashorn", new RepositoryScriptLocation(location), model);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object unwrapValue(final Object value)
    {
        // the existence of this method in the ScriptProcessor interface is humbug
        // script service should not leak internal script objects and clients should only use result not some passed in by-reference
        // structures

        // return same object
        return value;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void reset()
    {
        // copied from RepositoryScriptProcessor - no need for differen approach
        final List<ScriptLoader> loaders = new ArrayList<ScriptLoader>();
        for (final Store apiStore : this.searchPath.getStores())
        {
            final ScriptLoader loader = apiStore.getScriptLoader();
            if (loader == null)
            {
                throw new WebScriptException("Unable to retrieve script loader for Web Script store " + apiStore.getBasePath());
            }
            loaders.add(loader);
        }
        this.scriptLoader = new MultiScriptLoader(loaders.toArray(new ScriptLoader[loaders.size()]));
    }

}
