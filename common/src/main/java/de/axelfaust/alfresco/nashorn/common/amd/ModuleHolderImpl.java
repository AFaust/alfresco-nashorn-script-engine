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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ModuleHolderImpl implements ModuleHolder
{

    private static final Logger LOGGER = LoggerFactory.getLogger(ModuleHolderImpl.class);

    private final String publicModuleId;

    private final String moduleId;

    private final String normalizedModuleId;

    private final String loaderModuleId;

    private final String contextScriptUrl;

    private final boolean fromSecureSource;

    private final boolean implicitModule;

    private final List<String> definedDependencies;

    private volatile boolean initialized = false;

    private volatile boolean constructing = false;

    private JSObject factory = null;

    private Object value = null;

    protected ModuleHolderImpl(final String publicModuleId, final String moduleId, final String loaderModuleId,
            final String contextScriptUrl, final Object value, final boolean fromSecureSource, final boolean implicitModule)
    {
        ParameterCheck.mandatoryString("publicModuleId", publicModuleId);
        ParameterCheck.mandatoryString("moduleId", moduleId);

        ParameterCheck.nonEmptyString("loaderModuleId", loaderModuleId);
        ParameterCheck.nonEmptyString("contextScriptUrl", contextScriptUrl);

        this.publicModuleId = publicModuleId;
        this.moduleId = moduleId;
        this.loaderModuleId = loaderModuleId != null ? loaderModuleId.trim() : null;
        this.contextScriptUrl = contextScriptUrl;
        this.definedDependencies = Collections.emptyList();
        this.fromSecureSource = fromSecureSource;
        this.value = value;
        this.initialized = true;
        this.implicitModule = implicitModule;

        if (this.loaderModuleId != null)
        {
            this.normalizedModuleId = this.loaderModuleId + '!' + this.moduleId;
        }
        else
        {
            this.normalizedModuleId = this.moduleId;
        }
    }

    protected ModuleHolderImpl(final String publicModuleId, final String moduleId, final String loaderModuleId,
            final String contextScriptUrl, final List<String> definedDependencies, final JSObject factory, final boolean fromSecureSource)
    {
        ParameterCheck.mandatoryString("publicModuleId", publicModuleId);
        ParameterCheck.mandatoryString("moduleId", moduleId);
        ParameterCheck.mandatoryNativeFunction("factory", factory);

        ParameterCheck.nonEmptyString("loaderModuleId", loaderModuleId);
        ParameterCheck.nonEmptyString("contextScriptUrl", contextScriptUrl);

        this.publicModuleId = publicModuleId;
        this.moduleId = moduleId;
        this.loaderModuleId = loaderModuleId != null ? loaderModuleId.trim() : null;
        this.contextScriptUrl = contextScriptUrl;
        // as per AMD spec the default dependencies are provided if only a constructor factory is used
        // https://github.com/amdjs/amdjs-api/blob/master/AMD.md#dependencies-
        this.definedDependencies = definedDependencies == null ? Arrays.asList("require", "exports", "module")
                : new ArrayList<>(definedDependencies);
        this.fromSecureSource = fromSecureSource;
        this.factory = factory;
        this.implicitModule = false;

        if (this.loaderModuleId != null)
        {
            this.normalizedModuleId = this.loaderModuleId + '!' + this.moduleId;
        }
        else
        {
            this.normalizedModuleId = this.moduleId;
        }
    }

    /**
     * @return the publicModuleId
     */
    @Override
    public String getPublicModuleId()
    {
        return this.publicModuleId;
    }

    /**
     * @return the moduleId
     */
    @Override
    public String getModuleId()
    {
        return this.moduleId;
    }

    /**
     * @return the normalizedModuleId
     */
    @Override
    public String getNormalizedModuleId()
    {
        return this.normalizedModuleId;
    }

    /**
     * @return the loaderModuleId
     */
    @Override
    public String getLoaderModuleId()
    {
        return this.loaderModuleId;
    }

    /**
     * @return the contextScriptUrl
     */
    @Override
    public String getContextScriptUrl()
    {
        return this.contextScriptUrl;
    }

    /**
     * @return the fromSecureSource
     */
    @Override
    public boolean isFromSecureSource()
    {
        return this.fromSecureSource;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getResolvedModule()
    {
        return this.getModule(false, null);
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getOrResolveModule(final ModuleRegistry moduleRegistry)
    {
        return ModuleSystem.withTaggedCallerContextModule(this, () -> {
            return this.getModule(true, moduleRegistry);
        });
    }

    protected Object getModule(final boolean forceConstruct, final ModuleRegistry moduleRegistry)
    {
        Object result;
        if (this.initialized)
        {
            result = this.value;

            if (result == null && this.implicitModule)
            {
                LOGGER.info("Module {} has been defined implicitly during script load but script {} failed to define value of module",
                        this.normalizedModuleId, this.contextScriptUrl);
                throw new UnavailableModuleException("Module '{}' could not be loaded", this.normalizedModuleId);
            }
        }
        else if (forceConstruct && this.factory != null)
        {
            if (this.constructing)
            {
                LOGGER.info("Module {} is included in a circular dependency graph", this.normalizedModuleId);
                throw new UnavailableModuleException("Module '{}' is included in a circular dependency graph", this.normalizedModuleId);
            }

            this.constructing = true;
            try
            {
                final List<Object> resolvedDependencies = new ArrayList<>();
                this.definedDependencies.forEach(dependencyModuleId -> {
                    final Object dependencyModule;

                    if ("module".equals(dependencyModuleId))
                    {
                        LOGGER.debug(
                                "Module {} uses 'module'-dependency to expose module during initialisation (avoiding circular dependency issues)",
                                this.normalizedModuleId);
                        final JSObject moduleMeta = moduleRegistry.newNativeObject();
                        moduleMeta.setMember("id", this.normalizedModuleId);
                        moduleMeta.setMember("url", this.contextScriptUrl);
                        if (this.value == null)
                        {
                            this.value = moduleRegistry.newNativeObject();
                        }
                        moduleMeta.setMember("exports", this.value);
                        moduleMeta.eval("Object.freeze(this);");
                        dependencyModule = moduleMeta;
                    }
                    else if ("exports".equals(dependencyModuleId))
                    {
                        LOGGER.debug(
                                "Module {} uses 'exports'-dependency to expose module during initialisation (avoiding circular dependency issues)",
                                this.normalizedModuleId);
                        if (this.value != null)
                        {
                            LOGGER.debug("Module {} uses multiple 'exports'-dependencies", this.normalizedModuleId);
                            dependencyModule = this.value;
                        }
                        else
                        {
                            dependencyModule = moduleRegistry.newNativeObject();
                            this.value = dependencyModule;
                        }
                    }
                    else
                    {
                        LOGGER.debug("Loading dependency {} for module {}", dependencyModuleId, this.normalizedModuleId);
                        dependencyModule = moduleRegistry.getOrResolveModule(dependencyModuleId, this);
                    }
                    resolvedDependencies.add(dependencyModule);
                });

                LOGGER.debug("Calling factory of module {}", this.normalizedModuleId);
                if (this.value != null)
                {
                    this.factory.call(null, resolvedDependencies.toArray(new Object[0]));
                    // module exports should be frozen to prevent post-factory modification
                    ((JSObject) this.value).eval("Object.freeze(this);");
                }
                else
                {
                    this.value = this.factory.call(null, resolvedDependencies.toArray(new Object[0]));
                }
                LOGGER.debug("Completed initialization via factory of module {}", this.normalizedModuleId);
                this.initialized = true;
            }
            finally
            {
                this.constructing = false;
            }

            result = this.value;
        }
        else
        {
            LOGGER.info("Module {} has not been initialized", this.normalizedModuleId);
            throw new UnavailableModuleException("Module '{}' has not been initialized", this.normalizedModuleId);
        }
        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String toString()
    {
        return "ModuleHolder [publicModuleId=" + this.publicModuleId + ", moduleId=" + this.moduleId + ", loaderModuleId="
                + this.loaderModuleId + ", contextScriptUrl=" + this.contextScriptUrl + ", fromSecureSource=" + this.fromSecureSource + "]";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int hashCode()
    {
        final int prime = 31;
        int result = 1;
        result = prime * result + this.publicModuleId.hashCode();
        result = prime * result + ((this.loaderModuleId == null) ? 0 : this.loaderModuleId.hashCode());
        result = prime * result + this.moduleId.hashCode();
        result = prime * result + ((this.contextScriptUrl == null) ? 0 : this.contextScriptUrl.hashCode());
        result = prime * result + (this.fromSecureSource ? 1231 : 1237);
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

        final String otherLoaderModuleId = other.getLoaderModuleId();
        if ((this.loaderModuleId == null && otherLoaderModuleId != null)
                || (this.loaderModuleId != null && !this.loaderModuleId.equals(otherLoaderModuleId)))
        {
            return false;
        }

        if (!this.moduleId.equals(other.getModuleId()))
        {
            return false;
        }

        final String otherContextScriptUrl = other.getContextScriptUrl();
        if ((this.contextScriptUrl == null && otherContextScriptUrl != null)
                || (this.contextScriptUrl != null && !this.contextScriptUrl.equals(otherContextScriptUrl)))
        {
            return false;
        }

        if (this.fromSecureSource != other.isFromSecureSource())
        {
            return false;
        }
        return true;
    }

}
