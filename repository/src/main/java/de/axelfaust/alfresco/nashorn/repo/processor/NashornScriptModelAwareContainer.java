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

    /**
     *
     * This single abstract method (SAM) interface allows scripts to provide callback functions to a model-aware container to derive the
     * initial value of a field in an associative data container.
     *
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface NamedValueInitializationCallback
    {

        /**
         * Determines the initial value of a specific named member.
         *
         * @param member
         *            the name of the member for which to get the initial value
         * @return the initial value
         */
        Object getInitialValue(String member);
    }

    private static final Object EXPLICIT_NULL = new Object();

    /**
     *
     * This single abstract method (SAM) interface allows scripts to provide callback functions to a model-aware container to derive the
     * initial value of a field in an indexed data container.
     *
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface IndexValueInitializationCallback
    {

        /**
         * Determines the initial value of a specific indexed member.
         *
         * @param index
         *            the index of the member for which to get the initial value
         * @return the initial value
         */
        Object getInitialValue(int index);
    }

    private final UUID uuid = UUID.randomUUID();

    private final DataContainerType type;

    private final IndexValueInitializationCallback indexedValueCallback;

    private final NamedValueInitializationCallback namedValueCallback;

    protected NashornScriptModelAwareContainer(final DataContainerType type)
    {
        ParameterCheck.mandatory("type", type);
        this.type = type;

        this.indexedValueCallback = null;
        this.namedValueCallback = null;
    }

    protected NashornScriptModelAwareContainer(final IndexValueInitializationCallback indexValueCallback)
    {
        ParameterCheck.mandatory("indexValueCallback", indexValueCallback);
        this.indexedValueCallback = indexValueCallback;
        this.type = DataContainerType.INDEXED;

        this.namedValueCallback = null;
    }

    protected NashornScriptModelAwareContainer(final NamedValueInitializationCallback namedValueCallback)
    {
        ParameterCheck.mandatory("namedValueCallback", namedValueCallback);
        this.namedValueCallback = namedValueCallback;
        this.type = DataContainerType.ASSOCIATIVE;

        this.indexedValueCallback = null;
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
                final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
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

                            if (result == EXPLICIT_NULL)
                            {
                                result = null;
                            }
                            else if (result == null && this.indexedValueCallback != null)
                            {
                                final Object initialValue = this.indexedValueCallback.getInitialValue(idx);
                                while (idx > indexContainerData.size())
                                {
                                    indexContainerData.add(null);
                                }

                                indexContainerData.add(initialValue != null ? initialValue : EXPLICIT_NULL);
                                result = initialValue;
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
                        default:
                            if (this.namedValueCallback != null)
                            {
                                final Object initialValue = this.namedValueCallback.getInitialValue(name);
                                associativeContainerData.put(name, initialValue != null ? initialValue : EXPLICIT_NULL);
                                result = initialValue;
                            }
                    }
                }

                if (result == EXPLICIT_NULL)
                {
                    result = null;
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
                final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
                if (idx >= 0 && idx < indexContainerData.size())
                {
                    result = indexContainerData.get(idx);
                }
                else
                {
                    result = null;
                }

                if (result == EXPLICIT_NULL)
                {
                    result = null;
                }
                else if (result == null && this.indexedValueCallback != null)
                {
                    final Object initialValue = this.indexedValueCallback.getInitialValue(idx);
                    while (idx > indexContainerData.size())
                    {
                        indexContainerData.add(null);
                    }

                    indexContainerData.add(initialValue != null ? initialValue : EXPLICIT_NULL);
                    result = initialValue;
                }

                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                result = associativeContainerData.get(Integer.valueOf(idx));

                if (result == EXPLICIT_NULL)
                {
                    result = null;
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
                    final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
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
                final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
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
                    final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
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
                    final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
                    if (idx >= 0 && idx < indexContainerData.size())
                    {
                        indexContainerData.set(idx, value == null ? EXPLICIT_NULL : value);
                    }
                    else if (idx == indexContainerData.size())
                    {
                        indexContainerData.add(value == null ? EXPLICIT_NULL : value);
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
                associativeContainerData.put(name, value == null ? EXPLICIT_NULL : value);
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
                final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
                if (idx >= 0 && idx < indexContainerData.size())
                {
                    indexContainerData.set(idx, value == null ? EXPLICIT_NULL : value);
                }
                else if (idx == indexContainerData.size())
                {
                    indexContainerData.add(value == null ? EXPLICIT_NULL : value);
                }
                else
                {
                    throw new IllegalArgumentException("Index cannot be negative or larger than current size/length");
                }
                break;
            case ASSOCIATIVE:
                final Map<Object, Object> associativeContainerData = currentModel.getOrCreateAssociativeContainerData(this.uuid);
                associativeContainerData.put(Integer.valueOf(idx), value == null ? EXPLICIT_NULL : value);
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
                final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
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
                final List<Object> indexContainerData = currentModel.getOrCreateIndexContainerData(this.uuid);
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
