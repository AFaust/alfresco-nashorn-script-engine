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
import java.nio.charset.StandardCharsets;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.Collections;
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

import org.alfresco.error.AlfrescoRuntimeException;
import org.alfresco.repo.jscript.ClasspathScriptLocation;
import org.alfresco.repo.processor.BaseProcessor;
import org.alfresco.service.cmr.module.ModuleDependency;
import org.alfresco.service.cmr.module.ModuleDetails;
import org.alfresco.service.cmr.module.ModuleService;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.ScriptLocation;
import org.alfresco.service.cmr.repository.ScriptProcessor;
import org.alfresco.service.cmr.repository.StoreRef;
import org.alfresco.service.namespace.NamespaceService;
import org.alfresco.service.namespace.QName;
import org.alfresco.util.MD5;
import org.alfresco.util.Pair;
import org.alfresco.util.ParameterCheck;
import org.alfresco.util.PropertyCheck;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.core.io.Resource;

import de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLConnection;

/**
 * @author Axel Faust
 */
public class NashornScriptProcessor extends BaseProcessor implements ScriptProcessor, InitializingBean, ApplicationContextAware
{

    public static final List<String> NASHORN_GLOBAL_PROPERTIES_TO_ALWAYS_REMOVE = Collections.unmodifiableList(Arrays.asList("load",
            "loadWithNewGlobal", "exit", "quit"));

    private static final Logger LOGGER = LoggerFactory.getLogger(NashornScriptProcessor.class);

    private static final String _PRELOAD_MODULE_FIELD = "_preloadModule";

    private static final String CONTEXT_UUID_FIELD = "_scriptContextUUID";

    private static final String SCRIPT_AMD = "amd.js";

    private static final String SCRIPE_AMD_SCRIPT_RUNNER = "amd-script-runner.js";

    private static final int DEFAULT_SCRIPT_CONTEXT_WARMUP_COUNT = 10;

    protected ScriptEngine engine;

    protected NamespaceService namespaceService;

    protected ModuleService moduleService;

    protected Properties globalProperties;

    protected Resource amdConfig;

    protected String nashornGlobalPropertiesToRemove;

    protected final ReentrantReadWriteLock scriptContextLock = new ReentrantReadWriteLock(true);

    protected final List<ScriptContext> reusableScriptContexts = new LinkedList<ScriptContext>();

    protected final Set<String> validScriptContexts = new HashSet<String>();

    protected ApplicationContext applicationContext;

    protected int scriptContextWarmupCount = DEFAULT_SCRIPT_CONTEXT_WARMUP_COUNT;

    protected boolean executeArbitraryScriptStringsAsSecure = false;

    /**
     * {@inheritDoc}
     */
    @Override
    public void setApplicationContext(final ApplicationContext applicationContext) throws BeansException
    {
        this.applicationContext = applicationContext;
    }

    /**
     * @param engine
     *            the engine to set
     */
    public void setEngine(final ScriptEngine engine)
    {
        this.engine = engine;
    }

