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

(function amdTest()
{
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked
    // via extracted interface
    var testObj, ctxt = context;

    testObj = {

        getTestFunctionNames : function amdTest_getTestFunctionNames()
        {
            'use strict';
            return Java.to([ 'testBasicDefine', 'testLoaderPluginDefine', 'testSecureLoaderPluginDefine' ], 'java.util.List');
        },

        beforeScript : function amdTest_beforeScript()
        {
            'use strict';
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            SimpleScriptTestCase.initializeAMD(engine, ctxt);

            define.preload('loaderMetaLoader!test');

            // we don't remove Java here to allow simpler use of
            // org.junit.Assert
            SimpleScriptTestCase.removeGlobals(engine, ctxt, [ 'print', 'Packages', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java',
                    'javax', 'javafx', 'org' ]);

            require([ 'test' ], function amdTest_testSecureLoaderPluginDefine_registerDummyModule(testLoader)
            {
                testLoader.prepareModule('dummy', '/junit/tests/core/amdTest.js', true, 'dummy');
            });

            // empty config
            require.config({});
        },

        testBasicDefine : function amdTest_testBasicDefine()
        {
            'use strict';
            var Assert, basicModule, extendedBasicModule, err;

            Assert = Java.type('org.junit.Assert');

            define('basic', [], function amdTest_testBasicDefine_basicFactory()
            {
                return 'basic';
            });

            err = null;
            try
            {
                basicModule = require('basic');
                Assert.fail('require should have thrown error about uninitialized "basic" module');
            }
            catch (e)
            {
                err = e;
            }

            Assert.assertNotNull('An error should have been thrown trying to access uninitialized "basic" module', err);
            Assert.assertTrue('Native error should have been thrown', err instanceof Error);
            Assert.assertEquals('Error message did not match expectation', 'Module \'basic\' has not been initialised', err.message);

            define('extended-basic', [ 'basic' ], function amdTest_testBasicDefine_extendedBasicFactory(basic)
            {
                Assert.assertEquals('"basic" module was not resolved to expected value', 'basic', basic);

                return 'extended-basic';
            });

            err = null;
            try
            {
                basicModule = require('basic');
                Assert.fail('require should have thrown error about uninitialized "basic" module');
            }
            catch (e)
            {
                err = e;
            }
            Assert.assertNotNull('An error should have been thrown trying to access uninitialized "basic" module', err);
            Assert.assertTrue('Native error should have been thrown', err instanceof Error);
            Assert.assertEquals('Error message did not match expectation', 'Module \'basic\' has not been initialised', err.message);

            err = null;
            try
            {
                extendedBasicModule = require('extended-basic');
                Assert.fail('require should have thrown error about uninitialized "extended-basic" module');
            }
            catch (e)
            {
                err = e;
            }
            Assert.assertNotNull('An error should have been thrown trying to access uninitialized "basic" module', err);
            Assert.assertTrue('Native error should have been thrown', err instanceof Error);
            Assert.assertEquals('Error message did not match expectation', 'Module \'extended-basic\' has not been initialised',
                    err.message);

            require([ 'extended-basic' ], function amdTest_testBasicDefine_extendedBasicRequireCallback(extendedBasic)
            {
                Assert.assertEquals('"extended-basic" module was not resolved to expected value', 'extended-basic', extendedBasic);
            });

            err = null;
            try
            {
                basicModule = require('basic');
                Assert.assertEquals('"basic" module was not resolved to expected value', 'basic', basicModule);
            }
            catch (e)
            {
                Assert.fail('"basic" module should have been transitively initialized');
            }
        },

        testLoaderPluginDefine : function amdTest_testLoaderPluginDefine()
        {
            'use strict';
            var Assert, err;

            Assert = Java.type('org.junit.Assert');

            define('testLoader', function amdTest_testLoaderPluginDefine_testLoaderFactory()
            {
                return {
                    normalize : function amdTest_testLoaderPluginDefine_testLoader_normalize(moduleId, normalizeSimpleId, contextModule)
                    {
                        Assert.assertTrue('Module ID does not match requested raw ID', /^basic(Secure)?$/.test(moduleId));

                        return 'normalized/' + moduleId;
                    },

                    load : function amdTest_testLoaderPluginDefine_testLoader_load(normalizedId, require, load)
                    {
                        Assert.assertTrue('Module ID has not been normalized', /^normalized\/basic(Secure)?$/.test(normalizedId));

                        load(normalizedId + 'Module', /.*Secure$/.test(normalizedId));
                    }
                };
            });

            require([ 'testLoader!basic' ], function amdTest_testLoaderPluginDefine_basicModuleRequireCallback(basicModule)
            {
                Assert.assertEquals('"basic" module was not resolved to expected value', 'normalized/basicModule', basicModule);
            });

            err = null;
            try
            {
                require([ 'testLoader!basicSecure' ], function amdTest_testLoaderPluginDefine_basicSecureModuleRequireCallback(basicModule)
                {
                    Assert.assertEquals('"basicSecure" module was not resolved to expected value', 'normalized/basicSecureModule',
                            basicModule);
                });
                Assert.fail('require should have thrown error about insecure loader attempting to define "basicSecure" module as secure');
            }
            catch (e)
            {
                err = e;
            }
            Assert.assertNotNull('An error should have been thrown trying to load "basicSecure" module from insecure loader', err);
            Assert.assertTrue('Native error should have been thrown', err instanceof Error);
            Assert.assertEquals('Error message did not match expectation',
                    'Insecure loader module \'testLoader\' cannot declare a loaded module as secure', err.message);
        },

        testSecureLoaderPluginDefine : function amdTest_testSecureLoaderPluginDefine()
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert');

            // force load of module to register this script as secure
            require([ 'test!dummy' ], function nashornTest_before_loaded(dummy)
            {

            });

            define('secureTestLoader', function amdTest_testSecureLoaderPluginDefinee_secureTestLoaderFactory()
            {
                return {
                    normalize : function amdTest_testSecureLoaderPluginDefinee_secureTestLoader_normalize(moduleId, normalizeSimpleId,
                            contextModule)
                    {
                        Assert.assertTrue('Module ID does not match requested raw ID', /^basic(Secure)?$/.test(moduleId));

                        return 'normalized/' + moduleId;
                    },

                    load : function amdTest_testSecureLoaderPluginDefine_secureTestLoader_load(normalizedId, require, load)
                    {
                        Assert.assertTrue('Module ID has not been normalized', /^normalized\/basic(Secure)?$/.test(normalizedId));

                        load(normalizedId + 'Module', /.*Secure$/.test(normalizedId));
                    }
                };
            });

            require([ 'secureTestLoader!basicSecure' ],
                    function amdTest_testSecureLoaderPluginDefine_basicSecureModuleRequireCallback(basicModule)
                    {
                        Assert.assertEquals('"basicSecure" module was not resolved to expected value', 'normalized/basicSecureModule',
                                basicModule);
                    });
        }
    };
    return testObj;
}());
