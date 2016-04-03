/*
 * The logger name schemata are as follows:
 * - de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.&lt;loaderName&gt;.&lt;moduleId&gt;
 * - de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.&lt;scriptUrl&gt;
 * 
 * &lt;loaderName&gt; is the name of the loader plugin that loaded the script, i.e. "classpath" or "webscript".
 * 
 * &lt;moduleId&gt; is the nominal module ID (i.e. "_base/logger") with forward slashes converted into dots.
 * 
 * &lt;scriptUrl&gt; is the abstract URL from which a script has been loaded. "Abstract" in this regard means
 * that it may be an URL with a custom semantic protocol identifier that is only resolveable within the script engine.
 * An example scriptUrl might be "extensible-classpath://scripts/my-script.js" for a script that is resolved against
 * the classpath in such a way that scripts in the servers extension-root can override scripts bundled with the WAR. 
 */
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
                                + callerScriptModuleLoader + '.' + callerScriptModuleId.replace(/\//, '.'));
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
                                            if (!(args[idx] instanceof Function) || args[idx].name === 'toString')
                                            {
                                                // script objects passed to logger would not have their JS toString called
                                                values.push(new NativeLogMessageArgumentWrapper(args[idx]));
                                            }
                                            else
                                            {
                                                // ToStringFunction functional interface captures any function, even constructors
                                                values.push(new NativeLogMessageArgumentWrapper(Function.prototype.bind.call(
                                                        args[idx].toString, args[idx])));
                                            }
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
                        logger[meth](message, values);
                    }
                    else
                    {
                        logger[meth](message);
                    }
                }
            };

            // TODO Provide option to hook in dynamic log delegates (i.e. for JavaScript Console)
            /**
             * This module provides basic logging capabilities and delegates to SLF4J (which in turn will most likely be backed by Log4J). The logging
             * functionality of this module is caller-aware, meaning that each script will log into a distinct logger depending on its module ID or -
             * when no module ID can be determined for a caller - the URL it was loaded from.
             *  
             * @exports _base/logger
             * @author Axel Faust
             */
            // @exports is an alias for @module in this specific constellation (using object literal) 
            loggerModule = {
                
                /**
                 * Log a message at "trace" level
                 * 
                 * @instance
                 * @param {string} message - the message / pattern for the log message
                 * @param {Error|Throwable} [error] - the error / exception that needs to be logged
                 * @param {string} [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log level is enabled (mutually exclusive with error)
                 */
                trace : function logger__trace()
                {
                    logImpl('trace', arguments);
                },

                /**
                 * Checks if the "trace" log level is enabled for the caller script's logger
                 * 
                 * @instance
                 * @returns {boolean} true if the log level is enabled
                 */
                isTraceEnabled : function logger__isTraceEnabled()
                {
                    return isEnabledImpl('trace');
                },

                /**
                 * Log a message at "debug" level
                 * 
                 * @instance
                 * @param {string} message - the message / pattern for the log message
                 * @param {Error|Throwable} [error] - the error / exception that needs to be logged
                 * @param {string} [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log level is enabled (mutually exclusive with error)
                 */
                debug : function logger__debug()
                {
                    logImpl('debug', arguments);
                },

                /**
                 * Checks if the "debug" log level is enabled for the caller script's logger
                 * 
                 * @method
                 * @instance
                 * @returns {boolean} true if the log level is enabled
                 */
                isDebugEnabled : function logger__isDebugEnabled()
                {
                    return isEnabledImpl('debug');
                },

                /**
                 * Log a message at "info" level
                 * 
                 * @instance
                 * @param {string} message - the message / pattern for the log message
                 * @param {Error|Throwable} [error] - the error / exception that needs to be logged
                 * @param {string} [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log level is enabled (mutually exclusive with error)
                 */
                info : function logger__info()
                {
                    logImpl('info', arguments);
                },

                /**
                 * Checks if the "info" log level is enabled for the caller script's logger
                 * 
                 * @instance
                 * @returns {boolean} true if the log level is enabled
                 */
                isInfoEnabled : function logger__isInfoEnabled()
                {
                    return isEnabledImpl('info');
                },

                /**
                 * Log a message at "warn" level
                 * 
                 * @instance
                 * @param {string} message - the message / pattern for the log message
                 * @param {Error|Throwable} [error] - the error / exception that needs to be logged
                 * @param {string} [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log level is enabled (mutually exclusive with error)
                 */
                warn : function logger__warn()
                {
                    logImpl('warn', arguments);
                },

                /**
                 * Checks if the "warn" log level is enabled for the caller script's logger
                 * 
                 * @instance
                 * @returns {boolean} true if the log level is enabled
                 */
                isWarnEnabled : function logger__isWarnEnabled()
                {
                    return isEnabledImpl('warn');
                },

                /**
                 * Log a message at "error" level
                 * 
                 * @instance
                 * @param {string} message - the message / pattern for the log message
                 * @param {Error|Throwable} [error] - the error / exception that needs to be logged
                 * @param {string} [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log level is enabled (mutually exclusive with error)
                 */
                error : function logger__error()
                {
                    logImpl('error', arguments);
                },

                /**
                 * Checks if the "error" log level is enabled for the caller script's logger
                 * 
                 * @instance
                 * @returns {boolean} true if the log level is enabled
                 */
                isErrorEnabled : function logger__isErrorEnabled()
                {
                    return isEnabledImpl('error');
                }
            };

            Object.freeze(loggerModule);

            return loggerModule;
        });