/*
 * Copyright 2015 Axel Faust
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
package de.axelfaust.alfresco.nashorn.repo.web.scripts;

import java.io.InputStream;
import java.io.Reader;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;

import org.alfresco.repo.web.scripts.RepositoryScriptProcessor;
import org.alfresco.service.cmr.repository.ScriptLocation;
import org.alfresco.service.cmr.repository.ScriptProcessor;
import org.springframework.extensions.webscripts.ScriptContent;

import de.axelfaust.alfresco.nashorn.repo.processor.AMDLoadableScript;

/**
 * Instances of this class provide a facade around web script {@link ScriptContent} to allow execution via {@link ScriptProcessor}. This
 * class is mostly based on the similarily named class of default {@link RepositoryScriptProcessor}.
 */
public class RepositoryScriptLocation implements ScriptLocation, AMDLoadableScript
{

    protected final ScriptContent content;

    /**
     * The abstract path of the web script controller derived from the facaded {@link #content script content}.
     */
    protected volatile String webScriptPath;

    /**
     * Default constructor
     *
     * @param content
     *            the script content to facade
     */
    public RepositoryScriptLocation(final ScriptContent content)
    {
        this.content = content;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getLoaderName()
    {
        return "webscript";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getScriptModuleId()
    {
        if (this.webScriptPath == null)
        {
            this.determineWebScriptPath();
        }

        if (this.webScriptPath == null)
        {
            throw new IllegalStateException("Web script path could not be determined from script content");
        }
        return this.webScriptPath;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public InputStream getInputStream()
    {
        return this.content.getInputStream();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Reader getReader()
    {
        return this.content.getReader();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isCachable()
    {
        return this.content.isCachable();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isSecure()
    {
        return this.content.isSecure();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getPath()
    {
        return this.content.getPath();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String toString()
    {
        final StringBuilder builder = new StringBuilder();
        builder.append("RepositoryScriptLocation [");
        if (this.content.getPathDescription() != null)
        {
            builder.append("content.getPathDescription()=");
            builder.append(this.content.getPathDescription());
            builder.append(", ");
        }
        if (this.getLoaderName() != null)
        {
            builder.append("getLoaderName()=");
            builder.append(this.getLoaderName());
            builder.append(", ");
        }
        if (this.getScriptModuleId() != null)
        {
            builder.append("getScriptModuleId()=");
            builder.append(this.getScriptModuleId());
        }
        builder.append("]");
        return builder.toString();
    }

    protected void determineWebScriptPath()
    {
        // unfortunately no ScriptContent implementation exposes the abstract web script path, so we have to resort to this reflection stuff
        final List<String> fieldsToTry = Arrays.asList("path", "scriptPath");

        for (final String fieldName : fieldsToTry)
        {
            if (this.webScriptPath == null)
            {
                this.webScriptPath = tryAndGetField(this.content, fieldName);
            }
        }
    }

    protected static String tryAndGetField(final ScriptContent content, final String fieldName)
    {
        String result;

        try
        {
            final Field field = content.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            if (field.getType().isAssignableFrom(String.class))
            {
                result = (String) field.get(content);
            }
            else
            {
                result = null;
            }
        }
        catch (final IllegalAccessException | NoSuchFieldException e)
        {
            result = null;
        }
        return result;
    }
}