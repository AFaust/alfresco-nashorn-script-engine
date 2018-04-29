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
import de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel;

/**
 * @author Axel Faust
 */
public class RepositoryModuleRegistry extends ModuleRegistry
{

    protected RepositoryModuleRegistry(final RepositoryModuleSystem moduleSystem)
    {
        super(moduleSystem, NashornScriptModel.newMap(), NashornScriptModel.newMap(), NashornScriptModel.newSet());
    }

}
