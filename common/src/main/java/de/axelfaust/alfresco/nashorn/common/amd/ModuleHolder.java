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

import javax.script.ScriptException;

/**
 * @author Axel Faust
 */
public interface ModuleHolder
{

    /**
     * Creates an alternative module holder instance that exposes the same module instance under a different public module ID.
     *
     * @param alternatePublicModuleId
     *            the alternative public module ID
     * @return the alternative module holder instance
     */
    default ModuleHolder withAlternatePublicModuleId(final String alternatePublicModuleId)
    {
        return new ModuleHolderFacadeImpl(alternatePublicModuleId, this);
    }

    /**
     * Retrieves the public module ID by which this module instance represented by this holder should be accessible.
     *
     * @return the public module ID
     */
    String getPublicModuleId();

    /**
     * Retrieves the normalised module ID for the module instance represented by this holder. The normalised module ID reflects the
     * technical identifier of the module based on the loader used for defining it and its module ID (which may differ from its public
     * module ID due to aliasing / mapping).
     *
     * @return the normalised module ID
     */
    default String getNormalizedModuleId()
    {
        final String loaderModuleId = getLoaderModuleId();
        final String moduleId = getModuleId();
        final String normalizedModuleId = (loaderModuleId != null ? (loaderModuleId + "!") : "") + moduleId;
        return normalizedModuleId;
    }

    /**
     * Retrieves the module ID for the module instance represented by this holder.
     *
     * @return the module ID
     */
    String getModuleId();

    /**
     * Retrieves the module ID of the loader module that was used to load / define the module instance represented by this holder.
     *
     * @return the loader module ID
     */
    String getLoaderModuleId();

    /**
     * Retrieves the script URL of the script from which the module represented by this holder has been loaded / defined.
     *
     * @return the script URL
     */
    String getContextScriptUrl();

    /**
     * Retrieves the flag specifying if the module represented by this holder has been loaded / defined from a secure context.
     *
     * @return {@code true} if the module is considered to be from a secure source / context, {@code false} otherwise
     */
    boolean isFromSecureSource();

    /**
     * Retrieves the resolved module instance. This operation will not initialise the module instance if it has not been properly
     * initialised yet.
     *
     * @return the module instance
     * @throws UnavailableModuleException
     *             if the module instance has not been initialised yet
     */
    Object getResolvedModule();

    /**
     * Retrieves the module instance, lazily initialising it if it has not yet been initialised
     *
     * @param moduleRegistry
     *            reference to the module registry for resolution of dependencies
     * @return the module instance
     * @throws UnavailableModuleException
     *             if a dependent module instance could not be resolved
     * @throws ScriptException
     *             if the module factory throws an unhandled script error
     * @throws SecureModuleException
     *             if a dependent module only allows secure callers and the module represented by this holder is not
     *             {@link #isFromSecureSource() secure}
     */
    Object getOrResolveModule(final ModuleRegistry moduleRegistry);
}
