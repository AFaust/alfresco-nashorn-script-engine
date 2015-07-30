define('serviceRegistry', [ 'define', 'spring!ServiceRegistry' ], function(define, serviceRegistry)
{
    return define.asSecureUseModule({
        load : function(normalizedId, require, load)
        {
            var service, serviceGetterSignature;

            // assume normalizedId is capital service, i.e. NodeService
            serviceGetterSignature = 'get' + normalizedId + '()';
            try
            {
                service = serviceRegistry[serviceGetterSignature]();
            }
            catch (e)
            {
                service = null;
            }

            load(service !== null ? define.asSecureUseModule(service) : service, true);
        }
    });
});