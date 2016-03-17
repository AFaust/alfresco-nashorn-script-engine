/*
 * Copyright 2015, 2016 Axel Faust
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

/**
 * Instances of this interface represent scripts that can be natively loaded via the AMD loader within a {@link NashornScriptProcessor} and
 * don't require the processor to handle any of the IO.
 *
 * @author Axel Faust
 */
public interface AMDLoadableScript
{

    /**
     * Retrieves the name of the loader plugin (if any) that can load this script.
     *
     * @return the name of the loader plugin or {@code null} if script does not require a specific loader plugin
     */
    String getLoaderName();

    /**
     * Retrieves the module ID that this script can be loaded by via the AMD loader or loader plugin.
     *
     * @return the module ID of this script
     */
    String getScriptModuleId();
}
