'use strict';
// non-extensible raw classpath loader (scripts located anywhere in classpath)
define('classpath', [ 'nashorn!Java' ], function classpath_loader(Java)
{
    var ClasspathURLStreamHandler, URL, URLStreamHandler, AlfrescoClasspathURLConnection, logger, loader;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.classpath');
    URL = Java.type('java.net.URL');
    URLStreamHandler = Java.type('java.net.URLStreamHandler');
    AlfrescoClasspathURLConnection = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection');

    ClasspathURLStreamHandler = Java.extend(URLStreamHandler, {
        openConnection : function classpath_loader__ClasspathURLStreamHandler_openConnection(url)
        {
            var con = new AlfrescoClasspathURLConnection(url, null, false, null);
            return con;
        }
    });

    loader = {
        load : function classpath_loader__load(normalizedId, require, load)
        {
            var url = new URL('classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());

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
    var ClasspathURLStreamHandler, URL, URLStreamHandler, AlfrescoClasspathURLConnection, logger, loader;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.extensible-classpath');
    URL = Java.type('java.net.URL');
    URLStreamHandler = Java.type('java.net.URLStreamHandler');
    AlfrescoClasspathURLConnection = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection');

    ClasspathURLStreamHandler = Java.extend(URLStreamHandler, {
        openConnection : function extensible_classpath_loader__ClasspathURLStreamHandler_openConnection(url)
        {
            var con = new AlfrescoClasspathURLConnection(url, true);
            return con;
        }
    });

    loader = {
        load : function extensible_classpath_loader__load(normalizedId, require, load)
        {
            var url = new URL('extensible-classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());

            logger.trace('Loading module id {} from extensible classpath', normalizedId);

            load(url, true);
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});