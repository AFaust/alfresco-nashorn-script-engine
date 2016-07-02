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
package de.axelfaust.alfresco.nashorn.repo.loaders;

import java.io.IOException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.alfresco.util.PropertyCheck;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;

import de.axelfaust.alfresco.nashorn.repo.processor.ResettableScriptProcessorElement;

/**
 * @author Axel Faust
 */
public class AlfrescoClasspathURLStreamHandler extends URLStreamHandler implements InitializingBean, DisposableBean,
        ResettableScriptProcessorElement
{

    protected Registry registry;

    protected String basePath;

    protected String extensionPath;

    protected final Map<String, List<String>> precedenceChainByScript = new HashMap<String, List<String>>();

    protected final Map<String, ScriptFile> scriptHandles = new HashMap<String, ScriptFile>();

    /**
     * {@inheritDoc}
     */
    @Override
    public void afterPropertiesSet()
    {
        PropertyCheck.mandatory(this, "registry", this.registry);

        this.registry.register(this);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void destroy()
    {
        this.reset();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void reset()
    {
        this.scriptHandles.values().forEach(x -> x.reset());
    }

    /**
     * @param registry
     *            the registry to set
     */
    public void setRegistry(final Registry registry)
    {
        this.registry = registry;
    }

    /**
     * @param basePath
     *            the basePath to set
     */
    public void setBasePath(final String basePath)
    {
        this.basePath = basePath;
    }

    /**
     * @param extensionPath
     *            the extensionPath to set
     */
    public void setExtensionPath(final String extensionPath)
    {
        this.extensionPath = extensionPath;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL u) throws IOException
    {
        final String script;
        final boolean allowExtension = "extensible-classpath".equals(u.getProtocol());
        final boolean allowBase = !"raw-classpath".equals(u.getProtocol());
        if (allowBase && this.basePath != null && !this.basePath.trim().isEmpty())
        {
            script = this.basePath + "/" + u.getPath();
        }
        else
        {
            script = u.getPath();
        }

        final List<String> precendenceChain = this.getOrCreatePrecedenceChain(script, allowExtension);

        URLConnection con = null;
        for (final String potentialScript : precendenceChain)
        {
            ScriptFile scriptFile = this.scriptHandles.get(potentialScript);
            if (scriptFile == null)
            {
                scriptFile = new ClasspathScriptFile(potentialScript);
                this.scriptHandles.put(potentialScript, scriptFile);
            }

            if (scriptFile.exists(false))
            {
                con = new ScriptFileURLConnection(u, scriptFile);
                break;
            }
        }

        if (con == null)
        {
            throw new IOException("Script " + u + " does not exist");
        }

        return con;
    }

    protected List<String> getOrCreatePrecedenceChain(final String script, final boolean allowExtension)
    {
        List<String> precendenceChain = this.precedenceChainByScript.get(script);
        if (precendenceChain == null)
        {
            precendenceChain = new ArrayList<String>();
            this.precedenceChainByScript.put(script, precendenceChain);

            if (script.endsWith(".js") || script.endsWith(".nashornjs"))
            {
                precendenceChain.add(script);
            }
            else
            {
                final StringBuilder pathBuilder = new StringBuilder(script);

                final int basePathLength = this.basePath != null ? this.basePath.trim().length() : 0;
                final int extensionPathLength = allowExtension && this.extensionPath != null ? this.extensionPath.trim().length() : 0;

                for (final String suffix : Arrays.asList(null, ".nashornjs", ".js"))
                {
                    if (suffix != null)
                    {
                        pathBuilder.append(suffix);
                    }

                    if (extensionPathLength > 0)
                    {
                        if (basePathLength > 0)
                        {
                            pathBuilder.insert(basePathLength, '/');
                            pathBuilder.insert(basePathLength + 1, this.extensionPath);
                        }
                        else
                        {
                            pathBuilder.insert(0, this.extensionPath);
                            pathBuilder.insert(extensionPathLength, '/');
                        }

                        precendenceChain.add(pathBuilder.toString());

                        if (basePathLength > 0)
                        {
                            pathBuilder.delete(basePathLength, basePathLength + extensionPathLength + 1);
                        }
                        else
                        {
                            pathBuilder.delete(0, extensionPathLength + 1);
                        }
                    }

                    precendenceChain.add(pathBuilder.toString());

                    if (suffix != null)
                    {
                        pathBuilder.delete(pathBuilder.length() - suffix.length(), pathBuilder.length());
                    }
                }
            }
        }
        return precendenceChain;
    }

}
