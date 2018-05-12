'use strict';

define([ 'logger' ], function(logger)
{
    var module, Assert, Level;

    Assert = Java.type('org.junit.Assert');
    Level = Java.type('ch.qos.logback.classic.Level');

    module = {
        runLogLevelTest : function(backingLogger)
        {
            backingLogger.setLevel(Level.OFF);
            Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger.isTraceEnabled(),
                    logger.isTraceEnabled());
            Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger.isDebugEnabled(),
                    logger.isDebugEnabled());
            Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                    logger.isInfoEnabled());
            Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                    logger.isWarnEnabled());
            Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger.isErrorEnabled(),
                    logger.isErrorEnabled());

            backingLogger.setLevel(Level.TRACE);
            Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger.isTraceEnabled(),
                    logger.isTraceEnabled());
            Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger.isDebugEnabled(),
                    logger.isDebugEnabled());
            Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                    logger.isInfoEnabled());
            Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                    logger.isWarnEnabled());
            Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger.isErrorEnabled(),
                    logger.isErrorEnabled());

            backingLogger.setLevel(Level.DEBUG);
            Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger.isTraceEnabled(),
                    logger.isTraceEnabled());
            Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger.isDebugEnabled(),
                    logger.isDebugEnabled());
            Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                    logger.isInfoEnabled());
            Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                    logger.isWarnEnabled());
            Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger.isErrorEnabled(),
                    logger.isErrorEnabled());

            backingLogger.setLevel(Level.INFO);
            Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger.isTraceEnabled(),
                    logger.isTraceEnabled());
            Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger.isDebugEnabled(),
                    logger.isDebugEnabled());
            Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                    logger.isInfoEnabled());
            Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                    logger.isWarnEnabled());
            Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger.isErrorEnabled(),
                    logger.isErrorEnabled());

            backingLogger.setLevel(Level.WARN);
            Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger.isTraceEnabled(),
                    logger.isTraceEnabled());
            Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger.isDebugEnabled(),
                    logger.isDebugEnabled());
            Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                    logger.isInfoEnabled());
            Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                    logger.isWarnEnabled());
            Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger.isErrorEnabled(),
                    logger.isErrorEnabled());

            backingLogger.setLevel(Level.ERROR);
            Assert.assertEquals('Logger module isTraceEnabled should have same level as backing logger', backingLogger.isTraceEnabled(),
                    logger.isTraceEnabled());
            Assert.assertEquals('Logger module isDebugEnabled should have same level as backing logger', backingLogger.isDebugEnabled(),
                    logger.isDebugEnabled());
            Assert.assertEquals('Logger module isInfoEnabled should have same level as backing logger', backingLogger.isInfoEnabled(),
                    logger.isInfoEnabled());
            Assert.assertEquals('Logger module isWarnEnabled should have same level as backing logger', backingLogger.isWarnEnabled(),
                    logger.isWarnEnabled());
            Assert.assertEquals('Logger module isErrorEnabled should have same level as backing logger', backingLogger.isErrorEnabled(),
                    logger.isErrorEnabled());
        },

        runLogMessageTest : function(backingLogger, appender)
        {
            var messageCount = 0;

            Assert.assertEquals('Appender should start without any messages', 0, appender.list.size(), 0);

            backingLogger.setLevel(Level.OFF);
            logger.trace('Should be ignored');
            Assert
                    .assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list.size(),
                            0);

            backingLogger.setLevel(Level.TRACE);
            logger.trace('Should not be ignored');
            messageCount++;
            Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
            Assert.assertEquals('Raw log message should have been passed as-is', 'Should not be ignored',
                    appender.list[messageCount - 1].message);
            Assert.assertEquals('The level of the log message should match the log method being used', Level.TRACE,
                    appender.list[messageCount - 1].level);
            Assert.assertNull('The log message should have no throwable attached to it', appender.list[messageCount - 1].throwableProxy);
            Assert.assertEquals('The log message should have an empty argument array', 0,
                    appender.list[messageCount - 1].argumentArray.length, 0);

            backingLogger.setLevel(Level.DEBUG);
            logger.trace('Should be ignored');
            Assert
                    .assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list.size(),
                            0);

            logger.debug('Message with placeholder and 1 arg: {}', 'firstArg');
            messageCount++;
            Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
            Assert.assertEquals('Raw log message should have been passed as-is', 'Message with placeholder and 1 arg: {}',
                    appender.list[messageCount - 1].message);
            Assert.assertEquals('Formatted log message should have resolved placeholders', 'Message with placeholder and 1 arg: firstArg',
                    appender.list[messageCount - 1].formattedMessage);
            Assert.assertEquals('The level of the log message should match the log method being used', Level.DEBUG,
                    appender.list[messageCount - 1].level);
            Assert.assertNull('The log message should have no throwable attached to it', appender.list[messageCount - 1].throwableProxy);
            Assert.assertEquals('The log message should have a single-entry argument array', 1,
                    appender.list[messageCount - 1].argumentArray.length, 0);
            Assert.assertEquals('The log message argument array should contain our provided arg', 'firstArg',
                    appender.list[messageCount - 1].argumentArray[0]);

            backingLogger.setLevel(Level.INFO);
            logger.debug('Should be ignored');
            Assert
                    .assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list.size(),
                            0);

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
            Assert.assertNull('The log message should have no throwable attached to it', appender.list[messageCount - 1].throwableProxy);
            Assert.assertEquals('The log message should have a double-entry argument array', 2,
                    appender.list[messageCount - 1].argumentArray.length, 0);
            Assert.assertEquals('The log message argument array should contain our provided arg', 'firstArg',
                    appender.list[messageCount - 1].argumentArray[0]);
            Assert.assertEquals('The log message argument array should contain our provided arg', 'secondArg',
                    appender.list[messageCount - 1].argumentArray[1]);

            backingLogger.setLevel(Level.WARN);
            logger.info('Should be ignored');
            Assert
                    .assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list.size(),
                            0);

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
            Assert.assertNull('The log message should have no throwable attached to it', appender.list[messageCount - 1].throwableProxy);
            Assert.assertEquals('The log message should have a double-entry argument array', 2,
                    appender.list[messageCount - 1].argumentArray.length, 0);
            Assert.assertEquals('The log message argument array should contain our provided arg', 'firstArg',
                    appender.list[messageCount - 1].argumentArray[0]);
            Assert.assertEquals('The log message argument array should contain our provided arg', 'secondArg',
                    appender.list[messageCount - 1].argumentArray[1]);

            backingLogger.setLevel(Level.ERROR);
            logger.warn('Should be ignored');
            Assert
                    .assertEquals('No (additional) log message should have been added to the appender', messageCount, appender.list.size(),
                            0);

            logger.error('Message with placeholder and 5 args (array-style): {} + {} + {} + {} + {}', [ '1', '2', '3', '4', '5' ]);
            messageCount++;
            Assert.assertEquals('A log message should have been added to the appender', messageCount, appender.list.length, 0);
            Assert.assertEquals('Raw log message should have been passed as-is',
                    'Message with placeholder and 5 args (array-style): {} + {} + {} + {} + {}', appender.list[messageCount - 1].message);
            Assert.assertEquals('Formatted log message should have resolved placeholders',
                    'Message with placeholder and 5 args (array-style): 1 + 2 + 3 + 4 + 5',
                    appender.list[messageCount - 1].formattedMessage);
            Assert.assertEquals('The level of the log message should match the log method being used', Level.ERROR,
                    appender.list[messageCount - 1].level);
            Assert.assertNull('The log message should have no throwable attached to it', appender.list[messageCount - 1].throwableProxy);
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
        }
    };

    return module;
});
