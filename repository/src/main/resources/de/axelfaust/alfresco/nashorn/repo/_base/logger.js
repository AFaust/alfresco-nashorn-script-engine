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
/* globals getSimpleLogger: false */
define([ 'require', 'define' ], function logger(require, define)
{
    'use strict';
    var loggerModule, loggerModuleProto, getLogger, loggerByScriptUrl = {};

    getLogger = function logger__getLogger()
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

    // TODO Provide option to hook in dynamic log delegates (i.e. for JavaScript Console)
    /**
     * This module provides basic logging capabilities and delegates to SLF4J (which in turn will most likely be backed by Log4J). The
     * logging functionality of this module is caller-aware, meaning that each script will log into a distinct logger depending on its
     * module ID or - when no module ID can be determined for a caller - the URL it was loaded from.
     * 
     * @module _base/logger
     * @author Axel Faust
     */
    loggerModuleProto = {

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
        trace : function logger__trace()
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
        },

        /**
         * Checks if the "trace" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isTraceEnabled : function logger__isTraceEnabled()
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
        debug : function logger__debug()
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
        },

        /**
         * Checks if the "debug" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isDebugEnabled : function logger__isDebugEnabled()
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
        info : function logger__info()
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
        },

        /**
         * Checks if the "info" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isInfoEnabled : function logger__isInfoEnabled()
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
        warn : function logger__warn()
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
        },

        /**
         * Checks if the "warn" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isWarnEnabled : function logger__isWarnEnabled()
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
        error : function logger__error()
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
        },

        /**
         * Checks if the "error" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isErrorEnabled : function logger__isErrorEnabled()
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
            get : function logger__traceEnabled__getter()
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
            get : function logger__debugEnabled__getter()
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
            get : function logger__infoEnabled__getter()
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
            get : function logger__warnEnabled__getter()
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
            get : function logger__errorEnabled__getter()
            {
                return this.isErrorEnabled();
            },
            enumerable : true
        }
    });
    Object.freeze(loggerModule);

    return define.asSpecialModule(loggerModule, [ 'callerTagged' ]);
});