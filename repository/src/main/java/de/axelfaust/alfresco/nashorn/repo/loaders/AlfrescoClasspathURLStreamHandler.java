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

/**
 * @author Axel Faust
 */
public class AlfrescoClasspathURLStreamHandler extends URLStreamHandler
{

    protected boolean allowExtension = false;

    protected boolean basePathSet;

    protected String basePath;

    public AlfrescoClasspathURLStreamHandler()
    {
    }

    public AlfrescoClasspathURLStreamHandler(final String basePath)
    {
        this.basePath = basePath;
        this.basePathSet = true;
    }

    public AlfrescoClasspathURLStreamHandler(final boolean allowExtension)
    {
        this.allowExtension = allowExtension;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL u) throws IOException
    {
        final AlfrescoClasspathURLConnection con = this.basePathSet ? new AlfrescoClasspathURLConnection(u, this.basePath,
                this.allowExtension) : new AlfrescoClasspathURLConnection(u, this.allowExtension);
        return con;
    }

}
