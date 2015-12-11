// with pre-emps global access
with (scopeObj)
{
    // call on scobeObj prevents implicit this = global
    (function amd_execute_loadable_script()
    {
        'use strict';
        var moduleName = _loadableModule.scriptModuleId, result;
        
        if(_loadableModule.loaderName !== null)
        {
            moduleName = _loadableModule.loaderName + '!' + moduleName;
        }
        
        require([moduleName], function amd_execute_loadable_script__onModuleResolved(module)
        {
            'use strict';
            if (module !== null)
            {
                // module may have been declared as a main()-style entry function
                if (typeof module === 'function')
                {
                    result = module();
                }
                else
                {
                    result = module;
                }
            }
        });
        
        return result;
    }.call(scopeObj));
}