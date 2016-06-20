/* globals -require */
/* globals -define */
/* globals Java: false */
(function simple_logger()
{
    'use strict';
    var SimpleLogger, LoggerFactory, Throwable, Locale, NativeLogMessageArgumentWrapper, processMessageParams;

    LoggerFactory = Java.type('org.slf4j.LoggerFactory');
    Throwable = Java.type('java.lang.Throwable');
    Locale = Java.type('java.util.Locale');
    NativeLogMessageArgumentWrapper = Java.type('de.axelfaust.alfresco.nashorn.repo.utils.NativeLogMessageArgumentWrapper');

    processMessageParams = function simple_logger__processMessageParams(params)
    {
        var processedParams = [], idx;

        for (idx = 0; idx < params.length; idx++)
        {
            switch (typeof params[idx])
            {
                case 'object':
                case 'function':
                    // typeof null === 'object' so exclude here
                    // also: typeof javaObj === 'object' so add instanceof check against native prototype too
                    if (params[idx] !== null && (params[idx] instanceof Object || params[idx] instanceof Function))
                    {
                        if (!(params[idx] instanceof Function) || params[idx].name === 'toString')
                        {
                            // script objects passed to logger would not have their JS toString called
                            processedParams.push(new NativeLogMessageArgumentWrapper(params[idx]));
                        }
                        else
                        {
                            // ToStringFunction functional interface captures any function, even constructors
                            processedParams.push(new NativeLogMessageArgumentWrapper(Function.prototype.bind.call(params[idx].toString,
                                    params[idx])));
                        }
                    }
                    else
                    {
                        processedParams.push(params[idx]);
                    }
                    break;
                default:
                    processedParams.push(params[idx]);
            }
        }

        return processedParams;
    };

    /**
     * Create a new facade to a SLF4J logger instance with the provided name.
     * 
     * @class
     * @param {string}
     *            loggerName the name of the underlying logger to facade
     */
    SimpleLogger = function simple_logger__constructor(loggerName)
    {
        this.logger = LoggerFactory.getLogger(loggerName);
    };

    // TODO Find out why jsdoc3 is so difficult to handle in documenting class members
    SimpleLogger.prototype = {

        __noSuchProperty__ : function simple_logger__noSuchProperty__(name)
        {
            var result, getterName;
            if (/^(trace|debug|info|warn|error)Enabled$/.test(name))
            {
                getterName = 'is' + name.substring(0, 1).toUpperCase(Locale.ENGLISH) + name.substring(1);
                result = this[getterName]();
            }

            return result;
        },

        /**
         * Flag representing enablement of the trace log level
         * 
         * @instance
         * @memberof SimpleLogger
         * @var traceEnabled
         * @type {boolean}
         * @readonly
         */
        /**
         * Checks if the trace log level is enabled for this instance.
         * 
         * @instance
         * @memberof SimpleLogger
         * @returns {boolean} true if the trace log level is enabled, false otherwise
         */
        isTraceEnabled : function simple_logger__isTraceEnabled()
        {
            return this.logger.traceEnabled;
        },

        /**
         * Flag representing enablement of the debug log level
         * 
         * @instance
         * @memberof SimpleLogger
         * @var debugEnabled
         * @type {boolean}
         * @readonly
         */
        /**
         * Checks if the debug log level is enabled for this instance.
         * 
         * @instance
         * @memberof SimpleLogger
         * @returns {boolean} true if the debug log level is enabled, false otherwise
         */
        isDebugEnabled : function simple_logger__isDebugEnabled()
        {
            return this.logger.debugEnabled;
        },

        /**
         * Flag representing enablement of the info log level
         * 
         * @instance
         * @memberof SimpleLogger
         * @var infoEnabled
         * @type {boolean}
         * @readonly
         */
        /**
         * Checks if the trace info level is enabled for this instance.
         * 
         * @instance
         * @memberof SimpleLogger
         * @returns {boolean} true if the info log level is enabled, false otherwise
         */
        isInfoEnabled : function simple_logger__isInfoEnabled()
        {
            return this.logger.infoEnabled;
        },

        /**
         * Flag representing enablement of the warn log level
         * 
         * @instance
         * @memberof SimpleLogger
         * @var warnEnabled
         * @type {boolean}
         * @readonly
         */
        /**
         * Checks if the warn log level is enabled for this instance.
         * 
         * @instance
         * @memberof SimpleLogger
         * @returns {boolean} true if the warn log level is enabled, false otherwise
         */
        isWarnEnabled : function simple_logger__isWarnEnabled()
        {
            return this.logger.warnEnabled;
        },

        /**
         * Flag representing enablement of the error log level
         * 
         * @instance
         * @memberof SimpleLogger
         * @var errorEnabled
         * @type {boolean}
         * @readonly
         */
        /**
         * Checks if the error log level is enabled for this instance.
         * 
         * @instance
         * @memberof SimpleLogger
         * @returns {boolean} true if the error log level is enabled, false otherwise
         */
        isErrorEnabled : function simple_logger__isErrorEnabled()
        {
            return this.logger.errorEnabled;
        },

        /**
         * Logs a message at trace level.
         * 
         * @instance
         * @memberof SimpleLogger
         * @param {string}
         *            message the message to log, potentially including value placeholders in the form of '{}'
         * @param {Error|Throwable}
         *            [ex] the native error or Java exception to log
         * @param {object|array}
         *            [params] the parameter(s) to fill placeholders in the log message (if the log level is enabled) - multiple arguments
         *            can be provided either as an array or vararg-like list of values
         */
        trace : function simple_logger__trace(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.trace(message);
            }
            else if (arguments.length === 2
                    && (arg2 instanceof Throwable || (arg2 instanceof Error && arg2.nashornException instanceof Throwable)))
            {
                this.logger.trace(message, arg2 instanceof Throwable ? arg2 : arg2.nashornException);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                // TODO Optimize (this lookup is quite expansive)
                this.logger['trace(java.lang.String,java.lang.Object[])'](message, this.logger.traceEnabled ? processMessageParams(arg2)
                        : arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                // TODO Optimize (this lookup is quite expansive)
                this.logger['trace(java.lang.String,java.lang.Object[])'](message, this.logger.traceEnabled ? processMessageParams(args)
                        : args);
            }
        },

        /**
         * Logs a message at debug level.
         * 
         * @instance
         * @memberof SimpleLogger
         * @param {string}
         *            message the message to log, potentially including value placeholders in the form of '{}'
         * @param {Error|Throwable}
         *            [ex] the native error or Java exception to log
         * @param {object|array}
         *            [params] the parameter(s) to fill placeholders in the log message (if the log level is enabled) - multiple arguments
         *            can be provided either as an array or vararg-like list of values
         */
        debug : function simple_logger__debug(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.debug(message);
            }
            else if (arguments.length === 2
                    && (arg2 instanceof Throwable || (arg2 instanceof Error && arg2.nashornException instanceof Throwable)))
            {
                this.logger.debug(message, arg2 instanceof Throwable ? arg2 : arg2.nashornException);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                // TODO Optimize (this lookup is quite expansive)
                this.logger['debug(java.lang.String,java.lang.Object[])'](message, this.logger.debugEnabled ? processMessageParams(arg2)
                        : arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                // TODO Optimize (this lookup is quite expansive)
                this.logger['debug(java.lang.String,java.lang.Object[])'](message, this.logger.debugEnabled ? processMessageParams(args)
                        : args);
            }
        },

        /**
         * Logs a message at info level.
         * 
         * @instance
         * @memberof SimpleLogger
         * @param {string}
         *            message the message to log, potentially including value placeholders in the form of '{}'
         * @param {Error|Throwable}
         *            [ex] the native error or Java exception to log
         * @param {object|array}
         *            [params] the parameter(s) to fill placeholders in the log message (if the log level is enabled) - multiple arguments
         *            can be provided either as an array or vararg-like list of values
         */
        info : function simple_logger__info(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.info(message);
            }
            else if (arguments.length === 2
                    && (arg2 instanceof Throwable || (arg2 instanceof Error && arg2.nashornException instanceof Throwable)))
            {
                this.logger.info(message, arg2 instanceof Throwable ? arg2 : arg2.nashornException);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                // TODO Optimize (this lookup is quite expansive)
                this.logger['info(java.lang.String,java.lang.Object[])'](message, this.logger.infoEnabled ? processMessageParams(arg2)
                        : arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                // TODO Optimize (this lookup is quite expansive)
                this.logger['info(java.lang.String,java.lang.Object[])'](message, this.logger.infoEnabled ? processMessageParams(args)
                        : args);
            }
        },

        /**
         * Logs a message at warn level.
         * 
         * @instance
         * @memberof SimpleLogger
         * @param {string}
         *            message the message to log, potentially including value placeholders in the form of '{}'
         * @param {Error|Throwable}
         *            [ex] the native error or Java exception to log
         * @param {object|array}
         *            [params] the parameter(s) to fill placeholders in the log message (if the log level is enabled) - multiple arguments
         *            can be provided either as an array or vararg-like list of values
         */
        warn : function simple_logger__warn(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.warn(message);
            }
            else if (arguments.length === 2
                    && (arg2 instanceof Throwable || (arg2 instanceof Error && arg2.nashornException instanceof Throwable)))
            {
                this.logger.warn(message, arg2 instanceof Throwable ? arg2 : arg2.nashornException);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                // TODO Optimize (this lookup is quite expansive)
                this.logger['warn(java.lang.String,java.lang.Object[])'](message, this.logger.warnEnabled ? processMessageParams(arg2)
                        : arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                // TODO Optimize (this lookup is quite expansive)
                this.logger['warn(java.lang.String,java.lang.Object[])'](message, this.logger.warnEnabled ? processMessageParams(args)
                        : args);
            }
        },

        /**
         * Logs a message at error level.
         * 
         * @instance
         * @memberof SimpleLogger
         * @param {string}
         *            message the message to log, potentially including value placeholders in the form of '{}'
         * @param {Error|Throwable}
         *            [ex] the native error or Java exception to log
         * @param {...object|array}
         *            [params] the parameter(s) to fill placeholders in the log message (if the log level is enabled) - multiple arguments
         *            can be provided either as an array or vararg-like list of values
         */
        error : function simple_logger__error(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.error(message);
            }
            else if (arguments.length === 2
                    && (arg2 instanceof Throwable || (arg2 instanceof Error && arg2.nashornException instanceof Throwable)))
            {
                this.logger.error(message, arg2 instanceof Throwable ? arg2 : arg2.nashornException);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                // TODO Optimize (this lookup is quite expansive)
                this.logger['error(java.lang.String,java.lang.Object[])'](message, this.logger.errorEnabled ? processMessageParams(arg2)
                        : arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                // TODO Optimize (this lookup is quite expansive)
                this.logger['error(java.lang.String,java.lang.Object[])'](message, this.logger.errorEnabled ? processMessageParams(args)
                        : args);
            }
        }

    };

    Object.freeze(SimpleLogger.prototype);
    Object.freeze(SimpleLogger);

    Object.defineProperty(this, 'SimpleLogger', {
        value : SimpleLogger,
        enumerable : false
    });

}.call(this));