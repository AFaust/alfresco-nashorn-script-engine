'use strict';
(function spring_loader__global()
{
    var appContext = applicationContext;

    define('spring', [ 'define', 'nashorn!Java' ], function spring_loader(define, Java)
    {
        var loader = {
            load : function spring_loader__load(normalizedId, require, load)
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