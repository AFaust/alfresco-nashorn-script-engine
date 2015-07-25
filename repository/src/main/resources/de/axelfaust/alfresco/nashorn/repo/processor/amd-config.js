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
            // shortcut
            name : 'alfresco/webscript',
            loader : 'webscript',
            location : 'org/alfresco'
        }
    });
}());