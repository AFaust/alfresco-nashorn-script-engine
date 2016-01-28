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

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                value = this.backingMap.size();
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                value = this.backingMap.get(qname);
                        }
                    }

                    return value;
                },

                __put__ : function alfresco_common_QNameMapWrapper__put__(prop, value)
                {
                    var qname, result;

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                this.backingMap.put(qname, value);
                                result = value;
                        }
                    }

                    return result;
                },

                __getIds__ : function alfresco_common_QNameMapWrapper__getIds__()
                {
                    var ids = [];

                    this.backingMap.keySet().forEach(function(qname)
                    {
                        ids.push(String(QName.valueOf(qname)));
                    });

                    return ids;
                },

                __delete__ : function alfresco_common_QNameMapWrapper__delete__(prop)
                {
                    var qname;

                    if (typeof prop === 'string')
                    {
                        switch (prop)
                        {
                            case 'length':
                                break;
                            default:
                                qname = QName.valueOf(prop);
                                this.backingMap.remove(qname);
                        }
                    }
                },

                __call__ : function alfresco_common_QNameMapWapper__call__(name)
                {
                    var result;

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

                    return result;
                }

            });
        });