with (scopeObj)
{
    (function()
    {
        var moduleName = _loadableModule.scriptModuleId, result;
        
        if(_loadableModule.loaderName !== null)
        {
            moduleName = _loadableModule.loaderName + '!' + moduleName;
        }
        
        require([moduleName], function(module)
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
                    result = module;
                }
            }
        });
        
        return result;
    }.call(scopeObj));
}