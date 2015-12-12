'use strict';
(function amd_config()
{
    require.config({
        packages : [{
            name : '_base',
            loader : 'classpath',
            location : 'de/axelfaust/alfresco/nashorn/repo/_base'
        }, {
            // global alias that supports customer extensions
            name : 'alfresco',
            loader : 'extensible-classpath'
        }, {
            // alias to Java services via ServiceRegistry
            name : 'alfrescoServices',
            loader : 'serviceRegistry'
        }, {
            name : 'alfrescoWebScript',
            loader : 'webscript',
            location : 'org/alfresco'
        }],
        map : {
            '*' : {
                'alfresco/service' : 'alfrescoServices',
                'alfresco/webscript' : 'alfrescoWebScript'
            }
        }
    });
}());