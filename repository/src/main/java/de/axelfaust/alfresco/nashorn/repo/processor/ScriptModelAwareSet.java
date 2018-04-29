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
import java.util.Iterator;
import java.util.Set;
import java.util.UUID;

/**
 * @author Axel Faust
 */
public class ScriptModelAwareSet<V> implements Set<V>
{

    private final UUID uuid = UUID.randomUUID();

    /**
     * {@inheritDoc}
     */
    @Override
    public int size()
    {
        return this.doGetSet().size();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isEmpty()
    {
        return this.doGetSet().isEmpty();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean contains(final Object o)
    {
        return this.doGetSet().contains(o);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Iterator<V> iterator()
    {
        return this.doGetSet().iterator();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object[] toArray()
    {
        return this.doGetSet().toArray();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public <T> T[] toArray(final T[] a)
    {
        return this.doGetSet().toArray(a);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean add(final V e)
    {
        return this.doGetSet().add(e);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean remove(final Object o)
    {
        return this.doGetSet().remove(o);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean containsAll(final Collection<?> c)
    {
        return this.doGetSet().containsAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean addAll(final Collection<? extends V> c)
    {
        return this.doGetSet().addAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean retainAll(final Collection<?> c)
    {
        return this.doGetSet().retainAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean removeAll(final Collection<?> c)
    {
        return this.doGetSet().removeAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void clear()
    {
        this.doGetSet().clear();
    }

    protected Set<V> doGetSet()
    {
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        final Set<V> set = currentModel.getOrCreateUniqueEntryContainerData(this.uuid);
        return set;
    }
}
