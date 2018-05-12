/*
 * Copyright 2018 Axel Faust
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
package de.axelfaust.alfresco.nashorn.common.junit.interop;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ScriptFunction
{

    private static final Logger LOGGER = LoggerFactory.getLogger(ScriptFunction.class);

    protected final String fnName;

    public ScriptFunction(final String fnName)
    {
        this.fnName = fnName;
    }

    public String getFunctionName()
    {
        return this.fnName;
    }

    public Object invoke(final Object target, final Object... params)
    {
        if (target instanceof ScriptObjectMirror)
        {
            LOGGER.debug("Calling script function {}", this.fnName);
            return ((ScriptObjectMirror) target).callMember(this.fnName, params);
        }
        throw new UnsupportedOperationException("Can't invoke " + this.fnName + " on target " + target);
    }
}
