/* globals require: false */
(function amd_config()
{
    'use strict';

    require.config({
        packages : [ {
            name : '_base',
            loader : 'classpath',
            location : 'de/axelfaust/alfresco/nashorn/repo/_base'
        }, {
            name : '_legacy',
            loader : 'classpath',
            location : 'de/axelfaust/alfresco/nashorn/repo/_legacy'
        }, {
            // global alias that supports customer extensions
            name : 'alfresco',
            loader : 'extensible-classpath',
            location : 'scripts/nashorn/alfresco'
        }, {
            // alias to Java services via ServiceRegistry
            name : 'alfrescoServices',
            loader : 'serviceRegistry'
        }, {
            name : 'alfrescoWebScript',
            loader : 'webscript',
            location : 'org/alfresco'
        } ],
        map : {
            '*' : {
                'alfresco/foundation' : 'alfrescoServices',
                'alfresco/webscript' : 'alfrescoWebScript'
            }
        }
    });
}());