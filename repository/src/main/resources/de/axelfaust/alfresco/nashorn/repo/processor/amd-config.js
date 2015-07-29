(function()
{
    require.config({
        packages : [
        {
            // global alias that supports customer extensions 
            name : 'alfresco',
            loader : 'extensible-alfresco-classpath'
        },
        {
            // alias to Java services via ServiceRegistry
            name : 'alfresco/service',
            loader : 'serviceRegistry'
        },
        {
            // shortcut
            name : 'alfresco/webscript',
            loader : 'webscript',
            location : 'org/alfresco'
        }
    });
}());