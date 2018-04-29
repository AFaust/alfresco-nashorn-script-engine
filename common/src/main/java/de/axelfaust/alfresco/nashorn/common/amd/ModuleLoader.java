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
@FunctionalInterface
public interface ModuleLoader
{

    /**
     * Loads a module into a module system. This operation slightly differs from the semantics as
     * <a href="https://github.com/amdjs/amdjs-api/blob/master/LoaderPlugins.md#load-function-resourceid-require-load-config-">commonly
     * defined for an AMD loader plugin</a>. Specifically, a loader is not responsible for doing any actual loading of script files to be
     * evaluated as a module's value. This operation is primarily responsible from either resolving pre-defined module values, construct
     * Java-based module values or determine a URL to load a script, where the actual load would be delegated to the {@code load} function
     * provided as a parameter.
     *
     * This operation currently does not support the optional {@code config} parameter.
     *
     * @param moduleId
     *            the ID of the module to load
     * @param require
     *            the context-sensitive require function
     * @param load
     *            the callback to either specify a pre-built value as the module value, or provide a script URL to be loaded in order to
     *            load any module definitions contained therein
     */
    // TODO Detail load callback
    void load(String moduleId, JSObject require, JSObject load);
}