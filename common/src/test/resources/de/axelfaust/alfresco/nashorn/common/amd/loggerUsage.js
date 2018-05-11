'use strict';

require(
        [ 'logger' ],
        function(logger)
        {
            var enabledFnTest, logFnTest, StaticLoggerBinderCls, LevelCls, ListAppenderCls, loggerFactory, logbackLogger, appender, expectedLogSize;

            enabledFnTest = function(fnName)
            {
                var isEnabled;

                if (typeof logger[fnName] !== 'function')
                {
                    throw new Error('"logger" module must provide "' + fnName + '" function');
                }

                isEnabled = logger[fnName]();
                if (typeof isEnabled !== 'boolean')
                {
                    throw new Error('"logger" module "' + fnName + '" function must yield a boolean value');
                }
            };

            logFnTest = function(fnName)
            {
                if (typeof logger[fnName] !== 'function')
                {
                    throw new Error('"logger" module must provide "' + fnName + '" function');
                }
            };

            enabledFnTest('isTraceEnabled');
            enabledFnTest('isDebugEnabled');
            enabledFnTest('isInfoEnabled');
            enabledFnTest('isWarnEnabled');
            enabledFnTest('isErrorEnabled');

            logFnTest('trace');
            logFnTest('debug');
            logFnTest('info');
            logFnTest('warn');
            logFnTest('error');

            StaticLoggerBinderCls = Java.type('org.slf4j.impl.StaticLoggerBinder');
            LevelCls = Java.type('ch.qos.logback.classic.Level');
            ListAppenderCls = Java.type('ch.qos.logback.core.read.ListAppender');

            loggerFactory = StaticLoggerBinderCls.getSingleton().getLoggerFactory();
            // the current context is not part of any module, so qualifies as a global context
            logbackLogger = loggerFactory.getLogger('de.axelfaust.alfresco.nashorn.common.amd.modules.LoggerModule.scripts.-global-');

            logbackLogger.setLevel(LevelCls.OFF);
            if (logger.isTraceEnabled())
            {
                throw new Error("Expectation mismatch for logger.isTraceEnabled() when underlying logger has been disabled");
            }

            logbackLogger.setLevel(LevelCls.TRACE);
            if (!logger.isTraceEnabled())
            {
                throw new Error("Expectation mismatch for logger.isTraceEnabled() when underlying logger has been set to TRACE level");
            }

            logbackLogger.setLevel(LevelCls.DEBUG);
            if (logger.isTraceEnabled() || !logger.isDebugEnabled())
            {
                throw new Error(
                        "Expectation mismatch for logger.isTraceEnabled()/logger.isDebugEnabled when underlying logger has been set to DEBUG level");
            }

            logbackLogger.setLevel(LevelCls.INFO);
            if (logger.isDebugEnabled() || !logger.isInfoEnabled())
            {
                throw new Error(
                        "Expectation mismatch for logger.isDebugEnabled()/logger.isInfoEnabled when underlying logger has been set to INFO level");
            }

            logbackLogger.setLevel(LevelCls.WARN);
            if (logger.isInfoEnabled() || !logger.isWarnEnabled())
            {
                throw new Error(
                        "Expectation mismatch for logger.isInfoEnabled()/logger.isWarnEnabled when underlying logger has been set to WARN level");
            }

            logbackLogger.setLevel(LevelCls.ERROR);
            if (logger.isWarnEnabled() || !logger.isErrorEnabled())
            {
                throw new Error(
                        "Expectation mismatch for logger.isWarnEnabled()/logger.isErrorEnabled when underlying logger has been set to ERROR level");
            }

            appender = new ListAppenderCls();
            logbackLogger.addAppender(appender);
            appender.start();

            logger.warn('Should be ignored');
            expectedLogSize = 0;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }

            logger.error('Simple error log statement');
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].level !== LevelCls.ERROR)
            {
                throw new Error('Expectation mismatch for level of last log message');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple error log statement')
            {
                throw new Error('Expectation mismatch for last log message');
            }

            logbackLogger.setLevel(LevelCls.WARN);
            logger.info('Should be ignored');
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }

            logger.warn('Simple warn log statement');
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].level !== LevelCls.WARN)
            {
                throw new Error('Expectation mismatch for level of last log message');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple warn log statement')
            {
                throw new Error('Expectation mismatch for last log message');
            }

            logbackLogger.setLevel(LevelCls.INFO);
            logger.debug('Should be ignored');
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }

            logger.info('Simple info log statement');
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].level !== LevelCls.INFO)
            {
                throw new Error('Expectation mismatch for level of last log message');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple info log statement')
            {
                throw new Error('Expectation mismatch for last log message');
            }

            logbackLogger.setLevel(LevelCls.DEBUG);
            logger.trace('Should be ignored');
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }

            logger.debug('Simple debug log statement');
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].level !== LevelCls.DEBUG)
            {
                throw new Error('Expectation mismatch for level of last log message');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple debug log statement')
            {
                throw new Error('Expectation mismatch for last log message');
            }

            logbackLogger.setLevel(LevelCls.TRACE);
            logger.trace('Simple trace log statement');
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].level !== LevelCls.TRACE)
            {
                throw new Error('Expectation mismatch for level of last log message');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple trace log statement')
            {
                throw new Error('Expectation mismatch for last log message');
            }

            logger.debug('Simple log statement with native error', new Error('Test'));
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple log statement with native error')
            {
                throw new Error('Expectation mismatch for last log message');
            }
            if (appender.list[expectedLogSize - 1].throwableProxy === null)
            {
                throw new Error('Expectation mismatch for exception in last log message');
            }
            
            logger.debug(new Error('Test'));
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Error: Test')
            {
                throw new Error('Expectation mismatch for last log message');
            }
            if (appender.list[expectedLogSize - 1].throwableProxy === null)
            {
                throw new Error('Expectation mismatch for exception in last log message');
            }

            logger.debug('Simple log statement with placeholders for arguments from native array {} - {}', [ '1', '2' ]);
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple log statement with placeholders for arguments from native array {} - {}')
            {
                throw new Error('Expectation mismatch for last log message');
            }
            if (appender.list[expectedLogSize - 1].formattedMessage !== 'Simple log statement with placeholders for arguments from native array 1 - 2')
            {
                throw new Error('Expectation mismatch for last log formatted message');
            }

            logger.debug('Simple log statement with placeholders for arguments from varargs {} - {}', '1', '2');
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple log statement with placeholders for arguments from varargs {} - {}')
            {
                throw new Error('Expectation mismatch for last log message');
            }
            if (appender.list[expectedLogSize - 1].formattedMessage !== 'Simple log statement with placeholders for arguments from varargs 1 - 2')
            {
                throw new Error('Expectation mismatch for last log formatted message');
            }

            logger.debug('Simple log statement with placeholders for arguments from varargs {} - {} and native error {}', '1', '2', new Error(
                    'Test'));
            expectedLogSize++;
            if (appender.list.size() !== expectedLogSize)
            {
                throw new Error('Expectation mismatch for number of logged events');
            }
            if (appender.list[expectedLogSize - 1].formattedMessage !== 'Simple log statement with placeholders for arguments from varargs 1 - 2 and native error Error: Test')
            {
                throw new Error('Expectation mismatch for last log formated message');
            }
            if (appender.list[expectedLogSize - 1].message !== 'Simple log statement with placeholders for arguments from varargs {} - {} and native error {}')
            {
                throw new Error('Expectation mismatch for last log message');
            }
            if (appender.list[expectedLogSize - 1].throwableProxy === null)
            {
                throw new Error('Expectation mismatch for exception in last log message');
            }
        });
