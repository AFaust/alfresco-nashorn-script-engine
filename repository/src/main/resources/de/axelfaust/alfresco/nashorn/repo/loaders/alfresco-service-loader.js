'use strict';
define('serviceRegistry', [ 'define', 'spring!ServiceRegistry' ], function alfresco_service_loader(define, serviceRegistry)
{
    return define.asSecureUseModule({
        load : function alfresco_service_loader__load(normalizedId, require, load)
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