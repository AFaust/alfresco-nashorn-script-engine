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
            var url = this._toURL(normalizedId);
            load(url, true);
        },

        /**
         * Convert the module name to a Java URL object that can be used to load script source (and optimally source metadata to allow
         * caching of scripts).
         */
        _toURL : function(normalizedId)
        {
            return new java.net.URL('classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());
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
            var url = this._toURL(normalizedId);
            load(url, true);
        },

        /**
         * Convert the module name to a Java URL object that can be used to load script source (and optimally source metadata to allow
         * caching of scripts).
         */
        _toURL : function(normalizedId)
        {
            return new java.net.URL('extensible-alfresco-classpath', null, -1, normalizedId, new ClasspathURLStreamHandler());
        }
    };
});