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
package de.axelfaust.alfresco.nashorn.common.amd.core;

import de.axelfaust.alfresco.nashorn.common.amd.ModuleLoader;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ScriptBackedModuleLoader implements ModuleLoader
{
    // could have just been a lambda, but then it could not be extended

    protected final String loaderModuleId;

    protected final JSObject loadFn;

    public ScriptBackedModuleLoader(final String loaderModuleId, final JSObject loadFn)
    {
        this.loaderModuleId = loaderModuleId;
        this.loadFn = loadFn;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void load(final String moduleId, final JSObject require, final JSObject load)
    {
        this.loadFn.call(null, new Object[] { moduleId, require, load });
    }
}
