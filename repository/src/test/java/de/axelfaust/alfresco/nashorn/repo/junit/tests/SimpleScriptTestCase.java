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
package de.axelfaust.alfresco.nashorn.repo.junit.tests;

import java.io.IOException;
import java.io.Reader;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.script.SimpleBindings;
import javax.script.SimpleScriptContext;

import jdk.nashorn.api.scripting.URLReader;
import junit.framework.TestCase;

import org.junit.Ignore;

import de.axelfaust.alfresco.nashorn.repo.junit.runners.AfterScript;
import de.axelfaust.alfresco.nashorn.repo.junit.runners.BeforeScript;
import de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor;

/**
 * This class acts as a dummy test case class for script test cases that don't specify a special test case class, i.e. script test cases
 * without any Java-based preparation requirements. This test case class is annotated as {@link Ignore} to avoid it being executed as a
 * regular test case by JUnit.
 *
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
@Ignore
public class SimpleScriptTestCase extends TestCase implements ScriptContextReusingTestCase
{

    protected static final Map<String, ScriptContext> contextByFile = new ConcurrentHashMap<String, ScriptContext>();

    private static final String SCRIPT_AMD = "amd.js";

    public static void initializeAMD(final ScriptEngine engine, final ScriptContext scriptContext) throws ScriptException
    {
        loadScriptResource(engine, scriptContext, NashornScriptProcessor.class, SCRIPT_AMD);
    }

    public static void removeGlobals(final ScriptEngine engine, final ScriptContext scriptContext, final String... globalProperties)
            throws ScriptException
    {
        final Bindings engineBindings = scriptContext.getBindings(ScriptContext.ENGINE_SCOPE);

        // remove Nashorn globals
        for (final String property : NashornScriptProcessor.NASHORN_GLOBAL_PROPERTIES_TO_ALWAYS_REMOVE)
        {
            engineBindings.remove(property);
        }

        for (final String property : globalProperties)
        {
            engineBindings.remove(property);
        }
    }

    public static Object loadScriptResource(final ScriptEngine engine, final ScriptContext scriptContext, final Class<?> contextClass,
            final String script) throws ScriptException
    {
        return executeScriptFromResource(contextClass.getResource(script), engine, scriptContext);
    }

    @BeforeScript
    public static void beforeScript(final String scriptFile, final ScriptEngine nashornEngine)
    {
        // NO-OP
    }

    @AfterScript
    public static void afterScript(final String scriptFile, final ScriptEngine nashornEngine)
    {
        // cleanup
        contextByFile.remove(scriptFile);
    }

    protected static Object executeScriptFromResource(final URL resource, final ScriptEngine engine, final ScriptContext ctxt)
            throws ScriptException
    {
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
     * {@inheritDoc}
     */
    @Override
    public ScriptContext getReusableScriptContext(final String scriptFile, final ScriptEngine nashornEngine)
    {
        final ScriptContext scriptContext;

        if (scriptFile != null && contextByFile.containsKey(scriptFile))
        {
            scriptContext = contextByFile.get(scriptFile);
        }
        else
        {
            scriptContext = new SimpleScriptContext();
            final Bindings engineBindings = nashornEngine.createBindings();
            scriptContext.setBindings(engineBindings, ScriptContext.ENGINE_SCOPE);

            final Bindings globalBindings = new SimpleBindings();
            scriptContext.setBindings(globalBindings, ScriptContext.GLOBAL_SCOPE);

            // self reference
            globalBindings.put("context", scriptContext);

            contextByFile.put(scriptFile, scriptContext);
        }

        return scriptContext;
    }

}
