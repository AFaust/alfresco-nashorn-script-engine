'use strict';

(function createTest()
{
    // need to bind ctxt / gloablScope (this) early
    // won't be available when testObj.<fn> is invoked via extracted interface
    var testObj, ctxt = context, globalScope = this;

    testObj = {
        getTestFunctionNames : function()
        {
            return Java.to([ 'globalLoggerLevels', 'moduleLoggerLevels', 'messageLogging', 'exceptionLogging', 'nativeObjectHandling' ],
                    'java.util.List');
        },

        before : function()
        {
            var ClassPathScriptURLResolverCls, ModuleSystemCls, scriptUrlResolver, moduleSystem;

            if (globalScope.require)
            {
                throw new Error('\'require\' has already been initialised / set');
            }

            ClassPathScriptURLResolverCls = Java.type('de.axelfaust.alfresco.nashorn.common.amd.core.ClassPathScriptURLResolver');
            ModuleSystemCls = Java.type('de.axelfaust.alfresco.nashorn.common.amd.core.ModuleSystem');

            // we don't need to load any scripts for our tests
            scriptUrlResolver = new ClassPathScriptURLResolverCls();
            moduleSystem = new ModuleSystemCls(scriptUrlResolver, Object, function scopeBuilder(contextRequire, contextDefine)
            {
                // a new scope protects the global scope from any new defined globals and allows us to ensure existence of
                // require/define
                var newScope = Object.create(globalScope, {
                    define : {
                        value : contextDefine
                    },
                    require : {
                        value : contextRequire
                    }
                });
                return newScope;
            }, load);

            globalScope.require = moduleSystem.requireFunction;
            globalScope.define = moduleSystem.defineFunction;
        },

        globalLoggerLevels : function()
        {
            var Assert, StaticLoggerBinder, Level, loggerFactory;

            Assert = Java.type('org.junit.Assert');

            StaticLoggerBinder = Java.type('org.slf4j.impl.StaticLoggerBinder');
            Level = Java.type('ch.qos.logback.classic.Level');

            loggerFactory = StaticLoggerBinder.getSingleton().getLoggerFactory();

            require([ 'logger' ], function(logger)
            {
                var backingLogger;

                // the current context is not part of any module, so qualifies as a global context
                backingLogger = loggerFactory.getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-global-');

                backingLogger.setLevel(Level.OFF);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.TRACE);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.DEBUG);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.INFO);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.WARN);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.ERROR);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());
            });
        },

        moduleLoggerLevels : function()
        {
            var Assert, StaticLoggerBinder, Level, ListAppender, loggerFactory;

            Assert = Java.type('org.junit.Assert');

            StaticLoggerBinder = Java.type('org.slf4j.impl.StaticLoggerBinder');
            Level = Java.type('ch.qos.logback.classic.Level');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            loggerFactory = StaticLoggerBinder.getSingleton().getLoggerFactory();

            define('loggingModule', [ 'logger' ], function(logger)
            {
                var backingLogger;

                backingLogger = loggerFactory
                        .getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-defaultLoader-.loggingModule');

                backingLogger.setLevel(Level.OFF);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.TRACE);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.DEBUG);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.INFO);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.WARN);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                backingLogger.setLevel(Level.ERROR);
                Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger',
                        backingLogger.isTraceEnabled(), logger.isTraceEnabled());
                Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger',
                        backingLogger.isDebugEnabled(), logger.isDebugEnabled());
                Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                        logger.isInfoEnabled());
                Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                        logger.isWarnEnabled());
                Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger',
                        backingLogger.isErrorEnabled(), logger.isErrorEnabled());

                // dummy module instance
                return {};
            });

            define(
                    'long/module/id/prefix/for/loggingModule',
                    [ 'logger' ],
                    function(logger)
                    {
                        var backingLogger;

                        backingLogger = loggerFactory
                                .getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-defaultLoader-.long.module.id.prefix.for.loggingModule');

                        backingLogger.setLevel(Level.OFF);
                        Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger
                                .isTraceEnabled(), logger.isTraceEnabled());
                        Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger
                                .isDebugEnabled(), logger.isDebugEnabled());
                        Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger
                                .isInfoEnabled(), logger.isInfoEnabled());
                        Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger
                                .isWarnEnabled(), logger.isWarnEnabled());
                        Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger
                                .isErrorEnabled(), logger.isErrorEnabled());

                        backingLogger.setLevel(Level.TRACE);
                        Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger
                                .isTraceEnabled(), logger.isTraceEnabled());
                        Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger
                                .isDebugEnabled(), logger.isDebugEnabled());
                        Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger
                                .isInfoEnabled(), logger.isInfoEnabled());
                        Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger
                                .isWarnEnabled(), logger.isWarnEnabled());
                        Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger
                                .isErrorEnabled(), logger.isErrorEnabled());

                        backingLogger.setLevel(Level.DEBUG);
                        Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger
                                .isTraceEnabled(), logger.isTraceEnabled());
                        Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger
                                .isDebugEnabled(), logger.isDebugEnabled());
                        Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger
                                .isInfoEnabled(), logger.isInfoEnabled());
                        Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger
                                .isWarnEnabled(), logger.isWarnEnabled());
                        Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger
                                .isErrorEnabled(), logger.isErrorEnabled());

                        backingLogger.setLevel(Level.INFO);
                        Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger
                                .isTraceEnabled(), logger.isTraceEnabled());
                        Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger
                                .isDebugEnabled(), logger.isDebugEnabled());
                        Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger
                                .isInfoEnabled(), logger.isInfoEnabled());
                        Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger
                                .isWarnEnabled(), logger.isWarnEnabled());
                        Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger
                                .isErrorEnabled(), logger.isErrorEnabled());

                        backingLogger.setLevel(Level.WARN);
                        Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger
                                .isTraceEnabled(), logger.isTraceEnabled());
                        Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger
                                .isDebugEnabled(), logger.isDebugEnabled());
                        Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger
                                .isInfoEnabled(), logger.isInfoEnabled());
                        Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger
                                .isWarnEnabled(), logger.isWarnEnabled());
                        Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger
                                .isErrorEnabled(), logger.isErrorEnabled());

                        backingLogger.setLevel(Level.ERROR);
                        Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger
                                .isTraceEnabled(), logger.isTraceEnabled());
                        Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger
                                .isDebugEnabled(), logger.isDebugEnabled());
                        Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger
                                .isInfoEnabled(), logger.isInfoEnabled());
                        Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger
                                .isWarnEnabled(), logger.isWarnEnabled());
                        Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger
                                .isErrorEnabled(), logger.isErrorEnabled());

                        // dummy module instance
                        return {};
                    });

            define('dummyLoader', [ 'exports' ], function(exports)
            {
                exports.load = function(moduleId, require, load)
                {
                    var callerScriptUrl, loadScriptUrl;

                    callerScriptUrl = require.getCallerScriptURL();
                    loadScriptUrl = callerScriptUrl.replace(/logger\.js$/, 'logger/' + moduleId + '.js');

                    load(loadScriptUrl, false);
                };
            });

            require([ 'dummyLoader!loggerTestModule' ], function(loggerTest)
            {
                var backingLogger, appender;

                backingLogger = loggerFactory
                        .getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.dummyLoader.loggerTestModule');

                loggerTest.runLogLevelTest(backingLogger);

                appender = new ListAppender();
                backingLogger.addAppender(appender);
                appender.start();
                loggerTest.runLogMessageTest(backingLogger, appender);
            });
        },

        messageLogging : function()
        {
            var Assert, StaticLoggerBinder, Level, ListAppender, loggerFactory;

            Assert = Java.type('org.junit.Assert');

            StaticLoggerBinder = Java.type('org.slf4j.impl.StaticLoggerBinder');
            Level = Java.type('ch.qos.logback.classic.Level');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');

            loggerFactory = StaticLoggerBinder.getSingleton().getLoggerFactory();

            require([ 'logger' ], function(logger)
            {
                var backingLogger, appender, messageCount = 0;

                // the current context is not part of any module, so qualifies as a global context
                backingLogger = loggerFactory.getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-global-');
                appender = new ListAppender();
                backingLogger.addAppender(appender);
                appender.start();

                Assert.assertEquals('Appender should start without any messages', 0, appender.list.size(), 0);

                backingLogger.setLevel(Level.OFF);
                logger.trace('Should be ignored');
                Assert.assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list
                        .size(), 0);

                backingLogger.setLevel(Level.TRACE);
                logger.trace('Should not be ignored');
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Raw log message should have been passed as-is', 'Should not be ignored',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('The level of the log message should match the log method being used', Level.TRACE,
                        appender.list[messageCount - 1].level);
                Assert
                        .assertNull('The log message should have no throwable attached to it',
                                appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The log message should have an empty argument array', 0,
                        appender.list[messageCount - 1].argumentArray.length, 0);

                backingLogger.setLevel(Level.DEBUG);
                logger.trace('Should be ignored');
                Assert.assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list
                        .size(), 0);

                logger.debug('Message with placeholder and 1 arg: {}', 'firstArg');
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Raw log message should have been passed as-is', 'Message with placeholder and 1 arg: {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Message with placeholder and 1 arg: firstArg', appender.list[messageCount - 1].formattedMessage);
                Assert.assertEquals('The level of the log message should match the log method being used', Level.DEBUG,
                        appender.list[messageCount - 1].level);
                Assert
                        .assertNull('The log message should have no throwable attached to it',
                                appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The log message should have a single-entry argument array', 1,
                        appender.list[messageCount - 1].argumentArray.length, 0);
                Assert.assertEquals('The log message argument array should contain our provided arg', 'firstArg',
                        appender.list[messageCount - 1].argumentArray[0]);

                backingLogger.setLevel(Level.INFO);
                logger.debug('Should be ignored');
                Assert.assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list
                        .size(), 0);

                logger.info('Message with placeholder and 2 args (vararg-style): {} + {}', 'firstArg', 'secondArg');
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Raw log message should have been passed as-is',
                        'Message with placeholder and 2 args (vararg-style): {} + {}', appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Message with placeholder and 2 args (vararg-style): firstArg + secondArg',
                        appender.list[messageCount - 1].formattedMessage);
                Assert.assertEquals('The level of the log message should match the log method being used', Level.INFO,
                        appender.list[messageCount - 1].level);
                Assert
                        .assertNull('The log message should have no throwable attached to it',
                                appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The log message should have a double-entry argument array', 2,
                        appender.list[messageCount - 1].argumentArray.length, 0);
                Assert.assertEquals('The log message argument array should contain our provided arg', 'firstArg',
                        appender.list[messageCount - 1].argumentArray[0]);
                Assert.assertEquals('The log message argument array should contain our provided arg', 'secondArg',
                        appender.list[messageCount - 1].argumentArray[1]);

                backingLogger.setLevel(Level.WARN);
                logger.info('Should be ignored');
                Assert.assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list
                        .size(), 0);

                logger.warn('Message with placeholder and 2 args (array-style): {} + {}', [ 'firstArg', 'secondArg' ]);
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Raw log message should have been passed as-is',
                        'Message with placeholder and 2 args (array-style): {} + {}', appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Message with placeholder and 2 args (array-style): firstArg + secondArg',
                        appender.list[messageCount - 1].formattedMessage);
                Assert.assertEquals('The level of the log message should match the log method being used', Level.WARN,
                        appender.list[messageCount - 1].level);
                Assert
                        .assertNull('The log message should have no throwable attached to it',
                                appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The log message should have a double-entry argument array', 2,
                        appender.list[messageCount - 1].argumentArray.length, 0);
                Assert.assertEquals('The log message argument array should contain our provided arg', 'firstArg',
                        appender.list[messageCount - 1].argumentArray[0]);
                Assert.assertEquals('The log message argument array should contain our provided arg', 'secondArg',
                        appender.list[messageCount - 1].argumentArray[1]);

                backingLogger.setLevel(Level.ERROR);
                logger.warn('Should be ignored');
                Assert.assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list
                        .size(), 0);

                logger.error('Message with placeholder and 5 args (array-style): {} + {} + {} + {} + {}', [ '1', '2', '3', '4', '5' ]);
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Raw log message should have been passed as-is',
                        'Message with placeholder and 5 args (array-style): {} + {} + {} + {} + {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Message with placeholder and 5 args (array-style): 1 + 2 + 3 + 4 + 5',
                        appender.list[messageCount - 1].formattedMessage);
                Assert.assertEquals('The level of the log message should match the log method being used', Level.ERROR,
                        appender.list[messageCount - 1].level);
                Assert
                        .assertNull('The log message should have no throwable attached to it',
                                appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The log message should have a five-entry argument array', 5,
                        appender.list[messageCount - 1].argumentArray.length, 0);
                Assert.assertEquals('The log message argument array should contain our provided arg', '1',
                        appender.list[messageCount - 1].argumentArray[0]);
                Assert.assertEquals('The log message argument array should contain our provided arg', '2',
                        appender.list[messageCount - 1].argumentArray[1]);
                Assert.assertEquals('The log message argument array should contain our provided arg', '3',
                        appender.list[messageCount - 1].argumentArray[2]);
                Assert.assertEquals('The log message argument array should contain our provided arg', '4',
                        appender.list[messageCount - 1].argumentArray[3]);
                Assert.assertEquals('The log message argument array should contain our provided arg', '5',
                        appender.list[messageCount - 1].argumentArray[4]);
            });
        },

        exceptionLogging : function()
        {
            var Assert, StaticLoggerBinder, Level, ListAppender, RuntimeException, loggerFactory;

            Assert = Java.type('org.junit.Assert');

            StaticLoggerBinder = Java.type('org.slf4j.impl.StaticLoggerBinder');
            Level = Java.type('ch.qos.logback.classic.Level');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');
            RuntimeException = Java.type('java.lang.RuntimeException');

            loggerFactory = StaticLoggerBinder.getSingleton().getLoggerFactory();

            require([ 'logger' ], function(logger)
            {
                var backingLogger, appender, messageCount = 0, err;

                // the current context is not part of any module, so qualifies as a global context
                backingLogger = loggerFactory.getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-global-');
                appender = new ListAppender();
                backingLogger.addAppender(appender);
                appender.start();

                Assert.assertEquals('Appender should start without any messages', 0, appender.list.size(), 0);

                backingLogger.setLevel(Level.DEBUG);

                logger.debug(new Error('Test'));
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Log message should be derived from native error', 'Error: Test',
                        appender.list[messageCount - 1].message);
                Assert.assertNotNull('The log message should have a throwable attached to it',
                        appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The logged throwable is not of the expected type', 'jdk.nashorn.internal.runtime.ECMAException',
                        appender.list[messageCount - 1].throwableProxy.className);

                logger.debug(new RuntimeException('Test'));
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertNull('Log message should be null since none was provided', appender.list[messageCount - 1].message);
                Assert.assertNotNull('The log message should have a throwable attached to it',
                        appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The logged throwable is not of the expected type', 'java.lang.RuntimeException',
                        appender.list[messageCount - 1].throwableProxy.className);

                logger.debug('Testing error logging', new Error('Test'));
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Testing error logging',
                        appender.list[messageCount - 1].message);
                Assert.assertNotNull('The log message should have a throwable attached to it',
                        appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The logged throwable is not of the expected type', 'jdk.nashorn.internal.runtime.ECMAException',
                        appender.list[messageCount - 1].throwableProxy.className);

                logger.debug('Testing error logging', new RuntimeException('Test'));
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Testing error logging',
                        appender.list[messageCount - 1].message);
                Assert.assertNotNull('The log message should have a throwable attached to it',
                        appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The logged throwable is not of the expected type', 'java.lang.RuntimeException',
                        appender.list[messageCount - 1].throwableProxy.className);

                logger.debug('Testing error logging with error {} and arg {}', new Error('Test'), 'firstArg');
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Testing error logging with error {} and arg {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Testing error logging with error Error: Test and arg firstArg', appender.list[messageCount - 1].formattedMessage);
                Assert.assertNull(
                        'The log message should not have a throwable attached to it since native error was not provided as last argument',
                        appender.list[messageCount - 1].throwableProxy);

                logger.debug('Testing error logging with error {} and arg {}', new RuntimeException('Test'), 'firstArg');
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Testing error logging with error {} and arg {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Testing error logging with error java.lang.RuntimeException: Test and arg firstArg',
                        appender.list[messageCount - 1].formattedMessage);
                Assert.assertNull(
                        'The log message should not have a throwable attached to it since exception was not provided as last argument',
                        appender.list[messageCount - 1].throwableProxy);

                logger.debug('Testing error logging with arg {} and error {}', 'firstArg', new Error('Test'));
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Testing error logging with arg {} and error {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Testing error logging with arg firstArg and error Error: Test', appender.list[messageCount - 1].formattedMessage);
                Assert.assertNotNull(
                        'The log message should have a throwable attached to it since native error was provided as last argument',
                        appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The logged throwable is not of the expected type', 'jdk.nashorn.internal.runtime.ECMAException',
                        appender.list[messageCount - 1].throwableProxy.className);

                logger.debug('Testing error logging with arg {} and error {}', 'firstArg', new RuntimeException('Test'));
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Testing error logging with arg {} and error {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Formatted log message should have resolved placeholders',
                        'Testing error logging with arg firstArg and error java.lang.RuntimeException: Test',
                        appender.list[messageCount - 1].formattedMessage);
                Assert.assertNotNull(
                        'The log message should have a throwable attached to it since exception was provided as last argument',
                        appender.list[messageCount - 1].throwableProxy);
                Assert.assertEquals('The logged throwable is not of the expected type', 'java.lang.RuntimeException',
                        appender.list[messageCount - 1].throwableProxy.className);
            });
        },

        nativeObjectHandling : function()
        {
            var Assert, StaticLoggerBinder, Level, ListAppender, RuntimeException, loggerFactory;

            Assert = Java.type('org.junit.Assert');

            StaticLoggerBinder = Java.type('org.slf4j.impl.StaticLoggerBinder');
            Level = Java.type('ch.qos.logback.classic.Level');
            ListAppender = Java.type('ch.qos.logback.core.read.ListAppender');
            RuntimeException = Java.type('java.lang.RuntimeException');

            loggerFactory = StaticLoggerBinder.getSingleton().getLoggerFactory();

            require([ 'logger' ], function(logger)
            {
                var backingLogger, appender, messageCount = 0, nativeObj;

                // the current context is not part of any module, so qualifies as a global context
                backingLogger = loggerFactory.getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-global-');
                appender = new ListAppender();
                backingLogger.addAppender(appender);
                appender.start();

                Assert.assertEquals('Appender should start without any messages', 0, appender.list.size(), 0);

                backingLogger.setLevel(Level.DEBUG);

                nativeObj = new Date();
                logger.debug(nativeObj);
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Log message should have been derived from native object', String(nativeObj),
                        appender.list[messageCount - 1].message);

                logger.debug('Message with placeholder {}', nativeObj);
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Message with placeholder {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Tee formatted log message should have resolved placeholders', String('Message with placeholder '
                        + String(nativeObj)), appender.list[messageCount - 1].formattedMessage);

                nativeObj = {
                    firstName : 'Max',
                    lastName : 'Mustermann',
                    toString : function()
                    {
                        return this.firstName + ' ' + this.lastName;
                    }
                };
                logger.debug(nativeObj);
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('Log message should have been derived from native object', nativeObj.toString(),
                        appender.list[messageCount - 1].message);

                logger.debug('Message with placeholder {}', nativeObj);
                messageCount++;
                Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
                Assert.assertEquals('The raw log message should have been passed as-is', 'Message with placeholder {}',
                        appender.list[messageCount - 1].message);
                Assert.assertEquals('Tee formatted log message should have resolved placeholders', String('Message with placeholder '
                        + nativeObj.toString()), appender.list[messageCount - 1].formattedMessage);
            });
        }
    };

    return testObj;
}.call(this));
