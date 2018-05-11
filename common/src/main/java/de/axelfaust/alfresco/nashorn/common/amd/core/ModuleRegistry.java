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
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.amd.EnumBackedModuleFlags;
import de.axelfaust.alfresco.nashorn.common.amd.ModuleFlags;
import de.axelfaust.alfresco.nashorn.common.amd.SecureModuleException;
import de.axelfaust.alfresco.nashorn.common.amd.UnavailableModuleException;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ModuleRegistry
{

    private static final Logger LOGGER = LoggerFactory.getLogger(ModuleRegistry.class);

    protected final ModuleSystem moduleSystem;

    private final Map<String, ModuleHolder> modules;

    private final Map<String, List<ModuleHolder>> modulesByScriptUrl;

    private final Set<String> loadFailedModules;

    protected ModuleRegistry(final ModuleSystem moduleSystem)
    {
        this(moduleSystem, new HashMap<>(), new HashMap<>(), new HashSet<>());
    }

    protected ModuleRegistry(final ModuleSystem moduleSystem, final Map<String, ModuleHolder> modules,
            final Map<String, List<ModuleHolder>> modulesByScriptUrl, final Set<String> loadFailedModules)
    {
        this.moduleSystem = moduleSystem;

        this.modules = modules;
        this.modulesByScriptUrl = modulesByScriptUrl;
        this.loadFailedModules = loadFailedModules;
    }

    public Object getOrResolveModule(final String publicModuleId, final ModuleHolder contextModule)
    {
        LOGGER.debug("Retrieving module {} with lazy resolution", publicModuleId);
        ModuleHolder moduleHolder = this.lookupModuleByPublicModuleId(publicModuleId);

        Object result = null;
        if (moduleHolder == null)
        {
            LOGGER.debug("Module {} has not yet been defined", publicModuleId);

            if (this.loadFailedModules.contains(publicModuleId))
            {
                LOGGER.debug("Loading module {} has already been attempted and failed", publicModuleId);
                throw new UnavailableModuleException("Module '{}' could not be loaded", publicModuleId);
            }

            try
            {
                this.moduleSystem.getModuleLoadService().loadModule(publicModuleId, contextModule);
                moduleHolder = this.lookupModuleByPublicModuleId(publicModuleId);
            }
            catch (final SecureModuleException smex)
            {
                LOGGER.debug("Loading module {} failed - marking to avoid further load attempts", publicModuleId, smex);
                this.loadFailedModules.add(publicModuleId);
                throw smex;
            }
            catch (final Exception e)
            {
                LOGGER.debug("Loading module {} failed", publicModuleId, e);
                if (e instanceof RuntimeException)
                {
                    throw (RuntimeException) e;
                }
                throw new UnavailableModuleException("Module '{}' could not be loaded", e, publicModuleId);
            }

            if (moduleHolder == null)
            {
                LOGGER.debug("Loading module {} failed - marking to avoid further load attempts", publicModuleId);
                this.loadFailedModules.add(publicModuleId);
                throw new UnavailableModuleException("Module '{}' could not be loaded", publicModuleId);
            }

            LOGGER.debug("Module {} has been loaded", publicModuleId);
            result = moduleHolder.getOrResolveModule(this);
        }
        else
        {
            LOGGER.debug("Module {} has already been defined", publicModuleId);
            result = moduleHolder.getOrResolveModule(this);
        }

        result = this.handleResolvedModuleInstance(result, moduleHolder, contextModule);

        return result;
    }

    public Object getResolvedModule(final String publicModuleId, final ModuleHolder contextModule)
    {
        LOGGER.debug("Retrieving module {} without lazy resolution", publicModuleId);
        final ModuleHolder moduleHolder = this.lookupModuleByPublicModuleId(publicModuleId);
        Object result;
        if (moduleHolder == null)
        {
            LOGGER.debug("Module {} has not yet been defined", publicModuleId);
            throw new UnavailableModuleException("Module '{}' has not been defined", publicModuleId);
        }
        else
        {
            LOGGER.debug("Module {} has already been defined", publicModuleId);
            result = moduleHolder.getResolvedModule();
        }

        result = this.handleResolvedModuleInstance(result, moduleHolder, contextModule);

        return result;
    }

    /**
     * Looks up modules by the URL of the script from which they were loaded. This operation will retrieve all modules loaded from a
     * particular script in the order from earliest to latest.
     *
     * @param scriptUrl
     *            the URL of the script from which the modules were loaded
     * @return the list of holders for modules loaded from the specified script - never null
     */
    protected List<ModuleHolder> lookupModulesByScriptUrl(final String scriptUrl)
    {
        final List<ModuleHolder> moduleHolders = this.modulesByScriptUrl.getOrDefault(scriptUrl, Collections.emptyList());
        LOGGER.trace("Lookup of modules by script URL {} yielded {}", scriptUrl, moduleHolders);
        return Collections.unmodifiableList(moduleHolders);
    }

    /**
     * Looks up a module by the URL of the script from which it was loaded. This operation will only retrieve the last module loaded from
     * any specific script.
     *
     * @param scriptUrl
     *            the URL of the script from which the module was loaded
     * @return the holder of the last module loaded from the specified script or {@code null} if no module has been loaded from that script
     *         yet
     */
    protected ModuleHolder lookupModuleByScriptUrl(final String scriptUrl)
    {
        final List<ModuleHolder> moduleHolders = this.modulesByScriptUrl.getOrDefault(scriptUrl, Collections.emptyList());
        final ModuleHolder moduleHolder = moduleHolders.isEmpty() ? null : moduleHolders.get(moduleHolders.size() - 1);
        LOGGER.trace("Lookup of (last) module by script URL {} yielded {}", scriptUrl, moduleHolder);
        return moduleHolder;
    }

    /**
     * Looks up a specific module by a specific module ID.
     *
     * @param publicModuleId
     *            the module ID by which the module has been registered
     * @return the holder of the module or {@code null} if no module has been registered with the specified module ID yet
     */
    protected ModuleHolder lookupModuleByPublicModuleId(final String publicModuleId)
    {
        final ModuleHolder moduleHolder = this.modules.get(publicModuleId);
        LOGGER.trace("Lookup of module by public module ID {} yielded {}", publicModuleId, moduleHolder);
        return moduleHolder;
    }

    protected void registerModule(final ModuleHolder moduleHolder)
    {
        ParameterCheck.mandatory("module", moduleHolder);

        LOGGER.debug("Registering {}", moduleHolder);

        final String publicModuleId = moduleHolder.getPublicModuleId();
        final ModuleHolder oldModule = this.modules.put(publicModuleId, moduleHolder);
        final String contextScriptUrl = moduleHolder.getContextScriptUrl();
        if (contextScriptUrl != null)
        {
            this.modulesByScriptUrl.computeIfAbsent(contextScriptUrl, (x) -> {
                return new ArrayList<>();
            }).add(moduleHolder);
        }

        if (oldModule != null)
        {
            LOGGER.debug("Old module {} has been overriden by {} - existing modules may still have references to old module", oldModule,
                    moduleHolder);
        }
    }

    protected JSObject newNativeObject()
    {
        return this.moduleSystem.newNativeObject();
    }

    protected Object handleResolvedModuleInstance(final Object moduleInstance, final ModuleHolder module, final ModuleHolder contextModule)
    {
        Object resultModuleInstance = moduleInstance;

        if (moduleInstance instanceof JSObject && contextModule != null)
        {
            final ModuleFlags flags = EnumBackedModuleFlags.fromJSObject((JSObject) moduleInstance);

            if (flags != null && flags.requiresSecureCaller() && !contextModule.isFromSecureSource())
            {
                throw new SecureModuleException("Module '{}' cannot be accessed by insecure module '{}'", module.getNormalizedModuleId(),
                        contextModule.getNormalizedModuleId());
            }

            final ModuleFlags effectiveFlags = flags != null ? flags : new EnumBackedModuleFlags();
            resultModuleInstance = new ContextualModuleProxy(this.moduleSystem, (JSObject) moduleInstance, contextModule, effectiveFlags);
        }

        return resultModuleInstance;
    }
}
