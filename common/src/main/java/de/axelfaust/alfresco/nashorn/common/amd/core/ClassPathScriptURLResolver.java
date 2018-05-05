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

import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import de.axelfaust.alfresco.nashorn.common.amd.ScriptURLResolver;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;

/**
 * @author Axel Faust
 */
public class ClassPathScriptURLResolver implements ScriptURLResolver
{

    protected final ClassLoader classLoader;

    protected final List<String> supportedFileSuffixes = new ArrayList<>();

    protected final Map<String, ClassPathScriptURLResolutionWrapper> locationResolutionCache = new HashMap<>();

    public ClassPathScriptURLResolver(final ClassLoader classLoader)
    {
        ParameterCheck.mandatory("classLoader", classLoader);
        this.classLoader = classLoader;

        // no suffix is always supported
        this.supportedFileSuffixes.add("");
    }

    public ClassPathScriptURLResolver()
    {
        this(ClassPathScriptURLResolver.class.getClassLoader());
    }

    public void addSupportedFileSuffix(final String fileSuffix)
    {
        ParameterCheck.mandatoryString("fileSuffix", fileSuffix);
        if (!this.supportedFileSuffixes.contains(fileSuffix))
        {
            this.supportedFileSuffixes.add(fileSuffix);
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public URL resolveModuleScriptUrl(final String moduleId, final String... locations)
    {
        ParameterCheck.mandatoryString("moduleId", moduleId);

        URL resolvedURL = null;

        final List<String> locationsToTest = this.buildLocationsToTest(moduleId, locations);
        final Optional<String> existingLocation = locationsToTest.stream().filter(locationToTest -> {
            final ClassPathScriptURLResolutionWrapper resolution = this.locationResolutionCache.computeIfAbsent(locationToTest, (location) -> {
                final ClassPathScriptURLResolutionWrapper resolutionWrapper = this.buildResolutionWrapper(location);
                return resolutionWrapper;
            });
            return resolution.exists(false);
        }).findFirst();

        if (existingLocation.isPresent())
        {
            resolvedURL = this.locationResolutionCache.get(existingLocation.get()).getURL();
        }

        return resolvedURL;
    }

    protected List<String> buildLocationsToTest(final String moduleId, final String... locations)
    {
        final List<String> locationsToTest = new ArrayList<>();
        if (locations.length > 0)
        {
            Arrays.asList(locations).forEach(baseLocation -> {
                final String simpleLocation = baseLocation + "/" + moduleId;
                this.supportedFileSuffixes.forEach(fileSuffix -> {
                    if (fileSuffix.isEmpty())
                    {
                        locationsToTest.add(simpleLocation);
                    }
                    else if (fileSuffix.startsWith("."))
                    {
                        locationsToTest.add(simpleLocation + fileSuffix);
                    }
                    else
                    {
                        locationsToTest.add(simpleLocation + '.' + fileSuffix);
                    }
                });
            });
        }
        else
        {
            this.supportedFileSuffixes.forEach(fileSuffix -> {
                if (fileSuffix.isEmpty())
                {
                    locationsToTest.add(moduleId);
                }
                else if (fileSuffix.startsWith("."))
                {
                    locationsToTest.add(moduleId + fileSuffix);
                }
                else
                {
                    locationsToTest.add(moduleId + '.' + fileSuffix);
                }
            });
        }

        return locationsToTest;
    }

    protected ClassPathScriptURLResolutionWrapper buildResolutionWrapper(final String location)
    {
        return new ClassPathScriptURLResolutionWrapper(location, this.classLoader);
    }
}
