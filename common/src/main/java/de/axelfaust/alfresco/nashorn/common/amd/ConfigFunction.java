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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.util.AbstractJavaScriptObject;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ConfigFunction extends AbstractJavaScriptObject
{

    private static final String KEY_MAP = "map";

    private static final String KEY_PATHS = "paths";

    private static final String ERR_PATHS_OBJECT = "Config parameter 'paths' must be an object";

    private static final String ERR_MAP_OBJECT = "Config parameter 'map' must be an object";

    private static final String ERR_MAP_MAPPINGS_OBJECT = "Config parameter 'map' must be an object consisting of string -> string mapping objects for module ID prefix(es)";

    private static final String ERR_PATHS_STRUCTURE = "Config parameter 'paths' must be a mapping of module ID prefixes (string) to a single path (string) or multiple paths (array)";

    private static final Logger LOGGER = LoggerFactory.getLogger(ConfigFunction.class);

    protected final ModuleSystem moduleSystem;

    public ConfigFunction(final ModuleSystem moduleSystem)
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

        boolean configured = false;

        if (args.length > 0 && args[0] instanceof JSObject)
        {
            final JSObject configObj = (JSObject) args[0];
            if (!configObj.isArray() && !configObj.isFunction())
            {
                if (configObj.hasMember(KEY_PATHS))
                {
                    configured = this.handlePathsConfig(configObj) || configured;
                }

                if (configObj.hasMember(KEY_MAP))
                {
                    configured = this.handleMapConfig(configObj) || configured;
                }
            }
        }

        return configured;
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

    protected boolean handlePathsConfig(final JSObject configObj)
    {
        final Object pathsVal = configObj.getMember(KEY_PATHS);
        if (!(pathsVal instanceof JSObject) || ((JSObject) pathsVal).isArray() || ((JSObject) pathsVal).isFunction())
        {
            throw new IllegalArgumentException(ERR_PATHS_OBJECT);
        }

        final JSObject pathsObj = (JSObject) pathsVal;
        final Set<String> keys = pathsObj.keySet();
        final Map<String, List<String>> checkedPaths = new HashMap<>();
        keys.forEach(key -> {
            final Object memberVal = pathsObj.getMember(key);
            if (memberVal instanceof CharSequence)
            {
                checkedPaths.put(key, Collections.singletonList(memberVal.toString()));
            }
            else if (memberVal instanceof JSObject)
            {
                final JSObject pathsArr = (JSObject) memberVal;
                if (!pathsArr.isArray())
                {
                    throw new IllegalArgumentException(ERR_PATHS_STRUCTURE);
                }

                final Object pathsLength = pathsArr.getMember("length");
                if (!(pathsLength instanceof Number))
                {
                    throw new IllegalArgumentException(ERR_PATHS_STRUCTURE);
                }

                final List<String> pathsForPrefix = new ArrayList<>();
                for (int slot = 0; slot < ((Number) pathsLength).intValue(); slot++)
                {
                    final Object pathVal = pathsArr.getSlot(slot);
                    if (pathVal instanceof CharSequence)
                    {
                        pathsForPrefix.add(pathVal.toString());
                    }
                    else if (pathVal != null)
                    {
                        throw new IllegalArgumentException(ERR_PATHS_STRUCTURE);
                    }
                }
                checkedPaths.put(key, pathsForPrefix);
            }
            else if (memberVal != null)
            {
                throw new IllegalArgumentException(ERR_PATHS_STRUCTURE);
            }
        });

        LOGGER.debug("Configuring module paths {}", checkedPaths);
        final ModuleLoadService moduleLoadService = this.moduleSystem.getModuleLoadService();
        checkedPaths.forEach((moduleIdPrefix, paths) -> {
            moduleLoadService.setPaths(moduleIdPrefix, paths);
        });

        return !checkedPaths.isEmpty();
    }

    protected boolean handleMapConfig(final JSObject configObj)
    {
        final Object mapsVal = configObj.getMember(KEY_MAP);
        if (!(mapsVal instanceof JSObject) || ((JSObject) mapsVal).isArray() || ((JSObject) mapsVal).isFunction())
        {
            throw new IllegalArgumentException(ERR_MAP_OBJECT);
        }

        final JSObject mapObj = (JSObject) mapsVal;

        final Map<String, Map<String, String>> checkedMappings = new HashMap<>();
        final Set<String> moduleIdPrefixes = mapObj.keySet();
        moduleIdPrefixes.forEach(moduleIdPrefix -> {
            final Object memberVal = mapObj.getMember(moduleIdPrefix);

            if (!(memberVal instanceof JSObject) || ((JSObject) memberVal).isArray() || ((JSObject) memberVal).isFunction())
            {
                throw new IllegalArgumentException(ERR_MAP_MAPPINGS_OBJECT);
            }

            final Map<String, String> mappingsForModuleIdPrefix = new HashMap<>();
            final JSObject mapping = (JSObject) memberVal;
            final Set<String> moduleIds = mapping.keySet();
            moduleIds.forEach(moduleId -> {
                final Object mappingValue = mapping.getMember(moduleId);
                if (!(mappingValue instanceof CharSequence))
                {
                    throw new IllegalArgumentException(ERR_MAP_MAPPINGS_OBJECT);
                }
                mappingsForModuleIdPrefix.put(moduleId, mappingValue.toString());
            });
            checkedMappings.put(moduleIdPrefix, mappingsForModuleIdPrefix);
        });

        LOGGER.debug("Configuring module mapping {}", checkedMappings);
        final ModuleLoadService moduleLoadService = this.moduleSystem.getModuleLoadService();
        checkedMappings.forEach((moduleIdPrefix, mappings) -> {
            moduleLoadService.addMappings(moduleIdPrefix, mappings);
        });

        return !checkedMappings.isEmpty();
    }
}
