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

import java.io.Closeable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import javax.script.ScriptContext;

import de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModelAwareContainer.DataContainerType;
import de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModelAwareContainer.IndexValueInitializationCallback;
import de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModelAwareContainer.NamedValueInitializationCallback;

/**
 * @author Axel Faust
 */
public class NashornScriptModel implements Closeable
{

    private static final ThreadLocal<NashornScriptModel> CURRENT_MODEL = new ThreadLocal<>();

    private static final ThreadLocal<List<NashornScriptModel>> PENDING_MODELS = new ThreadLocal<>();

    /**
     * Opens a new script model and activates it for the current thread. Any currently active model will be put into a pending state until
     * the new model is closed.
     *
     * @return the handle to the new model
     */
    @SuppressWarnings("resource")
    public static NashornScriptModel openModel()
    {
        final NashornScriptModel model = new NashornScriptModel();

        final NashornScriptModel currentModel = CURRENT_MODEL.get();
        if (currentModel != null)
        {
            List<NashornScriptModel> pendingModels = PENDING_MODELS.get();
            if (pendingModels == null)
            {
                pendingModels = new ArrayList<>();
                PENDING_MODELS.set(pendingModels);
            }
            pendingModels.add(currentModel);
        }

        CURRENT_MODEL.set(model);

        return model;
    }

    /**
     * Creates a new indexed data container to be used for managing script-execution specific state in a script environment without any
     * sharing via {@link ScriptContext}.
     *
     * @return the new indexed data container
     */
    public static NashornScriptModelAwareContainer newIndexedContainer()
    {
        final NashornScriptModelAwareContainer dataContainer = new NashornScriptModelAwareContainer(DataContainerType.INDEXED);
        return dataContainer;
    }

    /**
     * Creates a new list to be used for managing script-execution specific state in Java-backed script objects.
     *
     * @return the new list
     */
    public static <V> List<V> newList()
    {
        return new ScriptModelAwareList<>();
    }

    /**
     * Creates a new indexed data container to be used for managing script-execution specific state in a script environment without any
     * sharing via {@link ScriptContext}.
     *
     * @param callback
     *            the initial value callback for the indexed container
     * @return the new indexed data container
     */
    public static NashornScriptModelAwareContainer newIndexedContainer(final IndexValueInitializationCallback callback)
    {
        final NashornScriptModelAwareContainer dataContainer = new NashornScriptModelAwareContainer(callback);
        return dataContainer;
    }

    /**
     * Creates a new associative data container to be used for managing script-execution specific state in a script environment without any
     * sharing via {@link ScriptContext}.
     *
     * @return the new associative data container
     */
    public static NashornScriptModelAwareContainer newAssociativeContainer()
    {
        final NashornScriptModelAwareContainer dataContainer = new NashornScriptModelAwareContainer(DataContainerType.ASSOCIATIVE);
        return dataContainer;
    }

    /**
     * Creates a new map to be used for managing script-execution specific state in Java-backed script objects.
     *
     * @return the new map
     */
    public static <K, V> Map<K, V> newMap()
    {
        return new ScriptModelAwareMap<>();
    }

    /**
     * Creates a new associative data container to be used for managing script-execution specific state in a script environment without any
     * sharing via {@link ScriptContext}.
     *
     * @param callback
     *            the initial value callback for the associative container
     * @return the new associative data container
     */
    public static NashornScriptModelAwareContainer newAssociativeContainer(final NamedValueInitializationCallback callback)
    {
        final NashornScriptModelAwareContainer dataContainer = new NashornScriptModelAwareContainer(callback);
        return dataContainer;
    }

    /**
     * Creates a new set to be used for managing script-execution specific state in Java-backed script objects.
     *
     * @return the new set
     */
    public static <V> Set<V> newSet()
    {
        return new ScriptModelAwareSet<>();
    }

    /**
     * Retrieves the currently active model
     *
     * @return the current model
     */
    protected static NashornScriptModel getCurrentModel()
    {
        final NashornScriptModel currentModel = CURRENT_MODEL.get();
        if (currentModel == null)
        {
            throw new IllegalStateException("No model is currently active");
        }

        return currentModel;
    }

    private final Thread thread = Thread.currentThread();

    private final Map<UUID, List<?>> indexedContainers = new HashMap<>();

    private final Map<UUID, Map<?, ?>> associativeContainers = new HashMap<>();

    private final Map<UUID, Set<?>> uniqueEntryContainers = new HashMap<>();

    private boolean closed = false;

    private NashornScriptModel()
    {
        // NO-OP
    }

    /**
     * Closes this script model.
     *
     * @throws IllegalStateException
     *             if the current model can't be closed (already closed; not belonging to current thread; not being the current model)
     */
    @Override
    public void close()
    {
        if (this.closed)
        {
            throw new IllegalStateException("Model has already been closed");
        }

        if (this.thread != Thread.currentThread())
        {
            throw new IllegalStateException("Model belongs to a different thread and can only be closed within that thread");
        }

        if (CURRENT_MODEL.get() != this)
        {
            throw new IllegalStateException("Model is not the currently active model");
        }

        final List<NashornScriptModel> pendingModels = PENDING_MODELS.get();
        if (pendingModels != null && !pendingModels.isEmpty())
        {
            final NashornScriptModel pendingModel = pendingModels.remove(pendingModels.size() - 1);
            CURRENT_MODEL.set(pendingModel);
        }
        else
        {
            CURRENT_MODEL.remove();
        }

        this.closed = true;
    }

    protected <V> List<V> getOrCreateIndexContainerData(final UUID containerUUID)
    {
        @SuppressWarnings("unchecked")
        List<V> list = (List<V>) this.indexedContainers.get(containerUUID);
        if (list == null)
        {
            list = new ArrayList<>();
            this.indexedContainers.put(containerUUID, list);
        }
        return list;
    }

    protected <K, V> Map<K, V> getOrCreateAssociativeContainerData(final UUID containerUUID)
    {
        @SuppressWarnings("unchecked")
        Map<K, V> map = (Map<K, V>) this.associativeContainers.get(containerUUID);
        if (map == null)
        {
            map = new LinkedHashMap<>();
            this.associativeContainers.put(containerUUID, map);
        }
        return map;
    }

    protected <V> Set<V> getOrCreateUniqueEntryContainerData(final UUID containerUUID)
    {
        @SuppressWarnings("unchecked")
        Set<V> set = (Set<V>) this.uniqueEntryContainers.get(containerUUID);
        if (set == null)
        {
            set = new HashSet<>();
            this.uniqueEntryContainers.put(containerUUID, set);
        }
        return set;
    }
}
