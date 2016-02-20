/* globals -require */
define(
        [ 'require', 'nashorn!Java' ],
        function logger(require, Java)
        {
            'use strict';
            var loggerModule, getSLF4JLogger, isEnabledImpl, logImpl, loggerByScriptUrl = {}, Throwable, LoggerFactory, NativeLogMessageArgumentWrapper;

            Throwable = Java.type('java.lang.Throwable');
            LoggerFactory = Java.type('org.slf4j.LoggerFactory');
            NativeLogMessageArgumentWrapper = Java.type('de.axelfaust.alfresco.nashorn.repo.utils.NativeLogMessageArgumentWrapper');

            getSLF4JLogger = function logger__getSLF4JLogger()
            {
                var callerScriptURL, callerScriptModuleId, callerScriptModuleLoader, logger;

                callerScriptURL = require.getCallerScriptURL(true);

                if (loggerByScriptUrl.hasOwnProperty(callerScriptURL))
                {
                    logger = loggerByScriptUrl[callerScriptURL];
                }
                else
                {
                    callerScriptModuleId = require.getCallerScriptModuleId(true);
                    callerScriptModuleLoader = require.getCallerScriptModuleLoader(true);

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

            isEnabledImpl = function logger__isEnabledImpl(level)
            {
                var logger = getSLF4JLogger(), prop, isEnabled = false;

                prop = (level || 'debug') + 'Enabled';
                // JavaLinker has a minor bug not handling ConsString -> force String
                isEnabled = logger[String(prop)];

                return isEnabled;
            };

            logImpl = function logger__logImpl(level, args)
            {
                var message, ex, values, idx, logger, enabledProp, meth;

                // we could delegate to isEnabledImpl but that would mean retrieving logger potentially twice
                logger = getSLF4JLogger();
                enabledProp = (level || 'debug') + 'Enabled';

                // to avoid interop performance overhead we should drop out as soon as possible
                // JavaLinker has a minor bug not handling ConsString -> force String
                if (logger[String(enabledProp)])
                {
                    // TODO Determine caller fn + line and expose via MDC

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

                                switch (typeof args[idx])
                                {
                                    case 'object':
                                    case 'function':
                                        // typeof null === 'object' so exclude here
                                        // also: typeof javaObj === 'object' so add instanceof check against native prototype too
                                        if (args[idx] !== null && (args[idx] instanceof Object || args[idx] instanceof Function))
                                        {
                                            // script objects passed to logger would not have their JS toString called
                                            values.push(new NativeLogMessageArgumentWrapper(args[idx]));
                                        }
                                        else
                                        {
                                            values.push(args[idx]);
                                        }
                                        break;
                                    default:
                                        values.push(args[idx]);
                                }
                            }
                        }
                    }

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
                }
            };

            // TODO Provide option to hook in dynamic log delegates (i.e. for JavaScript Console)
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