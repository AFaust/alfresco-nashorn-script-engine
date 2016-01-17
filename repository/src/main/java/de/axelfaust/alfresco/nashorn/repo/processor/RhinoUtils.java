/*
 * Copyright 2015 Axel Faust
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

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

/**
 * @author Axel Faust
 */
public class RhinoUtils
{

    /**
     *
     * A simple functional interface for any script function that is executed in an active Rhino context
     *
     * @param <T>
     *            the type of the execution result
     *
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface RhinoExecutable<T>
    {

        /**
         * Executes Rhino-dependant logic in an active Rhino context
         *
         * @param cx
         *            the active Rhino context
         * @param scope
         *            the initialised top level scope of the Rhino context
         * @return the result of the execution
         */
        T runInRhino(Context cx, Scriptable scope);

    }

    /**
     * Executes a Rhino-dependant callback in an active Rhino context
     *
     * @param <T>
     *            the type of the result
     * @param exec
     *            the callback
     * @return the result of the callback
     */
    public static <T> T inRhino(final RhinoExecutable<T> exec)
    {
        return RhinoUtils.DEFAULT_UTILS.runInRhino(exec);
    }

    protected static final RhinoUtils DEFAULT_UTILS = new RhinoUtils();

    protected Scriptable nonSecureScope;

    public RhinoUtils()
    {
        final Context cx = Context.enter();
        try
        {
            this.nonSecureScope = cx.initStandardObjects(null, true);
            this.nonSecureScope.delete("Packages");
            this.nonSecureScope.delete("getClass");
            this.nonSecureScope.delete("java");
        }
        finally
        {
            Context.exit();
        }
    }

    /**
     * Executes a Rhino-dependant callback in an active Rhino context
     *
     * @param <T>
     *            the type of the result
     * @param exec
     *            the callback
     * @return the result of the callback
     */
    public <T> T runInRhino(final RhinoExecutable<T> exec)
    {
        final Context cx = Context.enter();
        try
        {
            final Scriptable scope = cx.newObject(this.nonSecureScope);
            scope.setPrototype(this.nonSecureScope);
            scope.setParentScope(null);

            final T result = exec.runInRhino(cx, scope);
            return result;
        }
        finally
        {
            Context.exit();
        }
    }
}
