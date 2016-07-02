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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.alfresco.util.Pair;
import org.alfresco.util.TempFileProvider;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.ResourceUtils;

/**
 * Instances of this class provide an URL connection abstraction over classpath loaded scripts, optionally able to provide override
 * semantics using a special extension path. The resolution of scripts will be cached to improve overall performance when used to load many
 * small scripts, such as would be the case in an AMD module system scenario.
 *
 * @author Axel Faust
 * @deprecated Resolution / caching now handled in {@link AlfrescoClasspathURLStreamHandler} and {@link ClasspathScriptFile}, with
 *             connection being generic instances of {@link ScriptFileURLConnection}
 */
@Deprecated
public class AlfrescoClasspathURLConnection extends CacheableResolutionURLConnection
{

    private static final String CLASSPATH_CACHE_KIND = "classpath";

    private static final String TMP_DIRECTORY = "Alfresco-Nashorn-ScriptsFromJARs";

    private static final Logger LOGGER = LoggerFactory.getLogger(AlfrescoClasspathURLConnection.class);

    // TODO Consolidate caches into one structure & map by path variants (String + Path) so we can reset by various conditions
    protected static final Map<URL, File> EXTRACTED_JAR_SCRIPTS = new ConcurrentHashMap<URL, File>();

    protected static final Map<URL, File> RESOLVED_SCRIPT_FILES = new ConcurrentHashMap<URL, File>();

    static
    {
        // don't need to reset the extracted JAR scripts (JARs aren't modified at runtime)
        registerCacheResetHandler(() -> RESOLVED_SCRIPT_FILES.clear());
        registerCacheKindResetHandler(CLASSPATH_CACHE_KIND, () -> RESOLVED_SCRIPT_FILES.clear());
    }

    // TODO use a watch service to detect modifications (deletions require full reset)
    protected static final Map<Path, Pair<Long, Long>> SCRIPT_FILE_ATTRIBUTES = new HashMap<Path, Pair<Long, Long>>();

    protected transient ClassPathResource resource;

    protected transient File file;

    protected String basePath = "alfresco";

    protected int basePathLength = this.basePath.length();

    protected String extensionPath = "extension";

    protected int extensionPathLength = this.extensionPath.length();

    protected boolean allowExtension;

    protected transient long contentLength = -1;

    protected transient long lastModified = -1;

    public AlfrescoClasspathURLConnection(final URL url)
    {
        super(url);
    }

    public AlfrescoClasspathURLConnection(final URL url, final boolean allowExtension)
    {
        this(url);
        this.allowExtension = allowExtension;
    }

    public AlfrescoClasspathURLConnection(final URL url, final boolean allowExtension, final String extensionPath)
    {
        this(url, allowExtension);
        this.extensionPath = extensionPath;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath)
    {
        this(url);
        this.basePath = basePath;
        this.basePathLength = basePath != null ? basePath.length() : -1;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath, final boolean allowExtension)
    {
        this(url, allowExtension);
        this.basePath = basePath;
        this.basePathLength = basePath != null ? basePath.length() : -1;
    }

