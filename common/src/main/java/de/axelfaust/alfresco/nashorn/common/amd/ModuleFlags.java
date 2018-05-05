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

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import de.axelfaust.alfresco.nashorn.common.amd.core.ModuleSystem;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;

/**
 * Instances of this interface provide custom flags to modify the way the {@link ModuleSystem} processes a given module. Having any such
 * flags will cause a module to be wrapped by a proxy handler when required (directly or as dependency of a module factory function) to
 * ensure these flags are respected when calling this module or any of its members, or accessing any of its members.
 *
 * @author Axel Faust
 */
public interface ModuleFlags
{

    static String AMD_FLAGS_MEMBER_NAME = "--amdFlags--";

    static enum Flag
    {
        REQUIRE_SECURE_CALLER;

        private static final Map<String, Flag> FLAGS_BY_SIMPLIFIED_LOWERCASE_VALUE = new HashMap<>();

        /**
         * Retrieves an enum value for a textual representation using rules that are laxer than those used by {@link Flag#valueOf(String)
         * valueOf}. The input to this operation will first be checked against the nominal name of an enum value by converting all
         * characters to upper-case. If this does not find a match, then the lower-case version of the value will be checked against
         * simplified, lower-case value representations where all underscores have been removed. This in effect allows values such as
         * {@code requireSecureCaller} to resolve to {@link #REQUIRE_SECURE_CALLER}, simplifying mapping from script-provided strings to
         * enum values.
         *
         * @param value
         * @return
         */
        public static Flag valueFor(final String value)
        {
            ParameterCheck.mandatoryString("value", value);
            Flag flag;

            try
            {
                flag = Flag.valueOf(value.toUpperCase(Locale.ENGLISH));
            }
            catch (final IllegalArgumentException iae)
            {
                flag = FLAGS_BY_SIMPLIFIED_LOWERCASE_VALUE.computeIfAbsent(value.toLowerCase(Locale.ENGLISH), (computeValue) -> {
                    Flag computedFlag = null;
                    for (final Flag flagCandidate : Flag.values())
                    {
                        final String candidateValue = flagCandidate.name().replaceAll("_", "").toLowerCase(Locale.ENGLISH);
                        if (computeValue.equals(candidateValue))
                        {
                            computedFlag = flagCandidate;
                            break;
                        }
                    }
                    return computedFlag;
                });
            }

            if (flag == null)
            {
                throw new IllegalArgumentException(value + " cannot be mapped to a Flag enum value");
            }

            return flag;
        }
    }

    /**
     * Checks if the module requires that a caller script / caller module be loaded / designated a "secure" script, since the module is
     * considered advanced API that should not be exposed to all contexts.
     *
     * @return {@code true} if the caller context is required to be secure, {@code false} otherwise
     */
    default boolean requiresSecureCaller()
    {
        return hasFlag(Flag.REQUIRE_SECURE_CALLER);
    }

    /**
     * Checks if the module has a specific flag set.
     *
     * @return {@code true} if the flag is set, {@code false} otherwise
     */
    boolean hasFlag(Flag flag);
}
