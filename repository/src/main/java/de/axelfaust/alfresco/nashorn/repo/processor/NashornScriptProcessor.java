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
package de.axelfaust.alfresco.nashorn.repo.processor;

import java.io.IOException;
import java.io.Reader;
import java.net.URL;
import java.text.MessageFormat;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.script.SimpleBindings;
import javax.script.SimpleScriptContext;

import jdk.nashorn.api.scripting.URLReader;

import org.alfresco.repo.processor.BaseProcessor;
import org.alfresco.service.cmr.module.ModuleDependency;
import org.alfresco.service.cmr.module.ModuleDetails;
import org.alfresco.service.cmr.module.ModuleService;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.ScriptLocation;
import org.alfresco.service.cmr.repository.ScriptProcessor;
import org.alfresco.service.namespace.QName;
import org.alfresco.util.Pair;
import org.alfresco.util.ParameterCheck;
import org.alfresco.util.PropertyCheck;
import org.springframework.beans.factory.InitializingBean;

import de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection;

/**
 * @author Axel Faust
 */
public class NashornScriptProcessor extends BaseProcessor implements ScriptProcessor, InitializingBean
{

    private static final String _PRELOAD_MODULE_FIELD = "_preloadModule";

    private static final String CONTEXT_UUID_FIELD = "_scriptContextUUID";

    protected ScriptEngine engine;

    protected ModuleService moduleService;

    protected Properties globalProperties;

    protected final ReentrantReadWriteLock scriptContextLock = new ReentrantReadWriteLock(true);

    protected final List<ScriptContext> reusableScriptContexts = new LinkedList<ScriptContext>();

    protected final Set<String> validScriptContexts = new HashSet<String>();

    /**
     * @param engine
     *            the engine to set
     */
    public void setEngine(final ScriptEngine engine)
    {
        this.engine = engine;
    }

    /**
     * @param moduleService
     *            the moduleService to set
     */
    public void setModuleService(final ModuleService moduleService)
    {
        this.moduleService = moduleService;
    }

