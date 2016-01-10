/* globals -require */
(function()
{
    'use strict';
    define(
            [ 'require', 'nashorn!Java' ],
            function logger(require, Java)
            {
                var loggerModule, getSLF4JLogger, logImpl, isEnabledImpl, loggerByScriptUrl = {}, Throwable, LoggerFactory;

                Throwable = Java.type('java.lang.Throwable');
                LoggerFactory = Java.type('org.slf4j.LoggerFactory');

                getSLF4JLogger = function logger__getSLF4JLogger()
                {
                    var callerScriptURL, callerScriptModuleId, callerScriptModuleLoader, logger;

                    callerScriptURL = require.getCallerScriptURL();

                    if (loggerByScriptUrl.hasOwnProperty(callerScriptURL))
                    {
                        logger = loggerByScriptUrl[callerScriptURL];
                    }
                    else
                    {
                        callerScriptModuleId = require.getCallerScriptModuleId();
                        callerScriptModuleLoader = require.getCallerScriptModuleLoader();

                        if (typeof callerScriptModuleId === 'string')
                        {
                            logger = LoggerFactory.getLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.'
                                    + callerScriptModuleLoader + '.' + callerScriptModuleId);
                        }
                        else
                        {
                            // TODO Try to simplify (common) script URLs for shorter, easier-to-handle logger names
                            logger = LoggerFactory.getLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.'
                                    + callerScriptURL);
                        }
                        loggerByScriptUrl[callerScriptURL] = logger;
                    }

                    return logger;
                };

                logImpl = function logger__logImpl(level, args)
                {
                    var message, ex, values, idx, logger, meth;

                    for (idx = 0; idx < args.length; idx++)
                    {
                        if (idx === 0 && typeof args[idx] === 'string')
                        {
                            message = args[idx];
                        }

                        if (idx > 0 && message !== undefined)
                        {
                            if (idx === 1
                                    && args.length === 2
                                    && (args[idx] instanceof Throwable || (args[idx] instanceof Error && args[idx].nashornException instanceof Throwable)))
                            {
                                // best-effort attempt - requires correct inheritance
                                if (args[idx] instanceof Error && args[idx].nashornException instanceof Throwable)
                                {
                                    ex = args[idx].nashornException;
                                }
                                else
                                {
                                    ex = args[idx];
                                }
                            }
                            else if (ex === undefined)
                            {
                                if (values === undefined)
                                {
                                    values = [];
                                }
                                values.push(args[idx]);
                            }
                        }
                    }

                    logger = getSLF4JLogger();

                    meth = level || 'debug';
                    if (ex !== undefined)
                    {
                        logger[meth](message, ex);
                    }
                    else if (values !== undefined)
                    {
                        logger[meth](message, Java.to(values, 'java.lang.Object[]'));
                    }
                    else
                    {
                        logger[meth](message);
                    }
                };

                isEnabledImpl = function logger__isEnabledImpl(level)
                {
                    var logger = getSLF4JLogger(), prop, isEnabled = false;

                    prop = (level || 'debug') + 'Enabled';
                    // JavaLinker has a minor bug not handling ConsString -> force String
                    isEnabled = logger[String(prop)];

                    return isEnabled;
                };

                loggerModule = {
                    trace : function logger__trace()
                    {
                        logImpl('trace', arguments);
                    },

                    isTraceEnabled : function logger__isTraceEnabled()
                    {
                        return isEnabledImpl('trace');
                    },

                    debug : function logger__debug()
                    {
                        logImpl('debug', arguments);
                    },

                    isDebugEnabled : function logger__isDebugEnabled()
                    {
                        return isEnabledImpl('debug');
                    },

                    info : function logger__info()
                    {
                        logImpl('info', arguments);
                    },

                    isInfoEnabled : function logger__isInfoEnabled()
                    {
                        return isEnabledImpl('info');
                    },

                    warn : function logger__warn()
                    {
                        logImpl('warn', arguments);
                    },

                    isWarnEnabled : function logger__isWarnEnabled()
                    {
                        return isEnabledImpl('warn');
                    },

                    error : function logger__error()
                    {
                        logImpl('error', arguments);
                    },

                    isErrorEnabled : function logger__isErrorEnabled()
                    {
                        return isEnabledImpl('error');
                    }
                };

                Object.freeze(loggerModule);

                return loggerModule;
            });
}());