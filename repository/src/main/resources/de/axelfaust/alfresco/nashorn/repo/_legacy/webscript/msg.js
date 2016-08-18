/* globals -require */
/**
 * This module wraps the Rhino-based web script message utility typically provided as part of the script model to ensure compatibility with
 * Nashorn. In addition to the legacy support for a get-operation this module also exposes messages as simple properties (without
 * placeholder replacement functionality).
 * 
 * @module _legacy/webscript/msg
 * @requires nashorn!Java
 * @requires nashorn!JSAdapter
 * @requires _base/lang
 * @requires _base/ConversionService
 * @author Axel Faust
 */
define([ 'args!msg', 'nashorn!Java', 'nashorn!JSAdapter', '_base/lang', '_base/ConversionService' ], function _legacy_webscript_msg(
        rhinoMsg, Java, JSAdapter, lang, ConversionService)
{
    'use strict';
    var Map, List, ScriptMessage, ScriptableObject, RhinoUtils, result;

    Map = Java.type('java.util.Map');
    List = Java.type('java.util.List');
    ScriptMessage = Java.type('org.springframework.extensions.webscripts.ScriptMessage');
    ScriptableObject = Java.type('org.mozilla.javascript.ScriptableObject');
    RhinoUtils = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.RhinoUtils');

    if (rhinoMsg instanceof ScriptMessage)
    {
        result = new JSAdapter({
            toString : function _legacy_webscript_msg__toString()
            {
                return rhinoMsg.toString();
            }
        }, {
            /**
             * Retrieves a message from the underlying, locale-aware message bundle(s) and optionally replaces any placeholders with
             * specific values.
             * 
             * @instance
             * @function
             * @param {string}
             *            msgId the key / ID to the message to retrieve
             * @param {object|array|List|Map}
             *            [args] the arguments to be used to replace any placeholders in the resolved message
             */
            // overrides/prototype with a "normal" get to expose the legacy API of ScriptMessage
            get : function _legacy_webscript_msg__get(msgId, args)
            {
                var msgValue;

                if (lang.isObject(args, false, true) || args instanceof Map || Array.isArray(args) || args instanceof List)
                {
                    // need to construct a Scriptable to pass to ScriptMessage
                    msgValue = RhinoUtils.inRhino(function _legacy_webscript_msg__get_inRhino(cx, scope)
                    {
                        var scriptable, msgValue, arr;

                        if (lang.isObject(args, false, true) || args instanceof Map)
                        {
                            // TODO Transparently map object/Map with numeric String keys into an array
                            // default ScriptMessage does not support object as parameter but in case an extended variant does we
                            // cover this case here
                            scriptable = cx.newObject(scope);

                            if (lang.isObject(args, true))
                            {
                                arr = Object.keys(args);
                            }
                            else
                            {
                                arr = args.keys();
                            }

                            // either JS Array.forEach or Iterable.forEach
                            arr.forEach(function _legacy_webscript_msg__get_forEachKey(key)
                            {
                                var javaValue = ConversionService.convertToJava(args[key]);
                                ScriptableObject.putProperty(scriptable, key, javaValue);
                            });
                        }
                        else
                        {
                            arr = [];
                            // either JS Array.forEach or Iterable.forEach
                            args.forEach(function _legacy_webscript_msg__get_forEachElement(element)
                            {
                                arr.push(ConversionService.convertToJava(element));
                            });
                            arr = Java.to(arr, 'java.lang.Object[]');
                            scriptable = cx.newArray(scope, arr);
                        }

                        msgValue = rhinoMsg.get(msgId, scriptable);

                        return msgValue;
                    });
                }
                else
                {
                    msgValue = rhinoMsg.get(msgId);
                }

                return msgValue;
            }
        }, {
            // __get__ used to allow simple msg[msgId] accesss
            __get__ : function _legacy_webscript_msg__virtualGet(name)
            {
                var msgValue = result.get(name);
                return msgValue;
            }
        });
    }

    return result;
});