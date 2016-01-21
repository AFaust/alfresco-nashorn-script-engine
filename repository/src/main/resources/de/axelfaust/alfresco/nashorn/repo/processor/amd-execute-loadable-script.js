/* globals -require */
// wrapped as a module so any other modules behave properly (i.e. logger)
define('executeAMDLoadableScript', [ 'require', '_base/logger', '_base/JavaConvertableMixin' ], function amd_execute_loadable_script(
        require, logger, JavaConvertableMixin)
{
    'use strict';
    var executeFn;

    executeFn = function amd_execute_loadable_script__executeScript(moduleName)
    {
        var result, fnResolved, fnResolveFailed;

        fnResolved = function amd_execute_loadable_script__executeScript_onModuleResolved(module)
        {
            // module may have been declared as a main()-style entry function
            if (typeof module === 'function')
            {
                logger.trace('Module "{}" registered as a function', moduleName);
                result = module();
            }
            // TODO Consider providing optional/special base class (via declare) with script lifecycle callbacks
            else
            {
                // module may be the result itself
                result = module;
            }

            logger.trace('Module "{}" yielded result "{}"', moduleName, result);
        };

        fnResolveFailed = function amd_execute_loadable_script__executeScript_onModuleResolutionFailed(dependencies, modules,
                implicitModules)
        {
            var module;

            module = modules[modules.length - 1] || null;

            // module may have been declared as a main()-style entry function
            if (typeof module === 'function')
            {
                // both cases are actually surprising because then why was error handler called?
                logger.trace('Module "{}" registered as a function', moduleName);
                result = module();
            }
            // TODO Consider providing optional/special base class (via declare) with script lifecycle callbacks
            else if (module !== null)
            {
                // module may be the result itself
                result = module;
            }
            else
            {
                // may be a simple (non-module) script (that may use require imperatively)
                // since actual script execution error will not trigger this we simply use the implicit result / return value
                result = implicitModules[implicitModules.length - 1];

                logger.trace('A module "{}" has not been defined as an AMD-style module', moduleName);
            }

            logger.trace('Module "{}" yielded result "{}"', moduleName, result);
        };

        require([ moduleName ], fnResolved, fnResolveFailed);

        if (result !== undefined && result !== null)
        {
            if (result instanceof JavaConvertableMixin
                    || (typeof result.isInstanceOf === 'function' && result.isInstanceOf(JavaConvertableMixin)))
            {
                result = result.getJavaValue();
            }
            else if (result.javaValue !== undefined && result.javaValue !== null)
            {
                result = result.javaValue;
            }
        }

        return result;
    };

    Object.freeze(executeFn);

    return executeFn;
});