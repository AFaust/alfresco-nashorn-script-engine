/*
 * Copyright 2017 Axel Faust
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
package de.axelfaust.alfresco.nashorn.common.amd.core;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.amd.ScriptURLResolver;
import de.axelfaust.alfresco.nashorn.common.amd.modules.DefineFunction;
import de.axelfaust.alfresco.nashorn.common.amd.modules.RequireFunction;
import de.axelfaust.alfresco.nashorn.common.util.NashornUtils;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ModuleSystem
{

    /**
     *
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface TaggedCallerContextScriptUrlCallback<R>
    {

        /**
         * Executes this callback while a specifically script URL has been tagged as the caller for the purpose of all functionality
         * relying on the {@link ModuleSystem#getCallerContextScriptUrl() the context}.
         *
         * @return the result of the callback invocation if any
         */
        R executeForTaggedCallerContextScriptUrl();
    }

    @FunctionalInterface
    public static interface ModuleNormalisationHandle
    {

        String normalizeInCurrentContext(String moduleId);
    }

    private static final Logger LOGGER = LoggerFactory.getLogger(ModuleSystem.class);

    private static final ThreadLocal<List<Object>> TAGGED_CALLERS = new ThreadLocal<List<Object>>()
    {

        /**
         *
         * {@inheritDoc}
         */
        @Override
        protected List<Object> initialValue()
        {
            return new ArrayList<>();
        }
    };

    protected static final Pattern MODULE_NORMALIZED_ID_PATTERN = Pattern.compile("^([^!]+!)?([^!$]+)$");

    protected final ModuleRegistry moduleRegistry;

    protected final ModuleLoadService moduleLoadService;

    protected final JSObject requireFunction;

    protected final JSObject defineFunction;

    private final JSObject nativeObjectConstructor;

    public ModuleSystem(final ScriptURLResolver scriptUrlResolver, final JSObject nativeObjectConstructor,
            final JSObject isolatedScopeBuilder, final JSObject nashornLoader)
    {
        ParameterCheck.mandatory("scriptUrlResolver", scriptUrlResolver);
        ParameterCheck.mandatory("nativeObjectConstructor", nativeObjectConstructor);
        ParameterCheck.mandatory("isolatedScopeBuilder", isolatedScopeBuilder);
        ParameterCheck.mandatory("nashornLoader", nashornLoader);

        ParameterCheck.mandatoryNativeFunction("nativeObjectConstructor", nativeObjectConstructor);
        ParameterCheck.mandatoryNativeFunction("isolatedScopeBuilder", isolatedScopeBuilder);

        this.nativeObjectConstructor = nativeObjectConstructor;
        this.moduleRegistry = this.buildModuleRegistry();
        this.moduleLoadService = new ModuleLoadService(this, scriptUrlResolver, isolatedScopeBuilder, nashornLoader);

        this.requireFunction = this.buildRequireFunction();
        final ModuleHolderImpl requireModule = new ModuleHolderImpl("require", "require", null, null, this.requireFunction, true, false);
        this.moduleRegistry.registerModule(requireModule);

        this.defineFunction = this.buildDefineFunction();
        final ModuleHolderImpl defineModule = new ModuleHolderImpl("define", "define", null, null, this.defineFunction, true, false);
        this.moduleRegistry.registerModule(defineModule);
    }

    /**
     * Determines if the current thread is in a context without a
     * {@link #withTaggedCallerContextScriptUrl(String, TaggedCallerContextScriptUrlCallback) tagged script} as the caller.
     *
     * @return {@code true} if the current thread is not in any tagged context
     */
    public static boolean isInUntaggedContext()
    {
        final List<Object> taggedCallers = TAGGED_CALLERS.get();
        final boolean untaggedContext = taggedCallers.isEmpty();
        return untaggedContext;
    }

    /**
     * Retrieves the current, effective script URL for the caller in the current context.
     *
     * @return the script URL of the effective script caller or {@code null} if no script file could be determined as the current caller
     */
    public static String getCallerContextScriptUrl()
    {
        return getCallerContextScriptUrl(false, 0);
    }

    /**
     * Retrieves the current, effective script URL for the caller in the current context.
     *
     * @param suppressTaggedCaller
     *            {@code true} if this function should ignore the
     *            current tagged caller state and lookup the real caller
     *            script file, {@code false} otherwise
     * @param skipCallerContexts
     *            the number of caller contexts to skip - this can be necessary for utility functions exposed to scripts
     *            that need to provide information based on indirect callers (i.e. caller of the caller) - if this number is greater than
     *            the number of available contexts, the first context will be retrieved
     * @return the script URL of the effective script caller or {@code null} if no script file could be determined as the current caller
     */
    public static String getCallerContextScriptUrl(final boolean suppressTaggedCaller, final int skipCallerContexts)
    {
        ParameterCheck.nonNegativeInteger("skipCallerContexts", skipCallerContexts);

        String contextScriptUrl;
        final List<Object> taggedCallers = TAGGED_CALLERS.get();
        if (!taggedCallers.isEmpty() && !suppressTaggedCaller)
        {

            final Object taggedCaller = taggedCallers.get(Math.min(0, taggedCallers.size() - (1 + skipCallerContexts)));
            if (taggedCaller instanceof String)
            {
                contextScriptUrl = (String) taggedCaller;
            }
            else if (taggedCaller instanceof ModuleHolder)
            {
                contextScriptUrl = ((ModuleHolder) taggedCaller).getContextScriptUrl();
            }
            else
            {
                throw new IllegalStateException("Unsupported value for tagged caller: " + taggedCaller);
            }
        }
        else
        {
            contextScriptUrl = NashornUtils.getCallerScriptURL(skipCallerContexts, false);
        }
        return contextScriptUrl;
    }

    /**
     * Executes a callback while a specific script URL is being tagged as the caller for the purpose of this module system.
     *
     * @param callerContextScriptUrl
     *            the script URL of the caller
     * @param callback
     *            the callback to execute
     *
     * @return the result of the callback if any
     */
    public static <R> R withTaggedCallerContextScriptUrl(final String callerContextScriptUrl,
            final TaggedCallerContextScriptUrlCallback<R> callback)
    {
        LOGGER.debug("Tagging caller context script URL {}", callerContextScriptUrl);
        final List<Object> taggedCallers = TAGGED_CALLERS.get();
        taggedCallers.add(callerContextScriptUrl);
        try
        {
            return callback.executeForTaggedCallerContextScriptUrl();
        }
        finally
        {
            taggedCallers.remove(taggedCallers.size() - 1);
            LOGGER.debug("Untagged caller context script URL {}", callerContextScriptUrl);
        }
    }

    /**
     * Executes a callback while a specific module is being tagged as the caller for the purpose of this module system.
     *
     * @param callerContextModule
     *            the calling module
     * @param callback
     *            the callback to execute
     *
     * @return the result of the callback if any
     */
    public static <R> R withTaggedCallerContextModule(final ModuleHolder callerContextModule,
            final TaggedCallerContextScriptUrlCallback<R> callback)
    {
        LOGGER.debug("Tagging caller context module {}", callerContextModule);
        final List<Object> taggedCallers = TAGGED_CALLERS.get();
        taggedCallers.add(callerContextModule);
        try
        {
            return callback.executeForTaggedCallerContextScriptUrl();
        }
        finally
        {
            taggedCallers.remove(taggedCallers.size() - 1);
            LOGGER.debug("Untagged caller context module {}", callerContextModule);
        }
    }

    public JSObject getRequireFunction()
    {
        return this.requireFunction;
    }

    public JSObject getDefineFunction()
    {
        return this.defineFunction;
    }

    /**
     * Registers a module in the {@link #getCallerContextModuleId() current context}, or global context if no context is currently active.
     *
     * @param publicModuleId
     *            the public ID of the module to register - if provided as {@code null} the public module ID will be either derived from the
     *            current
     *            context (if active) or set to a random UUID value
     * @param dependencies
     *            the (potentially relative) module IDs of the module's dependencies
     * @param factoryOrModuleValue
     *            either the factory to instantiate the actual module value (a {@link JSObject#isFunction() native function) or the already
     *            instantiated module value
     */
    public void registerModuleInCurrentContext(final String publicModuleId, final List<String> dependencies,
            final Object factoryOrModuleValue)
    {
        ParameterCheck.mandatory("factoryOrModuleValue", factoryOrModuleValue);
        final ModuleHolder contextModule = this.getCallerContextModule();

        LOGGER.debug("Registering module {} with dependencies {} and factory/value {} from context {}", publicModuleId, dependencies,
                factoryOrModuleValue, contextModule);

        final String contextPublicModuleId = contextModule != null ? contextModule.getPublicModuleId() : null;
        String effectivePublicModuleId = publicModuleId;
        if (effectivePublicModuleId == null)
        {
            effectivePublicModuleId = contextPublicModuleId != null ? contextPublicModuleId : UUID.randomUUID().toString();
            LOGGER.debug("Defaulted public module ID to {}", effectivePublicModuleId);
        }

        final List<String> normalisedDependencies;
        ;
        if (dependencies != null)
        {
            normalisedDependencies = new ArrayList<>();
            dependencies.forEach(dependency -> {
                final String normalisedDependency = this.moduleLoadService.normalizeAndMapModuleId(dependency, contextModule);
                normalisedDependencies.add(normalisedDependency);
            });
            LOGGER.debug("Normalised dependencies of {} from {} to {}", effectivePublicModuleId, dependencies, normalisedDependencies);
        }
        else
        {
            normalisedDependencies = null;
        }

        final String moduleId = contextModule != null && effectivePublicModuleId.equals(contextPublicModuleId) ? contextModule.getModuleId()
                : publicModuleId;
        final String loaderModuleId = contextModule != null && contextModule.getLoaderModuleId() != null ? contextModule.getLoaderModuleId()
                : null;
        final String contextScriptUrl = contextModule != null ? contextModule.getContextScriptUrl() : NashornUtils.getCallerScriptURL();
        final boolean secureSource = contextModule != null ? contextModule.isFromSecureSource() : false;

        ModuleHolder module;
        if (factoryOrModuleValue instanceof JSObject && ((JSObject) factoryOrModuleValue).isFunction())
        {
            // TODO Try parsing factory source code to add modules loaded via require() to dependencies
            // as per http://requirejs.org/docs/whyamd.html#sugar
            module = new ModuleHolderImpl(effectivePublicModuleId, moduleId, loaderModuleId, contextScriptUrl, normalisedDependencies,
                    (JSObject) factoryOrModuleValue, secureSource);
        }
        else
        {
            module = new ModuleHolderImpl(effectivePublicModuleId, moduleId, loaderModuleId, contextScriptUrl, factoryOrModuleValue,
                    secureSource, false);

            if (normalisedDependencies != null && !normalisedDependencies.isEmpty())
            {
                LOGGER.warn("Module {} was defined with dependencies despite using an explicit value instead of factory-function", module);
            }
        }
        this.moduleRegistry.registerModule(module);
    }

    /**
     * Retrieves a specific module in the {@link #getCallerContextModuleId() current context}, or global context if no context is currently
     * active.
     *
     * @param moduleId
     *            the (potentially relative) ID of the module to retrieve
     * @return the resolved module
     */
    public Object retrieveModuleInCurrentContext(final String moduleId)
    {
        ParameterCheck.mandatoryString("moduelId", moduleId);

        final ModuleHolder contextModule = this.getCallerContextModule();
        final String normalizeAndMapModuleId = this.moduleLoadService.normalizeAndMapModuleId(moduleId, contextModule);
        final Object module = this.moduleRegistry.getOrResolveModule(normalizeAndMapModuleId, contextModule);

        return module;
    }

    /**
     * Retrieves the module for the caller in the current context.
     *
     * @return the module of the effective script caller or {@code null} if no module could be determined as the current caller
     */
    protected ModuleHolder getCallerContextModule()
    {
        ModuleHolder contextModule;
        final List<Object> taggedCallers = TAGGED_CALLERS.get();
        if (!taggedCallers.isEmpty())
        {
            final Object taggedCaller = taggedCallers.get(taggedCallers.size() - 1);
            if (taggedCaller instanceof String)
            {
                final String contextScriptUrl = (String) taggedCaller;
                final List<ModuleHolder> modules = this.moduleRegistry.lookupModulesByScriptUrl(contextScriptUrl);
                contextModule = modules.size() == 1 ? modules.get(0) : null;
            }
            else if (taggedCaller instanceof ModuleHolder)
            {
                contextModule = (ModuleHolder) taggedCaller;
            }
            else
            {
                if (taggedCaller != null)
                {
                    LOGGER.warn("Tagged caller {} is not supported - should never have been set", taggedCaller);
                }
                final String contextScriptUrl = NashornUtils.getCallerScriptURL();
                final List<ModuleHolder> modules = this.moduleRegistry.lookupModulesByScriptUrl(contextScriptUrl);
                contextModule = modules.size() == 1 ? modules.get(0) : null;
            }
        }
        else
        {
            final String contextScriptUrl = NashornUtils.getCallerScriptURL();
            final List<ModuleHolder> modules = this.moduleRegistry.lookupModulesByScriptUrl(contextScriptUrl);
            contextModule = modules.size() == 1 ? modules.get(0) : null;
        }
        return contextModule;
    }

    protected JSObject newNativeObject()
    {
        final JSObject nativeObject = (JSObject) this.nativeObjectConstructor.newObject();
        return nativeObject;
    }

    protected ModuleRegistry buildModuleRegistry()
    {
        return new ModuleRegistry(this);
    }

    protected JSObject buildDefineFunction()
    {
        return new DefineFunction(this);
    }

    protected JSObject buildRequireFunction()
    {
        return new RequireFunction(this, (moduleIdPrefix, paths) -> {
            this.moduleLoadService.setPaths(moduleIdPrefix, paths);
        }, (moduleIdPrefix, mappings) -> {
            this.moduleLoadService.setMappings(moduleIdPrefix, mappings);
        });
    }

    protected final ModuleRegistry getModuleRegistry()
    {
        return this.moduleRegistry;
    }

    protected final ModuleLoadService getModuleLoadService()
    {
        return this.moduleLoadService;
    }
}
