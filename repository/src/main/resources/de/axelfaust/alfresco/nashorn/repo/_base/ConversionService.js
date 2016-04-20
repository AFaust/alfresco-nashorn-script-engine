/* globals -require */
define('_base/ConversionService', [ 'nashorn!Java', './JavaConvertableMixin' ], function _base_ConversionService_root(Java,
        JavaConvertableMixin)
{
    'use strict';
    // actually exported elements
    var service, convertToJava, convertToScript, registerJavaToScriptConverter,
    // internal Java types
    ISO8601DateFormat, Pattern, NashornScriptModel, NashornScriptProcessor, JavaClass, JavaSystem,
    // internal data structures
    javaConversionCache, javaTypeConversionRegistry, globalJavaTypeConversionRegistry;

    ISO8601DateFormat = Java.type('org.alfresco.util.ISO8601DateFormat');
    Pattern = Java.type('java.util.regex.Pattern');
    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
    NashornScriptProcessor = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor');
    JavaClass = Java.type('java.lang.Class');
    JavaSystem = Java.type('java.lang.System');

    javaConversionCache = NashornScriptModel.newAssociativeContainer();
    javaTypeConversionRegistry = NashornScriptModel.newAssociativeContainer();
    globalJavaTypeConversionRegistry = {};

    globalJavaTypeConversionRegistry['java.util.Date'] = function _base_ConversionService__convertDateToScript(date)
    {
        var jsDate;

        jsDate = Date.parse(ISO8601DateFormat.format(date));

        return jsDate;
    };

    convertToJava = function _base_ConversionService__convertToJava(scriptObject)
    {
        var result, flags, convertedArray, idx, max, convertedElement;

        // default fallback
        result = scriptObject;

        if (scriptObject !== undefined && scriptObject !== null)
        {
            if (typeof scriptObject.isInstanceOf === 'function' && scriptObject.isInstanceOf(JavaConvertableMixin))
            {
                result = scriptObject.getJavaValue();
            }
            else if (scriptObject.javaValue !== undefined && scriptObject.javaValue !== null)
            {
                result = scriptObject.javaValue;
            }
            else
            {
                // handle some of the more common script native object types
                if (scriptObject instanceof String)
                {
                    // ensure we don't leak ConsString
                    result = String(scriptObject);
                }
                else if (scriptObject instanceof Date)
                {
                    result = ISO8601DateFormat.parse(scriptObject.toISOString());
                }
                else if (scriptObject instanceof RegExp)
                {
                    flags = 0;
                    if (scriptObject.multiline())
                    {
                        flags += Pattern.MULTILINE;
                    }
                    if (scriptObject.ignoreCase())
                    {
                        flags += Pattern.CASE_INSENSITIVE;
                    }
                    // no special flag for global()
                    result = Pattern.compile(scriptObject.source(), flags);
                }
                else if (Array.isArray(scriptObject))
                {
                    convertedArray = [];
                    // TODO Can we use Array.prototype.forEach on JSObject reliably? (Array.isArray works)
                    for (idx = 0, max = scriptObject.length; idx < max; idx++)
                    {
                        convertedElement = convertToJava(scriptObject[idx]);
                        if (convertedElement !== undefined && convertedElement !== null)
                        {
                            convertedArray.push(convertedElement);
                        }
                    }
                    result = Java.to(convertedArray, 'java.util.List');
                }
                // TODO Define conversion strategy for else case (object into Map)
            }
        }

        return result;
    };

    convertToScript = function _base_ConversionService__convertToScript(javaObject)
    {
        var result, identityHashCode, converted, cls, clsName, converter;

        // default fallback
        result = javaObject;

        if (Java.isJavaObject(javaObject))
        {
            identityHashCode = String(JavaSystem.identityHashCode(javaObject));

            if (identityHashCode in javaConversionCache)
            {
                result = javaConversionCache[identityHashCode];
            }
            else
            {
                cls = javaObject.class;
                clsName = cls.name;
                // TODO Consider inclusion of interfaces in converter resolution (e.g. as a catch-all for Map / List)
                while (clsName !== 'java.lang.Object')
                {
                    converter = javaTypeConversionRegistry[clsName] || globalJavaTypeConversionRegistry[clsName];

                    if (typeof converter === 'function')
                    {
                        converted = converter(javaObject);
                        if (converted !== undefined && converted !== null && converted !== javaObject)
                        {
                            result = converted;
                            javaConversionCache[identityHashCode] = result;
                            break;
                        }
                    }

                    cls = cls.superclass;
                    clsName = cls.name;
                }
            }
        }

        return result;
    };

    registerJavaToScriptConverter = function _base_ConversionService__registerJavaToScriptConverter(javaType, converter)
    {
        if (javaType instanceof JavaClass)
        {
            javaType = javaType.name;
        }
        else if (typeof javaType !== 'string')
        {
            throw new Error('javaType "' + javaType + '" is not a string');
        }

        if (typeof converter !== 'function')
        {
            throw new Error('converter "' + converter + '" is not a function');
        }

        if (NashornScriptProcessor.isInEngineContextInitialization())
        {
            globalJavaTypeConversionRegistry[javaType] = converter;
        }
        else
        {
            javaTypeConversionRegistry[javaType] = converter;
        }
    };

    /**
     * This module provides common conversion registration and execution capabilities that can be augmented by type specific plugins to
     * cover a wider range of conversions. By default this module only supports converting instances of
     * {@link module:_base/JavaConvertableMixin} to a Java representation.
     * 
     * @exports _base/ConversionService
     * @author Axel Faust
     */
    service = {

        /**
         * Converts a script object to a Java representation.
         * 
         * @instance
         * @function
         * @param {object}
         *            obj the script object to convert
         * @returns {object} the Java representation or the object itself if no conversion is supported
         */
        convertToJava : convertToJava,

        /**
         * Converts a Java object to a script representation.
         * 
         * @instance
         * @function
         * @param {object}
         *            obj the Java object to convert
         * @returns {object} the script representation or the object itself if no conversion is supported
         */
        convertToScript : convertToScript,

        /**
         * Registers a converter to handle {@link module:_base/ConverterService~convertToScript to-script conversions} for a particular Java
         * type.
         * 
         * @instance
         * @function
         * @param {string}
         *            javaType the Java type / class name the converter can handle
         * @param {function}
         *            converter the converter callback to handle conversion of a single instance
         */
        registerJavaToScriptConverter : registerJavaToScriptConverter
    };

    Object.freeze(service);

    return service;
});