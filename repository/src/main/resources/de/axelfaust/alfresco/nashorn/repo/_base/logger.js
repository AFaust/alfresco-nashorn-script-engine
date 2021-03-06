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
/* globals getSimpleLogger: false */
define([ 'nashorn!Java' ], function _base_logger__root(Java)
{
    'use strict';
    var loggerModule, loggerModuleProto, getLogger, loggerByScriptUrl = {}, loggerHooks;

    getLogger = function _base_logger__getLogger()
    {
        var callerScriptURL, callerScriptModuleId, callerScriptModuleLoader, logger;

        callerScriptURL = require.getCallerScriptURL();
        if (loggerByScriptUrl.hasOwnProperty(callerScriptURL))
        {
            logger = loggerByScriptUrl[callerScriptURL];
        }
        else
        {
            callerScriptModuleId = require.getScriptFileModuleId(callerScriptURL);
            callerScriptModuleLoader = require.getScriptFileModuleLoader(callerScriptURL);

            if (typeof callerScriptModuleId === 'string')
            {
                logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.'
                        + callerScriptModuleLoader + '.' + callerScriptModuleId.replace(/\//g, '.'));
            }
            else
            {
                // TODO Try to simplify (common) script URLs for shorter, easier-to-handle logger names
                logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.' + callerScriptURL);
            }
            loggerByScriptUrl[callerScriptURL] = logger;
        }

        return logger;
    };

    loggerHooks = (function _base_logger__initLoggerHooks()
    {
        var NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
        return NashornScriptModel.newAssociativeContainer();
    }());

    /**
     * This module provides basic logging capabilities and delegates to SLF4J (which in turn will most likely be backed by Log4J). The
     * logging functionality of this module is caller-aware, meaning that each script will log into a distinct logger depending on its
     * module ID or - when no module ID can be determined for a caller - the URL it was loaded from.
     * 
     * @module _base/logger
     * @requires module:nashorn!Java
     * @author Axel Faust
     */
    loggerModuleProto = {

        /**
         * Adds a hook to be called whenever a logging call is made on a specific level. Only one hook can be registered for a specific log
         * level. Hooks are only registered for the duration of the script execution.
         * 
         * @instance
         * @memberOf module:_base/logger
         * @param {string}
         *            level - the logging level to hook into
         * @param {function}
         *            hook - the log method to call (exact same signature as the log functions of this module)
         */
        addLoggerHook : function _base_logger__addLoggerHook(level, hook)
        {
            if (typeof level === 'string' && typeof hook === 'function')
            {
                loggerHooks[level] = hook;
            }
        },

        /**
         * Log a message at "trace" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        trace : function _base_logger__trace()
        {
            var logger = getLogger();
            if (logger.traceEnabled)
            {
                if (arguments.length <= 1)
                {
                    logger.trace(arguments[0]);
                }
                else if (arguments.length === 2)
                {
                    logger.trace(arguments[0], arguments[1]);
                }
                else
                {
                    // two or more varargs => safe to simply call logger with array of varargs
                    logger.trace(arguments[0], Array.prototype.slice.call(arguments, 1));
                }
            }

            if ('trace' in loggerHooks)
            {
                loggerHooks.trace.apply(null, arguments);
            }
        },

        /**
         * Checks if the "trace" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isTraceEnabled : function _base_logger__isTraceEnabled()
        {
            var logger = getLogger();
            return logger.traceEnabled;
        },

        /**
         * Log a message at "debug" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        debug : function _base_logger__debug()
        {
            var logger = getLogger();
            if (logger.debugEnabled)
            {
                if (arguments.length <= 1)
                {
                    logger.debug(arguments[0]);
                }
                else if (arguments.length === 2)
                {
                    logger.debug(arguments[0], arguments[1]);
                }
                else
                {
                    // two or more varargs => safe to simply call logger with array of varargs
                    logger.debug(arguments[0], Array.prototype.slice.call(arguments, 1));
                }
            }

            if ('debug' in loggerHooks)
            {
                loggerHooks.debug.apply(null, arguments);
            }
        },

        /**
         * Checks if the "debug" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isDebugEnabled : function _base_logger__isDebugEnabled()
        {
            var logger = getLogger();
            return logger.debugEnabled;
        },

        /**
         * Log a message at "info" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        info : function _base_logger__info()
        {
            var logger = getLogger();
            if (logger.infoEnabled)
            {
                if (arguments.length <= 1)
                {
                    logger.info(arguments[0]);
                }
                else if (arguments.length === 2)
                {
                    logger.info(arguments[0], arguments[1]);
                }
                else
                {
                    // two or more varargs => safe to simply call logger with array of varargs
                    logger.info(arguments[0], Array.prototype.slice.call(arguments, 1));
                }
            }

            if ('info' in loggerHooks)
            {
                loggerHooks.info.apply(null, arguments);
            }
        },

        /**
         * Checks if the "info" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isInfoEnabled : function _base_logger__isInfoEnabled()
        {
            var logger = getLogger();
            return logger.infoEnabled;
        },

        /**
         * Log a message at "warn" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        warn : function _base_logger__warn()
        {
            var logger = getLogger();
            if (logger.warnEnabled)
            {
                if (arguments.length <= 1)
                {
                    logger.warn(arguments[0]);
                }
                else if (arguments.length === 2)
                {
                    logger.warn(arguments[0], arguments[1]);
                }
                else
                {
                    // two or more varargs => safe to simply call logger with array of varargs
                    logger.warn(arguments[0], Array.prototype.slice.call(arguments, 1));
                }
            }

            if ('warn' in loggerHooks)
            {
                loggerHooks.warn.apply(null, arguments);
            }
        },

        /**
         * Checks if the "warn" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isWarnEnabled : function _base_logger__isWarnEnabled()
        {
            var logger = getLogger();
            return logger.warnEnabled;
        },

        /**
         * Log a message at "error" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        error : function _base_logger__error()
        {
            var logger = getLogger();
            if (logger.errorEnabled)
            {
                if (arguments.length <= 1)
                {
                    logger.error(arguments[0]);
                }
                else if (arguments.length === 2)
                {
                    logger.error(arguments[0], arguments[1]);
                }
                else
                {
                    // two or more varargs => safe to simply call logger with array of varargs
                    logger.error(arguments[0], Array.prototype.slice.call(arguments, 1));
                }
            }

            if ('error' in loggerHooks)
            {
                loggerHooks.error.apply(null, arguments);
            }
        },

        /**
         * Checks if the "error" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isErrorEnabled : function _base_logger__isErrorEnabled()
        {
            var logger = getLogger();
            return logger.errorEnabled;
        }
    };

    Object.freeze(loggerModuleProto);

    loggerModule = Object.create(loggerModuleProto, {
        /**
         * Flag representing enablement of the trace log level
         * 
         * @instance
         * @memberof module:_base/logger
         * @var traceEnabled
         * @type {boolean}
         * @readonly
         */
        traceEnabled : {
            get : function _base_logger__traceEnabled__getter()
            {
                return this.isTraceEnabled();
            },
            enumerable : true
        },
        /**
         * Flag representing enablement of the debug log level
         * 
         * @instance
         * @memberof module:_base/logger
         * @var debugEnabled
         * @type {boolean}
         * @readonly
         */
        debugEnabled : {
            get : function _base_logger__debugEnabled__getter()
            {
                return this.isDebugEnabled();
            },
            enumerable : true
        },
        /**
         * Flag representing enablement of the info log level
         * 
         * @instance
         * @memberof module:_base/logger
         * @var infoEnabled
         * @type {boolean}
         * @readonly
         */
        infoEnabled : {
            get : function _base_logger__infoEnabled__getter()
            {
                return this.isInfoEnabled();
            },
            enumerable : true
        },
        /**
         * Flag representing enablement of the warn log level
         * 
         * @instance
         * @memberof module:_base/logger
         * @var warnEnabled
         * @type {boolean}
         * @readonly
         */
        warnEnabled : {
            get : function _base_logger__warnEnabled__getter()
            {
                return this.isWarnEnabled();
            },
            enumerable : true
        },
        /**
         * Flag representing enablement of the error log level
         * 
         * @instance
         * @memberof module:_base/logger
         * @var errorEnabled
         * @type {boolean}
         * @readonly
         */
        errorEnabled : {
            get : function _base_logger__errorEnabled__getter()
            {
                return this.isErrorEnabled();
            },
            enumerable : true
        }
    });
    Object.freeze(loggerModule);

    return define.asSpecialModule(loggerModule, [ 'callerTagged' ]);
});