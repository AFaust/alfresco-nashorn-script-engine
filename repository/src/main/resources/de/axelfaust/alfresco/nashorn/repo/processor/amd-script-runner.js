/* globals _loadableModule: false */
/* globals require: false */
/* globals -define */
(function amd_script_runner__root()
{
    'use strict';
    var moduleName = _loadableModule.scriptModuleId, globalResult;

    if (_loadableModule.loaderName !== null)
    {
        moduleName = _loadableModule.loaderName + '!' + moduleName;
    }

    try
    {
        require([ 'executeAMDLoadableScript' ], function amd_script_runner__handleResult(executeAMDLoadableScript)
        {
            globalResult = executeAMDLoadableScript(moduleName);
        });

        // reset to clean state after use
        require.reset();
    }
    catch (e)
    {
        // reset to clean state after use
        require.reset();

        throw e;
    }

    return globalResult;
}());