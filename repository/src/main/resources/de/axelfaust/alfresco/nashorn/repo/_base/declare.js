'use strict';
define(
        [ './c3mro' ],
        function declare(c3mro)
        {
            var anonClassCount = 0, DummyCtor, isObject, fn_toString, isInstanceOf, inherited, forceNew, applyNew, standardConstructor, taggedMixin, standardPrototype, declareImpl, declare;

            DummyCtor = new Function();

            isObject = function declare__isObject(o)
            {
                var isObject = o instanceof Object && Object.prototype.toString.call(o) === '[object Object]';
                return isObject;
            };

            fn_toString = function declare__fn_toString(defaultToString)
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

                    result = '[Function ' + className + '_' + fnName + ']';
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

            inherited = function declare__inherited()
            {
                var result, linearization = this.constructor._c3mro_linearization, fnName, fnClsName, callerFn, args, overrides, effectiveArgs, idx, lastLookup, ctor, proto, fn, clsFound;

                // due to 'use strict' we can't use args.callee and have to require named function reference being passed

                for (idx = 0; idx < arguments.length; idx++)
                {
                    if (idx === 0 && typeof arguments[idx] === 'string')
                    {
                        fnName = arguments[idx];
                        fnClsName = this.constructor._declare_meta.className;
                    }
                    else if (idx === 0 && typeof arguments[idx] === 'function')
                    {
                        callerFn = arguments[idx];
                        if (typeof callerFn.fnName === 'string')
                        {
                            fnName = callerFn.fnName;
                            fnClsName = callerFn.fnClsName;
                        }
                    }
                    else if (idx < 2 && args === undefined)
                    {
                        args = arguments[idx];
                    }
                    else if (idx > 1 && args !== undefined && overrides === undefined && Array.isArray(arguments[idx]))
                    {
                        overrides = arguments[idx];
                    }
                }

                if (fnName === undefined)
                {
                    throw new Error('Unable to determine function name to call for inherited()');
                }

                if (fnName !== 'constructor')
                {
                    if (overrides !== undefined)
                    {
                        for (idx = 0; idx < args.length || idx < overrides.length; idx++)
                        {
                            if (idx < overrides.length)
                            {
                                effectiveArgs.push(overrides[idx]);
                            }
                            else
                            {
                                effectiveArgs.push(args[idx]);
                            }
                        }
                    }
                    else
                    {
                        effectiveArgs = args;
                    }

                    if (this._inherited !== undefined)
                    {
                        lastLookup = this._inherited;
                    }
                    else
                    {
                        lastLookup = {
                            callerFnName : null,
                            callerFnClsName : null,
                            ctor : null
                        };

                        Object.defineProperty(this, '_inherited', {
                            value : lastLookup
                        });
                    }

                    if (lastLookup.callerFnName === fnName && lastLookup.callerFnClsName === fnClsName)
                    {
                        ctor = lastLookup.ctor;
                    }
                    else
                    {
                        ctor = this.constructor;
                    }
                    proto = ctor.prototype;

                    // ascend the proto chain
                    while (fn === undefined && ctor !== null)
                    {
                        if (clsFound === true)
                        {
                            if (proto.hasOwnProperty(fnName) && typeof proto[fnName] === 'function')
                            {
                                fn = proto[fnName];
                            }
                        }
                        else
                        {
                            clsFound = ctor.fnClsName === fnClsName;
                        }

                        if (typeof ctor.superClass === 'function')
                        {
                            ctor = ctor.superClass;
                            proto = ctor.prototype;
                        }
                        else
                        {
                            ctor = null;
                        }
                    }

                    lastLookup.callerFnName = fnName;
                    lastLookup.callerFnClsName = fnClsName;
                    lastLookup.ctor = ctor;

                    if (fn !== undefined)
                    {
                        result = fn.apply(this, effectiveArgs);
                    }
                }
                else
                {
                    throw new Error('constructor is inheritently chained - call to inherited() is invalid');
                }

                return result;
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

                            if (target.constructor._declare_meta !== undefined)
                            {
                                value.fnClsName = target.constructor._declare_meta.className;
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

                        Object.freeze(ctor);

                        superClass = ctor;
                    }

                    // last base => our (empty) proto
                    proto = forceNew(superClass);
                }
                else
                {
                    proto = {};
                }
                
                
                cls.prototype = proto;
                proto.constructor = cls;
                proto.declaredClass = cls._declare_meta.className;
                cls.superClass = superClass || null;
                cls.fnClsName = cls._declare_meta.className;
                cls.fnName = 'constructor';

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

                // MAYBE Add special functions (extend / createSubclass) to ctor (if we need to support them)

                proto.isInstanceOf = isInstanceOf;
                proto.inherited = inherited;
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