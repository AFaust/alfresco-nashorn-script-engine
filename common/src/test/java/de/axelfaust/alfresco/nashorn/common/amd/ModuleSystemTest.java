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
package de.axelfaust.alfresco.nashorn.common.amd;

import java.net.URL;

import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import org.junit.Test;

import de.axelfaust.alfresco.nashorn.common.ScriptTestUtils;

/**
 * @author Axel Faust
 */
public class ModuleSystemTest
{

    @Test
    public void moduleSystemInitialisation() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        final URL resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }

    @Test
    public void simpleDefineAndRequire() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        URL resource;
        resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
        resource = ModuleSystemTest.class.getResource("simpleDefineAndRequire.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }

    @Test
    public void factoryDefineAndRequire() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        URL resource;
        resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
        resource = ModuleSystemTest.class.getResource("factoryDefineAndRequire.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }

    @Test
    public void callbackRequire() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        URL resource;
        resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
        resource = ModuleSystemTest.class.getResource("callbackRequire.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }

    @Test
    public void loadFromConfigurationPaths() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        URL resource;
        resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
        resource = ModuleSystemTest.class.getResource("loadFromConfiguredPath.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }

    @Test
    public void moduleMapping() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        URL resource;
        resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
        resource = ModuleSystemTest.class.getResource("moduleMapping.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }

    @Test
    public void loggerUsage() throws ScriptException
    {
        final ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        final ScriptEngine scriptEngine = scriptEngineManager.getEngineByName("nashorn");
        final ScriptContext scriptContext = ScriptTestUtils.newContext(scriptEngine);

        URL resource;
        resource = ModuleSystemTest.class.getResource("moduleSystemInitialisation.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
        resource = ModuleSystemTest.class.getResource("loggerUsage.js");
        ScriptTestUtils.executeScriptFromResource(resource, scriptEngine, scriptContext);
    }
}