    public AlfrescoClasspathURLConnection(final URL url, final String basePath, final boolean allowExtension, final String extensionPath)
    {
        this(url, basePath, allowExtension);
        this.extensionPath = extensionPath;
        this.extensionPathLength = basePath != null ? extensionPath.length() : -1;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void connect() throws IOException
    {
        if (!this.connected)
        {
            // this is primarily a validation step
            this.ensureScriptExists();

            this.connected = true;
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getContentLengthLong()
    {
        if (this.contentLength == -1)
        {
            this.ensureScriptExists();
            if (this.file != null)
            {
                final Pair<Long, Long> scriptFileAttributes = getScriptFileAttributes(this.file);
                this.contentLength = scriptFileAttributes != null ? scriptFileAttributes.getSecond().longValue() : this.file.length();
            }
            else
            {
                try
                {
                    this.contentLength = this.resource.contentLength();
                }
                catch (final IOException ioex)
                {
                    LOGGER.debug("Error getting contentLength from classpath resource", ioex);
                }
            }
        }

        return this.contentLength;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public long getLastModified()
    {
        if (this.lastModified == -1)
        {
            this.ensureScriptExists();
            if (this.file != null)
            {
                final Pair<Long, Long> scriptFileAttributes = getScriptFileAttributes(this.file);
                this.lastModified = scriptFileAttributes != null ? scriptFileAttributes.getFirst().longValue() : this.file.lastModified();
            }
            else
            {
                try
                {
                    this.lastModified = this.resource.lastModified();
                }
                catch (final IOException ioex)
                {
                    LOGGER.debug("Error getting lastModified from classpath resource", ioex);
                    this.lastModified = 0;
                }
            }
        }
        return this.lastModified;
    }

    /**
     * {@inheritDoc}
     */
    @SuppressWarnings("resource")
    @Override
    public InputStream getInputStream() throws IOException
    {
        this.connect();
        this.ensureScriptExists();

        // TODO Need to compensate StrictScriptEnforcingSourceInputStream adding to script content to support Nashorn cache
        // this assumes UTF-8
        final InputStream result;
        if (this.file != null)
        {
            // TODO use memory mapping
            result = new StrictScriptEnforcingSourceInputStream(new FileInputStream(this.file));
        }
        else
        {
            result = new StrictScriptEnforcingSourceInputStream(this.resource.getInputStream());
        }

        return result;
    }

    protected static Pair<Long, Long> getScriptFileAttributes(final File file)
    {
        Pair<Long, Long> attributes;
        final Path path = file.toPath();
        // TODO use a watch service to detect modifications (deletions require full reset)
        attributes = SCRIPT_FILE_ATTRIBUTES.get(path);
        if (attributes == null)
        {
            try
            {
                final BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
                attributes = new Pair<Long, Long>(Long.valueOf(attrs.lastModifiedTime().toMillis()), Long.valueOf(attrs.size()));
                SCRIPT_FILE_ATTRIBUTES.put(path, attributes);
            }
            catch (final IOException io)
            {
                LOGGER.warn("Error reading file attributes", io);
                attributes = null;
            }
        }

        return attributes;
    }

    /**
     * Ensures that the script referenced by the abstract classpath URL of this instance actually exists and prepares internal state for all
     * operations that {@link URLConnection} needs to provide.
     */
    protected void ensureScriptExists()
    {
        if (this.resource == null)
        {
            final StringBuilder pathBuilder = new StringBuilder();

            if (this.basePathLength > 0)
            {
                pathBuilder.append(this.basePath);
                pathBuilder.append('/');
            }
            pathBuilder.append(this.url.getPath());

            final ClassLoader classLoader = this.getClass().getClassLoader();

            for (final String suffix : Arrays.asList(null, ".nashornjs", ".js"))
            {
                Pair<ClassPathResource, File> resolved = null;

                if (suffix != null)
                {
                    pathBuilder.append(suffix);
                }

                if (this.allowExtension && this.extensionPathLength > 0)
                {
                    if (this.basePathLength > 0)
                    {
                        pathBuilder.insert(this.basePathLength, '/');
                        pathBuilder.insert(this.basePathLength + 1, this.extensionPath);
                    }
                    else
                    {
                        pathBuilder.insert(0, this.extensionPath);
                        pathBuilder.insert(this.extensionPathLength, '/');
                    }

                    resolved = checkAndResolvePath(pathBuilder.toString(), classLoader);

                    if (this.basePathLength > 0)
                    {
                        pathBuilder.delete(this.basePathLength, this.basePathLength + this.extensionPathLength + 1);
                    }
                    else
                    {
                        pathBuilder.delete(0, this.extensionPathLength + 1);
                    }
                }

                if (resolved == null)
                {
                    resolved = checkAndResolvePath(pathBuilder.toString(), classLoader);
                }

                if (suffix != null)
                {
                    pathBuilder.delete(pathBuilder.length() - suffix.length(), pathBuilder.length());
                }

                if (resolved != null)
                {
                    this.resource = resolved.getFirst();
                    this.file = resolved.getSecond();
                    break;
                }
            }

            if (this.resource == null)
            {
                LOGGER.debug("No resource found for {}", this.url);
                throw new IllegalStateException("No resource found for classpath: " + pathBuilder);
            }
        }
    }

    /**
     * Checks if a script exists at a specific path and resolves it to the according classpath resource and/or file handle for further
     * processing.
     *
     * @param path
     *            the path to check and resolve
     * @param classLoader
     *            the context class loader to use for resolution
     * @return the resolved classpath resource and/or file handle, or {@code null} if no resource/file could be resolved for the given path
     */
    protected static Pair<ClassPathResource, File> checkAndResolvePath(final String path, final ClassLoader classLoader)
    {
        Pair<ClassPathResource, File> resolved = null;

        LOGGER.debug("Resolving {}", path);
        final ClassPathResource testResource = new ClassPathResource(path, classLoader);
        try
        {
            URL testURL;

            // we save some of the getURL cost by caching resolution (reset via script processor)
            testURL = getCachedResolution(CLASSPATH_CACHE_KIND, path);
            if (testURL == null)
            {
                testURL = testResource.getURL();
                // equivalent to exists()
                if (testURL != null)
                {
                    registerCachedResolution(CLASSPATH_CACHE_KIND, path, testURL);
                }
                else
                {
                    registerCachedResolution(CLASSPATH_CACHE_KIND, path, SENTINEL);
                }
            }

            if (testURL != null && testURL != SENTINEL)
            {
                if (ResourceUtils.isJarURL(testURL))
                {
                    File extractedJARScript = EXTRACTED_JAR_SCRIPTS.get(testURL);
                    if (extractedJARScript == null)
                    {
                        // we extract JAR-contained scripts once to avoid unpack overhead
                        // as well as cost for lastModified/contentLength access via ClassPathResource
                        final File tmpDir = TempFileProvider.getTempDir(TMP_DIRECTORY);
                        extractedJARScript = new File(tmpDir, UUID.randomUUID() + ".js");

                        FileUtils.copyInputStreamToFile(testResource.getInputStream(), extractedJARScript);
                        EXTRACTED_JAR_SCRIPTS.put(testURL, extractedJARScript);

                        extractedJARScript.setLastModified(testResource.lastModified());
                    }

                    resolved = new Pair<ClassPathResource, File>(testResource, extractedJARScript);
                }
                else
                {
                    resolved = new Pair<ClassPathResource, File>(testResource, null);
                    // avoid repeated resolution costs
                    // again we want file to avoid cost for lastModified/contentLength via ClassPathResource
                    File file = RESOLVED_SCRIPT_FILES.get(testURL);
                    if (file == null && ResourceUtils.isFileURL(testURL))
                    {
                        try
                        {
                            file = ResourceUtils.getFile(testURL);
                            RESOLVED_SCRIPT_FILES.put(testURL, file);
                        }
                        catch (final IOException getFileIO)
                        {
                            // expected possibility
                            LOGGER.trace("Failed to resolve classpath resource to a file", getFileIO);
                        }
                    }
                    resolved.setSecond(file);
                }

                LOGGER.debug("Resolved {} to {}", path, resolved);
            }
        }
        catch (final IOException ioEx)
        {
            // expected possibility
            LOGGER.trace("IOException during getURL", ioEx);

            registerCachedResolution(CLASSPATH_CACHE_KIND, path, SENTINEL);
        }

        return resolved;
    }
}
