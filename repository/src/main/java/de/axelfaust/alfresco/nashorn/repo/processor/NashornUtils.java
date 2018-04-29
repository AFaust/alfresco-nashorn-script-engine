/*
 * Copyright 2015, 2016 Axel Faust
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

import sun.misc.SharedSecrets;

/**
 * This class provides a collection of generic utilities to determine / collect information that scripts running inside the Nashorn engine
 * cannot determine themselves. This currently includes the ability to determine the calling script as {@code arguments.callee} is both not
 * available in strict mode and deprecated / removed from later EcmaScript standard revisions.
 *
 * This utility class makes use of {@link SharedSecrets JVM internal APIs} to improve the efficiency of its utilities that may potentially
 * be called very frequently. These APIs might be inaccessible in Java 9, so this class is currently only guaranteed to work in Java 8.
 *
 * @author Axel Faust
 *
 * @deprecated Use {@link de.axelfaust.alfresco.nashorn.common.util.NashornUtils} instead - only kept for backwards compatibility until all uses
 *             have been refactored
 */
@Deprecated
public abstract class NashornUtils extends de.axelfaust.alfresco.nashorn.common.util.NashornUtils
{

    protected NashornUtils()
    {
        super();
        // NO-OP
    }
}
