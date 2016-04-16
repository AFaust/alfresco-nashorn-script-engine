/* globals require: false */
/* globals -define */
(function amd_script_runner__root()
{
    'use strict';
    var runner = {
        run : function amd_script_runner__run(moduleId, argumentModel)
        {
            var globalResult;

            require([ 'args', 'executeAMDLoadableScript' ], function amd_script_runner__handleResult(args, executeAMDLoadableScript)
            {
                args.setArgumentModel(argumentModel);
                globalResult = executeAMDLoadableScript(moduleId);
            });

            return globalResult;
        }
    };

    return runner;
}());