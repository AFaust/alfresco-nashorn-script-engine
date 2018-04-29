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
package de.axelfaust.alfresco.nashorn.repo.amd;

import de.axelfaust.alfresco.nashorn.common.amd.ModuleRegistry;
import de.axelfaust.alfresco.nashorn.common.amd.ModuleSystem;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class RepositoryModuleSystem extends ModuleSystem
{

    public RepositoryModuleSystem(final ScriptObjectMirror nativeObjectConstructor, final JSObject isolatedScopeBuilder,
            final JSObject nashornLoader)
    {
        super(nativeObjectConstructor, isolatedScopeBuilder, nashornLoader);
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    protected ModuleRegistry buildModuleRegistry()
    {
        return new RepositoryModuleRegistry(this);
    }
}
