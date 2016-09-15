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

(function classpathTest()
{
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked
    // via extracted interface
    var testObj, ctxt = context;

    testObj = {

        getTestFunctionNames : function classpathTest_getTestFunctionNames()
        {
            'use strict';
            return Java.to([ 'testClasspath', 'testExtensibleClasspath' ], 'java.util.List');
        },

        beforeScript : function classpathTest_beforeScript()
        {
            'use strict';
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            SimpleScriptTestCase.initializeAMD(engine, ctxt);

            // now we can use define
            define.preload('loaderMetaLoader!nashorn');
            define.preload('loaderMetaLoader!test');
            define.preload('loaderMetaLoader!classpath');

            SimpleScriptTestCase.removeGlobals(engine, ctxt, [ 'print', 'Packages', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java',
                    'javax', 'javafx', 'org' ]);

            require([ 'test' ], function nashornTest_beforeScript_registerDummyModule(testLoader)
            {
                testLoader.prepareModule('dummy', '/junit/tests/loaders/classpathTest.js', true, 'dummy');
            });

            // empty config
            require.config({});
        },

        before : function nashornTest_before()
        {
            'use strict';
            // force load of module to register this script as secure
            require([ 'test!dummy' ], function nashornTest_before_loaded(dummy)
            {

            });
        },

        testClasspath : function classpathTest_testClasspath()
        {
            'use strict;'
            require([ 'nashorn!Java', 'classpath!alfresco/simpleModuleA', 'classpath!alfresco/simpleModuleB',
                    'classpath!alfresco/extension/simpleModuleB' ],
                    function classpathTest_testClasspath_requireCallback(Java, SimpleModuleA, SimpleModuleB, OverridenSimpleModuleB)
                    {
                        var Assert = Java.type('org.junit.Assert');

                        Assert.assertEquals('SimpleModuleA yielded unexpected value', 'Simple Module A', SimpleModuleA);
                        Assert.assertEquals('SimpleModuleB yielded unexpected value', 'Simple Module B', SimpleModuleB);
                        Assert.assertEquals('OverridenSimpleModuleB yielded unexpected value', 'Overriden Simple Module B',
                                OverridenSimpleModuleB);
                    });
        },

        testExtensibleClasspath : function classpathTest_testExtensibleClasspath()
        {
            'use strict;'
            require([ 'nashorn!Java', 'extensible-classpath!simpleModuleA', 'extensible-classpath!simpleModuleB' ],
                    function classpathTest_testExtensibleClasspath_requireCallback(Java, SimpleModuleA, SimpleModuleB)
                    {
                        var Assert = Java.type('org.junit.Assert');

                        Assert.assertEquals('SimpleModuleA yielded unexpected value', 'Simple Module A', SimpleModuleA);
                        Assert.assertEquals('SimpleModuleB yielded unexpected value', 'Overriden Simple Module B', SimpleModuleB);
                    });
        }
    };
    return testObj;
}());
