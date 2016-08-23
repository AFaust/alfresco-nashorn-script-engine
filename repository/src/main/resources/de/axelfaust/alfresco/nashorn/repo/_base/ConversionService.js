/* globals -require */
/**
 * This module provides common conversion registration and execution capabilities that can be augmented by type specific plugins to cover a
 * wider range of conversions. By default this module only supports converting instances of {@link module:_base/JavaConvertableMixin} to a
 * Java representation.
 * 
 * @module _base/ConversionService
 * @requires module:nashorn!Java
 * @requires module:_base/JavaConvertableMixin
 * @requires module:_base/lang
 * @requires module:_base/logger
 * @author Axel Faust
 */
define([ 'nashorn!Java', './JavaConvertableMixin', './lang', './logger' ], function _base_ConversionService_root(Java,
        JavaConvertableMixin, lang, logger)
{
    'use strict';
    // actually exported elements
    var service, convertToJava, convertToScript, registerJavaToScriptConverter,
    // internal Java types
    ISO8601DateFormat, Pattern, NashornScriptModel, NashornScriptProcessor, JavaClass, JavaSystem, HashMap,
    // internal data structures
    javaConversionCache, javaTypeConversionRegistry, globalJavaTypeConversionRegistry;

    ISO8601DateFormat = Java.type('org.alfresco.util.ISO8601DateFormat');
    Pattern = Java.type('java.util.regex.Pattern');
    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
    NashornScriptProcessor = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor');
    JavaClass = Java.type('java.lang.Class');
    JavaSystem = Java.type('java.lang.System');
    HashMap = Java.type('java.util.HashMap');

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
        var result, flags, convertedArray;

        // default fallback
        result = scriptObject;

        if (scriptObject !== undefined && scriptObject !== null)
        {
            logger.debug('convertToJava called for "{}"', scriptObject);

            if (typeof scriptObject.isInstanceOf === 'function' && scriptObject.isInstanceOf(JavaConvertableMixin))
            {
                result = scriptObject.getJavaValue();
            }
            else if (lang.isObject(scriptObject.javaValue))
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
                    logger.debug('Ensured potential JS ConsString will not be accidentally exposed');
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
                    logger.debug('Recursively converting JS array with {} elements', scriptObject.length);
                    convertedArray = [];
                    scriptObject.forEach(function _base_ConversionService__convertToJava_forEachElement(element)
                    {
                        var convertedElement = convertToJava(element);
                        if (convertedElement !== undefined && convertedElement !== null)
                        {
                            convertedArray.push(convertedElement);
                        }
                    });
                    result = Java.to(convertedArray, 'java.util.List');
                }
                else if (lang.isObject(scriptObject, false, true))
                {
                    result = new HashMap();
                    Object.keys(scriptObject).forEach(function _base_ConversionService__convertToJava_forEachKey(key)
                    {
                        result[key] = convertToJava(scriptObject[key]);
                    });
                }
            }

            if (result !== scriptObject)
            {
                logger.debug('convertToJava yielded "{}" for "{}"', result, scriptObject);
            }
            else
            {
                logger.debug('convertToJava yielded original object');
            }
        }

        return result;
    };

    convertToScript = function _base_ConversionService__convertToScript(javaObject)
    {
        var result, identityHashCode, converted, cls, clsName, converter;

        // default fallback
        result = javaObject;

        if (javaObject !== undefined && javaObject !== null)
        {
            logger.debug('convertToScript called for "{}"', javaObject);

            // some Java types are inheritently treated as first-class JS types despite Java.isJaveObject() yielding true
            if (Java.isJavaObject(javaObject)
                    && !(typeof javaObject === 'string' || typeof javaObject === 'number' || typeof javaObject === 'boolean'))
            {
                identityHashCode = String(JavaSystem.identityHashCode(javaObject));

                if (identityHashCode in javaConversionCache)
                {
                    result = javaConversionCache[identityHashCode];
                    logger.debug('Using cached conversion result "{}" for "{}"', result, javaObject);
                }
                else
                {
                    cls = javaObject.getClass();
                    logger.debug('Retrieved Java type "{}" from "{}"', cls, javaObject);
                    clsName = cls.name;
                    // TODO Consider inclusion of interfaces in converter resolution (e.g. as a catch-all for Map / List)
                    while (clsName !== 'java.lang.Object')
                    {
                        logger.trace('Looking up converter for "{}"', clsName);
                        converter = javaTypeConversionRegistry[clsName] || globalJavaTypeConversionRegistry[clsName];

                        if (typeof converter === 'function')
                        {
                            logger.trace('Found converter for "{}"', clsName);
                            converted = converter(javaObject);
                            if (converted !== undefined && converted !== null && converted !== javaObject)
                            {
                                result = converted;
                                javaConversionCache[identityHashCode] = result;
                                break;
                            }
                        }

                        logger.trace('Continuing to parent class conversion lookup');
                        cls = cls.superclass;
                        clsName = cls.name;
                    }
                }
            }

            if (result !== javaObject)
            {
                logger.debug('convertToScript yielded "{}" for "{}"', result, javaObject);
            }
            else
            {
                logger.debug('convertToScript yielded original object');
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
            logger.debug('Registered global Java type converter for "{}"', javaType);
        }
        else
        {
            javaTypeConversionRegistry[javaType] = converter;
            logger.debug('Registered Java type converter for "{}"', javaType);
        }
    };

    service = {

        /**
         * Converts a script object to a Java representation.
         * 
         * @instance
         * @function
         * @memberof module:_base/ConversionService
         * @param {object}
         *            obj - the script object to convert
         * @returns {object} the Java representation or the object itself if no conversion is supported
         */
        convertToJava : convertToJava,

        /**
         * Converts a Java object to a script representation.
         * 
         * @instance
         * @function
         * @memberof module:_base/ConversionService
         * @param {object}
         *            obj - the Java object to convert
         * @returns {object} the script representation or the object itself if no conversion is supported
         */
        convertToScript : convertToScript,

        /**
         * Registers a converter to handle {@link module:_base/ConverterService~convertToScript to-script conversions} for a particular Java
         * type.
         * 
         * @instance
         * @function
         * @memberof module:_base/ConversionService
         * @param {string}
         *            javaType - the Java type / class name the converter can handle
         * @param {function}
         *            converter - the converter callback to handle conversion of a single instance
         */
        registerJavaToScriptConverter : registerJavaToScriptConverter
    };

    Object.freeze(service);

    return service;
});