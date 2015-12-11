'use strict';
// non-extensible raw classpath loader (scripts located anywhere in classpath)
define('classpath', [], function classpath_loader()
{
    var ClasspathURLStreamHandler;

    ClasspathURLStreamHandler = Java.extend(java.net.URLStreamHandler, {
        openConnection : function classpath_loader__ClasspathURLStreamHandler_openConnection(url)
        {
            var con = new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection(url, null, false, null);
            return con;
        }
    });

    return {
        load : function classpath_loader__load(normalizedId, require, load)
        {
            var url = new Packages.java.net.URL('classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());
            load(url, true);
        }
    };
});

// extensible alfresco classpath loader (scripts located in /alfresco/extension/ or /alfresco/)
define('extensible-classpath', [], function extensible_classpath_loader__load()
{
    var ClasspathURLStreamHandler;

    ClasspathURLStreamHandler = Java.extend(java.net.URLStreamHandler, {
        openConnection : function extensible_classpath_loader__ClasspathURLStreamHandler_openConnection(url)
        {
            var con = new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection(url, true);
            return con;
        }
    });

    return {
        load : function extensible_classpath_loader__load(normalizedId, require, load)
        {
            var url = new Packages.java.net.URL('extensible-classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());
            load(url, true);
        }
    };
});