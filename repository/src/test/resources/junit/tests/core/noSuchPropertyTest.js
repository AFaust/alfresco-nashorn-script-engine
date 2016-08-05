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
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked via extracted interface
    var testObj, ctxt = context;

    testObj = {

        getTestFunctionNames : function noSuchPropertyTest_getTestFunctionNames()
        {
            return Java.to([ 'testMiss', 'testArgsLookup', 'testLegacyRootObjectLookup' ], 'java.util.List');
        },

        beforeScript : function noSuchPropertyTest_beforeScript()
        {
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            SimpleScriptTestCase.initializeAMD(engine, ctxt);

            // now we can use define
            define.preload('loaderMetaLoader!nashorn');

            // we don't remove Java here to allow simpler use of org.junit.Assert
            SimpleScriptTestCase.removeGlobals(engine, ctxt, [ 'print', 'Packages', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java',
                    'javax', 'javafx', 'org' ]);

            // need to add fake spring loader to provide fake global-properties
            define('spring', [], function noSuchPropertyTest_beforeScript_defineSpring()
            {
                var loader, Properties;

                Properties = Java.type('java.util.Properties');

                loader = {
                    load : function noSuchPropertyTest_beforeScript_defineSpring_load(normalizedId, require, load)
                    {
                        if (normalizedId === 'global-properties')
                        {
                            load(new Properties(), false);
                        }
                    }
                };

                return loader;
            });

            define.preload('loaderMetaLoader!globalProperties');
            define.preload('loaderMetaLoader!legacyRootObjects');
            define.preload('loaderMetaLoader!args');

            // empty config
            require.config({});
        },

        // no need to differentiate strict from non-strict because noSuchProperty always assumes strict caller
        testMiss : function noSuchPropertyTest_testMiss(testCase)
        {
            'use strict';
            var globalValue, accessError = null, Assert = Java.type('org.junit.Assert');

            try
            {
                globalValue = unknownVariable;
            }
            catch (e)
            {
                accessError = e;
            }

            Assert.assertTrue('unknownVariable should not have been defined', globalValue === undefined);
            Assert.assertNotNull('An error should have been thrown and caught', accessError);
            Assert.assertTrue('accessError should have been a ReferenceError', accessError instanceof ReferenceError);
        },

        testArgsLookup : function noSuchPropertyTest_testArgsLookup(testCase)
        {
            'use strict';
            var globalValue, accessError = null, Assert = Java.type('org.junit.Assert'), registeredValue;

            require([ 'args' ], function noSuchPropertyTest_testArgsLookup_register(args)
            {
                registeredValue = 'registeredValue';
                args.setArgumentModel({
                    unknownVariable : registeredValue
                });
            });

            try
            {
                globalValue = unknownVariable;
            }
            catch (e)
            {
                accessError = e;
            }

            Assert.assertFalse('unknownVariable should have been defined', globalValue === undefined);
            Assert.assertNull('An error should have not been thrown and caught', accessError);
            Assert.assertEquals('unknownVariable should have been resolved to registered legacy root object', globalValue, registeredValue);
        },

        testLegacyRootObjectLookup : function noSuchPropertyTest_testLegacyRootObjectLookup(testCase)
        {
            'use strict';
            var globalValue, accessError = null, Assert = Java.type('org.junit.Assert'), registeredValue;

            require([ 'legacyRootObjects' ], function noSuchPropertyTest_testLegacyRootObjectLookup_register(legacyRootObjects)
            {
                registeredValue = 'registeredValue';
                legacyRootObjects.registerRootObject('unknownVariable', registeredValue);
            });

            try
            {
                globalValue = unknownVariable;
            }
            catch (e)
            {
                accessError = e;
            }

            Assert.assertFalse('unknownVariable should have been defined', globalValue === undefined);
            Assert.assertNull('An error should have not been thrown and caught', accessError);
            Assert.assertEquals('unknownVariable should have been resolved to registered legacy root object', globalValue, registeredValue);
        }
    };
    return testObj;
}());