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
import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.WeakHashMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;

/**
 * This class provides a simple Java-backed implementation of the {@link ModuleFlags} interface based on {@link Flag flag enum values}.
 *
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class EnumBackedModuleFlags implements ModuleFlags
{

    private static final Map<JSObject, EnumBackedModuleFlags> FLAGS_CACHE = new WeakHashMap<>();

    private static final ReentrantReadWriteLock FLAGS_CACHE_LOCK = new ReentrantReadWriteLock(true);

    /**
     * Extracts module flags from a native-like object using the {@link ModuleFlags#AMD_FLAGS_MEMBER_NAME flag meta-member} and transforms them
     * to an enum-based representation. This operation caches results for objects based on their object identity.
     *
     * @param object
     *            the native-like object for which to retrieve flags
     * @return the flags of the object or {@code null} if the object does not define any flags
     */
    public static EnumBackedModuleFlags fromJSObject(final JSObject object)
    {
        EnumBackedModuleFlags flags;

        FLAGS_CACHE_LOCK.readLock().lock();
        try
        {
            flags = FLAGS_CACHE.get(object);
        }
        finally
        {
            FLAGS_CACHE_LOCK.readLock().unlock();
        }

        if (flags == null && object.hasMember(AMD_FLAGS_MEMBER_NAME))
        {
            final Object member = object.getMember(ModuleFlags.AMD_FLAGS_MEMBER_NAME);
            if (member != null)
            {
                if (member instanceof JSObject && ((JSObject) member).isArray())
                {
                    final Collection<Object> values = ((JSObject) member).values();
                    flags = valuesToFlags(values);
                }
                else if (member instanceof Flag[])
                {
                    flags = new EnumBackedModuleFlags((Flag[]) member);
                }
                else if (member instanceof Object[])
                {
                    flags = valuesToFlags(Arrays.asList((Object[]) member));
                }
                else if (member instanceof Collection<?>)
                {
                    flags = valuesToFlags((Collection<?>) member);
                }
                else
                {
                    throw new UnsupportedOperationException("Unable to process flags value " + member);
                }
            }
            else
            {
                flags = null;
            }

            FLAGS_CACHE_LOCK.writeLock().lock();
            try
            {
                FLAGS_CACHE.put(object, flags);
            }
            finally
            {
                FLAGS_CACHE_LOCK.writeLock().unlock();
            }
        }

        return flags;
    }

    private static EnumBackedModuleFlags valuesToFlags(final Collection<?> values)
    {
        EnumBackedModuleFlags flags;
        final Collection<Flag> flagsCol = new ArrayList<>();
        for (final Object memberEl : values)
        {
            if (memberEl instanceof Flag)
            {
                flagsCol.add((Flag) memberEl);
            }
            else if (memberEl instanceof String)
            {
                flagsCol.add(Flag.valueFor((String) memberEl));
            }
        }
        flags = new EnumBackedModuleFlags(flagsCol);
        return flags;
    }

    protected final Set<Flag> setFlags;

    public EnumBackedModuleFlags(final Flag... flags)
    {
        ParameterCheck.mandatory("flags", flags);
        final EnumSet<Flag> setFlags = EnumSet.noneOf(Flag.class);
        for (final Flag flag : flags)
        {
            setFlags.add(flag);
        }
        this.setFlags = Collections.unmodifiableSet(setFlags);
    }

    public EnumBackedModuleFlags(final Collection<Flag> flags)
    {
        ParameterCheck.mandatory("flags", flags);
        final EnumSet<Flag> setFlags = EnumSet.noneOf(Flag.class);
        setFlags.addAll(flags);
        this.setFlags = Collections.unmodifiableSet(setFlags);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean hasFlag(final Flag flag)
    {
        final boolean hasFlag = this.setFlags.contains(flag);
        return hasFlag;
    }

}
