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
package de.axelfaust.alfresco.nashorn.common;

import java.io.IOException;
import java.io.Reader;
import java.net.URL;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.script.SimpleBindings;
import javax.script.SimpleScriptContext;

import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.URLReader;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ScriptTestUtils
{

    /**
     * Loads and runs a script resource within a specific script engine.
     *
     * @param resource
     *            the script to run
     * @param engine
     *            the engine with which to run the script
     * @param ctxt
     *            the context in which to run the script
     * @return the result of the script execution
     * @throws ScriptException
     *             if any error occurs during execution of the script, including any {@link IOException} loading the script from the
     *             provided resource
     */
    public static Object executeScriptFromResource(final URL resource, final ScriptEngine engine, final ScriptContext ctxt)
            throws ScriptException
    {
        ParameterCheck.mandatory("resource", resource);

        try (Reader reader = new URLReader(resource))
        {
            ctxt.setAttribute(ScriptEngine.FILENAME, resource.toString(), ScriptContext.ENGINE_SCOPE);
            return engine.eval(reader, ctxt);
        }
        catch (final IOException e)
        {
            throw new ScriptException(e);
        }
    }

    /**
     * Constructs a new, simple script context for executing scripts with a specific script engine
     *
     * @param engine
     *            the script engine for which to create the script context
     * @return the script context
     */
    public static ScriptContext newContext(final ScriptEngine scriptEngine)
    {
        ParameterCheck.mandatory("scriptEngine", scriptEngine);

        final SimpleScriptContext scriptContext = new SimpleScriptContext();
        final Bindings engineBindings = scriptEngine.createBindings();
        scriptContext.setBindings(engineBindings, ScriptContext.ENGINE_SCOPE);

        final Bindings globalBindings = new SimpleBindings();
        scriptContext.setBindings(globalBindings, ScriptContext.GLOBAL_SCOPE);
        return scriptContext;
    }
}
