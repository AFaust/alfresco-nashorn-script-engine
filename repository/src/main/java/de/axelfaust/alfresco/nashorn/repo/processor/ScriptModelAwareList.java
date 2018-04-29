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
import java.util.List;
import java.util.ListIterator;
import java.util.UUID;

/**
 * @author Axel Faust
 */
public class ScriptModelAwareList<V> implements List<V>
{

    private final UUID uuid = UUID.randomUUID();

    /**
     * {@inheritDoc}
     */
    @Override
    public int size()
    {
        return this.doGetList().size();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isEmpty()
    {
        return this.doGetList().isEmpty();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean contains(final Object o)
    {
        return this.doGetList().contains(o);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Iterator<V> iterator()
    {
        return this.doGetList().iterator();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object[] toArray()
    {
        return this.doGetList().toArray();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public <T> T[] toArray(final T[] a)
    {
        return this.doGetList().toArray(a);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean add(final V e)
    {
        return this.doGetList().add(e);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean remove(final Object o)
    {
        return this.doGetList().remove(o);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean containsAll(final Collection<?> c)
    {
        return this.doGetList().containsAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean addAll(final Collection<? extends V> c)
    {
        return this.doGetList().addAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean addAll(final int index, final Collection<? extends V> c)
    {
        return this.doGetList().addAll(index, c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean removeAll(final Collection<?> c)
    {
        return this.doGetList().removeAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean retainAll(final Collection<?> c)
    {
        return this.doGetList().retainAll(c);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void clear()
    {
        this.doGetList().clear();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public V get(final int index)
    {
        return this.doGetList().get(index);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public V set(final int index, final V element)
    {
        return this.doGetList().set(index, element);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void add(final int index, final V element)
    {
        this.doGetList().add(index, element);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public V remove(final int index)
    {
        return this.doGetList().remove(index);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int indexOf(final Object o)
    {
        return this.doGetList().indexOf(o);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int lastIndexOf(final Object o)
    {
        return this.doGetList().lastIndexOf(o);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public ListIterator<V> listIterator()
    {
        return this.doGetList().listIterator();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public ListIterator<V> listIterator(final int index)
    {
        return this.doGetList().listIterator(index);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public List<V> subList(final int fromIndex, final int toIndex)
    {
        return this.doGetList().subList(fromIndex, toIndex);
    }

    protected List<V> doGetList()
    {
        final NashornScriptModel currentModel = NashornScriptModel.getCurrentModel();
        final List<V> list = currentModel.getOrCreateIndexContainerData(this.uuid);
        return list;
    }
}
