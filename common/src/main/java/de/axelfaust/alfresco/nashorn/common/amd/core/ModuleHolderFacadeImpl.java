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

import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;

/**
 * @author Axel Faust
 */
public class ModuleHolderFacadeImpl implements ModuleHolder
{

    private final String publicModuleId;

    protected final ModuleHolder delegate;

    public ModuleHolderFacadeImpl(final String publicModuleId, final ModuleHolder delegate)
    {
        ParameterCheck.mandatoryString("publicModuleId", publicModuleId);
        ParameterCheck.mandatory("delegate", delegate);

        this.publicModuleId = publicModuleId;
        this.delegate = delegate;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getPublicModuleId()
    {
        return this.publicModuleId;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getNormalizedModuleId()
    {
        return this.delegate.getNormalizedModuleId();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getModuleId()
    {
        return this.delegate.getModuleId();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getLoaderModuleId()
    {
        return this.delegate.getLoaderModuleId();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getContextScriptUrl()
    {
        return this.delegate.getContextScriptUrl();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isFromSecureSource()
    {
        return this.delegate.isFromSecureSource();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getResolvedModule()
    {
        return this.delegate.getResolvedModule();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getOrResolveModule(final ModuleRegistry moduleRegistry)
    {
        return this.delegate.getOrResolveModule(moduleRegistry);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String toString()
    {
        return "ModuleHolder [publicModuleId=" + this.publicModuleId + ", moduleId=" + this.getModuleId() + ", loaderModuleId="
                + this.getLoaderModuleId() + ", contextScriptUrl=" + this.getContextScriptUrl() + ", fromSecureSource="
                + this.isFromSecureSource() + "]";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int hashCode()
    {
        final int prime = 31;
        int result = 1;

        final String loaderModuleId = this.getLoaderModuleId();
        final String moduleId = this.getModuleId();
        final String contextScriptUrl = this.getContextScriptUrl();

        result = prime * result + this.publicModuleId.hashCode();
        result = prime * result + ((loaderModuleId == null) ? 0 : loaderModuleId.hashCode());
        result = prime * result + moduleId.hashCode();
        result = prime * result + ((contextScriptUrl == null) ? 0 : contextScriptUrl.hashCode());
        result = prime * result + (this.isFromSecureSource() ? 1231 : 1237);
        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean equals(final Object obj)
    {
        if (this == obj)
        {
            return true;
        }
        if (obj == null)
        {
            return false;
        }
        if (!(obj instanceof ModuleHolder))
        {
            return false;
        }
        final ModuleHolder other = (ModuleHolder) obj;
        if (!this.publicModuleId.equals(other.getPublicModuleId()))
        {
            return false;
        }

        final String loaderModuleId = this.getLoaderModuleId();
        final String otherLoaderModuleId = other.getLoaderModuleId();
        if ((loaderModuleId == null && otherLoaderModuleId != null)
                || (loaderModuleId != null && !loaderModuleId.equals(otherLoaderModuleId)))
        {
            return false;
        }

        final String moduleId = this.getModuleId();
        if (!moduleId.equals(other.getModuleId()))
        {
            return false;
        }

        final String contextScriptUrl = this.getContextScriptUrl();
        final String otherContextScriptUrl = other.getContextScriptUrl();
        if ((contextScriptUrl == null && otherContextScriptUrl != null)
                || (contextScriptUrl != null && !contextScriptUrl.equals(otherContextScriptUrl)))
        {
            return false;
        }

        if (this.isFromSecureSource() != other.isFromSecureSource())
        {
            return false;
        }
        return true;
    }

}