    /**
     * @param namespaceService
     *            the namespaceService to set
     */
    public void setNamespaceService(final NamespaceService namespaceService)
    {
        this.namespaceService = namespaceService;
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
     * @param amdConfig
     *            the amdConfig to set
     */
    public void setAmdConfig(final Resource amdConfig)
    {
        this.amdConfig = amdConfig;
    }

    /**
     * @param nashornGlobalPropertiesToRemove
     *            the nashornGlobalPropertiesToRemove to set
     */
    public void setNashornGlobalPropertiesToRemove(final String nashornGlobalPropertiesToRemove)
    {
        this.nashornGlobalPropertiesToRemove = nashornGlobalPropertiesToRemove;
    }

    /**
     * @param scriptContextWarmupCount
     *            the scriptContextWarmupCount to set
     */
    public void setScriptContextWarmupCount(final int scriptContextWarmupCount)
    {
        this.scriptContextWarmupCount = scriptContextWarmupCount;
    }

    /**
     * @param executeArbitraryScriptStringsAsSecure
     *            the executeArbitraryScriptStringsAsSecure to set
     */
    public void setExecuteArbitraryScriptStringsAsSecure(final boolean executeArbitraryScriptStringsAsSecure)
    {
        this.executeArbitraryScriptStringsAsSecure = executeArbitraryScriptStringsAsSecure;
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
        PropertyCheck.mandatory(this, "amdConfig", this.amdConfig);

        super.register();

        // this will likely be pointless because web script processor triggers reset of ALL script processors
        // but we should not assume this and still prepare for decent "first script" performance
        // (and web script processor should not reset script processor just for its internal registry setup)
        // TODO Delay until context refresh and potentially outsource to background thread
        this.prepareReusableScriptContexts();
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
            result = this.executeAMDLoadableScript((AMDLoadableScript) location, model);
        }
        else if (location instanceof ClasspathScriptLocation)
        {
            final AMDLoadableScript script = new SimpleAMDLoadableScript("classpath", location.getPath());
            result = this.executeAMDLoadableScript(script, model);
        }
        else
        {
            CallerProvidedURLConnection.registerCallerProvidedScript(location);
            try
            {
                final AMDLoadableScript script = new SimpleAMDLoadableScript("callerProvided", location.getPath());
                result = this.executeAMDLoadableScript(script, model);
            }
            finally
            {
                CallerProvidedURLConnection.clearCallerProvidedScript();
            }
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object execute(final NodeRef nodeRef, final QName contentProp, final Map<String, Object> model)
    {
        ParameterCheck.mandatory("nodeRef", nodeRef);
        ParameterCheck.mandatory("contentProp", contentProp);

        final StringBuilder moduleIdBuilder = new StringBuilder();
        final StoreRef storeRef = nodeRef.getStoreRef();
        moduleIdBuilder.append(storeRef.getProtocol());
        moduleIdBuilder.append('/');
        moduleIdBuilder.append(storeRef.getIdentifier());
        moduleIdBuilder.append('/');
        moduleIdBuilder.append(nodeRef.getId());
        moduleIdBuilder.append('/');
        moduleIdBuilder.append(contentProp.toPrefixString(this.namespaceService).replaceFirst(":", "_"));

        final AMDLoadableScript script = new SimpleAMDLoadableScript("node", moduleIdBuilder.toString());
        final Object result = this.executeAMDLoadableScript(script, model);

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object execute(final String location, final Map<String, Object> model)
    {
        ParameterCheck.mandatoryString("location", location);

        final AMDLoadableScript script = new SimpleAMDLoadableScript("classpath", location);
        final Object result = this.executeAMDLoadableScript(script, model);

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object executeString(final String scriptStr, final Map<String, Object> model)
    {
        ParameterCheck.mandatoryString("script", scriptStr);

        CallerProvidedURLConnection.registerCallerProvidedScript(scriptStr, this.executeArbitraryScriptStringsAsSecure);
        try
        {
            final String location = MD5.Digest(scriptStr.getBytes(StandardCharsets.UTF_8));
            final AMDLoadableScript script = new SimpleAMDLoadableScript("callerProvided", location);
            final Object result = this.executeAMDLoadableScript(script, model);
            return result;
        }
        finally
        {
            CallerProvidedURLConnection.clearCallerProvidedScript();
        }
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

        // TODO Outsource to background thread
        this.prepareReusableScriptContexts();
    }

    protected void prepareReusableScriptContexts()
    {
        if (this.scriptContextWarmupCount > 0)
        {
            LOGGER.info("Creating {} initial reusable script contexts", Integer.valueOf(this.scriptContextWarmupCount));
            this.scriptContextLock.writeLock().lock();
            try
            {
                for (int idx = 0; idx < this.scriptContextWarmupCount; idx++)
                {
                    final ScriptContext context = this.initScriptContext();
                    final String uuid = String.valueOf(context.getAttribute(CONTEXT_UUID_FIELD));
                    this.validScriptContexts.add(uuid);
                    this.reusableScriptContexts.add(context);
                }
            }
            catch (final ScriptException sex)
            {
                throw new AlfrescoRuntimeException("Error creating initial reusable script contexts", sex);
            }
            finally
            {
                this.scriptContextLock.writeLock().unlock();
            }
        }
    }

    protected Object executeAMDLoadableScript(final AMDLoadableScript script, final Map<String, Object> model)
    {
        try
        {
            final ScriptContext ctxt = this.obtainScriptContext();
            try
            {
                LOGGER.debug("Executing AMD-loadable script {}", script);
                // TODO Potentially restrict access only to AMDLoadableScript API
                ctxt.setAttribute("_loadableModule", script, ScriptContext.GLOBAL_SCOPE);
                ctxt.setAttribute("_argumentModel", model, ScriptContext.GLOBAL_SCOPE);

                // unique object reference as key for current execution (may be used in modules for execution local caching
                ctxt.setAttribute("_executionKey", new Object(), ScriptContext.GLOBAL_SCOPE);

                final URL resource = NashornScriptProcessor.class.getResource(SCRIPE_AMD_SCRIPT_RUNNER);
                final Object scriptResult = this.executeScriptFromResource(resource, ctxt);

                LOGGER.debug("Return value of AMD-loadable script {}: {}", script, scriptResult);

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
            throw new org.alfresco.scripts.ScriptException("Error executing AMD-loadable script", se);
        }
    }

    protected ScriptContext obtainScriptContext() throws ScriptException
    {
        ScriptContext context;

        this.scriptContextLock.readLock().lock();
        try
        {
            LOGGER.trace("Obtaining script context - {} reusable contexts available", Integer.valueOf(this.reusableScriptContexts.size()));
            context = this.reusableScriptContexts.isEmpty() ? null : this.reusableScriptContexts.remove(0);
        }
        finally
        {
            this.scriptContextLock.readLock().unlock();
        }

        if (context == null)
        {
            context = this.initScriptContext();

            final String uuid = String.valueOf(context.getAttribute(CONTEXT_UUID_FIELD));
            this.scriptContextLock.writeLock().lock();
            try
            {
                this.validScriptContexts.add(uuid);
            }
            finally
            {
                this.scriptContextLock.writeLock().unlock();
            }
        }

        return context;
    }

    protected void returnScriptContext(final ScriptContext ctxt)
    {
        final String uuid = String.valueOf(ctxt.getAttribute(CONTEXT_UUID_FIELD));
        boolean returnContext = true;

        this.scriptContextLock.readLock().lock();
        try
        {
            returnContext = this.validScriptContexts.contains(uuid);
        }
        finally
        {
            this.scriptContextLock.readLock().unlock();
        }

        if (returnContext)
        {
            LOGGER.trace("Clearing re-usable script context {}", uuid);

            // clear all data left at this stage
            ctxt.getBindings(ScriptContext.GLOBAL_SCOPE).clear();

            // remove any potentially added non-default global property
            final Bindings engineBindings = ctxt.getBindings(ScriptContext.ENGINE_SCOPE);
            for (final String key : engineBindings.keySet())
            {
                // we define the UUID field so we keep it
                if (!CONTEXT_UUID_FIELD.equals(key))
                {
                    engineBindings.remove(key);
                }
            }

            LOGGER.debug("Returning reusable script context {}", uuid);
            this.scriptContextLock.writeLock().lock();
            try
            {
                // double check
                returnContext = this.validScriptContexts.contains(uuid);
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
        else
        {
            LOGGER.debug("Discarding reusable script context {}", uuid);
        }
    }

    protected ScriptContext initScriptContext() throws ScriptException
    {
        final String uuid = UUID.randomUUID().toString();
        LOGGER.debug("Initialising new script context {}", uuid);
        final ScriptContext ctxt = new SimpleScriptContext();

        // if possible, we'd like to reuse this over many invocations
        final Bindings engineBindings = this.engine.createBindings();
        ctxt.setBindings(engineBindings, ScriptContext.ENGINE_SCOPE);

        final Bindings globalBindings = new SimpleBindings();
        ctxt.setBindings(globalBindings, ScriptContext.GLOBAL_SCOPE);

        // only available during initialisation
        globalBindings.put("applicationContext", this.applicationContext);

        URL resource;

        LOGGER.trace("Executing bootstrap scripts");

        // 1) AMD loader to be used for all scripts apart from bootstrap
        resource = NashornScriptProcessor.class.getResource(SCRIPT_AMD);
        this.executeScriptFromResource(resource, ctxt);

        // 2) the nashorn loader plugin so we can control access to globals
        this.preloadAMDModule(ctxt, "loaderMetaLoader", "nashorn");

        // remove Nashorn globals
        for (final String property : NASHORN_GLOBAL_PROPERTIES_TO_ALWAYS_REMOVE)
        {
            engineBindings.remove(property);
        }

        if (this.nashornGlobalPropertiesToRemove != null)
        {
            for (final String property : this.nashornGlobalPropertiesToRemove.split(","))
            {
                engineBindings.remove(property.trim());
            }
        }

        globalBindings.put("processorExtensions", this.processorExtensions);

        LOGGER.trace("Checking for extension scripts");

        this.initScriptContextExtensions(ctxt);

        LOGGER.trace("Finalizing script context");

        try
        {
            resource = this.amdConfig.getURL();
            this.executeScriptFromResource(resource, ctxt);
        }
        catch (final IOException ioex)
        {
            throw new ScriptException(ioex);
        }

        ctxt.setAttribute(CONTEXT_UUID_FIELD, uuid, ScriptContext.ENGINE_SCOPE);

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

            LOGGER.trace("Checking for extension scripts in module {}", moduleId);

            // check for module script context extensions
            final String extensionScriptsKey = MessageFormat.format("nashornJavaScriptProcessor.{0}.extensionScripts", moduleId);
            final Object extensionScriptsValue = this.globalProperties.get(extensionScriptsKey);
            if (extensionScriptsValue instanceof String && !((String) extensionScriptsValue).trim().isEmpty())
            {
                final String[] scriptNames = ((String) extensionScriptsValue).trim().split("\\s*,\\s*");

                LOGGER.debug("Processing {} extension scripts in module {}", Integer.valueOf(scriptNames.length), moduleId);

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
                        this.preloadAMDModule(ctxt, loaderNameValue, moduleIdValue);
                    }
                }
            }

            // mark as executed
            moduleExecution.setSecond(Boolean.TRUE);
        }
    }

    protected void preloadAMDModule(final ScriptContext ctxt, final Object loaderNameValue, final Object moduleIdValue)
            throws ScriptException
    {
        final String fullModuleId = MessageFormat.format("{0}!{1}", loaderNameValue, moduleIdValue);

        LOGGER.trace("Pre-loading module {}", fullModuleId);

        ctxt.setAttribute(_PRELOAD_MODULE_FIELD, fullModuleId, ScriptContext.GLOBAL_SCOPE);
        ctxt.setAttribute(ScriptEngine.FILENAME, "preload", ScriptContext.ENGINE_SCOPE);
        try
        {
            this.engine.eval("define.preload(_preloadModule);", ctxt);
        }
        catch (final ScriptException sex)
        {
            LOGGER.error("Error preloading module {}", fullModuleId);
            throw sex;
        }
        finally
        {
            ctxt.removeAttribute(_PRELOAD_MODULE_FIELD, ScriptContext.GLOBAL_SCOPE);
            LOGGER.trace("Pre-loading of module {} completed", fullModuleId);
        }
    }

    protected Object executeScriptFromResource(final URL resource, final ScriptContext ctxt) throws ScriptException
    {
        LOGGER.trace("Executing script from resource {}", resource);
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
        finally
        {
            LOGGER.trace("Execution of script from resource {} completed", resource);
        }
    }
}
