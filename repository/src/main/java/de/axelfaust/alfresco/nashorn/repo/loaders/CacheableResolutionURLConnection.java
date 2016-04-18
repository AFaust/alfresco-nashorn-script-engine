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
package de.axelfaust.alfresco.nashorn.repo.loaders;

import java.net.URL;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;

import org.alfresco.util.Pair;
import org.alfresco.util.ParameterCheck;

/**
 * Instances of the Nashorn engine loader URL connection base class internally use String to {@link URL} resolutions that are cacheable by
 * nature to avoid incurring repeating resolution costs. This base class serves as a uniform entry point for client code that needs to
 * universally or selective clear cached resolutions, i.e. to ensure new script files are picked up.
 *
 * @author Axel Faust
 */
public abstract class CacheableResolutionURLConnection extends URLConnection
{

    // TODO Expose cached resolutions and sentinels via admin console tool
    // TODO Add uniform "sentinel" handling

    private static final Map<Pair<String, String>, URL> CACHED_RESOLUTION = new HashMap<Pair<String, String>, URL>();

    protected CacheableResolutionURLConnection(final URL url)
    {
        super(url);
    }

    // TODO Add "sentinel only" and "all" resets
    // TODO Add explicit "remove sentinel/resolution" for specific path
    public static void clearCachedResolutions()
    {
        synchronized (CACHED_RESOLUTION)
        {
            CACHED_RESOLUTION.clear();
        }
    }

    protected static void registerCachedResolution(final String cacheKind, final String resolutionKey, final URL resolutionValue)
    {
        ParameterCheck.mandatoryString("cacheKind", cacheKind);
        ParameterCheck.mandatoryString("resolutionKey", resolutionKey);
        ParameterCheck.mandatory("resolutionValue", resolutionValue);

        synchronized (CACHED_RESOLUTION)
        {
            CACHED_RESOLUTION.put(new Pair<String, String>(cacheKind, resolutionKey), resolutionValue);
        }
    }

    protected static URL getCachedResolution(final String cacheKind, final String resolutionKey)
    {
        ParameterCheck.mandatoryString("cacheKind", cacheKind);
        ParameterCheck.mandatoryString("resolutionKey", resolutionKey);

        synchronized (CACHED_RESOLUTION)
        {
            final URL url = CACHED_RESOLUTION.get(new Pair<String, String>(cacheKind, resolutionKey));
            return url;
        }
    }
}
