'use strict';
define('spring', [ 'define' ], function spring_loader(define)
{
    var applicationContext = Java.type('org.springframework.web.context.ContextLoader').getCurrentWebApplicationContext();
    return define.asSecureUseModule({
        load : function spring_loader__load(normalizedId, require, load)
        {
            var bean = applicationContext.getBean(normalizedId.replace(/\//g, '.'));
            load(define.asSecureUseModule(bean), true);
        }
    });
});