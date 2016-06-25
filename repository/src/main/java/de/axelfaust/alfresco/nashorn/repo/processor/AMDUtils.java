/*
 * Copyright 2016 Axel Faust
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

import java.util.Map;

import org.alfresco.scripts.ScriptException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This class provides a collection of AMD loader related utilities that have been implemented in Java rather than in JavaScript to improve
 * the potential performance of the AMD loader infrastructure. These may not necessarily always relate to actual bottlenecks in the AMD
 * framework, but all are operations ideal for "outsourcing" to Java.
 *
 * @author Axel Faust
 */
public class AMDUtils
{

    private static final Logger LOGGER = LoggerFactory.getLogger("de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd");

    /**
     * Maps a module ID to the effective module ID using configuration-based mappings and the context module requesting the module
     * identified by the ID as a dependency.
     *
     * @param moduleId
     *            the ID of the module that should be mapped
     * @param contextModuleId
     *            the ID of the context module that is requesting a module as a dependency, or {@code null} if no context module is
     *            available
     * @param mappings
     *            the configured mappings
     * @return the mapped module ID
     */
    public static String mapModuleId(final String moduleId, final String contextModuleId, final Map<String, Map<String, String>> mappings)
    {
        final StringBuilder resultBuilder = new StringBuilder(moduleId);
        boolean mapped = false;

        if (contextModuleId != null)
        {
            int contextStart = 0;
            while (!mapped)
            {
                final int contextSeparatorIdx = contextModuleId.indexOf('/', contextStart);

                if (contextSeparatorIdx != -1)
                {
                    final String contextLookup = contextModuleId.substring(0, contextSeparatorIdx);

                    final Map<String, String> mapping = mappings.get(contextLookup);
                    if (mapping != null)
                    {
                        mapped = mapWithMapping(moduleId, resultBuilder, mapping, false);
                    }
                }
                else
                {
                    break;
                }

                contextStart = contextSeparatorIdx + 1;
            }
        }

        if (!mapped)
        {
            final Map<String, String> mapping = mappings.get("*");
            if (mapping != null)
            {
                mapped = mapWithMapping(moduleId, resultBuilder, mapping, true);
            }
        }

        return resultBuilder.toString();
    }

    /**
     * Normalizes a simple module ID, resolving any relative ID segments against the current context module that is requesting a dependency.
     *
     * @param moduleId
     *            the module ID to normalize
     * @param contextModuleId
     *            the ID of the context module, or {@code null} if no context module is available
     * @return the normalized module ID
     */
    public static String normalizeSimpleModuleId(final String moduleId, final String contextModuleId)
    {
        LOGGER.trace("Normalizing simple id \"{}\"", moduleId);

        final StringBuilder resultBuilder = new StringBuilder(moduleId);
        final StringBuilder prefixBuilder = new StringBuilder();

        if (resultBuilder.length() == 0)
        {
            throw new ScriptException("Module ID is empty");
        }

        int backslashIndex = -1;
        while ((backslashIndex = resultBuilder.indexOf("\\")) != -1)
        {
            resultBuilder.replace(backslashIndex, backslashIndex + 1, "/");
        }

        if (resultBuilder.indexOf("../") == 0 || resultBuilder.indexOf("./") == 0)
        {
            LOGGER.trace("Simple id \"{}\" is in relative form", moduleId);
            if (contextModuleId == null)
            {
                throw new ScriptException("Module ID is relative but call to normalize was made outside of an active module context");
            }
            prefixBuilder.append(contextModuleId.lastIndexOf('/') != -1 ? contextModuleId.substring(0, contextModuleId.lastIndexOf('/'))
                    : "");
        }

        while (resultBuilder.length() > 0 && resultBuilder.charAt(0) == '.')
        {
            if (resultBuilder.charAt(1) == '.' && resultBuilder.charAt(2) == '/')
            {
                if (prefixBuilder.indexOf("/") != -1)
                {
                    prefixBuilder.delete(prefixBuilder.lastIndexOf("/"), prefixBuilder.length());
                }
                else if (prefixBuilder.length() != 0)
                {
                    prefixBuilder.delete(0, prefixBuilder.length());
                }
                else
                {
                    throw new ScriptException("Module ID is relative with too many parent-level elements for current module context");
                }

                resultBuilder.delete(0, 3);
            }
            else if (resultBuilder.charAt(1) != '/')
            {
                throw new ScriptException("Invalid segment (not matching either relative . or ..) in module ID");
            }
            else
            {
                resultBuilder.delete(0, 2);
            }
        }

        if (resultBuilder.length() == 0)
        {
            throw new ScriptException("Module ID contains only relative path elements");
        }

        if (prefixBuilder.length() > 0)
        {
            prefixBuilder.append('/');
            resultBuilder.insert(0, prefixBuilder);
        }

        return resultBuilder.toString();
    }

    protected static boolean mapWithMapping(final String moduleId, final StringBuilder resultBuilder, final Map<String, String> mapping,
            final boolean asteriskMapping)
    {
        boolean mapped = false;
        int end = resultBuilder.length();
        while (!mapped)
        {
            final int separatorIdx = resultBuilder.substring(0, end).lastIndexOf('/');
            if (separatorIdx != -1)
            {
                final String lookup = resultBuilder.substring(0, separatorIdx);
                final String replacement = mapping.get(lookup);
                if (replacement != null)
                {
                    resultBuilder.replace(0, separatorIdx, replacement);
                    mapped = true;

                    LOGGER.trace("Mapped module id {} to {} via {}mapping of package {}", moduleId, resultBuilder,
                            asteriskMapping ? "asterisk " : "", lookup);
                }
                end = separatorIdx;
            }
            else
            {
                break;
            }
        }
        return mapped;
    }
}
