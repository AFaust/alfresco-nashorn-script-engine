'use strict';
define([], function()
{
    var lastC3mroId = 0, locateCandidate, merge, c3mro;

    locateCandidate = function locateCandidate(baseLinearizations)
    {
        var candidate = -1, candidateO, unsuitableCandidates = {}, baseIdx = 0, idx, baseLinearization, blIdx;

        while (candidate === -1 && baseIdx < baseLinearizations.length)
        {
            // select candidate
            if (baseLinearizations[baseIdx].length > 0)
            {
                candidateO = baseLinearizations[baseIdx][0];
                candidate = candidateO._c3mro_id;

                // check if we already dismissed it
                if (!unsuitableCandidates.hasOwnProperty(candidate))
                {
                    // check tails of remaining linearizations
                    for (idx = baseIdx + 1; candidate !== -1 && idx < baseLinearizations.length; idx++)
                    {
                        baseLinearization = baseLinearizations[idx];
                        for (blIdx = 1; candidate !== -1 && blIdx < baseLinearization.length; blIdx++)
                        {
                            if (candidate === baseLinearization[blIdx]._c3mro_id)
                            {
                                unsuitableCandidates[candidate] = candidate;
                                candidate = -1;
                            }
                            else
                            {
                                // pro-actively mark anything in tail as unsuitable to potentially short circuit further iterations of outer
                                // while
                                unsuitableCandidates[baseLinearization[blIdx]._c3mro_id] = baseLinearization[blIdx]._c3mro_id;
                            }
                        }
                    }

                    if (candidate === -1)
                    {
                        baseIdx++;
                    }
                }
                else
                {
                    candidate = -1;
                    baseIdx++;
                }
            }
            else
            {
                // remove empty baseLinearization
                baseLinearizations.splice(baseIdx, 1);
            }
        }

        return candidate !== -1 ? candidateO : null;
    };

    merge = function merge(linearization, baseLinearizations)
    {
        var candidate, blLengthBefore = baseLinearizations.length, baseIdx;

        candidate = locateCandidate(baseLinearizations);

        if (candidate === null)
        {
            if (blLengthBefore === baseLinearizations.length)
            {
                throw new Error('Unable to find a candidate that passes merge requirements');
            }
        }
        else
        {
            linearization.push(candidate);

            // remove matching heads of base linearizations
            for (baseIdx = 0; baseIdx < baseLinearizations.length; baseIdx++)
            {
                if (baseLinearizations[baseIdx][0] === candidate)
                {
                    baseLinearizations[baseIdx].splice(0, 1);
                }
            }
        }
    };

    c3mro = function c3mro(o, bases)
    {
        var c3mroId, linearization, baseLinearizations, idx;

        linearization = [ o ];

        if (Array.isArray(bases) && bases.length > 0)
        {
            baseLinearizations = [];
            for (idx = 0; idx < bases.length; idx++)
            {
                if (bases[idx] !== undefined && bases[idx] !== null)
                {
                    if (!Array.isArray(bases[idx]._c3mro_linearization) || typeof bases[idx]._c3mro_id !== 'number')
                    {
                        throw new Error('Unknown / undefined base: ' + bases[idx]);
                    }

                    // slice to shallow-copy
                    baseLinearizations.push(bases[idx]._c3mro_linearization.slice(0));
                }
            }

            linearization = [ o ];
            while (baseLinearizations.length > 0)
            {
                merge(linearization, baseLinearizations);
            }
        }
        else if (bases !== undefined && bases !== null && !Array.isArray(bases))
        {
            throw new Error('Invalid bases');
        }

        c3mroId = lastC3mroId++;

        Object.defineProperty(o, '_c3mro_id', {
            value : c3mroId,
            writable : false,
            enumerable : false,
            configurable : false
        });

        Object.defineProperty(o, '_c3mro_linearization', {
            value : linearization,
            writable : false,
            enumerable : false,
            configurable : false
        });

        Object.freeze(linearization);
        
        return o;
    };

    Object.freeze(c3mro);

    return c3mro;
});