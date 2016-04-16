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

/**
 * @author Axel Faust
 */
public interface AMDModulePreloader
{

    /**
     * Preloads an AMD module.
     *
     * @param moduleId
     *            the ID of the module to preload (including loader name prefix)
     */
    public void preload(String moduleId);
}
