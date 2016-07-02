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
package de.axelfaust.alfresco.nashorn.repo.junit.tests.loaders;

import org.junit.Assert;
import org.junit.Test;

import de.axelfaust.alfresco.nashorn.repo.loaders.ClasspathScriptFile;
import de.axelfaust.alfresco.nashorn.repo.loaders.ScriptFile;

/**
 * @author Axel Faust
 */
public class ClasspathScriptFileTests
{

    @Test
    public void existingFile()
    {
        final ScriptFile scriptFile = new ClasspathScriptFile("de/axelfaust/alfresco/nashorn/repo/loaders/empty.js");

        Assert.assertTrue("empty.js does not exist", scriptFile.exists(false));
        Assert.assertTrue("empty.js is not of a positive integer", scriptFile.getSize(false) > 0);
        // 13 characters + EOL/EOF
        Assert.assertEquals("empty.js is not of a expected size", 13 + 1, scriptFile.getSize(false));
        Assert.assertTrue("empty.js last modification time is not a positive integer", scriptFile.getLastModified(false) > 0);
    }

    @Test
    public void nonExistingFile()
    {
        final ScriptFile scriptFile = new ClasspathScriptFile("de/axelfaust/alfresco/nashorn/repo/loaders/test1.js");

        Assert.assertFalse("test1.js does exist", scriptFile.exists(false));
        Assert.assertEquals("test1.js is not -1", -1, scriptFile.getSize(false));
        Assert.assertEquals("test1.js last modification time is not -1", -1, scriptFile.getLastModified(false));
    }

    // TODO Test dynamic exist - miss - exist
}
