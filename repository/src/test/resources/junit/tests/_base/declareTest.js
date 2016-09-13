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

(function declareTest()
{
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked
    // via extracted interface
    var testObj, ctxt = context;

    testObj = {

        getTestFunctionNames : function declareTest_getTestFunctionNames()
        {
            'use strict';
            return Java.to(
                    [ 'testSimpleDeclare', 'testLinearInheritance', 'testNonLinearInheritance', 'testToString', 'testDeclaredClass' ],
                    'java.util.List');
        },

        beforeScript : function declareTest_beforeScript()
        {
            'use strict';
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            SimpleScriptTestCase.initializeAMD(engine, ctxt);

            // now we can use define
            define.preload('loaderMetaLoader!nashorn');

            // we don't remove Java here to allow simpler use of
            // org.junit.Assert
            SimpleScriptTestCase.removeGlobals(engine, ctxt, [ 'print', 'Packages', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java',
                    'javax', 'javafx', 'org' ]);

            define.preload('loaderMetaLoader!classpath');

            // config to provide at least _base package
            require.config({
                packages : [ {
                    name : '_base',
                    loader : 'classpath',
                    location : 'de/axelfaust/alfresco/nashorn/repo/_base'
                } ]
            });
        },

        testSimpleDeclare : function declareTest_testSimpleDeclare(testCase)
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert');

            require([ '_base/declare' ],
                    function declareTest_testSimpleDeclare_runTest(declare)
                    {
                        var Cls, instance;

                        Cls = declare('TestClass', {
                            x : 10,
                            fn : function declareTest_testSimpleDeclare_runTest_fn()
                            {
                                return 'fnResult';
                            }
                        });

                        Assert.assertEquals('Declared Cls should have been a function', 'function', typeof Cls);
                        Assert.assertTrue('Cls constructor should declare meta object', Cls._declare_meta !== null
                                && typeof Cls._declare_meta === 'object');
                        Assert.assertEquals('Declare meta object of Cls constructor should define class name as defined', 'TestClass',
                                Cls._declare_meta.className);
                        Assert.assertEquals('Cls constructor should have toString result based on class name',
                                '[Function TestClass_constructor]', String(Cls));

                        instance = new Cls();

                        Assert.assertTrue('Instance of Cls should pass instanceof test', instance instanceof Cls);
                        Assert.assertEquals('Instance of Cls should inherit isInstanceOf from prototype', 'function',
                                typeof instance.isInstanceOf);
                        Assert.assertTrue('Instance of Cls should pass isInstanceOf test', instance.isInstanceOf(Cls));
                        Assert.assertEquals('Instance of Cls should inherit inherited from prototype', 'function',
                                typeof instance.inherited);

                        Assert.assertEquals('Instance of Cls should provide property x as defined in class structure', 10, instance.x, 0);
                        Assert.assertEquals('Instance of Cls should provide function fn as defined in class structure', 'function',
                                typeof instance.fn);
                        Assert.assertEquals('fn invoked on instance of Cls should provide result as defined in declaration', 'fnResult',
                                instance.fn());
                    });
        },

        testLinearInheritance : function declareTest_testLinearInheritance(testCase)
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert');

            require(
                    [ '_base/declare' ],
                    function declareTest_testLinearInheritance_runTest(declare)
                    {
                        var ClsA, ClsB, ClsC, instance;

                        ClsA = declare('TestClassA', {
                            x : 'A',
                            fn : function declareTest_testLinearInheritance_runTest_A_fn()
                            {
                                return 'A';
                            }
                        });

                        ClsB = declare('TestClassB', [ ClsA ], {
                            x : 'B',
                            fn : function declareTest_testLinearInheritance_runTest_B_fn()
                            {
                                return this.inherited(declareTest_testLinearInheritance_runTest_B_fn, arguments) + 'B';
                            }
                        });

                        ClsC = declare('TestClassC', [ ClsB ], {
                            x : 'C',
                            fn : function declareTest_testLinearInheritance_runTest_C_fn()
                            {
                                return this.inherited(declareTest_testLinearInheritance_runTest_C_fn, arguments) + 'C';
                            }
                        });

                        Assert.assertEquals('Declared ClsA should have been a function', 'function', typeof ClsA);
                        Assert.assertEquals('Declared ClsB should have been a function', 'function', typeof ClsB);
                        Assert.assertEquals('Declared ClsC should have been a function', 'function', typeof ClsC);
                        Assert.assertTrue('ClsA constructor should declare meta object', ClsA._declare_meta !== null
                                && typeof ClsA._declare_meta === 'object');
                        Assert.assertTrue('ClsB constructor should declare meta object', ClsB._declare_meta !== null
                                && typeof ClsB._declare_meta === 'object');
                        Assert.assertTrue('ClsC constructor should declare meta object', ClsC._declare_meta !== null
                                && typeof ClsC._declare_meta === 'object');
                        Assert.assertEquals('Declare meta object of ClsA constructor should define class name as defined', 'TestClassA',
                                ClsA._declare_meta.className);
                        Assert.assertEquals('Declare meta object of ClsB constructor should define class name as defined', 'TestClassB',
                                ClsB._declare_meta.className);
                        Assert.assertEquals('Declare meta object of ClsC constructor should define class name as defined', 'TestClassC',
                                ClsC._declare_meta.className);
                        Assert.assertEquals('ClsA constructor should have toString result based on class name',
                                '[Function TestClassA_constructor]', String(ClsA));
                        Assert.assertEquals('ClsB constructor should have toString result based on class name',
                                '[Function TestClassB_constructor]', String(ClsB));
                        Assert.assertEquals('ClsC constructor should have toString result based on class name',
                                '[Function TestClassC_constructor]', String(ClsC));

                        instance = new ClsC();

                        Assert.assertTrue('Instance of ClsC should pass instanceof test for ClsA', instance instanceof ClsA);
                        Assert.assertTrue('Instance of ClsC should pass instanceof test for ClsB', instance instanceof ClsB);
                        Assert.assertTrue('Instance of ClsC should pass instanceof test for ClsC', instance instanceof ClsC);
                        Assert.assertEquals('Instance of ClsC should inherit isInstanceOf from prototype', 'function',
                                typeof instance.isInstanceOf);
                        Assert.assertTrue('Instance of ClsC should pass isInstanceOf test for ClsA', instance.isInstanceOf(ClsA));
                        Assert.assertTrue('Instance of ClsC should pass isInstanceOf test for ClsB', instance.isInstanceOf(ClsB));
                        Assert.assertTrue('Instance of ClsC should pass isInstanceOf test for ClsC', instance.isInstanceOf(ClsC));
                        Assert.assertEquals('Instance of ClsC should inherit inherited from prototype', 'function',
                                typeof instance.inherited);

                        Assert
                                .assertEquals(
                                        'Instance of ClsC should provide property x as defined in class structure (overriding values from TestClassA and TestClassB)',
                                        'C', instance.x);
                        Assert.assertEquals('Instance of ClsC should provide function fn as defined in class structure', 'function',
                                typeof instance.fn);
                        Assert
                                .assertEquals(
                                        'fn invoked on instance of ClsC should provide constructed result through concatenating results from inherited()',
                                        'ABC', instance.fn());
                    });
        },

        testNonLinearInheritance : function declareTest_testNonLinearInheritance(testCase)
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert');

            require(
                    [ '_base/declare' ],
                    function declareTest_testLinearInheritance_runTest(declare)
                    {
                        var ClsA, ClsB, ClsC, ClsD, instance;

                        ClsA = declare('TestClassA', {
                            x : 'A',
                            fn : function declareTest_testLinearInheritance_runTest_A_fn()
                            {
                                return 'A';
                            }
                        });

                        ClsB = declare('TestClassB', [ ClsA ], {
                            x : 'B',
                            fn : function declareTest_testLinearInheritance_runTest_B_fn()
                            {
                                return this.inherited(declareTest_testLinearInheritance_runTest_B_fn, arguments) + 'B';
                            }
                        });

                        ClsC = declare('TestClassC', [ ClsA ], {
                            x : 'C',
                            fn : function declareTest_testLinearInheritance_runTest_C_fn()
                            {
                                return this.inherited(declareTest_testLinearInheritance_runTest_C_fn, arguments) + 'C';
                            }
                        });

                        // ClsC before ClsB to have fn result in ACBD instead of
                        // ABCD (which could be mistaken for linear inheritance)
                        ClsD = declare('TestClassD', [ ClsC, ClsB ], {
                            x : 'D',
                            fn : function declareTest_testLinearInheritance_runTest_D_fn()
                            {
                                return this.inherited(declareTest_testLinearInheritance_runTest_D_fn, arguments) + 'D';
                            }
                        });

                        Assert.assertEquals('Declared ClsA should have been a function', 'function', typeof ClsA);
                        Assert.assertEquals('Declared ClsB should have been a function', 'function', typeof ClsB);
                        Assert.assertEquals('Declared ClsC should have been a function', 'function', typeof ClsC);
                        Assert.assertEquals('Declared ClsD should have been a function', 'function', typeof ClsD);
                        Assert.assertTrue('ClsA constructor should declare meta object', ClsA._declare_meta !== null
                                && typeof ClsA._declare_meta === 'object');
                        Assert.assertTrue('ClsB constructor should declare meta object', ClsB._declare_meta !== null
                                && typeof ClsB._declare_meta === 'object');
                        Assert.assertTrue('ClsC constructor should declare meta object', ClsC._declare_meta !== null
                                && typeof ClsC._declare_meta === 'object');
                        Assert.assertTrue('ClsD constructor should declare meta object', ClsD._declare_meta !== null
                                && typeof ClsD._declare_meta === 'object');
                        Assert.assertEquals('Declare meta object of ClsA constructor should define class name as defined', 'TestClassA',
                                ClsA._declare_meta.className);
                        Assert.assertEquals('Declare meta object of ClsB constructor should define class name as defined', 'TestClassB',
                                ClsB._declare_meta.className);
                        Assert.assertEquals('Declare meta object of ClsC constructor should define class name as defined', 'TestClassC',
                                ClsC._declare_meta.className);
                        Assert.assertEquals('Declare meta object of ClsD constructor should define class name as defined', 'TestClassD',
                                ClsD._declare_meta.className);
                        Assert.assertEquals('ClsA constructor should have toString result based on class name',
                                '[Function TestClassA_constructor]', String(ClsA));
                        Assert.assertEquals('ClsB constructor should have toString result based on class name',
                                '[Function TestClassB_constructor]', String(ClsB));
                        Assert.assertEquals('ClsC constructor should have toString result based on class name',
                                '[Function TestClassC_constructor]', String(ClsC));
                        Assert.assertEquals('ClsD constructor should have toString result based on class name',
                                '[Function TestClassD_constructor]', String(ClsD));

                        instance = new ClsD();

                        Assert.assertTrue('Instance of ClsD should pass instanceof test for ClsA', instance instanceof ClsA);
                        // ClsB is a mixin and thus not supported by native
                        // instanceOf
                        Assert.assertFalse('Instance of ClsD should not pass instanceof test for mixin ClsB', instance instanceof ClsB);
                        Assert.assertTrue('Instance of ClsD should pass instanceof test for ClsC', instance instanceof ClsC);
                        Assert.assertTrue('Instance of ClsD should pass instanceof test for ClsD', instance instanceof ClsD);
                        Assert.assertEquals('Instance of ClsD should inherit isInstanceOf from prototype', 'function',
                                typeof instance.isInstanceOf);
                        Assert.assertTrue('Instance of ClsD should pass isInstanceOf test for ClsA', instance.isInstanceOf(ClsA));
                        Assert.assertTrue('Instance of ClsD should pass isInstanceOf test for ClsB', instance.isInstanceOf(ClsB));
                        Assert.assertTrue('Instance of ClsD should pass isInstanceOf test for ClsC', instance.isInstanceOf(ClsC));
                        Assert.assertTrue('Instance of ClsD should pass isInstanceOf test for ClsD', instance.isInstanceOf(ClsD));
                        Assert.assertEquals('Instance of ClsD should inherit inherited from prototype', 'function',
                                typeof instance.inherited);

                        Assert
                                .assertEquals(
                                        'Instance of ClsD should provide property x as defined in class structure (overriding values from TestClassA, TestClassB and TestClassC)',
                                        'D', instance.x);
                        Assert.assertEquals('Instance of ClsD should provide function fn as defined in class structure', 'function',
                                typeof instance.fn);
                        Assert
                                .assertEquals(
                                        'fn invoked on instance of ClsD should provide constructed result through concatenating results from inherited()',
                                        'ACBD', instance.fn());
                    });
        },

        testToString : function declareTest_testToString()
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert');

            require([ '_base/declare' ], function declareTest_testToString_runTest(declare)
            {
                var ClsA, ClsB, clsAInstance, clsBInstance;

                ClsA = declare('TestClassA', {});
                ClsB = declare('TestClassB', [ ClsA ], {
                    toString : function declareTest_testToString_runTest_B_toString()
                    {
                        return 'Custom-toString-B';
                    }
                });

                clsAInstance = new ClsA();

                Assert.assertEquals('clsAInstance.toString() did not yield expected default value', '[object TestClassA]', clsAInstance
                        .toString());
                Assert.assertEquals('String(clsAInstance) did not yield expected default value', '[object TestClassA]',
                        String(clsAInstance));

                clsBInstance = new ClsB();

                Assert.assertEquals('clsBInstance.toString() did not yield expected value', 'Custom-toString-B', clsBInstance.toString());
                Assert.assertEquals('String(clsBInstance) did not yield expected value', 'Custom-toString-B', String(clsBInstance));
            });
        },

        testDeclaredClass : function declareTest_testDeclaredClass()
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert');

            require([ '_base/declare' ], function declareTest_testDeclaredClass_runTest(declare)
            {
                var ClsA, ClsB, clsAInstance, clsBInstance;

                ClsA = declare('TestClassA', {});
                ClsB = declare({});

                Assert.assertEquals('ClsA.fnClsName did not match explicitely defined name', 'TestClassA', ClsA.fnClsName);
                Assert.assertTrue('ClsB.fnClsName did not match expected default name pattern', /^anonClass_\d+$/.test(ClsB.fnClsName));

                clsAInstance = new ClsA();
                Assert.assertEquals('clsAInstance.declaredClass did not match explicitely defined name', 'TestClassA',
                        clsAInstance.declaredClass);

                clsBInstance = new ClsB();
                Assert.assertTrue('clsBInstance.declaredClass did not match expected default name pattern', /^anonClass_\d+$/
                        .test(clsBInstance.declaredClass));
            });
        }
    };
    return testObj;
}());
