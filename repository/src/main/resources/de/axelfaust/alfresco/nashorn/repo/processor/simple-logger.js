/* globals -require */
/* globals -define */
/* globals Java: false */
(function simple_logger()
{
    'use strict';
    var SimpleLoggerCtor, LoggerFactory, Throwable, Locale, NativeLogMessageArgumentWrapper, processMessageParams;

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

    SimpleLoggerCtor = function simple_logger__constructor(loggerName)
    {
        this.logger = LoggerFactory.getLogger(loggerName);
    };

    SimpleLoggerCtor.prototype = {

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

        isTraceEnabled : function simple_logger__isTraceEnabled()
        {
            return this.logger.traceEnabled;
        },

        isDebugEnabled : function simple_logger__isDebugEnabled()
        {
            return this.logger.debugEnabled;
        },

        isInfoEnabled : function simple_logger__isInfoEnabled()
        {
            return this.logger.infoEnabled;
        },

        isWarnEnabled : function simple_logger__isWarnEnabled()
        {
            return this.logger.warnEnabled;
        },

        isErrorEnabled : function simple_logger__isErrorEnabled()
        {
            return this.logger.errorEnabled;
        },

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

                this.logger['trace(java.lang.String,java.lang.Object[])'](message, this.logger.traceEnabled ? processMessageParams(args)
                        : args);
            }
        },

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

                this.logger['debug(java.lang.String,java.lang.Object[])'](message, this.logger.debugEnabled ? processMessageParams(args)
                        : args);
            }
        },

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

                this.logger['info(java.lang.String,java.lang.Object[])'](message, this.logger.infoEnabled ? processMessageParams(args)
                        : args);
            }
        },

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

                this.logger['warn(java.lang.String,java.lang.Object[])'](message, this.logger.warnEnabled ? processMessageParams(args)
                        : args);
            }
        },

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

                this.logger['error(java.lang.String,java.lang.Object[])'](message, this.logger.errorEnabled ? processMessageParams(args)
                        : args);
            }
        }

    };

    Object.freeze(SimpleLoggerCtor.prototype);
    Object.freeze(SimpleLoggerCtor);

    Object.defineProperty(this, 'SimpleLogger', {
        value : SimpleLoggerCtor,
        enumerable : false
    });

}.call(this));