/* globals -require */
/* globals applicationContext: false */
(function spring_loader__global()
{
    'use strict';
    var appContext = applicationContext;

    define('spring', [ 'define' ], function spring_loader(define)
    {
        var loader = {
            load : function spring_loader__load(normalizedId, /*jshint unused: false*/require, load)
            {
                var bean = appContext.getBean(normalizedId.replace(/\//g, '.'));
                load(define.asSecureUseModule(bean), true);
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return define.asSecureUseModule(loader);
    });
}());
