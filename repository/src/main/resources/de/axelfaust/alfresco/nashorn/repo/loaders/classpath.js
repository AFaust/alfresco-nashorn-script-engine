/* globals -require */
(function classpath_loader_root()
{
    'use strict';
    // non-extensible raw classpath loader (scripts located anywhere in classpath)
    define('classpath', [ 'nashorn!Java' ],
            function classpath_loader(Java)
            {
                var URL, AlfrescoClasspathURLStreamHandler, streamHandler, logger, loader;

                logger = Java.type('org.slf4j.LoggerFactory').getLogger(
                        'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.classpath');
                URL = Java.type('java.net.URL');
                // need to select specific constructor to override basePath
                AlfrescoClasspathURLStreamHandler = Java
                        .type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler')['(java.lang.String)'];
                streamHandler = new AlfrescoClasspathURLStreamHandler(null);

                loader = {
                    load : function classpath_loader__load(normalizedId, /* jshint unused: false */require, load)
                    {
                        var url = new URL('classpath', null, -1, normalizedId, streamHandler);

                        logger.trace('Loading module id {} from classpath', normalizedId);

                        load(url, true);
                    }
                };

                Object.freeze(loader.load);
                Object.freeze(loader);

                return loader;
            });

    // extensible alfresco classpath loader (scripts located in /alfresco/extension/ or /alfresco/)
    define('extensible-classpath', [ 'nashorn!Java' ], function extensible_classpath_loader__load(Java)
    {
        var URL, AlfrescoClasspathURLStreamHandler, streamHandler, logger, loader;

        logger = Java.type('org.slf4j.LoggerFactory').getLogger(
                'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.extensible-classpath');
        URL = Java.type('java.net.URL');
        AlfrescoClasspathURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler');
        streamHandler = new AlfrescoClasspathURLStreamHandler(true);

        loader = {
            load : function extensible_classpath_loader__load(normalizedId, /* jshint unused: false */require, load)
            {
                var url = new URL('extensible-classpath', null, -1, normalizedId, streamHandler);

                logger.trace('Loading module id {} from extensible classpath', normalizedId);

                load(url, true);
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });
}());