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
package de.axelfaust.alfresco.nashorn.common.amd.modules;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.amd.ModuleSystemRuntimeException;
import de.axelfaust.alfresco.nashorn.common.amd.core.ModuleSystem;
import de.axelfaust.alfresco.nashorn.common.amd.modules.ConfigFunction.MappingsConfigHandle;
import de.axelfaust.alfresco.nashorn.common.amd.modules.ConfigFunction.PathsConfigHandle;
import de.axelfaust.alfresco.nashorn.common.util.AbstractJavaScriptObject;
import de.axelfaust.alfresco.nashorn.common.util.LambdaJavaScriptFunction;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class RequireFunction extends AbstractJavaScriptObject
{

    private static final Logger LOGGER = LoggerFactory.getLogger(RequireFunction.class);

    protected final ModuleSystem moduleSystem;

    protected final JSObject configFunction;

    public RequireFunction(final ModuleSystem moduleSystem, final PathsConfigHandle pathsConfigHandle,
            final MappingsConfigHandle mappingsConfigHandle)
    {
        ParameterCheck.mandatory("moduleSystem", moduleSystem);

        this.moduleSystem = moduleSystem;

        final LambdaJavaScriptFunction getCallerScriptURL = new LambdaJavaScriptFunction((thiz, args) -> {
            boolean suppressTaggedCaller = false;
            if (args.length > 0 && args[0] instanceof Boolean)
            {
                suppressTaggedCaller = Boolean.TRUE.equals(args[0]);
            }
            // we want to provide the caller context to the calling script, so need to skip one layer
            return ModuleSystem.getCallerContextScriptUrl(suppressTaggedCaller, 1);
        });
        this.setMemberImpl("getCallerScriptURL", getCallerScriptURL, false);

        this.configFunction = new ConfigFunction(pathsConfigHandle, mappingsConfigHandle);
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getMember(final String name)
    {
        Objects.requireNonNull(name);

        Object memberValue;
        if ("config".equals(name))
        {
            // access to config function should only be granted in a global scope
            if (!ModuleSystem.isInUntaggedContext())
            {
                throw new ModuleSystemRuntimeException("'require.config' is only accessible in a global scope");
            }
            memberValue = this.configFunction;
        }
        else
        {
            memberValue = super.getMember(name);
        }
        return memberValue;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object call(final Object thiz, final Object... inboundArgs)
    {
        final Object[] args = this.correctArgsAbstraction(inboundArgs);
        LOGGER.debug("Processing call to 'require' with arguments {}", args);

        if (args.length == 0)
        {
            throw new IllegalArgumentException("Missing arguments in call to 'require'");
        }

        final List<String> requiredModuleIds = this.extractRequiredModuleIdsFromArgs(args);

        final Object result;
        if (args.length == 1)
        {
            if (requiredModuleIds.isEmpty())
            {
                throw new IllegalArgumentException("No module IDs provided in call to 'require'");
            }

            if (requiredModuleIds.size() > 1)
            {
                throw new IllegalArgumentException(
                        "Multiple module IDs in call to 'require' are only supported if callback function is provided");
            }

            final String requiredModuleId = requiredModuleIds.get(0);
            result = this.moduleSystem.retrieveModuleInCurrentContext(requiredModuleId);
            LOGGER.debug("Resolved {} for module {}", result, requiredModuleId);
        }
        else
        {

            if (!(args[1] instanceof JSObject && ((JSObject) args[1]).isFunction()))
            {
                throw new IllegalArgumentException("Illegal value for 'callback' in call to 'require'");
            }

            if (args.length > 2)
            {
                if (!(args[2] instanceof JSObject && ((JSObject) args[2]).isFunction()))
                {
                    throw new IllegalArgumentException("Illegal value for 'errorCallback' in call to 'require'");
                }
            }

            // errorCallback is an optional argument as a "soft" deviation from AMD standard
            final JSObject callback = (JSObject) args[1];
            final JSObject errorCallback = args.length > 2 ? (JSObject) args[2] : null;

            LOGGER.debug("Resolving modules {} for callback (using error callback: {})", requiredModuleIds,
                    Boolean.valueOf(errorCallback != null));
            final Object[] resolvedModules = new Object[requiredModuleIds.size()];
            final Object[] resolutionErrors = new Object[requiredModuleIds.size()];
            boolean allModulesResolved = true;

            for (int i = 0; i < resolvedModules.length; i++)
            {
                final String requiredModuleId = requiredModuleIds.get(i);
                try
                {
                    LOGGER.debug("Resolving module {}", requiredModuleId);
                    resolvedModules[i] = this.moduleSystem.retrieveModuleInCurrentContext(requiredModuleId);
                }
                catch (final Exception e)
                {
                    allModulesResolved = false;
                    if (errorCallback != null)
                    {
                        resolutionErrors[i] = e;
                    }
                    else if (e instanceof RuntimeException)
                    {
                        throw (RuntimeException) e;
                    }
                    else
                    {
                        throw new ModuleSystemRuntimeException("Failed to resolve '{}'", e, requiredModuleId);
                    }
                }
            }

            if (allModulesResolved)
            {
                result = callback.call(null, resolvedModules);
                LOGGER.debug("Resolved modules {} for callback", Arrays.asList(resolvedModules));
            }
            else
            {
                // errorCallback cannot be null here otherwise we would have already re-thrown an exception in the resolution catch block
                LOGGER.debug("Failed to resolve modules {} - resolved {} and got errors {}", requiredModuleIds,
                        Arrays.asList(resolvedModules), Arrays.asList(resolutionErrors));
                result = errorCallback.call(null, new Object[] { resolvedModules, resolutionErrors });
            }
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isFunction()
    {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isStrictFunction()
    {
        return true;
    }

    protected List<String> extractRequiredModuleIdsFromArgs(final Object[] args)
    {
        final List<String> requiredModuleIds = new ArrayList<>();
        if (args[0] instanceof CharSequence)
        {
            final String requiredModuleId = String.valueOf(args[0]);
            requiredModuleIds.add(requiredModuleId);
        }
        else if (args[0] instanceof JSObject && ((JSObject) args[0]).isArray())
        {
            final JSObject dependenciesArr = (JSObject) args[0];
            final int dependenciesLength = ParameterCheck.mandatoryNativeArray("dependencies", dependenciesArr);

            for (int j = 0, max = dependenciesLength; j < max; j++)
            {
                final Object slot = dependenciesArr.getSlot(j);
                if (!(slot instanceof CharSequence))
                {
                    throw new IllegalArgumentException(
                            "Entry '" + String.valueOf(j) + "' in 'dependencies' is not a string denoting a module ID");
                }

                final String requiredModuleId = String.valueOf(slot);
                requiredModuleIds.add(requiredModuleId);
            }
        }
        else
        {
            throw new IllegalArgumentException("'dependencies' must be either a string or array of module IDs");
        }
        return requiredModuleIds;
    }
}
