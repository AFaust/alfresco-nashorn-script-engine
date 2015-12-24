'use strict';
(function nashorn_loader_root()
{
    // this loader will be responsible for providing access to Nashorn global utilities that we may want to restrict to secure scripts
    // in order to prevent circumventions those global utilities will be removed after this loader is defined, so we need to store them
    // locally in a "backup" object
    var globalBackup;

    globalBackup = {
        Packages : Packages,
        Java : Java,
        JavaImporter : JavaImporter,
        print : print
    };

    define('nashorn', [ 'define' ], function nashorn_loader(define)
    {
        var loader;

        loader = {
            load : function nashorn_loader__load(normalizedId, require, load)
            {
                var module;

                if (globalBackup.hasOwnProperty(normalizedId))
                {
                    module = globalBackup[normalizedId];
                    load(define.asSecureUseModule(module), true);
                }
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return define.asSecureUseModule(loader);
    });
}());