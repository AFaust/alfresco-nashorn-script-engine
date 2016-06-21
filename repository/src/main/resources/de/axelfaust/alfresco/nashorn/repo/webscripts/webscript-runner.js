/* globals -require */
/**
 * This module acts as the standard runner for Nashorn-backed web scripts. Its primary purpose is to wrap web script executions to
 * additionally preload the "webscript" AMD loader plugin before the actual script is executed. This allows us to not load that specific
 * loader plugin for all script use cases.
 * 
 * @requires module:require
 * @requires module:args!_RepositoryNashornScriptProcessor_scriptContent
 * @author Axel Faust
 */
define([ 'require', 'args!_RepositoryNashornScriptProcessor_scriptContent' ], function webscript_runner__factory(require, scriptContent)
{
    'use strict';

    // TODO Optimize define - allow re-use of initialized webscript loader in future executions
    define.preload('loaderMetaLoader!webscript');

    return function webscript_runner()
    {
        var webscriptModuleId, result;

        webscriptModuleId = scriptContent.loaderName + '!' + scriptContent.scriptModuleId;

        require([ webscriptModuleId ], function webscript_runner__callback(webscriptResult)
        {
            result = webscriptResult;

            if (typeof result === 'function')
            {
                result = result();
            }
        }, function webscript_runner__errCallback(dependencies, resolutions, implicitResolutions)
        {
            result = resolutions[0] || implicitResolutions[0];
        });

        return result;
    };
});
