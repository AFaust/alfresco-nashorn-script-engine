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

import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public interface ModuleNormalizingLoader extends ModuleLoader
{

    /**
     * Normalises a module ID to resolve any relative constituents to obtain an absolute ID which can be loaded by this instance. This
     * operation generally complies with the semantics as
     * <a href="https://github.com/amdjs/amdjs-api/blob/master/LoaderPlugins.md#normalize-function-resourceid-normalize-">commonly defined
     * for an AMD loader plugin</a>, but extends it slightly for better contextualisation.
     *
     * @param moduleId
     *            the module ID to normalise
     * @param normalize
     *            the function handle for the default module ID normalisation processing
     * @param contextModule
     *            the definition of the module as the call context in which the ID needs to be normalised
     * @return the normalised module ID of the requested module
     */
    String normalize(String moduleId, JSObject normalize, JSObject contextModule);
}
