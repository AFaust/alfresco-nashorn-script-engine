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
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.util.AbstractJavaScriptObject;
import de.axelfaust.alfresco.nashorn.common.util.NashornUtils;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class DefineFunction extends AbstractJavaScriptObject
{

    private static final Logger LOGGER = LoggerFactory.getLogger(DefineFunction.class);

    protected final ModuleSystem moduleSystem;

    public DefineFunction(final ModuleSystem moduleSystem)
    {
        this.moduleSystem = moduleSystem;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object call(final Object thiz, final Object... inboundArgs)
    {
        final Object[] args = this.correctArgsAbstraction(inboundArgs);
        LOGGER.debug("Processing call to 'define' with arguments {}", args);

        final String contextPublicModuleId = this.moduleSystem.getCallerContextModuleId();
        final ModuleHolder contextModule = contextPublicModuleId != null
                ? this.moduleSystem.getModuleRegistry().lookupModuleByPublicModuleId(contextPublicModuleId)
                : null;

        String publicModuleId = null;
        List<String> dependencies = null;
        Object factoryOrValue = null;

        // iterate arguments from the 3rd one to the first
        // this is due to the signature of (id?, dependencies?, factory)
        for (int i = Math.min(2, args.length - 1); i >= 0; i--)
        {
            if (factoryOrValue == null)
            {
                factoryOrValue = args[i];
            }
            else if (dependencies == null && i <= 1 && args[i] instanceof JSObject && ((JSObject) args[i]).isArray())
            {
                final JSObject dependenciesArr = (JSObject) args[i];
                final int dependenciesLength = ParameterCheck.mandatoryNativeArray("dependencies", dependenciesArr);

                dependencies = new ArrayList<>();
                for (int j = 0, max = dependenciesLength; j < max; j++)
                {
                    final Object slot = dependenciesArr.getSlot(j);
                    if (!(slot instanceof CharSequence))
                    {
                        throw new IllegalArgumentException(
                                "Entry '" + String.valueOf(j) + "' in 'dependencies' is not a string denoting a module ID");
                    }

                    final String dependencyModuleId = String.valueOf(slot);
                    final String normalisedDependencyModuleId = ModuleSystem.withTaggedCallerContextModule(contextModule, () -> {
                        return this.moduleSystem.getModuleLoadService().normalizeAndMapModuleId(dependencyModuleId, contextModule);
                    });
                    dependencies.add(normalisedDependencyModuleId);
                }
            }
            else if (publicModuleId == null && i == 0 && args[i] instanceof CharSequence)
            {
                publicModuleId = String.valueOf(args[i]);
            }
            else
            {
                throw new IllegalArgumentException("Invalid parameter '" + args[i] + "' in call to 'define(id?, dependencies?, factory)'");
            }
        }

        ParameterCheck.mandatory("factory", factoryOrValue);

        if (publicModuleId == null)
        {
            // without a context module we assign a UUID-based module ID - unless some code uses the return value of define that module will
            // effectively no be reference-able
            publicModuleId = contextPublicModuleId != null ? contextPublicModuleId : UUID.randomUUID().toString();
        }

        ModuleHolder module;

        final String moduleId = contextModule != null && publicModuleId.equals(contextPublicModuleId) ? contextModule.getModuleId()
                : publicModuleId;
        final String loaderModuleId = contextModule != null && contextModule.getLoaderModuleId() != null ? contextModule.getLoaderModuleId()
                : null;
        final String contextScriptUrl = contextModule != null ? contextModule.getContextScriptUrl() : NashornUtils.getCallerScriptURL();
        final boolean secureSource = contextModule != null ? contextModule.isFromSecureSource() : false;

        if (factoryOrValue instanceof JSObject && ((JSObject) factoryOrValue).isFunction())
        {
            // TODO Try parsing factory source code to add modules loaded via require() to dependencies
            // as per http://requirejs.org/docs/whyamd.html#sugar
            module = new ModuleHolderImpl(publicModuleId, moduleId, loaderModuleId, contextScriptUrl, dependencies,
                    (JSObject) factoryOrValue, secureSource);
        }
        else
        {
            module = new ModuleHolderImpl(publicModuleId, moduleId, loaderModuleId, contextScriptUrl, factoryOrValue, secureSource, false);

            if (dependencies != null && !dependencies.isEmpty())
            {
                LOGGER.info("Module {} was defined with dependencies despite using an explicit value instead of factory-function", module);
            }
        }
        this.moduleSystem.getModuleRegistry().registerModule(module);

        return publicModuleId;
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

}
