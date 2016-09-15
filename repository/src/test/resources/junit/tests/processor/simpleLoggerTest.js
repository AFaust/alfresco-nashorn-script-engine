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

(function simpleLoggerTest()
{
    // need to bind ctxt early - won't be available when testObj.<fn> is invoked via extracted interface
    var testObj, ctxt = context;

    testObj = {

        getTestFunctionNames : function simpleLoggerTest_getTestFunctionNames()
        {
            return Java.to([ 'testAPIDefined', 'testTraceLogging', 'testDebugLogging', 'testInfoLogging', 'testWarnLogging',
                    'testErrorLogging' ], 'java.util.List');
        },

        beforeScript : function simpleLoggerTest_beforeScript()
        {
            var SimpleScriptTestCase = Java.type('de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase');

            SimpleScriptTestCase.initializeAMD(engine, ctxt);

            // now we can use define
            define.preload('loaderMetaLoader!nashorn');

            // we don't remove Java here to allow simpler use of org.junit.Assert
            SimpleScriptTestCase.removeGlobals(engine, ctxt, [ 'print', 'Packages', 'JavaImporter', 'JSAdapter', 'com', 'edu', 'java',
                    'javax', 'javafx', 'org' ]);

            // empty config
            require.config({});
        },

        testAPIDefined : function simpleLoggerTest_testAPIDefined(testCase)
        {
            'use strict';
            var Assert = Java.type('org.junit.Assert'), logger;

            Assert.assertFalse('getSimpleLogger should have been defined', getSimpleLogger === undefined);
            Assert.assertEquals('getSimpleLogger should have been a function', 'function', typeof getSimpleLogger);

            logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo');

            Assert.assertFalse('logger instance should have been provided', logger === undefined || logger === null);

            Assert.assertEquals('logger.trace should have been a function', 'function', typeof logger.trace);
            Assert.assertEquals('logger.debug should have been a function', 'function', typeof logger.debug);
            Assert.assertEquals('logger.info should have been a function', 'function', typeof logger.info);
            Assert.assertEquals('logger.warn should have been a function', 'function', typeof logger.warn);
            Assert.assertEquals('logger.error should have been a function', 'function', typeof logger.error);

            Assert.assertEquals('logger.isTraceEnabled should have been a function', 'function', typeof logger.isTraceEnabled);
            Assert.assertEquals('logger.isDebugEnabled should have been a function', 'function', typeof logger.isDebugEnabled);
            Assert.assertEquals('logger.isInfoEnabled should have been a function', 'function', typeof logger.isInfoEnabled);
            Assert.assertEquals('logger.isWarnEnabled should have been a function', 'function', typeof logger.isWarnEnabled);
            Assert.assertEquals('logger.isErrorEnabled should have been a function', 'function', typeof logger.isErrorEnabled);

            Assert.assertEquals('logger.traceEnabled should have been a boolean', 'boolean', typeof logger.traceEnabled);
            Assert.assertEquals('logger.debugEnabled should have been a boolean', 'boolean', typeof logger.debugEnabled);
            Assert.assertEquals('logger.infoEnabled should have been a boolean', 'boolean', typeof logger.infoEnabled);
            Assert.assertEquals('logger.warnEnabled should have been a boolean', 'boolean', typeof logger.warnEnabled);
            Assert.assertEquals('logger.errorEnabled should have been a boolean', 'boolean', typeof logger.errorEnabled);
        },

        testTraceLogging : function simpleLoggerTest_testTraceLogging(testCase)
        {
            'use strict';
            var Assert, ListAppender, lockbackLogger, logger, traceAppender, expectedLength;

            Assert = Java.type('org.junit.Assert');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            lockbackLogger = Java.type('org.slf4j.LoggerFactory').getLogger(
                    'de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.trace');

            logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.trace');
            Assert.assertFalse('logger instance should have been provided', logger === undefined || logger === null);

            lockbackLogger.setLevel(Java.type('ch.qos.logback.classic.Level').TRACE);
            traceAppender = new ListAppender();
            traceAppender.start();
            expectedLength = 0;
            lockbackLogger.addAppender(traceAppender);

            Assert.assertTrue('logger.traceEnabled should report TRACE logging as enabled', logger.traceEnabled);
            Assert.assertTrue('logger.isTraceEnabled() should report TRACE logging as enabled', logger.isTraceEnabled());

            // test simple message
            logger.trace('Simple trace message');
            expectedLength++;
            Assert.assertEquals('traceAppender should have received the logging event', expectedLength, traceAppender.list.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect message', 'Simple trace message',
                    traceAppender.list[expectedLength - 1].message);

            // test message with var-arg like parameters
            logger.trace('Trace message {}={}', 'key', 'value');
            expectedLength++;
            Assert.assertEquals('traceAppender should have received the logging event', expectedLength, traceAppender.list.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect message', 'Trace message {}={}',
                    traceAppender.list[expectedLength - 1].message);
            Assert.assertEquals('traceAppender received logging event with incorrect number of parameters', 2,
                    traceAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect 1st parameter', 'key',
                    traceAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('traceAppender received logging event with incorrect 2nd parameter', 'value',
                    traceAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('traceAppender received logging event with incorrect formatted message', 'Trace message key=value',
                    traceAppender.list[expectedLength - 1].formattedMessage);

            // test message with array-based parameters
            logger.trace('Trace message {}={}', [ 'key', 'value' ]);
            expectedLength++;
            Assert.assertEquals('traceAppender should have received the logging event', expectedLength, traceAppender.list.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect message', 'Trace message {}={}',
                    traceAppender.list[expectedLength - 1].message);
            Assert.assertEquals('traceAppender received logging event with incorrect number of parameters', 2,
                    traceAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect 1st parameter', 'key',
                    traceAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('traceAppender received logging event with incorrect 2nd parameter', 'value',
                    traceAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('traceAppender received logging event with incorrect formatted message', 'Trace message key=value',
                    traceAppender.list[expectedLength - 1].formattedMessage);

            // test message with toString-enabled script object parameter
            logger.trace('Trace message {}', {
                toString : function()
                {
                    return 'value';
                }
            });
            expectedLength++;
            Assert.assertEquals('traceAppender should have received the logging event', expectedLength, traceAppender.list.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect message', 'Trace message {}',
                    traceAppender.list[expectedLength - 1].message);
            Assert.assertEquals('traceAppender received logging event with incorrect number of parameters', 1,
                    traceAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect formatted message', 'Trace message value',
                    traceAppender.list[expectedLength - 1].formattedMessage);

            // test message with native error
            logger.trace('Trace message', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('traceAppender should have received the logging event', expectedLength, traceAppender.list.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect message', 'Trace message',
                    traceAppender.list[expectedLength - 1].message);
            Assert.assertTrue('traceAppender received logging event without a throwable instance',
                    traceAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'traceAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', traceAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('traceAppender received logging event with incorrect formatted message', 'Trace message',
                    traceAppender.list[expectedLength - 1].formattedMessage);

            // test message with params AND native error
            logger.trace('Trace message {}={}', 'key', 'value', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('traceAppender should have received the logging event', expectedLength, traceAppender.list.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect message', 'Trace message {}={}',
                    traceAppender.list[expectedLength - 1].message);
            Assert.assertEquals('traceAppender received logging event with incorrect number of parameters', 2,
                    traceAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('traceAppender received logging event with incorrect 1st parameter', 'key',
                    traceAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('traceAppender received logging event with incorrect 2nd parameter', 'value',
                    traceAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertTrue('traceAppender received logging event without a throwable instance',
                    traceAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'traceAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', traceAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('traceAppender received logging event with incorrect formatted message', 'Trace message key=value',
                    traceAppender.list[expectedLength - 1].formattedMessage);
        },

        testDebugLogging : function simpleLoggerTest_testDebugLogging(testCase)
        {
            'use strict';
            var Assert, ListAppender, lockbackLogger, logger, debugAppender, expectedLength;

            Assert = Java.type('org.junit.Assert');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            lockbackLogger = Java.type('org.slf4j.LoggerFactory').getLogger(
                    'de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.debug');

            logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.debug');
            Assert.assertFalse('logger instance should have been provided', logger === undefined || logger === null);

            lockbackLogger.setLevel(Java.type('ch.qos.logback.classic.Level').DEBUG);
            debugAppender = new ListAppender();
            debugAppender.start();
            expectedLength = 0;
            lockbackLogger.addAppender(debugAppender);

            Assert.assertTrue('logger.debugEnabled should report TRACE logging as enabled', logger.debugEnabled);
            Assert.assertTrue('logger.isDebugEnabled() should report TRACE logging as enabled', logger.isDebugEnabled());

            // test simple message
            logger.debug('Simple debug message');
            expectedLength++;
            Assert.assertEquals('debugAppender should have received the logging event', expectedLength, debugAppender.list.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect message', 'Simple debug message',
                    debugAppender.list[expectedLength - 1].message);

            // test message with var-arg like parameters
            logger.debug('Debug message {}={}', 'key', 'value');
            expectedLength++;
            Assert.assertEquals('debugAppender should have received the logging event', expectedLength, debugAppender.list.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect message', 'Debug message {}={}',
                    debugAppender.list[expectedLength - 1].message);
            Assert.assertEquals('debugAppender received logging event with incorrect number of parameters', 2,
                    debugAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect 1st parameter', 'key',
                    debugAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('debugAppender received logging event with incorrect 2nd parameter', 'value',
                    debugAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('debugAppender received logging event with incorrect formatted message', 'Debug message key=value',
                    debugAppender.list[expectedLength - 1].formattedMessage);

            // test message with array-based parameters
            logger.debug('Debug message {}={}', [ 'key', 'value' ]);
            expectedLength++;
            Assert.assertEquals('debugAppender should have received the logging event', expectedLength, debugAppender.list.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect message', 'Debug message {}={}',
                    debugAppender.list[expectedLength - 1].message);
            Assert.assertEquals('debugAppender received logging event with incorrect number of parameters', 2,
                    debugAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect 1st parameter', 'key',
                    debugAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('debugAppender received logging event with incorrect 2nd parameter', 'value',
                    debugAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('debugAppender received logging event with incorrect formatted message', 'Debug message key=value',
                    debugAppender.list[expectedLength - 1].formattedMessage);

            // test message with toString-enabled script object parameter
            logger.debug('Debug message {}', {
                toString : function()
                {
                    return 'value';
                }
            });
            expectedLength++;
            Assert.assertEquals('debugAppender should have received the logging event', expectedLength, debugAppender.list.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect message', 'Debug message {}',
                    debugAppender.list[expectedLength - 1].message);
            Assert.assertEquals('debugAppender received logging event with incorrect number of parameters', 1,
                    debugAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect formatted message', 'Debug message value',
                    debugAppender.list[expectedLength - 1].formattedMessage);

            // test message with native error
            logger.debug('Debug message', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('debugAppender should have received the logging event', expectedLength, debugAppender.list.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect message', 'Debug message',
                    debugAppender.list[expectedLength - 1].message);
            Assert.assertTrue('debugAppender received logging event without a throwable instance',
                    debugAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'debugAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', debugAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('debugAppender received logging event with incorrect formatted message', 'Debug message',
                    debugAppender.list[expectedLength - 1].formattedMessage);

            // test message with params AND native error
            logger.debug('Debug message {}={}', 'key', 'value', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('debugAppender should have received the logging event', expectedLength, debugAppender.list.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect message', 'Debug message {}={}',
                    debugAppender.list[expectedLength - 1].message);
            Assert.assertEquals('debugAppender received logging event with incorrect number of parameters', 2,
                    debugAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('debugAppender received logging event with incorrect 1st parameter', 'key',
                    debugAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('debugAppender received logging event with incorrect 2nd parameter', 'value',
                    debugAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertTrue('debugAppender received logging event without a throwable instance',
                    debugAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'debugAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', debugAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('debugAppender received logging event with incorrect formatted message', 'Debug message key=value',
                    debugAppender.list[expectedLength - 1].formattedMessage);
        },

        testInfoLogging : function simpleLoggerTest_testInfoLogging(testCase)
        {
            'use strict';
            var Assert, ListAppender, lockbackLogger, logger, infoAppender, expectedLength;

            Assert = Java.type('org.junit.Assert');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            lockbackLogger = Java.type('org.slf4j.LoggerFactory').getLogger(
                    'de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.info');

            logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.info');
            Assert.assertFalse('logger instance should have been provided', logger === undefined || logger === null);

            lockbackLogger.setLevel(Java.type('ch.qos.logback.classic.Level').DEBUG);
            infoAppender = new ListAppender();
            infoAppender.start();
            expectedLength = 0;
            lockbackLogger.addAppender(infoAppender);

            Assert.assertTrue('logger.infoEnabled should report TRACE logging as enabled', logger.infoEnabled);
            Assert.assertTrue('logger.isInfoEnabled() should report TRACE logging as enabled', logger.isInfoEnabled());

            // test simple message
            logger.info('Simple info message');
            expectedLength++;
            Assert.assertEquals('infoAppender should have received the logging event', expectedLength, infoAppender.list.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect message', 'Simple info message',
                    infoAppender.list[expectedLength - 1].message);

            // test message with var-arg like parameters
            logger.info('Info message {}={}', 'key', 'value');
            expectedLength++;
            Assert.assertEquals('infoAppender should have received the logging event', expectedLength, infoAppender.list.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect message', 'Info message {}={}',
                    infoAppender.list[expectedLength - 1].message);
            Assert.assertEquals('infoAppender received logging event with incorrect number of parameters', 2,
                    infoAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect 1st parameter', 'key',
                    infoAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('infoAppender received logging event with incorrect 2nd parameter', 'value',
                    infoAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('infoAppender received logging event with incorrect formatted message', 'Info message key=value',
                    infoAppender.list[expectedLength - 1].formattedMessage);

            // test message with array-based parameters
            logger.info('Info message {}={}', [ 'key', 'value' ]);
            expectedLength++;
            Assert.assertEquals('infoAppender should have received the logging event', expectedLength, infoAppender.list.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect message', 'Info message {}={}',
                    infoAppender.list[expectedLength - 1].message);
            Assert.assertEquals('infoAppender received logging event with incorrect number of parameters', 2,
                    infoAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect 1st parameter', 'key',
                    infoAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('infoAppender received logging event with incorrect 2nd parameter', 'value',
                    infoAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('infoAppender received logging event with incorrect formatted message', 'Info message key=value',
                    infoAppender.list[expectedLength - 1].formattedMessage);

            // test message with toString-enabled script object parameter
            logger.info('Info message {}', {
                toString : function()
                {
                    return 'value';
                }
            });
            expectedLength++;
            Assert.assertEquals('infoAppender should have received the logging event', expectedLength, infoAppender.list.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect message', 'Info message {}',
                    infoAppender.list[expectedLength - 1].message);
            Assert.assertEquals('infoAppender received logging event with incorrect number of parameters', 1,
                    infoAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect formatted message', 'Info message value',
                    infoAppender.list[expectedLength - 1].formattedMessage);

            // test message with native error
            logger.info('Info message', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('infoAppender should have received the logging event', expectedLength, infoAppender.list.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect message', 'Info message',
                    infoAppender.list[expectedLength - 1].message);
            Assert.assertTrue('infoAppender received logging event without a throwable instance',
                    infoAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'infoAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', infoAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('infoAppender received logging event with incorrect formatted message', 'Info message',
                    infoAppender.list[expectedLength - 1].formattedMessage);

            // test message with params AND native error
            logger.info('Info message {}={}', 'key', 'value', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('infoAppender should have received the logging event', expectedLength, infoAppender.list.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect message', 'Info message {}={}',
                    infoAppender.list[expectedLength - 1].message);
            Assert.assertEquals('infoAppender received logging event with incorrect number of parameters', 2,
                    infoAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('infoAppender received logging event with incorrect 1st parameter', 'key',
                    infoAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('infoAppender received logging event with incorrect 2nd parameter', 'value',
                    infoAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertTrue('infoAppender received logging event without a throwable instance',
                    infoAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'infoAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', infoAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('infoAppender received logging event with incorrect formatted message', 'Info message key=value',
                    infoAppender.list[expectedLength - 1].formattedMessage);
        },

        testWarnLogging : function simpleLoggerTest_testWarnLogging(testCase)
        {
            'use strict';
            var Assert, ListAppender, lockbackLogger, logger, warnAppender, expectedLength;

            Assert = Java.type('org.junit.Assert');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            lockbackLogger = Java.type('org.slf4j.LoggerFactory').getLogger(
                    'de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.warn');

            logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.warn');
            Assert.assertFalse('logger instance should have been provided', logger === undefined || logger === null);

            lockbackLogger.setLevel(Java.type('ch.qos.logback.classic.Level').DEBUG);
            warnAppender = new ListAppender();
            warnAppender.start();
            expectedLength = 0;
            lockbackLogger.addAppender(warnAppender);

            Assert.assertTrue('logger.warnEnabled should report TRACE logging as enabled', logger.warnEnabled);
            Assert.assertTrue('logger.isWarnEnabled() should report TRACE logging as enabled', logger.isWarnEnabled());

            // test simple message
            logger.warn('Simple warn message');
            expectedLength++;
            Assert.assertEquals('warnAppender should have received the logging event', expectedLength, warnAppender.list.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect message', 'Simple warn message',
                    warnAppender.list[expectedLength - 1].message);

            // test message with var-arg like parameters
            logger.warn('Warn message {}={}', 'key', 'value');
            expectedLength++;
            Assert.assertEquals('warnAppender should have received the logging event', expectedLength, warnAppender.list.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect message', 'Warn message {}={}',
                    warnAppender.list[expectedLength - 1].message);
            Assert.assertEquals('warnAppender received logging event with incorrect number of parameters', 2,
                    warnAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect 1st parameter', 'key',
                    warnAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('warnAppender received logging event with incorrect 2nd parameter', 'value',
                    warnAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('warnAppender received logging event with incorrect formatted message', 'Warn message key=value',
                    warnAppender.list[expectedLength - 1].formattedMessage);

            // test message with array-based parameters
            logger.warn('Warn message {}={}', [ 'key', 'value' ]);
            expectedLength++;
            Assert.assertEquals('warnAppender should have received the logging event', expectedLength, warnAppender.list.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect message', 'Warn message {}={}',
                    warnAppender.list[expectedLength - 1].message);
            Assert.assertEquals('warnAppender received logging event with incorrect number of parameters', 2,
                    warnAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect 1st parameter', 'key',
                    warnAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('warnAppender received logging event with incorrect 2nd parameter', 'value',
                    warnAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('warnAppender received logging event with incorrect formatted message', 'Warn message key=value',
                    warnAppender.list[expectedLength - 1].formattedMessage);

            // test message with toString-enabled script object parameter
            logger.warn('Warn message {}', {
                toString : function()
                {
                    return 'value';
                }
            });
            expectedLength++;
            Assert.assertEquals('warnAppender should have received the logging event', expectedLength, warnAppender.list.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect message', 'Warn message {}',
                    warnAppender.list[expectedLength - 1].message);
            Assert.assertEquals('warnAppender received logging event with incorrect number of parameters', 1,
                    warnAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect formatted message', 'Warn message value',
                    warnAppender.list[expectedLength - 1].formattedMessage);

            // test message with native error
            logger.warn('Warn message', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('warnAppender should have received the logging event', expectedLength, warnAppender.list.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect message', 'Warn message',
                    warnAppender.list[expectedLength - 1].message);
            Assert.assertTrue('warnAppender received logging event without a throwable instance',
                    warnAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'warnAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', warnAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('warnAppender received logging event with incorrect formatted message', 'Warn message',
                    warnAppender.list[expectedLength - 1].formattedMessage);

            // test message with params AND native error
            logger.warn('Warn message {}={}', 'key', 'value', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('warnAppender should have received the logging event', expectedLength, warnAppender.list.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect message', 'Warn message {}={}',
                    warnAppender.list[expectedLength - 1].message);
            Assert.assertEquals('warnAppender received logging event with incorrect number of parameters', 2,
                    warnAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('warnAppender received logging event with incorrect 1st parameter', 'key',
                    warnAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('warnAppender received logging event with incorrect 2nd parameter', 'value',
                    warnAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertTrue('warnAppender received logging event without a throwable instance',
                    warnAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'warnAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', warnAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('warnAppender received logging event with incorrect formatted message', 'Warn message key=value',
                    warnAppender.list[expectedLength - 1].formattedMessage);
        },

        testErrorLogging : function simpleLoggerTest_testErrorLogging(testCase)
        {
            'use strict';
            var Assert, ListAppender, lockbackLogger, logger, errorAppender, expectedLength;

            Assert = Java.type('org.junit.Assert');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            lockbackLogger = Java.type('org.slf4j.LoggerFactory').getLogger(
                    'de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.error');

            logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.tests.core.simpleLoggerTest.error');
            Assert.assertFalse('logger instance should have been provided', logger === undefined || logger === null);

            lockbackLogger.setLevel(Java.type('ch.qos.logback.classic.Level').DEBUG);
            errorAppender = new ListAppender();
            errorAppender.start();
            expectedLength = 0;
            lockbackLogger.addAppender(errorAppender);

            Assert.assertTrue('logger.errorEnabled should report TRACE logging as enabled', logger.errorEnabled);
            Assert.assertTrue('logger.isErrorEnabled() should report TRACE logging as enabled', logger.isErrorEnabled());

            // test simple message
            logger.error('Simple error message');
            expectedLength++;
            Assert.assertEquals('errorAppender should have received the logging event', expectedLength, errorAppender.list.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect message', 'Simple error message',
                    errorAppender.list[expectedLength - 1].message);

            // test message with var-arg like parameters
            logger.error('Error message {}={}', 'key', 'value');
            expectedLength++;
            Assert.assertEquals('errorAppender should have received the logging event', expectedLength, errorAppender.list.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect message', 'Error message {}={}',
                    errorAppender.list[expectedLength - 1].message);
            Assert.assertEquals('errorAppender received logging event with incorrect number of parameters', 2,
                    errorAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect 1st parameter', 'key',
                    errorAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('errorAppender received logging event with incorrect 2nd parameter', 'value',
                    errorAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('errorAppender received logging event with incorrect formatted message', 'Error message key=value',
                    errorAppender.list[expectedLength - 1].formattedMessage);

            // test message with array-based parameters
            logger.error('Error message {}={}', [ 'key', 'value' ]);
            expectedLength++;
            Assert.assertEquals('errorAppender should have received the logging event', expectedLength, errorAppender.list.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect message', 'Error message {}={}',
                    errorAppender.list[expectedLength - 1].message);
            Assert.assertEquals('errorAppender received logging event with incorrect number of parameters', 2,
                    errorAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect 1st parameter', 'key',
                    errorAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('errorAppender received logging event with incorrect 2nd parameter', 'value',
                    errorAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertEquals('errorAppender received logging event with incorrect formatted message', 'Error message key=value',
                    errorAppender.list[expectedLength - 1].formattedMessage);

            // test message with toString-enabled script object parameter
            logger.error('Error message {}', {
                toString : function()
                {
                    return 'value';
                }
            });
            expectedLength++;
            Assert.assertEquals('errorAppender should have received the logging event', expectedLength, errorAppender.list.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect message', 'Error message {}',
                    errorAppender.list[expectedLength - 1].message);
            Assert.assertEquals('errorAppender received logging event with incorrect number of parameters', 1,
                    errorAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect formatted message', 'Error message value',
                    errorAppender.list[expectedLength - 1].formattedMessage);

            // test message with native error
            logger.error('Error message', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('errorAppender should have received the logging event', expectedLength, errorAppender.list.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect message', 'Error message',
                    errorAppender.list[expectedLength - 1].message);
            Assert.assertTrue('errorAppender received logging event without a throwable instance',
                    errorAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'errorAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', errorAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('errorAppender received logging event with incorrect formatted message', 'Error message',
                    errorAppender.list[expectedLength - 1].formattedMessage);

            // test message with params AND native error
            logger.error('Error message {}={}', 'key', 'value', new Error('My native error'));
            expectedLength++;
            Assert.assertEquals('errorAppender should have received the logging event', expectedLength, errorAppender.list.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect message', 'Error message {}={}',
                    errorAppender.list[expectedLength - 1].message);
            Assert.assertEquals('errorAppender received logging event with incorrect number of parameters', 2,
                    errorAppender.list[expectedLength - 1].argumentArray.length, 0);
            Assert.assertEquals('errorAppender received logging event with incorrect 1st parameter', 'key',
                    errorAppender.list[expectedLength - 1].argumentArray[0]);
            Assert.assertEquals('errorAppender received logging event with incorrect 2nd parameter', 'value',
                    errorAppender.list[expectedLength - 1].argumentArray[1]);
            Assert.assertTrue('errorAppender received logging event without a throwable instance',
                    errorAppender.list[expectedLength - 1].throwableProxy !== null);
            Assert
                    .assertEquals(
                            'errorAppender received logging event where throwable message does not match native error message (with implied prefix from error type)',
                            'Error: My native error', errorAppender.list[expectedLength - 1].throwableProxy.message);
            Assert.assertEquals('errorAppender received logging event with incorrect formatted message', 'Error message key=value',
                    errorAppender.list[expectedLength - 1].formattedMessage);
        }
    };
    return testObj;
}());