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
 * Instances of this interface represent elements that contribute functionality to the script processor and need to be reset when the script
 * processor itself is reset.
 *
 * @author Axel Faust
 */
public interface ResettableScriptProcessorElement
{

    /**
     *
     * @author Axel Faust
     */
    interface Registry
    {

        /**
         * Registers a resettable script processor element.
         *
         * @param element
         *            the element to register
         */
        void register(ResettableScriptProcessorElement element);
    }

    /**
     * Resets any cached state / data of this instance as part of a script processor reset.
     */
    void reset();
}
