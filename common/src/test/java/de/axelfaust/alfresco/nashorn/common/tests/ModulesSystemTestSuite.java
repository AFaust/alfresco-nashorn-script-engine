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
package de.axelfaust.alfresco.nashorn.common.tests;

import org.junit.runner.RunWith;

import de.axelfaust.alfresco.nashorn.common.junit.runners.ScriptSuite;

/**
 *
 * @author Axel Faust
 */
@RunWith(ScriptSuite.class)
@ScriptSuite.SuiteFolders({ "/de/axelfaust/alfresco/nashorn/common/amd/core", "/de/axelfaust/alfresco/nashorn/common/amd/modules" })
public class ModulesSystemTestSuite
{
    // NO-OP
}
