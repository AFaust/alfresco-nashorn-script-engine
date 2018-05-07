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
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.amd.core.ModuleSystem;
import de.axelfaust.alfresco.nashorn.common.util.AbstractJavaScriptObject;
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

        String requestedPublicModuleId = null;
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
                    dependencies.add(dependencyModuleId);
                }
            }
            else if (requestedPublicModuleId == null && i == 0 && args[i] instanceof CharSequence)
            {
                requestedPublicModuleId = String.valueOf(args[i]);
            }
            else
            {
                throw new IllegalArgumentException("Invalid parameter '" + args[i] + "' in call to 'define(id?, dependencies?, factory)'");
            }
        }

        final String actualPublicModuleId = this.moduleSystem.registerModuleInCurrentContext(requestedPublicModuleId, dependencies,
                factoryOrValue);

        return actualPublicModuleId;
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
