/* globals -define */
require([ '_base/ConversionService', 'alfresco/common/QName' ], function miscConverters_root(ConversionService, QName)
{
    'use strict';
    ConversionService.registerJavaToScriptConverter('org.alfresco.service.namespace.QName', QName.valueOf);

    // we don't export anything
    return null;
});