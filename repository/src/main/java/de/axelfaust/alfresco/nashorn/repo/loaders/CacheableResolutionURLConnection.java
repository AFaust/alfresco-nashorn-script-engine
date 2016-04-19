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

import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import org.alfresco.util.Pair;
import org.alfresco.util.ParameterCheck;

/**
 * Instances of this base class internally use String to {@link URL} resolutions that are cacheable by nature to avoid incurring repeating
 * resolution costs. This base class serves as a uniform entry point for client code that needs to universally or selective clear cached
 * resolutions, i.e. to ensure new script files are picked up.
 *
 * @author Axel Faust
 */
public abstract class CacheableResolutionURLConnection extends URLConnection
{
    // TODO Expose cached resolutions and sentinels via admin console tool

    private static final Map<Pair<String, String>, URL> CACHED_RESOLUTION = new HashMap<Pair<String, String>, URL>();

    private static final ReentrantReadWriteLock RESOLUTION_LOCK = new ReentrantReadWriteLock(true);

    protected static final URL SENTINEL;
    static
    {
        URL sentinel;
        try
        {
            sentinel = new URL("file://sentinel");
        }
        catch (final MalformedURLException ignore)
        {
            sentinel = null;
        }
        SENTINEL = sentinel;
    }

    protected CacheableResolutionURLConnection(final URL url)
    {
        super(url);
    }

    /**
     * Clears all cached resolutions.
     */
    public static void clearCachedResolutions()
    {
        RESOLUTION_LOCK.writeLock().lock();
        try
        {
            CACHED_RESOLUTION.clear();
        }
        finally
        {
            RESOLUTION_LOCK.writeLock().unlock();
        }
    }

    /**
     * Clears all cached resolutions for a particular kind of cached resolutions (typically one specific sub-type of URL connection).
     *
     * @param cacheKind
     *            the kind of cached resolutions to clear
     */
    public static void clearCachedResolutions(final String cacheKind)
    {
        ParameterCheck.mandatoryString("cacheKind", cacheKind);

        final Collection<Pair<String, String>> keys = new ArrayList<Pair<String, String>>();
        RESOLUTION_LOCK.readLock().lock();
        try
        {
            for (final Entry<Pair<String, String>, URL> resolutionEntry : CACHED_RESOLUTION.entrySet())
            {
                if (cacheKind.equals(resolutionEntry.getKey().getFirst()))
                {
                    keys.add(resolutionEntry.getKey());
                }
            }
        }
        finally
        {
            RESOLUTION_LOCK.readLock().unlock();
        }

        RESOLUTION_LOCK.writeLock().lock();
        try
        {
            CACHED_RESOLUTION.keySet().removeAll(keys);
            keys.clear();

            // another go-through to pick up any we missed / inserted between read and write lock
            for (final Entry<Pair<String, String>, URL> resolutionEntry : CACHED_RESOLUTION.entrySet())
            {
                if (cacheKind.equals(resolutionEntry.getKey().getFirst()))
                {
                    keys.add(resolutionEntry.getKey());
                }
            }
            CACHED_RESOLUTION.keySet().removeAll(keys);
        }
        finally
        {
            RESOLUTION_LOCK.writeLock().unlock();
        }
    }

    /**
     * Clears a single cached resolution.
     *
     * @param cacheKind
     *            the kind of cached resolution to clear
     * @param resolutionKey
     *            the specific key for the resolution to clear
     */
    public static void clearCachedResolution(final String cacheKind, final String resolutionKey)
    {
        ParameterCheck.mandatoryString("cacheKind", cacheKind);
        ParameterCheck.mandatoryString("resolutionKey", resolutionKey);

        RESOLUTION_LOCK.writeLock().lock();
        try
        {
            CACHED_RESOLUTION.remove(new Pair<String, String>(cacheKind, resolutionKey));
        }
        finally
        {
            RESOLUTION_LOCK.writeLock().unlock();
        }
    }

    /**
     * Clears all cached resolutions that failed to produce a valid script to enable retries at resolving the corresponding base paths.
     */
    public static void clearResolutionSentinels()
    {
        final Collection<Pair<String, String>> keys = new ArrayList<Pair<String, String>>();
        RESOLUTION_LOCK.readLock().lock();
        try
        {
            for (final Entry<Pair<String, String>, URL> resolutionEntry : CACHED_RESOLUTION.entrySet())
            {
                if (resolutionEntry.getValue() == SENTINEL)
                {
                    keys.add(resolutionEntry.getKey());
                }
            }
        }
        finally
        {
            RESOLUTION_LOCK.readLock().unlock();
        }

        RESOLUTION_LOCK.writeLock().lock();
        try
        {
            CACHED_RESOLUTION.keySet().removeAll(keys);

            // another simple go-through to pick up any we missed / inserted between read and write lock
            CACHED_RESOLUTION.values().remove(SENTINEL);
        }
        finally
        {
            RESOLUTION_LOCK.writeLock().unlock();
        }
    }

    protected static void registerCachedResolution(final String cacheKind, final String resolutionKey, final URL resolutionValue)
    {
        ParameterCheck.mandatoryString("cacheKind", cacheKind);
        ParameterCheck.mandatoryString("resolutionKey", resolutionKey);
        ParameterCheck.mandatory("resolutionValue", resolutionValue);

        RESOLUTION_LOCK.writeLock().lock();
        try
        {
            CACHED_RESOLUTION.put(new Pair<String, String>(cacheKind, resolutionKey), resolutionValue);
        }
        finally
        {
            RESOLUTION_LOCK.writeLock().unlock();
        }
    }

    protected static URL getCachedResolution(final String cacheKind, final String resolutionKey)
    {
        ParameterCheck.mandatoryString("cacheKind", cacheKind);
        ParameterCheck.mandatoryString("resolutionKey", resolutionKey);

        RESOLUTION_LOCK.readLock().lock();
        try
        {
            final URL url = CACHED_RESOLUTION.get(new Pair<String, String>(cacheKind, resolutionKey));
            return url;
        }
        finally
        {
            RESOLUTION_LOCK.readLock().unlock();
        }
    }
}
