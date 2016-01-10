/* globals -require */
(function()
{
    'use strict';

    define('callerProvided', [ 'nashorn!Java' ], function callerProvided_loader(Java)
    {
        var URL, CallerProvidedURLConnection, CallerProvidedURLStreamHandler, streamHandler, logger, loader;

        logger = Java.type('org.slf4j.LoggerFactory').getLogger(
                'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.callerProvided');
        URL = Java.type('java.net.URL');
        CallerProvidedURLConnection = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLConnection');
        CallerProvidedURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLStreamHandler');
        streamHandler = new CallerProvidedURLStreamHandler();

        loader = {
            load : function callerProvided_loader__load(normalizedId, /*jshint unused: false*/require, load)
            {
                var url = new URL('callerProvided', null, -1, normalizedId, streamHandler);

                logger.trace('Loading module id {} from caller provided script', normalizedId);

                load(url, CallerProvidedURLConnection.isCallerProvidedScriptSecure());
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });
}());