define('spring', [ 'define' ], function(define)
{
    var applicationContext = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    
    return define.asSecureUseModule({
        load : function(normalizedId, require, load)
        {
            var bean = applicationContext.getBean(normalizedId.replace(/\//g, '.'));
            load(define.asSecureUseModule(bean), true);
        }
    });
});