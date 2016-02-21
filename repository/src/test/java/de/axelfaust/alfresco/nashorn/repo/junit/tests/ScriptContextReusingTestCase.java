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

import javax.script.ScriptContext;
import javax.script.ScriptEngine;

/**
 * @author Axel Faust
 */
public interface ScriptContextReusingTestCase
{

    /**
     * Retrieves the reusable script context that should be used for executing individual tests of this instance.
     *
     * @param scriptFile
     *            the test script file for which to retrieve the script context
     * @param nashornEngine
     *            the Nashorn engine instance from which to obtain initial bindings in case no script context has been created yet
     * @return the reusable script context
     */
    ScriptContext getReusableScriptContext(final String scriptFile, final ScriptEngine nashornEngine);

}
