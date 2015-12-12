'use strict';
define(
        'declare',
        [ './c3mro' ],
        function declare(c3mro)
        {
            var anonClassCount = 0, DummyCtor, isObject, fn_toString, isInstanceOf, forceNew, applyNew, standardConstructor, taggedMixin, standardPrototype, declareImpl, declare;

            DummyCtor = new Function();

            isObject = function declare__isObject(o)
            {
                var isObject = o instanceof Object && Object.prototype.toString.call(o) === '[object Object]';
                return isObject;
            };

            fn_toString = function declare__ctor_toString(defaultToString)
            {
                var result, className, fnName;

                if (defaultToString === true)
                {
                    result = Function.prototype.toString.call(this);
                }
                else
                {
                    if (this._declare_meta !== undefined)
                    {
                        className = this._declare_meta.className;
                    }
                    else
                    {
                        className = this.fnClsName;
                    }
                    fnName = this.fnName;

                    result = '[Function ' + className + '_constructor]';
                }

                return result;
            },

            isInstanceOf = function declare__isInstanceOf(cls)
            {
                var linearization = this.constructor._c3mro_linearization, isBase = false, idx;

                for (idx = 0; idx < linearization.length && isBase === false; idx++)
                {
                    isBase = linearization[idx] === cls;
                }

                return isBase;
            };

            forceNew = function declare__forceNew(ctor)
            {
                var instance;

                DummyCtor.prototype = ctor.prototype;
                instance = new DummyCtor();
                DummyCtor.prototype = null;

                return instance;
            };

            applyNew = function declare__applyNew(args, ctor)
            {
                var instance = forceNew(ctor);
                ctor.apply(instance, args);
                return instance;
            };

            standardConstructor = function declare__createStandardConstructor()
            {
                var standardConstructor = function declare__standardConstructor()
                {
                    var result, idx, ctor, linearization;

                    if (!(this instanceof standardConstructor))
                    {
                        result = applyNew(arguments, standardConstructor);
                    }
                    else
                    {
                        linearization = standardConstructor._c3mro_linearization;
                        result = this;

                        for (idx = linearization.length - 1; idx >= 0; idx--)
                        {
                            ctor = linearization[idx]._declare_meta.constructor;
                            if (typeof ctor === 'function')
                            {
                                ctor.apply(result, arguments);
                            }
                        }

                        // class name is included in a non-enumerable field to avoid messing with potential JSON.stringify use
                        Object.defineProperty(result, '_declare_className', {
                            value : standardConstructor._declare_meta.className
                        });
                    }

                    return result;
                };

                return standardConstructor;
            };

            taggedMixin = function declare__taggedMixin(target, source)
            {
                var name, value;

                for (name in source)
                {
                    if (source.hasOwnProperty(name) && name !== 'constructor')
                    {
                        value = source[name];
                        if (typeof value === 'function')
                        {
                            value.fnName = name;
                            value.toString = fn_toString;

                            if (target._declare_meta !== undefined)
                            {
                                value.fnClsName = target._declare_meta.className;
                            }
                        }
                        target[name] = value;
                    }
                }
            };

            standardPrototype = function declare__standardPrototype(cls, classStructure)
            {
                var superClass, proto, ctor, superLin, slLen, clsLin, clLen, startWithSuperClass = true, base, offset, name;

                superClass = cls._declare_meta.superClass;

                if (superClass !== null)
                {
                    // Check if expected superClass (first in superClass arg to declare) matches linearization tail
                    // If yes, use superClass for initial proto and mixin proto properties of all cls in linearization from superClass to 1
                    // If no, construct completely new chain of protos based on linearization

                    clsLin = cls._c3mro_linearization;
                    clLen = clsLin.length;

                    superLin = superClass._c3mro_linearization;
                    slLen = superLin.length;

                    for (offset = 1; offset <= slLen; offset++)
                    {
                        if (superLin[slLen - offset] !== clsLin[clLen - offset])
                        {
                            startWithSuperClass = false;
                        }
                    }

                    if (startWithSuperClass === false)
                    {
                        // can't use superClass as start, so reset offset and select differnt superClass to start proto from
                        superClass = clsLin[clLen - 1];
                        offset = 2;
                    }

                    for (; offset < clLen; offset++)
                    {
                        proto = forceNew(superClass);

                        base = clsLin[clLen - offset];
                        for (name in base.prototype)
                        {
                            if (name !== 'constructor' && base.prototype.hasOwnProperty(name))
                            {
                                proto[name] = base.prototype[name];
                            }
                        }

                        ctor = new Function();
                        ctor.superClass = superClass;
                        ctor.prototype = proto;
                        ctor.fnClsName = base._declare_meta.className + '-derived';
                        ctor.fnName = 'constructor';
                        ctor.toString = fn_toString;
                        proto.constructor = ctor;
                        superClass = ctor;
                    }

                    // last base => our (empty) proto
                    proto = forceNew(superClass);
                }
                else
                {
                    proto = {};
                }

                taggedMixin(proto, classStructure);

                return proto;
            };

            declareImpl = function declare__declareImpl(className, superClass, bases, classStructure)
            {
                var ctor, proto, meta, prototype, structure, key;

                ctor = standardConstructor();

                // flip bases into order "right most mixin -> left most mixin -> superClass"
                // ensures linearization results in correct override order for mixins over base class
                bases.reverse();
                c3mro(ctor, bases);
                // flip back for documentation in meta
                bases.reverse();

                structure = {};
                for (key in classStructure)
                {
                    if (key !== 'constructor' && classStructure.hasOwnProperty(key))
                    {
                        structure[key] = classStructure[key];
                    }
                }

                meta = {
                    className : className,
                    superClass : superClass || null,
                    constructor : classStructure.constructor || null,
                    structure : structure,
                    bases : bases
                };

                Object.defineProperty(ctor, '_declare_meta', {
                    value : meta
                });

                proto = standardPrototype(ctor, classStructure)
                ctor.prototype = proto;
                proto.constructor = ctor
                proto.declaredClass = className;
                ctor.superClass = meta.superClass;
                ctor.fnName = 'constructor';

                // MAYBE Add special functions (extend / createSubclass) to ctor (if we need to support them)

                proto.isInstanceOf = isInstanceOf;
                ctor.toString = fn_toString;
                // TODO Add 'standard' methods to proto

                Object.freeze(meta);
                Object.freeze(bases);
                Object.freeze(structure);
                Object.freeze(ctor);

                return ctor;
            };

            declare = function declare__declare()
            {
                var className, bases, superClass, structure, idx, fArr, fIdx;

                for (idx = 0; idx < arguments.length; idx++)
                {
                    if (idx === 0 && typeof arguments[idx] === 'string')
                    {
                        className = arguments[idx];
                    }

                    if (idx < 2 && bases === undefined && structure === undefined && typeof arguments[idx] === 'function')
                    {
                        bases = [ arguments[idx] ];
                    }

                    if (idx < 2 && bases === undefined && structure === undefined && Array.isArray(arguments[idx]))
                    {
                        fArr = arguments[idx];

                        bases = [];
                        for (fIdx = 0; fIdx < fArr.length; fIdx++)
                        {
                            if (typeof fArr[fIdx] !== 'function')
                            {
                                throw new Error('Base ' + fArr[fIdx] + ' is not a callable constructor');
                            }

                            if (!isObject(fArr[fIdx]._declare_meta) || typeof fArr[fIdx]._declare_meta.className !== 'string')
                            {
                                throw new Error('Base ' + fArr[fIdx] + ' appears not to have been defined via declare');
                            }

                            bases.push(fArr[fIdx]);
                        }
                    }

                    if (idx < 3 && structure === undefined && isObject(arguments[idx]))
                    {
                        structure = arguments[idx];
                    }
                }

                if (structure === undefined || structure === null)
                {
                    structure = {};
                }

                if (bases === undefined)
                {
                    bases = [];
                }

                if (className === undefined || className === null)
                {
                    // TODO Try to derive name from calling module
                    className = 'anonClass_' + (++anonClassCount);
                }

                if (bases.length > 0)
                {
                    superClass = bases[0];
                }

                return declareImpl(className, superClass, bases, structure);
            };

            Object.freeze(declare);

            return declare;
        });