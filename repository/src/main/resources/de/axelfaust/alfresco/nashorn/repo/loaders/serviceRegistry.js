/* globals -require */
define('serviceRegistry', [ 'define', 'spring!ServiceRegistry' ], function alfresco_service_loader(define, serviceRegistry)
{
    'use strict';
    var loader;

    loader = {
        load : function alfresco_service_loader__load(normalizedId, /* jshint unused: false */require, load)
        {
            var service, serviceGetterSignature;

            // assume normalizedId is capital service, i.e. NodeService
            // JavaLinker has a minor bug not handling ConsString -> force String
            serviceGetterSignature = String('get' + normalizedId + '()');
            try
            {
                service = serviceRegistry[serviceGetterSignature]();
            }
            catch (e)
            {
                service = null;
            }

            if (service !== null)
            {
                load(define.asSecureUseModule(service), true);
            }
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return define.asSecureUseModule(loader);
});