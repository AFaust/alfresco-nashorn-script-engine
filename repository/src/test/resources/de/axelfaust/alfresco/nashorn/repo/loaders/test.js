(function test_loader_root()
{
    'use strict';

    define('test', [ 'define' ], function test_loader(define)
    {
        var loader, modules = {};

        loader = {

            prepareModule : function test_loader__prepareMOdule(normalizedId, url, isSecure, module)
            {
                modules[normalizedId] = {
                    url : url,
                    isSecure : isSecure,
                    module : module
                };
            },

            load : function test_loader__load(normalizedId, /* jshint unused: false */require, load)
            {
                var module;

                if (modules.hasOwnProperty(normalizedId))
                {
                    module = {
                        wrapped : modules[normalizedId].module,
                        url : modules[normalizedId].url,
                        secureUseOnly : false
                    };
                    load(module, modules[normalizedId].isSecure);
                }
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });
}());