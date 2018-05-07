'use strict';

require(
        [ 'logger' ],
        function(logger)
        {
            var enabledFnTest, logFnTest, StaticLoggerBinderCls, LevelCls, loggerFactory, logbackLogger;

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
            
            // TODO Actual logging calls
        });
