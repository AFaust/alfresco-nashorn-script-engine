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
public class ScriptBackedModuleNormalizingLoader extends ScriptBackedModuleLoader implements ModuleNormalizingLoader
{

    protected final JSObject normalizeFn;

    public ScriptBackedModuleNormalizingLoader(final String loaderModuleId, final JSObject loadFn, final JSObject normalizeFn)
    {
        super(loaderModuleId, loadFn);
        this.normalizeFn = normalizeFn;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public String normalize(final String moduleId, final JSObject normalizeSimpleId, final JSObject contextModule)
    {
        final Object result = this.normalizeFn.call(null, new Object[] { moduleId, normalizeSimpleId, contextModule });
        if (!(result instanceof CharSequence))
        {
            throw new ModuleSystemRuntimeException(
                    "Function 'load' of loader module '{}' does not return a string as required by API contract", this.loaderModuleId);
        }
        return String.valueOf(result);
    }
}
