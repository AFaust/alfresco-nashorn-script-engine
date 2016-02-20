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
package de.axelfaust.alfresco.nashorn.repo.utils;

import jdk.nashorn.internal.objects.NativeObject;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

/**
 * Instances of this class act as a simple toString wrapper for native JavaScript objects used during logging. Since any log framework will
 * call the Java {@link Object#toString() toString} operation on script objects instead of the JavaScript
 * {@link NativeObject#toString(Object) toString}, delegation from the first to the latter is necessary.
 *
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class NativeLogMessageArgumentWrapper
{

    @FunctionalInterface
    public static interface ToStringFunction
    {

        /**
         * @see Object#toString()
         *
         * @return the string representation of the object instance this function instance is bound to
         */
        public String scriptToString();
    }

    protected ToStringFunction toStringFunction;

    protected ScriptObjectMirror scriptObject;

    public NativeLogMessageArgumentWrapper(final ToStringFunction toStringFunction)
    {
        this.toStringFunction = toStringFunction;
    }

    public NativeLogMessageArgumentWrapper(final ScriptObjectMirror scriptObject)
    {
        this.scriptObject = scriptObject;
    }

    public String toString()
    {
        String result;

        if (this.toStringFunction != null)
        {
            result = this.toStringFunction.scriptToString();
        }
        else
        {
            final Object toStringResult = this.scriptObject.callMember("toString");
            result = toStringResult != null ? toStringResult.toString() : this.scriptObject.toString();
        }
        return result;
    }
}
