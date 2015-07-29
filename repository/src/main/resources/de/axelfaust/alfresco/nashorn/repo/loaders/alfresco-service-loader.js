define('serviceRegistry', [ 'define', 'spring!ServiceRegistry' ], function(define, serviceRegistry)
{
    return define.asSecureUseModule({
        load : function(normalizedId, require, load)
        {
            var service, serviceGetterName, serviceGetter;
            
            // assume normalizedId is capital service, i.e. NodeService
            serviceGetterName = 'get' + normalizedId;
            serviceGetter = serviceRegistry[serviceGetterName];
            
            if (typeof serviceGetter === 'function')
            {
                service = serviceGetter();
            }
            else
            {
                service = null;
            }
            
            load(service !== null ? define.asSecureUseModule(service) : service, true);
        }
    });
});