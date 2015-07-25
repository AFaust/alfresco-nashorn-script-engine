// non-extensible raw classpath loader (scripts located anywhere in classpath)
define('classpath', [], function()
{
    var ClasspathURLStreamHandler;

    ClasspathURLStreamHandler = Java.extend(java.net.URLStreamHandler, {
        openConnection : function(url)
        {
            var con = new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection(url, null, false, null);
            return con;
        }
    });

    return {
        load : function(normalizedId, require, load)
        {
            var url = new java.net.URL('classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());
            load(url, true);
        }
    };
});

// extensible alfresco classpath loader (scripts located in /alfresco/extension/ or /alfresco/)
define('extensible-alfresco-classpath', [], function()
{
    var ClasspathURLStreamHandler;

    ClasspathURLStreamHandler = Java.extend(java.net.URLStreamHandler, {
        openConnection : function(url)
        {
            var con = new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLConnection(url, true);
            return con;
        }
    });

    return {
        load : function(normalizedId, require, load)
        {
            var url = new java.net.URL('extensible-alfresco-classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());
            load(url, true);
        }
    };
});