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

import java.io.InputStream;

/**
 * @author Axel Faust
 */
public interface ScriptFile
{

    /**
     * Retrieves (and implicitly checks) the existence of this script file. Implementations may use caching / asynchronous check and
     * notification mechanisms to keep the overhead to a minimum.
     *
     * @param force
     *            {@code true} if the check must be performed and no cached information may be used
     * @return {@code true} if this script file still exists, {@code false} otherwise
     */
    boolean exists(boolean force);

    /**
     * Retrieves the size of the script file. Implementations may cache the size of the script until backing script file has been determined
     * to no longer exist or to have been replaced / superceded.
     *
     * @param force
     *            {@code true} if the check must be performed and no cached information may be used
     * @return the size or {@code -1} if the size cannot be determined (this prevents caching)
     */
    long getSize(boolean force);

    /**
     * Retrieves the timestamp of the last modification of the source file. Implementations are allowed to throttle checks of the timestamp
     * within configurable timeframes to avoid repeated access to slow resources that are bound to yield the same result 98+ % of the time.
     *
     * @param force
     *            {@code true} if the check must be performed and no cached information may be used
     * @return the timestamp in milliseconds
     */
    long getLastModified(boolean force);

    /**
     * Retrieves an input stream to the scripts content
     *
     * @return a new input stream for the script contents
     */
    InputStream getInputStream();

    /**
     * Resets any cached state for the script.
     */
    void reset();
}
