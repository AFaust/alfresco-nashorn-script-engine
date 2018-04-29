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
package de.axelfaust.alfresco.nashorn.common.util;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import jdk.nashorn.api.scripting.AbstractJSObject;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.ScriptUtils;
import jdk.nashorn.internal.runtime.ScriptObject;

/**
 * This generic base class for other Java-backed {@link JSObject} implementations provides some common handling of members. Subclasses must
 * override the public mutation APIs and call the corresponding internal implementations whereas read APIs access to the members/slots
 * mutated that way is already exposed.
 *
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class AbstractJavaScriptObject extends AbstractJSObject
{

    private String nameForDefaultValue;

    private final Set<String> enumerableMembers = new HashSet<>();

    private final Map<String, Object> members = new HashMap<>();

    private final List<Object> slots = new ArrayList<>();

    private final ReentrantReadWriteLock memberSlotLock = new ReentrantReadWriteLock(true);

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getMember(final String name)
    {
        Objects.requireNonNull(name);
        this.memberSlotLock.readLock().lock();
        try
        {
            final Object memberValue = this.isArray() && "length".equals(name) && !this.members.containsKey(name)
                    ? Integer.valueOf(this.slots.size()) : this.members.get(name);
            return memberValue;
        }
        finally
        {
            this.memberSlotLock.readLock().unlock();
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getSlot(final int slot)
    {
        Objects.requireNonNull(slot);
        this.memberSlotLock.readLock().lock();
        try
        {
            final Object slotValue = slot >= 0 && slot < this.slots.size() ? this.slots.get(slot) : null;
            return slotValue;
        }
        finally
        {
            this.memberSlotLock.readLock().unlock();
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean hasMember(final String name)
    {
        Objects.requireNonNull(name);
        this.memberSlotLock.readLock().lock();
        try
        {
            final boolean hasMember = this.enumerableMembers.contains(name);
            return hasMember;
        }
        finally
        {
            this.memberSlotLock.readLock().unlock();
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean hasSlot(final int slot)
    {
        Objects.requireNonNull(slot);
        this.memberSlotLock.readLock().lock();
        try
        {
            final boolean hasSlot = slot >= 0 && slot < this.slots.size();
            return hasSlot;
        }
        finally
        {
            this.memberSlotLock.readLock().unlock();
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Set<String> keySet()
    {
        this.memberSlotLock.readLock().lock();
        try
        {
            final LinkedHashSet<String> keys = new LinkedHashSet<>();
            keys.addAll(this.enumerableMembers);
            for (int idx = 0, max = this.slots.size(); idx < max; idx++)
            {
                keys.add(String.valueOf(idx));
            }
            return keys;
        }
        finally
        {
            this.memberSlotLock.readLock().unlock();
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Collection<Object> values()
    {
        final Collection<Object> values = new ArrayList<>();
        for (final String key : this.keySet())
        {
            values.add(this.getMember(key));
        }

        return values;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getDefaultValue(final Class<?> hint)
    {
        Object defaultValue;
        if (String.class.equals(hint))
        {
            final StringBuilder stringBuilder = new StringBuilder();
            stringBuilder.append("[");
            stringBuilder.append(this.getClassName());

            final String nameForDefaultValue = this.getNameForDefaultValue();
            if (nameForDefaultValue != null && !nameForDefaultValue.trim().isEmpty())
            {
                stringBuilder.append(" ");
                stringBuilder.append(nameForDefaultValue);
            }
            stringBuilder.append("]");
            defaultValue = stringBuilder.toString();
        }
        else
        {
            defaultValue = super.getDefaultValue(hint);
        }

        return defaultValue;
    }

    /**
     * Retrieves the The simple name to be used in the {@link jdk.nashorn.api.scripting.AbstractJSObject#getDefaultValue(Class) default
     * value}
     * string representation (in the form of {@code [&lt;ClassName&gt; &lt;nameForDefaultValue&gt;]}
     *
     * @return the name to be used in the default value string representation
     */
    protected String getNameForDefaultValue()
    {
        return this.nameForDefaultValue;
    }

    /**
     * Sets the The simple name to be used in the {@link jdk.nashorn.api.scripting.AbstractJSObject#getDefaultValue(Class) default
     * value}
     * string representation (in the form of {@code [&lt;ClassName&gt; &lt;nameForDefaultValue&gt;]}
     *
     * @param nameForDefaultValue
     *            the name to be used in the default value string representation
     */
    protected void setNameForDefaultValue(final String nameForDefaultValue)
    {
        this.nameForDefaultValue = nameForDefaultValue;
    }

    protected void setMemberImpl(final String name, final Object value, final boolean enumerable)
    {
        Objects.requireNonNull(name);

        this.memberSlotLock.writeLock().lock();
        try
        {
            this.members.put(name, value);

            if (enumerable)
            {
                this.enumerableMembers.add(name);
            }
            else
            {
                this.enumerableMembers.remove(name);
            }
        }
        finally
        {
            this.memberSlotLock.writeLock().unlock();
        }
    }

    protected void removeMemberImpl(final String name)
    {
        Objects.requireNonNull(name);

        this.memberSlotLock.writeLock().lock();
        try
        {
            this.members.remove(name);
            this.enumerableMembers.remove(name);
        }
        finally
        {
            this.memberSlotLock.writeLock().unlock();
        }
    }

    protected void setSlotImpl(final int slot, final Object value)
    {
        if (slot < 0)
        {
            throw new IllegalArgumentException("Only positive slot indices are allowed");
        }

        this.memberSlotLock.writeLock().lock();
        try
        {
            // grow list if necessary
            while (value != null && slot > this.slots.size())
            {
                this.slots.add(null);
            }

            if (slot < this.slots.size())
            {
                if (value == null && slot == this.slots.size() - 1)
                {
                    this.slots.remove(slot);
                    // shrink list by removing any nulls
                    for (int curSlot = slot - 1; curSlot >= 0; curSlot--)
                    {
                        if (this.slots.get(curSlot) != null)
                        {
                            break;
                        }
                        this.slots.remove(curSlot);
                    }
                }
                else
                {
                    this.slots.set(slot, value);
                }
            }
            else if (value != null)
            {
                this.slots.add(value);
            }
        }
        finally
        {
            this.memberSlotLock.writeLock().unlock();
        }
    }

    protected void removeSlotImpl(final int slot)
    {
        if (slot < 0)
        {
            throw new IllegalArgumentException("Only positive slot indices are allowed");
        }

        this.memberSlotLock.writeLock().lock();
        try
        {
            if (slot < this.slots.size())
            {
                this.slots.remove(slot);

                // slot was last - try and shrink list by removing any nulls
                if (slot == this.slots.size())
                {
                    for (int curSlot = slot - 1; curSlot >= 0; curSlot--)
                    {
                        if (this.slots.get(curSlot) != null)
                        {
                            break;
                        }
                        this.slots.remove(curSlot);
                    }
                }
            }
        }
        finally
        {
            this.memberSlotLock.writeLock().unlock();
        }
    }

    protected Object[] correctArgsAbstraction(final Object... args)
    {
        final Object[] realArgs = new Object[args.length];

        // workaround for JDK-8137258 (needs to be removed for JDK 9)
        for (int idx = 0; idx < realArgs.length; idx++)
        {
            if (args[idx] instanceof ScriptObject)
            {
                realArgs[idx] = ScriptUtils.wrap(args[idx]);
            }
            else
            {
                realArgs[idx] = args[idx];
            }
        }

        return realArgs;
    }
}
