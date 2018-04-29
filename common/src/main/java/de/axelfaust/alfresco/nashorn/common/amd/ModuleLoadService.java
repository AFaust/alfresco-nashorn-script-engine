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

import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.util.LambdaJavaScriptFunction;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.ScriptUtils;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ModuleLoadService
{

    private static final String MODULE_ID_RELATIVE_FRAGMENT = "./";

    private static final String MODULE_ID_ASCENDING_FRAGMENT = "../";

    private static final String MODULE_ID_SEPARATOR = "/";

    private static final String WILDCARD_MODULE_ID = "*";

    private static final Logger LOGGER = LoggerFactory.getLogger(ModuleLoadService.class);

    protected final ModuleSystem moduleSystem;

    protected final ScriptURLResolver scriptUrlResolver;

    protected final JSObject isolatedScopeBuilder;

    protected final JSObject nashornLoader;

    protected final Map<String, Collection<String>> pathsByModuleIdPrefix = new HashMap<>();

    protected final Map<String, Map<String, String>> mappingsByModuleIdPrefix = new HashMap<>();

    protected ModuleLoadService(final ModuleSystem moduleSystem, final ScriptURLResolver scriptUrlResolver,
            final JSObject isolatedScopeBuilder, final JSObject nashornLoader)
    {
        ParameterCheck.mandatory("moduleSystem", moduleSystem);
        ParameterCheck.mandatory("scriptUrlResolver", scriptUrlResolver);
        ParameterCheck.mandatory("isolatedScopeBuilder", isolatedScopeBuilder);
        ParameterCheck.mandatory("nashornLoader", nashornLoader);

        if (!isolatedScopeBuilder.isFunction())
        {
            throw new IllegalArgumentException("'isolatedScopeBuilder' must be a function");
        }

        this.moduleSystem = moduleSystem;
        this.scriptUrlResolver = scriptUrlResolver;
        this.isolatedScopeBuilder = isolatedScopeBuilder;
        this.nashornLoader = nashornLoader;
    }

    protected void setPath(final String moduleIdPrefix, final String path)
    {
        this.pathsByModuleIdPrefix.put(moduleIdPrefix, Collections.singleton(path));
    }

    protected void setPaths(final String moduleIdPrefix, final Collection<String> paths)
    {
        this.pathsByModuleIdPrefix.put(moduleIdPrefix, new ArrayList<>(paths));
    }

    protected void addMappings(final String moduleIdPrefix, final Map<String, String> mappings)
    {
        this.mappingsByModuleIdPrefix.put(moduleIdPrefix, new HashMap<>(mappings));
    }

    /**
     * Normalises a provided module ID and applies ID mapping upon module IDs without explicit loader plugin references it as per
     * configuration of the module system. If an explicit reference to a loader plugin exists, that plugin will be asked to normalise the ID
     * if it provides a {@code normalize()} function.
     *
     * @param id
     *            the module ID to be normalised
     * @param contextModule
     *            the context module requesting a module by the provided ID
     * @return the normalised and mapped module ID
     */
    protected String normalizeAndMapModuleId(final String id, final ModuleHolder contextModule)
    {
        ParameterCheck.mandatoryString("id", id);

        final String publicModuleId;
        final Matcher matcher = ModuleSystem.MODULE_NORMALIZED_ID_PATTERN.matcher(id);
        if (matcher.matches())
        {
            String loaderModuleId = matcher.group(1);
            final String moduleId = matcher.group(2);

            if (loaderModuleId != null)
            {
                // loader module may also be relative
                loaderModuleId = this.normalizeAndMapModuleId(loaderModuleId, contextModule);
            }

            String normalizedModuleId;
            if (moduleId.startsWith(MODULE_ID_RELATIVE_FRAGMENT) || moduleId.startsWith(MODULE_ID_ASCENDING_FRAGMENT))
            {
                final ModuleLoader loaderModule = loaderModuleId != null ? this.getLoaderModule(loaderModuleId, contextModule) : null;
                if (contextModule == null)
                {
                    throw new IllegalArgumentException("Relative module ID '" + id + "' is invalid outside of an active module context");
                }

                if (loaderModule instanceof ModuleNormalizingLoader)
                {
                    LOGGER.debug("Normalising module ID {} in context {} via loader {}", id, contextModule, loaderModuleId);

                    final JSObject normalizeDelegate = new LambdaJavaScriptFunction((thiz, args) -> {
                        ParameterCheck.mandatoryCharSequence("relativeId", args.length > 0 ? args[0] : null);
                        final String relativeId = ((CharSequence) args[0]).toString();
                        final String normalizedId = this.doNormalizeModuleId(relativeId, contextModule);
                        return normalizedId;
                    });

                    final JSObject contextModuleObj = this.moduleSystem.newNativeObject();
                    contextModuleObj.setMember("id", contextModule.getPublicModuleId());
                    contextModuleObj.setMember("moduleId", contextModule.getModuleId());
                    contextModuleObj.setMember("loaderModuleId", contextModule.getLoaderModuleId());
                    contextModuleObj.setMember("contextScriptUrl", contextModule.getContextScriptUrl());
                    contextModuleObj.setMember("fromSecureSource", contextModule.isFromSecureSource());
                    contextModuleObj.eval("Object.freeze(this);");

                    normalizedModuleId = ((ModuleNormalizingLoader) loaderModule).normalize(moduleId, normalizeDelegate, contextModuleObj);
                }
                else
                {
                    LOGGER.debug("Normalising module ID {} in context {}", id, contextModule);
                    normalizedModuleId = this.doNormalizeModuleId(moduleId, contextModule);
                }

                LOGGER.debug("Normalised module ID {} to {}", id, normalizedModuleId);
            }
            else
            {
                // can use ID as-is
                normalizedModuleId = id;
            }

            if (loaderModuleId != null)
            {
                // normalizedModuleId will not be mapped
                // mapping only applies to default loader of module system
                publicModuleId = loaderModuleId + "!" + normalizedModuleId;
            }
            else
            {
                publicModuleId = this.mapModuleId(normalizedModuleId, contextModule);
            }
        }
        else
        {
            LOGGER.info("Module ID {} is invalid", id);
            throw new IllegalArgumentException("Module ID '" + id + "' is invalid");
        }

        return publicModuleId;
    }

    protected String mapModuleId(final String moduleId, final ModuleHolder contextModule)
    {
        ParameterCheck.mandatoryString("moduleId", moduleId);

        String mappedModuledId = null;
        if (contextModule != null)
        {
            // check context-based mappings
            final String contextModuleId = contextModule.getModuleId();
            final StringBuilder moduleIdPrefixBuilder = new StringBuilder(contextModuleId);

            while (mappedModuledId == null && moduleIdPrefixBuilder.length() != 0)
            {
                final Map<String, String> mappings = this.mappingsByModuleIdPrefix.get(moduleIdPrefixBuilder.toString());
                if (mappings != null)
                {
                    final String candidateMappedModuleId = mappings.get(moduleId);
                    if (candidateMappedModuleId != null)
                    {
                        LOGGER.debug("Mapping module {} to {} due to mappings {} applicable to context module {}", moduleId,
                                candidateMappedModuleId, mappings, contextModule);
                        mappedModuledId = candidateMappedModuleId;
                    }
                }

                if (mappedModuledId == null)
                {
                    // generalise to shorter module ID prefix
                    final int startOfLastSegment = moduleIdPrefixBuilder.lastIndexOf(MODULE_ID_SEPARATOR);
                    moduleIdPrefixBuilder.delete(startOfLastSegment != -1 ? startOfLastSegment : 0, moduleIdPrefixBuilder.length());
                }
            }
        }

        if (mappedModuledId == null)
        {
            // global / generic mapping
            final Map<String, String> mappings = this.mappingsByModuleIdPrefix.get(WILDCARD_MODULE_ID);
            if (mappings != null)
            {
                final String candidateMappedModuleId = mappings.get(moduleId);
                if (candidateMappedModuleId != null)
                {
                    LOGGER.debug("Mapping module {} to {} due to global mappings {}", moduleId, candidateMappedModuleId, mappings);
                    mappedModuledId = candidateMappedModuleId;
                }
            }
        }

        if (mappedModuledId == null)
        {
            // no mapping is applicable
            mappedModuledId = moduleId;
        }

        return mappedModuledId;
    }

    protected String doNormalizeModuleId(final String relativeModuleId, final ModuleHolder contextModule)
    {
        ParameterCheck.mandatoryString("relativeModuleId", relativeModuleId);
        ParameterCheck.mandatory("contextModule", contextModule);

        final StringBuilder normalizedIdBuilder = new StringBuilder();
        normalizedIdBuilder.append(contextModule.getModuleId());

        if (relativeModuleId.startsWith(MODULE_ID_RELATIVE_FRAGMENT))
        {
            // the only time we ascend for ./ path elements is for the first element in a relative ID
            final int startOfLastSegment = normalizedIdBuilder.lastIndexOf(MODULE_ID_SEPARATOR);
            normalizedIdBuilder.delete(startOfLastSegment, normalizedIdBuilder.length());
            normalizedIdBuilder.append(MODULE_ID_SEPARATOR);
            normalizedIdBuilder.append(relativeModuleId.substring(2));
        }
        else
        {
            normalizedIdBuilder.append(MODULE_ID_SEPARATOR);
            normalizedIdBuilder.append(relativeModuleId);
        }

        // use nextStartIdx as minor performance improvement by avoiding indexOf from first position for every iteration
        int nextStartIdx = 0;
        while (true)
        {
            final int ascendingFragmentIdx = normalizedIdBuilder.indexOf(MODULE_ID_SEPARATOR + MODULE_ID_ASCENDING_FRAGMENT, nextStartIdx);
            final int relativeFragmentIdx = normalizedIdBuilder.indexOf(MODULE_ID_SEPARATOR + MODULE_ID_RELATIVE_FRAGMENT, nextStartIdx);
            if (ascendingFragmentIdx != -1 && (relativeFragmentIdx == -1 || ascendingFragmentIdx < relativeFragmentIdx))
            {
                // collapse xxx/abc/../xyz to xxx/xyz by removing /abc/..
                final int startOfLastSegment = normalizedIdBuilder.lastIndexOf(MODULE_ID_SEPARATOR, ascendingFragmentIdx - 1);
                if (startOfLastSegment == -1)
                {
                    // in this case we remove abc/../ from abc/../xyz to result in xyz
                    normalizedIdBuilder.delete(0, ascendingFragmentIdx + 4);
                }
                else
                {
                    normalizedIdBuilder.delete(startOfLastSegment, ascendingFragmentIdx + 3);
                }
                nextStartIdx = startOfLastSegment;
            }
            else if (relativeFragmentIdx != -1)
            {
                // simply collapse redundant relative fragment /./ to /
                normalizedIdBuilder.delete(relativeFragmentIdx, relativeFragmentIdx + 2);
                nextStartIdx = relativeFragmentIdx;
            }
            else
            {
                // done
                break;
            }
        }

        if (normalizedIdBuilder.indexOf(MODULE_ID_ASCENDING_FRAGMENT) == 0)
        {
            throw new IllegalArgumentException("Relative module ID '" + relativeModuleId
                    + "' contains more ascending elements (../) than the ID of the context module contains in total elements");
        }

        // remove superfluous ./ at the start (not caught by previous loop)
        while (true)
        {
            final int relativeFragmentIdx = normalizedIdBuilder.indexOf(MODULE_ID_RELATIVE_FRAGMENT);
            if (relativeFragmentIdx == 0)
            {
                normalizedIdBuilder.delete(0, 2);
            }
            else
            {
                break;
            }
        }

        return normalizedIdBuilder.toString();
    }

    protected void loadModule(final String publicModuleId, final ModuleHolder contextModule)
    {
        final Matcher matcher = ModuleSystem.MODULE_NORMALIZED_ID_PATTERN.matcher(publicModuleId);
        if (matcher.matches())
        {
            final String loaderModuleId = matcher.group(1);
            final String moduleId = matcher.group(2);

            if (loaderModuleId != null)
            {
                this.loadModuleViaLoader(publicModuleId, loaderModuleId, moduleId, contextModule);
            }
            else
            {
                this.loadModuleViaScriptResolver(publicModuleId, moduleId, contextModule);
            }
        }
        else
        {
            LOGGER.info("Requested module ID {} is invalid", publicModuleId);
            throw new IllegalArgumentException("Requested module ID '" + publicModuleId + "' is invalid");
        }
    }

    protected void loadModuleViaScriptResolver(final String publicModuleId, final String moduleId, final ModuleHolder contextModule)
    {
        Collection<String> paths = null;
        final StringBuilder moduleIdPrefixBuilder = new StringBuilder(moduleId);
        while (paths == null && moduleIdPrefixBuilder.length() != 0)
        {
            paths = this.pathsByModuleIdPrefix.get(moduleIdPrefixBuilder.toString());

            if (paths == null)
            {
                final int startOfLastSegment = moduleIdPrefixBuilder.lastIndexOf(MODULE_ID_SEPARATOR);
                moduleIdPrefixBuilder.delete(startOfLastSegment != -1 ? startOfLastSegment : 0, moduleIdPrefixBuilder.length());
            }
        }

        if (paths == null)
        {
            paths = this.pathsByModuleIdPrefix.get(WILDCARD_MODULE_ID);
        }

        String[] locations = new String[0];
        if (paths != null)
        {
            locations = paths.toArray(new String[0]);
        }

        // TODO Are all resolved scripts secure or do we want to add ability for resolver to determine/decide?
        final URL scriptUrl = this.scriptUrlResolver.resolveModuleScriptUrl(moduleId, locations);
        if (scriptUrl != null)
        {
            this.checkAndProcessLoaderModuleResult(publicModuleId, null, moduleId, scriptUrl, true, null);
        }
        else
        {
            LOGGER.info("No script URL could be resolved for module {} in locations {}", publicModuleId, locations);
            throw new UnavailableModuleException("Module '{}' could not be loaded", publicModuleId);
        }
    }

    protected void loadModuleViaLoader(final String publicModuleId, final String loaderModuleId, final String moduleId,
            final ModuleHolder contextModule)
    {
        final ModuleLoader loaderModule = this.getLoaderModule(loaderModuleId, contextModule);

        final JSObject load = new LambdaJavaScriptFunction((thiz, args) -> {
            final Object value = args[0];
            final boolean isSecureSource = Boolean.TRUE.equals(ScriptUtils.convert(args[1], Boolean.class));
            final String overrideUrl = args[2] != null ? String.valueOf(args[2]) : null;
            this.checkAndProcessLoaderModuleResult(publicModuleId, loaderModuleId, moduleId, value, isSecureSource, overrideUrl);
            return null;
        });

        // require needs to be context-specific for the contextModule of the main call
        // see http://requirejs.org/docs/plugins.html#apiload
        final Object require = this.moduleSystem.getModuleRegistry().getOrResolveModule("require", contextModule);
        ParameterCheck.mandatory("requre", require);

        loaderModule.load(moduleId, (JSObject) require, load);
    }

    protected void checkAndProcessLoaderModuleResult(final String publicModuleId, final String loaderModuleId, final String moduleId,
            final Object value, final boolean isSecureSource, final String overrideUrl)

    {
        if (value instanceof URL)
        {
            final String scriptUrl = String.valueOf(value);

            final ModuleHolder moduleByPublicId = this.moduleSystem.getModuleRegistry().lookupModuleByPublicModuleId(publicModuleId);
            if (moduleByPublicId != null && scriptUrl.equals(moduleByPublicId.getContextScriptUrl()))
            {
                throw new ModuleSystemRuntimeException(
                        "Module '{}' in script '{}' has already been loaded once - it should not have been loaded again", publicModuleId,
                        scriptUrl);
            }

            final String normalizedModuleId = (loaderModuleId != null ? loaderModuleId + "!" : "") + moduleId;
            final List<ModuleHolder> modulesByScriptUrl = this.moduleSystem.getModuleRegistry().lookupModulesByScriptUrl(scriptUrl);

            final AtomicReference<ModuleHolder> moduleMatchingNormalizedId = new AtomicReference<>();
            modulesByScriptUrl.forEach(module -> {
                if (publicModuleId.equals(module.getPublicModuleId()))
                {
                    throw new ModuleSystemRuntimeException(
                            "Module '{}' in script '{}' has already been loaded once - it should not have been loaded again",
                            publicModuleId, scriptUrl);
                }

                if (normalizedModuleId.equals(module.getNormalizedModuleId()))
                {
                    moduleMatchingNormalizedId.set(module);
                }
            });

            final ModuleHolder existingModule = moduleMatchingNormalizedId.get();
            if (existingModule != null)
            {
                LOGGER.debug("Remapping already loaded module {} to {} from url {}", existingModule.getPublicModuleId(), publicModuleId,
                        scriptUrl);
                final ModuleHolder remapped = existingModule.withAlternatePublicModuleId(publicModuleId);
                this.moduleSystem.getModuleRegistry().registerModule(remapped);
            }
            else if (modulesByScriptUrl.isEmpty())
            {
                this.doLoadModuleImpl(publicModuleId, loaderModuleId, moduleId, value, isSecureSource, scriptUrl);
            }
            else
            {
                throw new ModuleSystemRuntimeException(
                        "Module '{}' in script '{}' has already been loaded once - it should not have been loaded again", publicModuleId,
                        scriptUrl);
            }
        }
        else
        {
            LOGGER.debug("Registering pre-resolved module {}", publicModuleId);
            final ModuleHolder moduleHolder = new ModuleHolderImpl(publicModuleId, moduleId, loaderModuleId, overrideUrl, value,
                    isSecureSource, false);
            this.moduleSystem.getModuleRegistry().registerModule(moduleHolder);
        }
    }

    protected void doLoadModuleImpl(final String publicModuleId, final String loaderModuleId, final String moduleId, final Object value,
            final boolean isSecureSource, final String scriptUrl)
    {
        LOGGER.debug("Loading module {} from url {} (secureSource: {})", publicModuleId, scriptUrl, Boolean.valueOf(isSecureSource));

        final ModuleHolder dummy = new ModuleHolderImpl(publicModuleId, moduleId, loaderModuleId, scriptUrl, null, isSecureSource, true);
        if (isSecureSource && loaderModuleId != null)
        {
            final ModuleHolder loaderModuleDef = this.moduleSystem.getModuleRegistry().lookupModuleByPublicModuleId(loaderModuleId);
            if (!loaderModuleDef.isFromSecureSource())
            {
                throw new SecureModuleException("Module '{}' cannot be loaded by insecure loader module '{}'",
                        dummy.getNormalizedModuleId(), loaderModuleDef.getNormalizedModuleId());
            }
        }
        this.moduleSystem.getModuleRegistry().registerModule(dummy);

        final Object require = this.moduleSystem.getModuleRegistry().getOrResolveModule("require", dummy);
        final Object define = this.moduleSystem.getModuleRegistry().getOrResolveModule("define", dummy);

        final Object isolatedScope = this.isolatedScopeBuilder.call(null, require, define);
        final Object implicitResult = ModuleSystem.withTaggedCallerContextScriptUrl(scriptUrl, () -> {
            return this.nashornLoader.call(null, value, isolatedScope);
        });

        final ModuleHolder moduleRegisteredById = this.moduleSystem.getModuleRegistry().lookupModuleByPublicModuleId(publicModuleId);
        final ModuleHolder moduleRegisteredByScriptUrl = this.moduleSystem.getModuleRegistry().lookupModuleByScriptUrl(scriptUrl);
        // no module registered via a define() call
        if (moduleRegisteredById == dummy && moduleRegisteredByScriptUrl == dummy)
        {
            LOGGER.debug("Module {} from url {} yielded implicit result {}", publicModuleId, scriptUrl, implicitResult);

            final ModuleHolder implicitModule = new ModuleHolderImpl(publicModuleId, moduleId, loaderModuleId, scriptUrl, implicitResult,
                    isSecureSource, true);
            this.moduleSystem.getModuleRegistry().registerModule(implicitModule);
        }
        else if (moduleRegisteredById != dummy)
        {
            LOGGER.debug("Module {} from url {} has been properly defined via define()", publicModuleId, scriptUrl);
        }
        else
        {
            LOGGER.debug(
                    "At least one module with alternate ID {} (originally requested {}) from url {} has been properly defined via define()",
                    moduleRegisteredByScriptUrl.getPublicModuleId(), publicModuleId, scriptUrl);
        }
    }

    protected ModuleLoader getLoaderModule(final String loaderModuleId, final ModuleHolder contextModule)
    {
        final Object loaderModuleObj = this.moduleSystem.getModuleRegistry().getOrResolveModule(loaderModuleId, contextModule);

        ModuleLoader loaderModule;
        if (loaderModuleObj instanceof ModuleLoader)
        {
            LOGGER.debug("Returning Java-backed loader module {} as-is", loaderModuleId);
            loaderModule = (ModuleLoader) loaderModuleObj;
        }
        else if (loaderModuleObj instanceof JSObject)
        {
            final JSObject scriptObj = (JSObject) loaderModuleObj;
            final Object loadMemberValue = scriptObj.getMember("load");
            if (loadMemberValue instanceof JSObject && ((JSObject) loadMemberValue).isFunction())
            {
                final Object normalizeMemberValue = scriptObj.getMember("normalize");

                if (normalizeMemberValue instanceof JSObject && ((JSObject) normalizeMemberValue).isFunction())
                {
                    LOGGER.debug("Facading script-backed loader module {} as ModuleNormalizingLoader", loaderModuleId);
                    loaderModule = new ScriptBackedModuleNormalizingLoader(loaderModuleId, (JSObject) loadMemberValue,
                            (JSObject) normalizeMemberValue);
                }
                else
                {
                    LOGGER.debug("Facading script-backed loader module {} as ModuleLoader", loaderModuleId);
                    loaderModule = new ScriptBackedModuleLoader(loaderModuleId, (JSObject) loadMemberValue);
                }
            }
            else
            {
                throw new ModuleSystemRuntimeException("Module '{}' is not a valid loader module", loaderModuleId);
            }
        }
        else
        {
            throw new ModuleSystemRuntimeException("Module '{}' is not a valid loader module", loaderModuleId);
        }
        return loaderModule;
    }
}
