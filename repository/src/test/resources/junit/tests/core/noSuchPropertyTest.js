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

(function noSuchPropertyTest()
{
    var testObj = {

        getTestFunctionNames : function noSuchPropertyTest_getTestFunctionNames()
        {
            return Java.to([ 'testMiss', 'testStrictMiss' ], 'java.util.List');
        },

        beforeScript : function noSuchPropertyTest_beforeScript()
        {
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            // TODO Find out why "context" does not work
            SimpleScriptTestCase.initializeAMD(engine, context);

            // now we can use define
            define.preload('loaderMetaLoader!classpath');
            define.preload('classpath!de/axelfaust/alfresco/nashorn/repo/processor/noSuchProperty');

            // empty config
            require.config({});
        },

        before : function noSuchPropertyTest_before()
        {
            require.reset();
        },

        testMiss : function noSuchPropertyTest_testMiss(testCase)
        {
            var globalValue, Assert = Java.type('org.junit.Assert');

            globalValue = unknownVariable;

            Assert.assertTrue('unknownVariable should not have been defined', globalValue === undefined);
        },

        testStrictMiss : function noSuchPropertyTest_testStrictMiss(testCase)
        {
            'use strict';
            var globalValue, accessError, Assert = Java.type('org.junit.Assert');

            try
            {
                globalValue = unknownVariable;
            }
            catch (e)
            {
                accessError = e;
            }

            Assert.assertTrue('unknownVariable should not have been defined', globalValue === undefined);
            Assert.assertTrue('accessError should not have been a ReferenceError', accessError instanceof ReferenceError);
        }
    };
    return testObj;
}());