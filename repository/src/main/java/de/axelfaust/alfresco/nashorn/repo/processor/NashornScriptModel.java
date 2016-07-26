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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    private static final ThreadLocal<NashornScriptModel> CURRENT_MODEL = new ThreadLocal<NashornScriptModel>();

    private static final ThreadLocal<List<NashornScriptModel>> PENDING_MODELS = new ThreadLocal<List<NashornScriptModel>>();

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
                pendingModels = new ArrayList<NashornScriptModel>();
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

    private final Map<UUID, List<Object>> indexedContainers = new HashMap<UUID, List<Object>>();

    private final Map<UUID, Map<Object, Object>> associativeContainers = new HashMap<UUID, Map<Object, Object>>();

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

    protected List<Object> getOrCreateIndexContainerData(final UUID containerUUID)
    {
        List<Object> list = this.indexedContainers.get(containerUUID);
        if (list == null)
        {
            list = new ArrayList<Object>();
            this.indexedContainers.put(containerUUID, list);
        }
        return list;
    }

    protected Map<Object, Object> getOrCreateAssociativeContainerData(final UUID containerUUID)
    {
        Map<Object, Object> map = this.associativeContainers.get(containerUUID);
        if (map == null)
        {
            map = new LinkedHashMap<Object, Object>();
            this.associativeContainers.put(containerUUID, map);
        }
        return map;
    }
}
