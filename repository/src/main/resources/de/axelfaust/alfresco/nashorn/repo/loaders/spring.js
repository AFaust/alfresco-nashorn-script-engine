'use strict';
define('spring', [ 'define', 'nashorn!Java' ], function spring_loader(define, Java)
{
    var loader, applicationContext = Java.type('org.springframework.web.context.ContextLoader').getCurrentWebApplicationContext();

    loader = {
        load : function spring_loader__load(normalizedId, require, load)
        {
            var bean = applicationContext.getBean(normalizedId.replace(/\//g, '.'));
            load(define.asSecureUseModule(bean), true);
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return define.asSecureUseModule(loader);
});