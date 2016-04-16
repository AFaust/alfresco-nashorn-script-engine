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
package de.axelfaust.alfresco.nashorn.repo.processor;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import jdk.nashorn.api.scripting.AbstractJSObject;

import org.alfresco.util.ParameterCheck;

/**
 * @author Axel Faust
 */
@SuppressWarnings({ "restriction", "resource" })
public class NashornScriptModelAwareContainer extends AbstractJSObject
{

    /**
     * The set of supported data container types.
     *
     * @author Axel Faust
     */
    public static enum DataContainerType
    {
        /** Provides a list-/array-like indexed data container */
        INDEXED,
        /** Provides an object-/map-like associative data container */
        ASSOCIATIVE;
    }

    private final UUID uuid = UUID.randomUUID();

    private final DataContainerType type;

    protected NashornScriptModelAwareContainer(final DataContainerType type)
    {
        ParameterCheck.mandatory("type", type);
        this.type = type;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getMember(final String name)
    {
        Object result;
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                switch (name)
                {
                    case "length":
                        result = Integer.valueOf(indexContainerData.size());
                        break;
                    default:
                        try
                        {
                            final int idx = Integer.parseInt(name);
                            if (idx >= 0 && idx < indexContainerData.size())
                            {
                                result = indexContainerData.get(idx);
                            }
                            else
                            {
                                result = null;
                            }
                        }
                        catch (final NumberFormatException nex)
                        {
                            result = null;
                        }
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                result = associativeContainerData.get(name);
                if (result == null)
                {
                    switch (name)
                    {
                        case "length":
                            result = Integer.valueOf(associativeContainerData.size());
                            break;
                        default: // empty
                    }
                }
                break;
            default:
                result = null;
        }

        return result;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getSlot(final int idx)
    {
        Object result;
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                if (idx >= 0 && idx < indexContainerData.size())
                {
                    result = indexContainerData.get(idx);
                }
                else
                {
                    result = null;
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                result = associativeContainerData.get(Integer.valueOf(idx));
                break;
            default:
                result = null;
        }

        return result;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean hasMember(final String name)
    {
        boolean result;
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                try
                {
                    final int idx = Integer.parseInt(name);
                    final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                    result = idx >= 0 && idx < indexContainerData.size();
                }
                catch (final NumberFormatException nex)
                {
                    result = false;
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                result = associativeContainerData.containsKey(name);
                break;
            default:
                result = false;
        }

        return result;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean hasSlot(final int idx)
    {
        boolean result;
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                result = idx >= 0 && idx < indexContainerData.size();
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                result = associativeContainerData.containsKey(Integer.valueOf(idx));
                break;
            default:
                result = false;
        }

        return result;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void removeMember(final String name)
    {
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                try
                {
                    final int idx = Integer.parseInt(name);
                    final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                    if (idx >= 0 && idx < indexContainerData.size())
                    {
                        indexContainerData.remove(idx);
                    }
                    else
                    {
                        throw new IllegalArgumentException("Index cannot be negative or equal/larger than current size/length");
                    }
                }
                catch (final NumberFormatException nex)
                {
                    throw new IllegalArgumentException("Index must be an integer number");
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                associativeContainerData.remove(name);
                break;
            default:
                throw new UnsupportedOperationException("removeMember not supported by " + this.type);
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void setMember(final String name, final Object value)
    {
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                try
                {
                    final int idx = Integer.parseInt(name);
                    final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                    if (idx >= 0 && idx < indexContainerData.size())
                    {
                        indexContainerData.set(idx, value);
                    }
                    else if (idx == indexContainerData.size())
                    {
                        indexContainerData.add(value);
                    }
                    else
                    {
                        throw new IllegalArgumentException("Index cannot be negative or larger than current size/length");
                    }
                }
                catch (final NumberFormatException nex)
                {
                    throw new IllegalArgumentException("Index must be an integer number");
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                associativeContainerData.put(name, value);
                break;
            default:
                throw new UnsupportedOperationException("setMember not supported by " + this.type);
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void setSlot(final int idx, final Object value)
    {
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                if (idx >= 0 && idx < indexContainerData.size())
                {
                    indexContainerData.set(idx, value);
                }
                else if (idx == indexContainerData.size())
                {
                    indexContainerData.add(value);
                }
                else
                {
                    throw new IllegalArgumentException("Index cannot be negative or larger than current size/length");
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                associativeContainerData.put(Integer.valueOf(idx), value);
                break;
            default:
                throw new UnsupportedOperationException("setSlot not supported by " + this.type);
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Set<String> keySet()
    {
        final Set<String> keys;

        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                keys = new LinkedHashSet<String>();
                final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                for (int idx = 0, max = indexContainerData.size(); idx < max; idx++)
                {
                    keys.add(String.valueOf(idx));
                }
                break;
            case ASSOCIATIVE:
                keys = new HashSet<String>();
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                for (final Object key : associativeContainerData.keySet())
                {
                    keys.add(String.valueOf(key));
                }
                break;
            default:
                keys = Collections.emptySet();

        }
        return keys;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Collection<Object> values()
    {
        final Collection<Object> values;

        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        switch (this.type)
        {
            case INDEXED:
                values = new ArrayList<Object>();
                final List<Object> indexContainerData = currentModel.getOrIndexContainerData(this.uuid);
                values.addAll(indexContainerData);
                break;
            case ASSOCIATIVE:
                values = new ArrayList<Object>();
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                values.addAll(associativeContainerData.values());
                break;
            default:
                values = Collections.emptySet();

        }
        return values;
    }

    // TODO Other hooks

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean isArray()
    {
        return this.type == DataContainerType.INDEXED;
    }
}
