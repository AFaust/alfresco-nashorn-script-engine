'use strict';
// non-extensible raw classpath loader (scripts located anywhere in classpath)
define('classpath', [], function classpath_loader()
{
    var ClasspathURLStreamHandler, logger, loader;

    logger = Packages.org.slf4j.LoggerFactory
            .getLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.classpath-loader');

    ClasspathURLStreamHandler = Java.extend(java.net.URLStreamHandler, {
        openConnection : function classpath_loader__ClasspathURLStreamHandler_openConnection(url)
        {
            var con = new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection(url, null, false, null);
            return con;
        }
    });

    loader = {
        load : function classpath_loader__load(normalizedId, require, load)
        {
            var url = new Packages.java.net.URL('classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());

            logger.trace('Loading module id {} from classpath', normalizedId);

            load(url, true);
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});

// extensible alfresco classpath loader (scripts located in /alfresco/extension/ or /alfresco/)
define('extensible-classpath', [], function extensible_classpath_loader__load()
{
    var ClasspathURLStreamHandler, logger, loader;

    logger = Packages.org.slf4j.LoggerFactory
            .getLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.extensible-classpath-loader');

    ClasspathURLStreamHandler = Java.extend(java.net.URLStreamHandler, {
        openConnection : function extensible_classpath_loader__ClasspathURLStreamHandler_openConnection(url)
        {
            var con = new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection(url, true);
            return con;
        }
    });

    loader = {
        load : function extensible_classpath_loader__load(normalizedId, require, load)
        {
            var url = new Packages.java.net.URL('extensible-classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());

            logger.trace('Loading module id {} from extensible classpath', normalizedId);

            load(url, true);
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});