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
package de.axelfaust.alfresco.nashorn.common.amd.core;

import java.net.URL;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;

/**
 * @author Axel Faust
 */
public class ClassPathScriptURLResolutionWrapper
{

    protected static final long DEFAULT_EXISTENCE_CHECK_INTERVAL = 30000;

    private static final Logger LOGGER = LoggerFactory.getLogger(ClassPathScriptURLResolutionWrapper.class);

    // following constants copied from org.springframework.util.ResourceUtils to avoid dependency
    private static final String URL_PROTOCOL_JAR = "jar";

    private static final String URL_PROTOCOL_ZIP = "zip";

    private static final String URL_PROTOCOL_VFSZIP = "vfszip";

    private static final String URL_PROTOCOL_WSJAR = "wsjar";

    private static final String URL_PROTOCOL_CODE_SOURCE = "code-source";

    private static final String JAR_URL_SEPARATOR = "!/";

    protected final String location;

    protected final ClassLoader classLoader;

    protected volatile long existenceCheckInterval = DEFAULT_EXISTENCE_CHECK_INTERVAL;

    protected transient boolean existsInJarFile = false;

    protected transient long lastExistenceCheck = -1;

    protected transient URL url = null;

    public ClassPathScriptURLResolutionWrapper(final String location, final ClassLoader classLoader)
    {
        ParameterCheck.mandatoryString("location", location);
        ParameterCheck.mandatory("classLoader", classLoader);
        this.location = location;
        this.classLoader = classLoader;
    }

    /**
     * @param existenceCheckInterval
     *            the existenceCheckInterval to set
     */
    public void setExistenceCheckInterval(final long existenceCheckInterval)
    {
        this.existenceCheckInterval = existenceCheckInterval;
    }

    public URL getURL()
    {
        // ensures initialisation of a reasonable value and implicitly validates current state (from time to time)
        this.exists(false);
        return this.url;
    }

    public boolean exists(final boolean force)
    {
        boolean exists = this.url != null;

        if (!this.existsInJarFile || force)
        {
            final long currentTimeMillis = System.currentTimeMillis();
            if (force || currentTimeMillis - this.lastExistenceCheck >= this.existenceCheckInterval)
            {
                synchronized (this)
                {
                    exists = this.url != null;
                    if (force || currentTimeMillis - this.lastExistenceCheck >= this.existenceCheckInterval)
                    {
                        this.performExistenceCheck();
                        this.lastExistenceCheck = currentTimeMillis;
                        exists = this.url != null;
                    }
                }
            }
        }

        return exists;
    }

    protected synchronized void performExistenceCheck()
    {
        LOGGER.debug("Checking existence of {}", this.location);
        this.url = this.classLoader.getResource(this.location);
        if (this.url != null)
        {
            final String protocol = this.url.getProtocol();
            this.existsInJarFile = (URL_PROTOCOL_JAR.equals(protocol) || URL_PROTOCOL_ZIP.equals(protocol)
                    || URL_PROTOCOL_VFSZIP.equals(protocol) || URL_PROTOCOL_WSJAR.equals(protocol)
                    || (URL_PROTOCOL_CODE_SOURCE.equals(protocol) && this.url.getPath().contains(JAR_URL_SEPARATOR)));
        }
        else
        {
            this.existsInJarFile = false;
        }

        LOGGER.debug("Resolved resource URL {} for {} (existsInJarFile = {})", this.url, this.location, this.existsInJarFile);
    }
}
