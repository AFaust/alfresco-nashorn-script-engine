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
    'use strict';
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked via extracted interface
    var testObj, ctxt = context;

    testObj = {

        // copied from NashornScriptProcessor - since we limit access to Java we can't obtain it in before fn
        defaultInaccessible : [ 'load', 'loadWithNewGlobal', 'exit', 'quit' ],

        customInaccessible : [ 'print', 'Packages', 'Java', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java', 'javax', 'javafx', 'org' ],

        getTestFunctionNames : function nashornTest_getTestFunctionNames()
        {
            return Java.to([ 'testInaccessibles', 'testJavaAccess' ], 'java.util.List');
        },

        beforeScript : function nashornTest_beforeScript()
        {
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
            // force load of module to register this script as secure
            require([ 'test!dummy' ], function nashornTest_before_loaded(dummy)
            {

            });
        },

        testInaccessibles : function nashornTest_testInaccessibles(testCase)
        {
            var this_ = this, checkFn;

            checkFn = function nashornTest_testInaccessibles_forEach(variable)
            {
                var value;
                // currently fails because __noSuchProperty__ hook uses closure _this as scope and does not know if caller is strict or not
                try
                {
                    value = this_[variable];

                    throw new Error('Access to ' + variable + ' should have thrown a ReferenceError');
                }
                catch (e)
                {
                    if (!(e instanceof ReferenceError))
                    {
                        throw new Error('Access to ' + variable + ' should have thrown a ReferenceError');
                    }
                }
            };

            // can't access org.junit.Assert due to limited access to Java
            this.defaultInaccessible.forEach(checkFn);
            this.customInaccessible.forEach(checkFn);
        },

        testJavaAccess : function nashornTest_testJavaAccess(testCase)
        {
            // we don't test all but most relevant fns to check for "real" NativeJava
            var expected, javaTestFns = [ 'type', 'typeName', 'from', 'to', 'extend' ];
            try
            {
                require([ 'nashorn!Java' ], function nashornTest_testJavaAccess_loaded(Java)
                {
                    var testClass;

                    javaTestFns.forEach(function nashornTest_testJavaAccess_loaded_fnCheck(fnName)
                    {
                        if (typeof Java[fnName] !== 'function')
                        {
                            expected = new Error('NativeJava should provide function ' + fnName);
                            throw expected;
                        }
                    });

                    testClass = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor');

                    if (testClass === undefined || testClass === null)
                    {
                        expected = new Error('NativeJava.type() should have been able to provide static class for NashornScriptProcessor');
                        throw expected;
                    }

                }, function nashornTest_testJavaAccess_failed(dependencies, modules, implicitModules)
                {
                    expected = new Error('NativeJava should have been provided via module nashorn!Java');
                    throw expected;
                });
            }
            catch (e)
            {
                if (e === expected)
                {
                    throw e;
                }
                throw new Error('NativeJava should have been provided via module nashorn!Java - failed instead with ' + e);
            }
        }
    };
    return testObj;
}());