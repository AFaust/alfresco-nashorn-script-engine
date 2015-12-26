'use strict';
(function amd_execute_loadable_script()
{
    var moduleName = _loadableModule.scriptModuleId, result, fnResolved, fnResolveFailed;

    if (_loadableModule.loaderName !== null)
    {
        moduleName = _loadableModule.loaderName + '!' + moduleName;
    }

    // reset to clean state before potential previous use
    require.reset();

    fnResolved = function amd_execute_loadable_script__onModuleResolved(logger, module)
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

    fnResolveFailed = function amd_execute_loadable_script__onModuleResolutionFailed(dependencies, modules, implicitModules)
    {
        var logger, module;

        logger = modules[0] || null;
        module = modules[modules.length - 1] || null;

        // module may have been declared as a main()-style entry function
        if (typeof module === 'function')
        {
            if (logger !== null)
            {
                // both cases are actually surprising because then why was error handler called?
                logger.trace('Module "{}" registered as a function', moduleName);
            }
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

            if (logger !== null)
            {
                logger.trace('A module "{}" has not been defined as an AMD-style module', moduleName);
            }
        }

        if (logger !== null)
        {
            logger.trace('Module "{}" yielded result "{}"', moduleName, result);
        }
    };

    require([ '_base/logger', moduleName ], fnResolved, fnResolveFailed);

    return result;
}());