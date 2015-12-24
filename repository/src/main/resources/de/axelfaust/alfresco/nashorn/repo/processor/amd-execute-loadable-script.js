'use strict';
(function amd_execute_loadable_script()
{
    var moduleName = _loadableModule.scriptModuleId, result;

    if (_loadableModule.loaderName !== null)
    {
        moduleName = _loadableModule.loaderName + '!' + moduleName;
    }

    // reset to clean state before potential previous use
    require.reset();

    require([ moduleName ], function amd_execute_loadable_script__onModuleResolved(module)
    {
        if (module !== null)
        {
            // module may have been declared as a main()-style entry function
            if (typeof module === 'function')
            {
                result = module();
            }
            else
            {
                // module may be the result itself
                result = module;
            }
        }
    });

    return result;
}());