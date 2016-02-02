/* globals -require */
define([ '_base/declare', '_base/JavaConvertableMixin', './QName', '_base/logger', 'nashorn!Java' ],
        function alfresco_node_QNameMapWrapper_root(declare, JavaConvertableMixin, QName, logger, Java)
        {
            'use strict';
            var Map, IllegalArgumentException;

            Map = Java.type('java.util.Map');
            IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

            return declare([ JavaConvertableMixin ], {

                '--declare--proxy-support-enabled' : true,

                '--declare--proxy-extension-hooks-enabled' : true,

                internalJavaValueProperty : 'backingMap',

                constructor : function alfresco_common_QNameMapWrapper__constructor(backingMap)
                {
                    if (!(backingMap instanceof Map))
                    {
                        throw new IllegalArgumentException('backingMap value invalid: ' + backingMap);
                    }

                    // this is intended to be an internal property
                    // defined this way since we want to be immutable
                    Object.defineProperty(this, 'backingMap', {
                        value : backingMap
                    });
                },

                __get__ : function alfresco_common_QNameMapWrapper__get__(prop)
                {
                    var qname, value;

                    logger.trace('__get__ called for {}', prop);

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                value = this.backingMap.size();
                                break;
                            case 'clear':
                                /* falls through */
                            case 'size':
                                value = Function.prototype.bind.call(function alfresco_common_QNameMapWrapper__get__virtualZeroArgFn(fnName)
                                {
                                    var result = this.backingMap[fnName]();
                                    return result;
                                }, this, prop);
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                value = this.backingMap.get(qname.javaValue);
                        }
                    }

                    logger.debug('__get__ for {} yielded {}', prop, value);

                    return value;
                },

                __has__ : function alfresco_common_QNameMapWrapper__has__(prop)
                {
                    var qname, result = false;

                    logger.trace('__has__ called for {}', prop);

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                result = this.backingMap.containsKey(qname.javaValue);
                        }
                    }

                    logger.debug('__has__ for {} yielded {}', prop, result);

                    return result;
                },

                __put__ : function alfresco_common_QNameMapWrapper__put__(prop, value)
                {
                    var qname, result;

                    logger.trace('__put__ called for {} and value {}', prop, value);

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                this.backingMap.put(qname.javaValue, value !== null ? (value.javaValue || value) : value);
                                result = value;
                        }
                    }

                    logger.debug('__put__ for {} and value {} yielded {}', prop, value, result);

                    return result;
                },

                __getIds__ : function alfresco_common_QNameMapWrapper__getIds__()
                {
                    var ids = [];

                    logger.trace('__getIds__ called');

                    this.backingMap.keySet().forEach(function(qname)
                    {
                        ids.push(String(QName.valueOf(qname)));
                    });

                    return ids;
                },

                __delete__ : function alfresco_common_QNameMapWrapper__delete__(prop)
                {
                    var qname, result;

                    logger.trace('__delete__ called for {}', prop);

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                result = this.backingMap.remove(qname.javaValue);
                        }
                    }

                    logger.debug('__delete__ for {} yielded', prop, result);

                    return result;
                },

                __call__ : function alfresco_common_QNameMapWapper__call__(name)
                {
                    var result;

                    logger.trace('__call__ called for {}', name);

                    switch (name)
                    {
                        case 'clear':
                            /* falls through */
                        case 'size':
                            if (arguments.length === 1)
                            {
                                result = this.backingMap[name]();
                                break;
                            }
                            /* falls through */
                        default:
                            // TODO Define a core module that defaults __call__ behaviour
                            result = this.inherited(alfresco_common_QNameMapWapper__call__, arguments);
                    }

                    logger.debug('__call__ for {} yielded', name, result);

                    return result;
                }

            });
        });