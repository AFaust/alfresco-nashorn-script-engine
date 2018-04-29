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
package de.axelfaust.alfresco.nashorn.common.amd;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.util.NashornUtils;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ModuleSystem
{

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

    protected final RequireFunction requireFunction = new RequireFunction(this);

    protected final DefineFunction defineFunction = new DefineFunction(this);

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

        final ModuleHolderImpl requireModule = new ModuleHolderImpl("require", "require", null, null, this.requireFunction, true, false);
        this.moduleRegistry.registerModule(requireModule);

        final ModuleHolderImpl defineModule = new ModuleHolderImpl("define", "define", null, null, this.defineFunction, true, false);
        this.moduleRegistry.registerModule(defineModule);
    }

    /**
     *
     * @author Axel Faust
     */
    @FunctionalInterface
    public interface TaggedCallerContextScriptUrlCallback<R>
    {

        /**
         * Executes this callback while a specifically script URL has been tagged as the caller for the purpose of all functionality
         * relying on the {@link ModuleSystem#getCallerContextScriptUrl() the context}.
         *
         * @return the result of the callback invocation if any
         */
        R executeForTaggedCallerContextScriptUrl();
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
     * Retrieves the module ID for the caller in the current context.
     *
     * @return the module ID of the effective script caller or {@code null} if no module could be determined as the current caller
     */
    public String getCallerContextModuleId()
    {
        String contextModuleId;
        final List<Object> taggedCallers = TAGGED_CALLERS.get();
        if (!taggedCallers.isEmpty())
        {
            final Object taggedCaller = taggedCallers.get(taggedCallers.size() - 1);
            if (taggedCaller instanceof String)
            {
                final String contextScriptUrl = (String) taggedCaller;
                final List<ModuleHolder> modules = this.moduleRegistry.lookupModulesByScriptUrl(contextScriptUrl);
                contextModuleId = modules.size() == 1 ? modules.get(0).getPublicModuleId() : null;
            }
            else if (taggedCaller instanceof ModuleHolder)
            {
                contextModuleId = ((ModuleHolder) taggedCaller).getPublicModuleId();
            }
            else
            {
                if (taggedCaller != null)
                {
                    LOGGER.warn("Tagged caller {} is not supported - should never have been set", taggedCaller);
                }
                final String contextScriptUrl = NashornUtils.getCallerScriptURL();
                final List<ModuleHolder> modules = this.moduleRegistry.lookupModulesByScriptUrl(contextScriptUrl);
                contextModuleId = modules.size() == 1 ? modules.get(0).getPublicModuleId() : null;
            }
        }
        else
        {
            final String contextScriptUrl = NashornUtils.getCallerScriptURL();
            final List<ModuleHolder> modules = this.moduleRegistry.lookupModulesByScriptUrl(contextScriptUrl);
            contextModuleId = modules.size() == 1 ? modules.get(0).getPublicModuleId() : null;
        }
        return contextModuleId;
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

    protected JSObject newNativeObject()
    {
        final JSObject nativeObject = (JSObject) this.nativeObjectConstructor.newObject();
        return nativeObject;
    }

    protected ModuleRegistry buildModuleRegistry()
    {
        return new ModuleRegistry(this);
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