    /**
     * @param globalProperties
     *            the globalProperties to set
     */
    public void setGlobalProperties(final Properties globalProperties)
    {
        this.globalProperties = globalProperties;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void afterPropertiesSet()
    {
        PropertyCheck.mandatory(this, "name", this.name);
        PropertyCheck.mandatory(this, "extension", this.extension);
        PropertyCheck.mandatory(this, "scriptService", this.scriptService);
        PropertyCheck.mandatory(this, "moduleService", this.moduleService);
        PropertyCheck.mandatory(this, "engine", this.engine);

        PropertyCheck.mandatory(this, "globalProperties", this.globalProperties);

        super.register();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object execute(final ScriptLocation location, final Map<String, Object> model)
    {
        ParameterCheck.mandatory("location", location);

        final Object result;
        if (location instanceof AMDLoadableScript)
        {
            result = this.executeAMDLodableScript((AMDLoadableScript) location, model);
        }
        else
        {
            // TODO
            result = null;
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object execute(final NodeRef nodeRef, final QName contentProp, final Map<String, Object> model)
    {
        // TODO Auto-generated method stub
        return null;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object execute(final String location, final Map<String, Object> model)
    {
        // TODO Auto-generated method stub
        return null;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object executeString(final String script, final Map<String, Object> model)
    {
        // TODO Auto-generated method stub
        return null;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void reset()
    {
        this.scriptContextLock.writeLock().lock();
        try
        {
            this.reusableScriptContexts.clear();
            this.validScriptContexts.clear();
        }
        finally
        {
            this.scriptContextLock.writeLock().unlock();
        }
    }

    protected Object executeAMDLodableScript(final AMDLoadableScript script, final Map<String, Object> model)
    {
        try
        {
            final ScriptContext ctxt = this.obtainScriptContext();
            try
            {
                // TODO Potentially restrict access only to AMDLoadableScript API
                ctxt.setAttribute("_loadableModule", script, ScriptContext.GLOBAL_SCOPE);
                ctxt.setAttribute("_argumentModel", model, ScriptContext.GLOBAL_SCOPE);

                final URL resource = NashornScriptProcessor.class.getResource("amd-execute-loadable-script.js");
                final Object scriptResult = this.executeScriptFromResource(resource, ctxt);

                // TODO Convert / unwrap scriptResult for Java
                return scriptResult;
            }
            finally
            {
                this.returnScriptContext(ctxt);
            }
        }
        catch (final ScriptException se)
        {
            throw new org.alfresco.scripts.ScriptException("", se);
        }
    }

    protected ScriptContext obtainScriptContext() throws ScriptException
    {
        ScriptContext context;
        URL resource;

        this.scriptContextLock.readLock().lock();
        try
        {
            context = this.reusableScriptContexts.isEmpty() ? null : this.reusableScriptContexts.remove(0);
        }
        finally
        {
            this.scriptContextLock.readLock().unlock();
        }

        if (context == null)
        {
            context = this.initScriptContext();

            this.scriptContextLock.writeLock().lock();
            try
            {
                this.validScriptContexts.add(String.valueOf(context.getAttribute(CONTEXT_UUID_FIELD)));
            }
            finally
            {
                this.scriptContextLock.writeLock().unlock();
            }
        }
        else
        {
            // reset
            resource = NashornScriptProcessor.class.getResource("scope-clear.js");
            this.executeScriptFromResource(resource, context);

            // clear all data left at this stage
            context.getBindings(ScriptContext.GLOBAL_SCOPE).clear();

        }

        // prepare scope
        resource = NashornScriptProcessor.class.getResource("scope-prepare.js");
        this.executeScriptFromResource(resource, context);

        return context;
    }

    protected void returnScriptContext(final ScriptContext ctxt)
    {
        final String uuid = String.valueOf(ctxt.getAttribute(CONTEXT_UUID_FIELD));
        boolean returnContext = true;

        this.scriptContextLock.readLock().lock();
        try
        {
            returnContext = !this.validScriptContexts.contains(uuid);
        }
        finally
        {
            this.scriptContextLock.readLock().unlock();
        }

        if (returnContext)
        {
            this.scriptContextLock.writeLock().lock();
            try
            {
                // double check
                returnContext = !this.validScriptContexts.contains(uuid);
                if (returnContext)
                {
                    this.reusableScriptContexts.add(ctxt);
                }
            }
            finally
            {
                this.scriptContextLock.writeLock().unlock();
            }
        }
    }

    protected ScriptContext initScriptContext() throws ScriptException
    {
        final ScriptContext ctxt = new SimpleScriptContext();

        // if possible, we'd like to reuse this over many invocations
        final Bindings engineBindings = this.engine.createBindings();
        ctxt.setBindings(engineBindings, ScriptContext.ENGINE_SCOPE);

        final Bindings globalBindings = new SimpleBindings();
        ctxt.setBindings(globalBindings, ScriptContext.GLOBAL_SCOPE);

        URL resource;

        // execute the most basic bootstrap scripts

        // AMD loader to be used for all scripts apart from bootstrap
        resource = NashornScriptProcessor.class.getResource("amd.js");
        this.executeScriptFromResource(resource, ctxt);

        // the root loader plugin so AMD loader can actually be used
        resource = AlfrescoClasspathURLConnection.class.getResource("classpath-loader.js");
        this.executeScriptFromResource(resource, ctxt);

        globalBindings.put("processorExtensions", this.processorExtensions);

        this.initScriptContextExtensions(ctxt);

        final String uuid = UUID.randomUUID().toString();
        ctxt.setAttribute(CONTEXT_UUID_FIELD, uuid, ScriptContext.ENGINE_SCOPE);

        // finalize the bootstrap
        resource = NashornScriptProcessor.class.getResource("complete-processor-init.js");
        this.executeScriptFromResource(resource, ctxt);

        // remove any init data that shouldn't be publicly available
        globalBindings.clear();

        return ctxt;
    }

    protected void initScriptContextExtensions(final ScriptContext ctxt) throws ScriptException
    {
        final Map<String, Pair<ModuleDetails, Boolean>> modules = new HashMap<String, Pair<ModuleDetails, Boolean>>();

        for (final ModuleDetails module : this.moduleService.getAllModules())
        {
            final String moduleId = module.getId();
            modules.put(moduleId, new Pair<>(module, Boolean.FALSE));

            for (final String alias : module.getAliases())
            {
                modules.put(alias, modules.get(moduleId));
            }
        }

        for (final ModuleDetails module : this.moduleService.getAllModules())
        {
            this.initScriptContextExtensions(ctxt, modules, module);
        }

        // TODO Load custom extensions outside of module context (i.e. definitions by customer in alfresco-global.properties)
    }

    protected void initScriptContextExtensions(final ScriptContext ctxt, final Map<String, Pair<ModuleDetails, Boolean>> modules,
            final ModuleDetails module) throws ScriptException
    {
        final String moduleId = module.getId();
        final Pair<ModuleDetails, Boolean> moduleExecution = modules.get(moduleId);
        if (!Boolean.TRUE.equals(moduleExecution.getSecond()))
        {
            // ensure module dependencies had their chance to init script context extensions first
            for (final ModuleDependency dependency : module.getDependencies())
            {
                final Pair<ModuleDetails, Boolean> dependencyState = modules.get(dependency.getDependencyId());
                if (dependencyState != null)
                {
                    // just recurse - will check execution state therein
                    this.initScriptContextExtensions(ctxt, modules, dependencyState.getFirst());
                }
                // else missing dependency - ModuleService should have failed startup
            }

            // check for module script context extensions
            final String extensionScriptsKey = MessageFormat.format("nashornJavaScriptProcessor.{0}.extensionScripts", moduleId);
            final Object extensionScriptsValue = this.globalProperties.get(extensionScriptsKey);
            if (extensionScriptsValue instanceof String && !((String) extensionScriptsValue).trim().isEmpty())
            {
                final String[] scriptNames = ((String) extensionScriptsValue).trim().split("\\s*,\\s*");

                for (final String scriptName : scriptNames)
                {
                    final String moduleIdKey = MessageFormat.format("nashornJavaScriptProcessor.{0}.extensionScript.{1}.moduleId",
                            moduleId, scriptName);
                    final String loaderNameKey = MessageFormat.format("nashornJavaScriptProcessor.{0}.extensionScript.{1}.loaderName",
                            moduleId, scriptName);

                    final Object moduleIdValue = this.globalProperties.get(moduleIdKey);
                    final Object loaderNameValue = this.globalProperties.get(loaderNameKey);

                    if (moduleIdValue instanceof String && loaderNameValue instanceof String)
                    {
                        final String fullModuleId = MessageFormat.format("{0}!{1}", loaderNameValue, moduleIdValue);
                        ctxt.setAttribute(_PRELOAD_MODULE_FIELD, fullModuleId, ScriptContext.GLOBAL_SCOPE);
                        ctxt.setAttribute(ScriptEngine.FILENAME, "preload-" + fullModuleId, ScriptContext.ENGINE_SCOPE);
                        try
                        {
                            this.engine.eval("define.preload(_preloadModule);", ctxt);
                        }
                        finally
                        {
                            ctxt.removeAttribute(_PRELOAD_MODULE_FIELD, ScriptContext.GLOBAL_SCOPE);
                        }
                    }
                }
            }

            // mark as executed
            moduleExecution.setSecond(Boolean.TRUE);
        }
    }

    protected Object executeScriptFromResource(final URL resource, final ScriptContext ctxt) throws ScriptException
    {
        try (@SuppressWarnings("restriction")
        Reader reader = new URLReader(resource))
        {
            ctxt.setAttribute(ScriptEngine.FILENAME, resource.toString(), ScriptContext.ENGINE_SCOPE);
            return this.engine.eval(reader, ctxt);
        }
        catch (final IOException e)
        {
            throw new ScriptException(e);
        }
    }
}
