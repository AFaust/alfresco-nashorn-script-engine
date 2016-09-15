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

(function nashornTest()
{
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked
    // via extracted interface
    var testObj, ctxt = context;

    testObj = {

        // copied from NashornScriptProcessor - since we limit access to Java we
        // can't obtain it in before fn
        defaultInaccessible : [ 'load', 'loadWithNewGlobal', 'exit', 'quit' ],

        customInaccessible : [ 'print', 'Packages', 'Java', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java', 'javax', 'javafx', 'org' ],

        getTestFunctionNames : function nashornTest_getTestFunctionNames()
        {
            'use strict';
            return Java.to(
                    [ 'testInaccessibles', 'testJavaAccess', 'testPackagesAccess', 'testJSAdapterAccess', 'testJavaImporterAccess' ],
                    'java.util.List');
        },

        beforeScript : function nashornTest_beforeScript()
        {
            'use strict';
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            SimpleScriptTestCase.initializeAMD(engine, ctxt);

            // now we can use define
            define.preload('loaderMetaLoader!nashorn');
            define.preload('loaderMetaLoader!test');

            SimpleScriptTestCase.removeGlobals(engine, ctxt, this.customInaccessible);

            require([ 'test' ], function nashornTest_beforeScript_registerDummyModule(testLoader)
            {
                testLoader.prepareModule('dummy', '/junit/tests/loaders/nashornTest.js', true, 'dummy');
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

        testInaccessibles : function nashornTest_testInaccessibles(testCase)
        {
            'use strict';
            var this_ = this, checkFn, Java, Assert;

            require([ 'nashorn!Java' ], function nashornTest_testInaccessibles_requireJavaCallback(JavaModule)
            {
                Java = JavaModule;
            });
            Assert = Java.type('org.junit.Assert');

            checkFn = function nashornTest_testInaccessibles_forEach(variable)
            {
                var value;
                try
                {
                    value = this_[variable];

                    // currently fails because __noSuchProperty__ hook uses
                    // closure _this as scope and does not know if caller is
                    // strict or not
                    // throw new Error('Access to ' + variable + ' should have
                    // thrown a ReferenceError');
                }
                catch (e)
                {
                    Assert.assertTrue('Access to ' + variable + ' should have thrown a ReferenceError', e instanceof ReferenceError);
                }
            };

            // can't access org.junit.Assert due to limited access to Java
            this.defaultInaccessible.forEach(checkFn);
            this.customInaccessible.forEach(checkFn);
        },

        testJavaAccess : function nashornTest_testJavaAccess(testCase)
        {
            'use strict';
            // we don't test all but most relevant fns to check for "real"
            // NativeJava
            require([ 'nashorn!Packages', 'nashorn!Java' ], function nashornTest_testJavaAccess_loaded(Packages, Java)
            {
                var Assert, testClass, javaTestFns;

                Assert = Packages.org.junit.Assert;
                javaTestFns = [ 'type', 'typeName', 'from', 'to', 'extend' ]

                javaTestFns.forEach(function nashornTest_testJavaAccess_loaded_fnCheck(fnName)
                {
                    Assert.assertTrue(fnName + ' is not a function', typeof Java[fnName] === 'function');
                });

                testClass = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor');

                Assert.assertFalse('testClass was resolved as undefined', testClass === undefined);
                Assert.assertNotNull('testClass was resolved as null', testClass);
                Assert.assertFalse('testClass.class is undefined', testClass.class === undefined);
                Assert.assertNotNull('testClass.class is null', testClass.class);
                Assert.assertEquals('testClass is not the expected class',
                        'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor', testClass.class.name);
            });
        },

        testPackagesAccess : function nashornTest_testPackagesAccess(testCase)
        {
            'use strict';
            require([ 'nashorn!Java', 'nashorn!Packages' ], function nashornTest_testPackagesAccess_loaded(Java, Packages)
            {
                var Assert, testClass;

                Assert = Java.type('org.junit.Assert');
                testClass = Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor;

                Assert.assertFalse('testClass was resolved as undefined', testClass === undefined);
                Assert.assertNotNull('testClass was resolved as null', testClass);
                Assert.assertFalse('testClass.class is undefined', testClass.class === undefined);
                Assert.assertNotNull('testClass.class is null', testClass.class);
                Assert.assertEquals('testClass is not the expected class',
                        'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor', testClass.class.name);
            });
        },

        testJSAdapterAccess : function nashornTest_testJSAdapterAccess(testCase)
        {
            'use strict';
            require([ 'nashorn!JSAdapter', 'nashorn!Packages' ], function nashornTest_testJSAdapterAccess_loaded(JSAdapter, Packages)
            {
                var Assert, proxy, adaptee;
                Assert = Packages.org.junit.Assert;

                adaptee = {
                    __get__ : function __get__(name)
                    {
                        return 'simulated prop "' + name + '"';
                    },

                    __call__ : function __call__(name, arg1, arg2)
                    {
                        return 'simulated fn "' + name + '"';
                    }
                };

                proxy = new JSAdapter(adaptee);

                Assert.assertEquals('property x did not yield expected value', 'simulated prop "x"', proxy.x);
                Assert.assertEquals('getter for property x did not yield expected value', 'simulated fn "getX"', proxy.getX());
            });
        },

        testJavaImporterAccess : function nashornTest_testJavaImporterAccess(testCase)
        {
            // not "use strict;" since that would disallow use of with
            require([ 'nashorn!JavaImporter', 'nashorn!Packages' ], function nashornTest_testJavaImporterAccess_loaded(JavaImporter,
                    Packages)
            {
                var Assert, imports, map, list;

                Assert = Packages.org.junit.Assert
                imports = new JavaImporter(Packages.java.util);

                with (imports)
                {
                    Assert.assertTrue(typeof HashMap === 'function');
                    Assert.assertTrue(typeof ArrayList === 'function');

                    map = new HashMap();
                    Assert.assertEquals('java.util.HashMap', map.class.name);
                    Assert['assertEquals(long,long)'](0, map.size());

                    list = new ArrayList();
                    Assert.assertEquals('java.util.ArrayList', list.class.name);
                    Assert['assertEquals(long,long)'](0, list.length);
                    Assert['assertEquals(long,long)'](0, list.size());
                }
            });
        }
    };
    return testObj;
}());
