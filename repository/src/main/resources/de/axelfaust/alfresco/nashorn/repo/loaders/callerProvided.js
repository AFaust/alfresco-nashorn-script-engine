'use strict';
define('callerProvided', [ 'nashorn!Java' ], function callerProvided_loader(Java)
{
    var CallerProvidedURLStreamHandler, URL, URLStreamHandler, CallerProvidedURLConnection, logger, loader;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.callerProvided');
    URL = Java.type('java.net.URL');
    URLStreamHandler = Java.type('java.net.URLStreamHandler');
    CallerProvidedURLConnection = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLConnection');

    // TODO Try to optimize by moving into actual Java class (which may call back into JS)
    CallerProvidedURLStreamHandler = Java.extend(URLStreamHandler, {
        openConnection : function callerProvided_loader__CallerProvidedURLStreamHandler_openConnection(url)
        {
            var con = new CallerProvidedURLConnection(url);
            return con;
        }
    });

    loader = {
        load : function callerProvided_loader__load(normalizedId, require, load)
        {
            var url = new URL('callerProvided', null, -1, normalizedId, new CallerProvidedURLStreamHandler());

            logger.trace('Loading module id {} from caller provided script', normalizedId);

            load(url, CallerProvidedURLConnection.isCallerProvidedScriptSecure());
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});