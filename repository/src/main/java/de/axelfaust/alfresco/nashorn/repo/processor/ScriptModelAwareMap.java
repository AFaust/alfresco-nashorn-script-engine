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
package de.axelfaust.alfresco.nashorn.repo.processor;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * @author Axel Faust
 */
public class ScriptModelAwareMap<K, V> implements Map<K, V>
{

    private final UUID uuid = UUID.randomUUID();

    /**
     * {@inheritDoc}
     */
    @Override
    public int size()
    {
        return this.doGetMap().size();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isEmpty()
    {
        return this.doGetMap().isEmpty();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean containsKey(final Object key)
    {
        return this.doGetMap().containsKey(key);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean containsValue(final Object value)
    {
        return this.doGetMap().containsValue(value);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public V get(final Object key)
    {
        return this.doGetMap().get(key);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public V put(final K key, final V value)
    {
        return this.doGetMap().put(key, value);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public V remove(final Object key)
    {
        return this.doGetMap().remove(key);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void putAll(final Map<? extends K, ? extends V> m)
    {
        this.doGetMap().putAll(m);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void clear()
    {
        this.doGetMap().clear();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Set<K> keySet()
    {
        return this.doGetMap().keySet();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Collection<V> values()
    {
        return this.doGetMap().values();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Set<Entry<K, V>> entrySet()
    {
        return this.doGetMap().entrySet();
    }

    protected Map<K, V> doGetMap()
    {
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        final Map<K, V> map = currentModel.getOrCreateAssociativeContainerData(this.uuid);
        return map;
    }
}
