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
package de.axelfaust.alfresco.nashorn.repo.processor;

import java.io.IOException;
import java.io.Reader;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import javax.script.Bindings;
import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.script.SimpleBindings;

import jdk.nashorn.api.scripting.URLReader;

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

import de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLStreamHandler;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class NashornScriptProcessor extends BaseProcessor implements ScriptProcessor, InitializingBean, ApplicationContextAware,
        ResettableScriptProcessorElement.Registry
{

    public static final List<String> NASHORN_GLOBAL_PROPERTIES_TO_ALWAYS_REMOVE = Collections.unmodifiableList(Arrays.asList("load",
            "loadWithNewGlobal", "exit", "quit"));

    private static final Logger LOGGER = LoggerFactory.getLogger(NashornScriptProcessor.class);

    private static final String SCRIPT_SIMPLE_LOGGER = "simple-logger.js";

    private static final String SCRIPT_AMD = "amd.js";

    private static final String SCRIPT_NO_SUCH_PROPERTY = "noSuchProperty.js";

    private static final String SCRIPE_AMD_SCRIPT_RUNNER = "amd-script-runner.js";

    private static final ThreadLocal<Boolean> inEngineContextInitialization = new ThreadLocal<Boolean>();

    /**
     * Checks if the current thread is currently involved in script engine context initialization.
     *
     * @return {@code true} if the current thread is initializing a new script engine context
     */
    public static boolean isInEngineContextInitialization()
    {
        final boolean result = Boolean.TRUE.equals(inEngineContextInitialization.get());
        return result;
    }

    protected ScriptEngine engine;

    protected NamespaceService namespaceService;

    protected ModuleService moduleService;

    protected Properties globalProperties;

    protected Resource amdConfig;

    protected String nashornGlobalPropertiesToRemove;

    protected ApplicationContext applicationContext;

    protected boolean executeArbitraryScriptStringsAsSecure = false;

    protected AMDModulePreloader amdPreloader;

    protected AMDScriptRunner amdRunner;

    protected final ReentrantReadWriteLock initialisationStateLock = new ReentrantReadWriteLock(true);

    protected final List<ResettableScriptProcessorElement> resettableProcessorElements = new ArrayList<ResettableScriptProcessorElement>();

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

        this.initialisationStateLock.writeLock().lock();
        try
        {
            this.initScriptContext();
        }
        catch (final ScriptException sex)
        {
            throw new org.alfresco.scripts.ScriptException("Error initialising script processor", sex);
        }
        finally
        {
            this.initialisationStateLock.writeLock().unlock();
        }

        super.register();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void register(final ResettableScriptProcessorElement element)
    {
        if (element != null)
        {
            this.resettableProcessorElements.add(element);
        }
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
            CallerProvidedURLStreamHandler.registerCallerProvidedScript(location);
            try
            {
                final AMDLoadableScript script = new SimpleAMDLoadableScript("callerProvided", location.getPath());
                result = this.executeAMDLoadableScript(script, model);
            }
            finally
            {
                CallerProvidedURLStreamHandler.clearCallerProvidedScript();
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

        CallerProvidedURLStreamHandler.registerCallerProvidedScript(scriptStr, this.executeArbitraryScriptStringsAsSecure);
        try
        {
            final String location = MD5.Digest(scriptStr.getBytes(StandardCharsets.UTF_8));
            final AMDLoadableScript script = new SimpleAMDLoadableScript("callerProvided", location);
            final Object result = this.executeAMDLoadableScript(script, model);
            return result;
        }
        finally
        {
            CallerProvidedURLStreamHandler.clearCallerProvidedScript();
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void reset()
    {
        this.initialisationStateLock.writeLock().lock();
        try
        {
            this.initScriptContext();
        }
        catch (final ScriptException sex)
        {
            throw new org.alfresco.scripts.ScriptException("Error resetting script processor", sex);
        }
        finally
        {
            this.initialisationStateLock.writeLock().unlock();
        }

        this.resettableProcessorElements.forEach(x -> x.reset());
    }

    protected Object executeAMDLoadableScript(final AMDLoadableScript script, final Map<String, Object> model)
    {
        this.initialisationStateLock.readLock().lock();
        try
        {
            try (final NashornScriptModel scriptModel = NashornScriptModel.openModel())
            {
                LOGGER.debug("Executing AMD-loadable script {}", script);
                final String moduleId;
                if (script.getLoaderName() != null && !script.getLoaderName().isEmpty())
                {
                    moduleId = MessageFormat.format("{0}!{1}", script.getLoaderName(), script.getScriptModuleId());
                }
                else
                {
                    moduleId = script.getScriptModuleId();
                }

                try
                {
                    final Object scriptResult = this.amdRunner.run(moduleId, model);
                    LOGGER.debug("Return value of AMD-loadable script {}: {}", script, scriptResult);

                    // TODO Convert / unwrap scriptResult for Java (could also be done in runner)
                    return scriptResult;
                }
                catch (final RuntimeException ex)
                {
                    LOGGER.debug("Error executing AMD-loadable script", ex);
                    throw ex;
                }
            }
        }
        finally
        {
            this.initialisationStateLock.readLock().unlock();
        }
    }

    protected void initScriptContext() throws ScriptException
    {
        final Bindings oldEngineBindings = this.engine.getBindings(ScriptContext.ENGINE_SCOPE);
        final AMDModulePreloader oldPreloader = this.amdPreloader;
        final AMDScriptRunner oldAMDRunner = this.amdRunner;

        LOGGER.debug("Initializing new script context");

        inEngineContextInitialization.set(Boolean.TRUE);
        try (NashornScriptModel model = NashornScriptModel.openModel())
        {
            // create new (unpolluted) engine bindings
            final Bindings engineBindings = this.engine.createBindings();
            this.engine.setBindings(engineBindings, ScriptContext.ENGINE_SCOPE);

            final Bindings globalBindings = new SimpleBindings();
            this.engine.setBindings(globalBindings, ScriptContext.GLOBAL_SCOPE);

            // only available during initialisation
            globalBindings.put("applicationContext", this.applicationContext);

            LOGGER.debug("Executing bootstrap scripts");
            URL resource;

            // 1) simple logger facade for SLF4J
            LOGGER.debug("Bootstrapping simple logger");
            resource = NashornScriptProcessor.class.getResource(SCRIPT_SIMPLE_LOGGER);
            this.executeScriptFromResource(resource);

            // 2) AMD loader and noSuchProperty to be used for all scripts apart from bootstrap
            LOGGER.debug("Setting up AMD");
            resource = NashornScriptProcessor.class.getResource(SCRIPT_AMD);
            this.executeScriptFromResource(resource);

            resource = NashornScriptProcessor.class.getResource(SCRIPT_NO_SUCH_PROPERTY);
            this.executeScriptFromResource(resource);

            final Object define = this.engine.get("define");
            this.amdPreloader = ((Invocable) this.engine).getInterface(define, AMDModulePreloader.class);

            // 3) the nashorn loader plugin so we can control access to globals
            LOGGER.debug("Setting up nashorn AMD loader");
            this.preloadAMDModule("loaderMetaLoader", "nashorn", "nashorn");

            // 4) remove Nashorn globals
            LOGGER.debug("Removing disallowed Nashorn globals \"{}\" and \"{}\"", NASHORN_GLOBAL_PROPERTIES_TO_ALWAYS_REMOVE,
                    this.nashornGlobalPropertiesToRemove);
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

            // 5) Java extensions (must be picked up by modules before #9)
            globalBindings.put("processorExtensions", this.processorExtensions);

            // 6) AMD config
            LOGGER.debug("Applying AMD config \"{}\"", this.amdConfig);
            resource = this.amdConfig.getURL();
            this.executeScriptFromResource(resource);

            // 7) configured JavaScript base modules
            LOGGER.debug("Bootstrapping base modules");
            this.initScriptContextBaseModules(this.amdPreloader);

            // 8) configured JavaScript extension modules
            LOGGER.debug("Bootstrapping extension modules");
            this.initScriptContextExtensions(this.amdPreloader);

            // 9) remove any init data that shouldn't be publicly available
            globalBindings.clear();

            // 10) obtain the runner interface
            LOGGER.debug("Preparing AMD script runner");
            resource = NashornScriptProcessor.class.getResource(SCRIPE_AMD_SCRIPT_RUNNER);
            final Object scriptRunnerObj = this.executeScriptFromResource(resource);
            this.amdRunner = ((Invocable) this.engine).getInterface(scriptRunnerObj, AMDScriptRunner.class);

            LOGGER.info("New script context initialized");
        }
        catch (final Throwable t)
        {
            LOGGER.warn("Initialization of script context failed", t);

            // reset
            this.engine.setBindings(oldEngineBindings, ScriptContext.ENGINE_SCOPE);
            this.engine.getBindings(ScriptContext.GLOBAL_SCOPE).clear();
            this.amdPreloader = oldPreloader;
            this.amdRunner = oldAMDRunner;

            if (t instanceof RuntimeException)
            {
                throw (RuntimeException) t;
            }
            else if (t instanceof ScriptException)
            {
                throw (ScriptException) t;
            }
            else
            {
                throw new org.alfresco.scripts.ScriptException("Unknown error initializing script context - reset to previous state", t);
            }
        }
        finally
        {
            inEngineContextInitialization.remove();
        }
    }

    protected void initScriptContextBaseModules(final AMDModulePreloader amdPreloader) throws ScriptException
    {
        final Object extensionScriptsValue = this.globalProperties.get("nashornJavaScriptProcessor.baseScripts");
        if (extensionScriptsValue instanceof String && !((String) extensionScriptsValue).trim().isEmpty())
        {
            final String[] scriptNames = ((String) extensionScriptsValue).trim().split("\\s*,\\s*");

            LOGGER.debug("Processing {} base scripts", Integer.valueOf(scriptNames.length));

            for (final String scriptName : scriptNames)
            {
                final String modulePrefix = "nashornJavaScriptProcessor.baseScript." + scriptName;
                final String moduleIdKey = modulePrefix + ".moduleId";
                final String loaderNameKey = modulePrefix + ".loaderName";
                final String aliasModuleIdKey = modulePrefix + ".aliasModuleId";

                final Object moduleIdValue = this.globalProperties.get(moduleIdKey);
                final Object loaderNameValue = this.globalProperties.get(loaderNameKey);
                final Object aliasModuleIdValue = this.globalProperties.get(aliasModuleIdKey);

                if (moduleIdValue instanceof String && loaderNameValue instanceof String)
                {
                    this.preloadAMDModule(loaderNameValue, moduleIdValue, aliasModuleIdValue);
                }
            }
        }
    }

    protected void initScriptContextExtensions(final AMDModulePreloader amdPreloader) throws ScriptException
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
            this.initScriptContextExtensions(modules, module);
        }

        // TODO Load custom extensions outside of module context (i.e. definitions by customer in alfresco-global.properties)
    }

    protected void initScriptContextExtensions(final Map<String, Pair<ModuleDetails, Boolean>> modules, final ModuleDetails module)
            throws ScriptException
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
                    this.initScriptContextExtensions(modules, dependencyState.getFirst());
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
                    final String modulePrefix = MessageFormat.format("nashornJavaScriptProcessor.{0}.extensionScript.{1}", moduleId,
                            scriptName);
                    final String moduleIdKey = modulePrefix + ".moduleId";
                    final String loaderNameKey = modulePrefix + ".loaderName";
                    final String aliasModuleIdKey = modulePrefix + ".aliasModuleId";

                    final Object moduleIdValue = this.globalProperties.get(moduleIdKey);
                    final Object loaderNameValue = this.globalProperties.get(loaderNameKey);
                    final Object aliasModuleIdValue = this.globalProperties.get(aliasModuleIdKey);

                    if (moduleIdValue instanceof String && loaderNameValue instanceof String)
                    {
                        this.preloadAMDModule(loaderNameValue, moduleIdValue, aliasModuleIdValue);
                    }
                }
            }

            // mark as executed
            moduleExecution.setSecond(Boolean.TRUE);
        }
    }

    protected void preloadAMDModule(final Object loaderNameValue, final Object moduleIdValue, final Object aliasModuleIdValue)
            throws ScriptException
    {
        this.initialisationStateLock.readLock().lock();
        try
        {
            LOGGER.debug("Pre-loading module {}!{}", loaderNameValue, moduleIdValue);

            String call;
            if (aliasModuleIdValue != null)
            {
                call = MessageFormat.format("define.preload(''{0}!{1}'', ''{2}'');", loaderNameValue, moduleIdValue, aliasModuleIdValue);
            }
            else
            {
                call = MessageFormat.format("define.preload(''{0}!{1}'');", loaderNameValue, moduleIdValue);
            }

            try
            {
                // TODO Determine if it's possible to still use ScriptContext attributes in scripts called via extracted interfaces
                // TODO Determine why we can't get AMDModulePreloader interface for define.preload()
                // final ScriptObjectMirror define = (ScriptObjectMirror) this.engine.getContext().getAttribute("define");
                // define.callMember("preload", fullModuleId);
                // this.amdPreloader.preload(fullModuleId);
                this.engine.eval(call);
            }
            catch (final RuntimeException ex)
            {
                LOGGER.error("Error preloading module {}!{}", loaderNameValue, moduleIdValue);
                throw ex;
            }
        }
        finally
        {
            this.initialisationStateLock.readLock().unlock();
        }
    }

    protected Object executeScriptFromResource(final URL resource) throws ScriptException
    {
        this.initialisationStateLock.readLock().lock();
        try
        {
            LOGGER.debug("Executing script from resource {}", resource);
            try (Reader reader = new URLReader(resource))
            {
                this.engine.getContext().setAttribute(ScriptEngine.FILENAME, resource.toString(), ScriptContext.ENGINE_SCOPE);
                return this.engine.eval(reader);
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
        finally
        {
            this.initialisationStateLock.readLock().unlock();
        }
    }
}
