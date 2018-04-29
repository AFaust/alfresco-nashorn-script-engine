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

/**
 * @author Axel Faust
 */
@FunctionalInterface
public interface ScriptURLResolver
{

    /**
     * Resolves the script URL for a specific module against the lookup locations configured for the most specific, common module ID prefix.
     * module ID prefix.
     *
     * @param moduleId
     *            the ID of the module for which to resolve the script URL
     * @param locations
     *            any configured base locations from which to resolve the script URL for the module
     * @return the resolved script URL, or {@code null} if the script could not be resolved / found
     */
    URL resolveModuleScriptUrl(String moduleId, String... locations);
}
