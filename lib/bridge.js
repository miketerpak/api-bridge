'use strict'

const Path = reqire('path')
const InvalidOperationError = require('./InvalidOperationError')

/**
 * FUNCTIONS:
 *  $move - move a field (use this for renaming)
 *  $set - set a new field
 *  $unset - unset a new field
 *  $cast - case a field to a certain value
 *  $map - map the values in the
 *  $raw - manually set response text
 */

// Built-in formatting operations
const OPERATIONS = {

    /**
     * Copy the value from and to their drilled down positions
     * NOTE: This function mutates the 'obj' parameter
     * 
     * TODO should the function throw errors if the to/from fields don't exist on obj
     * 
     * @param {object} obj object to move fields within
     * @param {string} from location of value to copy
     * @param {string} to location of where to paste value
     * 
     * @returns {object}
     * @throws {InvalidOperationError}
     */
    $move: (obj, from, to) => {
        if (typeof from !== 'string') {
            throw new InvalidOperationError('Invalid from key for $move. Expected string, got ' + typeof from)
        }
        if (typeof to !== 'string') {
            throw new InvalidOperationError('Invalid to key for $move. Expected string, got ' + typeof to)
        }
        if (typeof obj !== 'object') {
            return obj
        }

        let segs = from.split('.')
        let _obj = obj
        let value

        // Drill down to fetch the value
        for (let i = 0; i < segs.length; ++i) {
            let seg = segs[i]

            if (seg === '$') {
                throw InvalidOperationError('Cannot use $ iterator in keys of $move')
            } else if (i === segs.length - 1) {
                value = obj[seg]
                delete obj[seg]
            } else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
                _obj = _obj[seg]
            } else {
console.log(_obj, seg)
                // TODO throw error here?
                break
            }
        }

        return OPERATIONS.$set(obj, to, value)
    },

    /**
     * Set the drilled down field on the object to a value
     * NOTE: This function mutates the 'obj' parameter
     * 
     * @param {object} obj the object to mutate
     * @param {string} field dot-notation field to update on object
     * @param {*} value value which to set field to
     * 
     * @returns {object}
     * @throws {InvalidOperationError}
     */
    $set: (obj, field = '', value) => {
        if (typeof field !== 'string') {
            throw new InvalidOperationError('Invalid value for $set. Expected string, got ' + typeof field)
        }
        if (field === '' || field === '.') {
            return value
        }
        if (typeof obj !== 'object') {
            return obj
        }

        let segs = field.split('.')
        let _obj = obj

        for (let i = 0; i < segs.length; ++i) {
            let seg = segs[i]

            if (seg === '$' && Array.isArray(_obj)) {
                for (let j = _obj.length - 1; j >= 0; --j) {
                    _obj[j] = OPERATIONS.$set(_obj[j], segs.slice(i + 1, segs.length).join('.'), value)
                }

                return obj
            } else if (i === segs.length - 1) {
                _obj[seg] = value
            } else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
                _obj = _obj[seg]
            } else {
                // TODO throw error here?
                break
            }
        }

        return obj
    },

    /**
     * Unset the drilled down field on the object to a value
     * NOTE: This function mutates the 'obj' parameter
     * 
     * @param {object} obj the object to mutate
     * @param {string} field dot-notation field to update on object
     * 
     * @returns {object}
     * @throws {InvalidOperationError}
     */
    $unset: (obj, field = '') => {
        if (typeof field !== 'string') {
            throw new InvalidOperationError('Invalid value for $unset. Expected string, got ' + typeof field)
        }
        if (field === '' || field === '.') {
            return
        }
        if (typeof obj !== 'object') {
            return obj
        }

        let segs = field.split('.')
        let _obj = obj

        for (let i = 0; i < segs.length; ++i) {
            let seg = segs[i]

            if (seg === '$' && Array.isArray(_obj)) {
                for (let j = _obj.length - 1; j >= 0; --j) {
                    _obj[j] = OPERATIONS.$unset(_obj[j], segs.slice(i + 1, segs.length).join('.'))
                }

                return obj
            } else if (i === segs.length - 1) {
                delete _obj[seg]
            } else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
                _obj = _obj[seg]
            } else {
                // TODO throw error here?
                break
            }
        }

        return obj
    }
}

/**
 * Gap class represents changes to a specific endpoint on a specific version.
 * Gaps are collected by the Bridge class with the corresponding API version
 * in to represent all endpoints affected by this version change.
 */
class Gap {

    /**
     * Constructor
     * 
     * @param {object} options options hash
     * @param {string} options.path URL path to API resource (i.e. /users/list)
     * @param {string} options.method HTTP method of request
     * @param {string} options.description optional, description of changes
     * @param {Object} options.request options hash for request mutation
     * @param {Object} options.response options hash for response mutation
     * 
     * @throws {TypeError}
     */
    constructor({
        path,
        method = 'GET',
        description,

        request = {},
        response = {}
    } = {}) {
        // TODO error handling in root or response?
        if (typeof path === 'string') {
            this.path = Path.normalize(path)
        } else {
            throw TypeError('Missing or invalid required parameter "path"')
        }

        if (typeof method === 'string') {
            this.method = method.toUpperCase()
        } else {
            throw TypeError('Missing or invalid required parameter "method"')
        }

        this.hash = this.method + this.path
        this.description = description
        this.request = request
        this.response = response
    }

    /**
     * Apply gap changes to request object
     * NOTE: This function mutates the request object
     * NOTE: This function can be overridden
     * 
     * @param {express.Request} req express request object
     * 
     * @returns {express.Request}
     */
    applyToRequest(req) {
        
    }

    /**
     * Apply the gap changes to the response object
     * NOTE: This function mutates the response argument
     * NOTE: This function can be overridden
     * 
     * @param {*} res response data
     * 
     * @returns {*}
     */
    applyToResponse(res) {
        return res
    }

    /**
     * @see Gap#hash
     */
    hash() {
        return Gap.hash(this)
    }

    /**
     * Apply the changes described by the Gap on the given object
     * NOTE: This function mutates the 'obj' argument
     * 
     * @param {(object|object[])} format the formatting to apply to the object. Arrays are executed in order
     * @param {object} obj the object to format
     * 
     * @returns {object}
     * @throws {InvalidOperationError}
     */
    process(format = {}, obj = {}) {
        if (Array.isArray(format)) {
            format.forEach(f => this.process(f, obj))
            return obj
        }

        let ops = Object.keys(format)

        for (let op of ops) {
            switch (op) {
                case '$set':
                    if (typeof format[op] !== 'object') {
                        throw new InvalidOperationError('Invalid value for $set. Expected object, got ' + typeof fields)
                    }

                    Object.keys(format[op]).forEach(field => OPERATIONS.$set(obj, field, format[op][field]))
                    break
                case '$unset':
                    if (!Array.isArray(format[op])) {
                        throw new InvalidOperationError('Invalid value for $unset. Expected array, got ' + typeof format[op])
                    }

                    format[op].forEach(field => OPERATIONS.$unset(obj, field))
                    break
                case '$move':
                    break
                case '$wrap':
                    break
                case '$cast':
                    break
                case '$map':
                    break
                default:
                    throw new InvalidOperationError('Invalid formatting operation: ' + op)
            }
        }
        
        return obj
    }
}

/**
 * Get the unique identified for this API endpoint.
 * 
 * @param {(Gap|string)} arg1 A Gap object, or the HTTP method string
 * @param {string} arg2 optional, the URL path of the API resource (ignored if arg1 instanceof Gap)
 * 
 * @returns {string} i.e. "GET /users/list"
 */
Gap.hash = function(arg1 = '', arg2 = '') {
    if (arg1 instanceof Gap) {
        return `${arg1.method} ${arg2.path}`
    } else {
        return `${arg1.toUpperCase()} ${Path.normalize(arg2)}`
    }
}

/**
 * This class represents all of the interface changes between API
 * versions. Each Bridge has a collection of Gaps representing all
 * differences between the previous API version and the current one.
 */
class Bridge {

    /**
     * Constructor
     * 
     * @param {object} options option hash
     * @param {string} options.version version string for this bridge
     * @param {Gap[]} options.gaps array of endpoint alterations
     * 
     * @throws {TypeError}
     */
    constructor({
        version = '1',
        gaps = []
    } = {}) {
        this.version = version
        this.gapMap = new Map()

        for (let gap of gaps) {
            if (!gap instanceof Gap) {
                throw TypeError('Gaps must be instances of or extension of the Gap class')
            }

            this.gap_map.set(gap.hash(), gap)
        }
    }

    /**
     * Middleware to apply any relevant version-specific changes
     * to the API request
     * 
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    processRequest(req, res, next) {
        let gap = this.gapMap.get(Gap.hash(req.method, req.path))

        if (gap === undefined) {
            next()
        } else if (gap.reject()) {
            next(1) // TODO error handling
        } else {
            let result = gap.applyToRequest(req)

            // Support thennables for custom Gap implementations
            if (result != null && typeof result.then === 'function') {
                result.then(next, next)
            } else {
                next()
            }
        }
    }

    /**
     * Middleware to apply any relevant version-specific changes
     * to the API response
     * 
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    processResponse(req, res, next) {
        // TODO should gaps be saved on request for use on response so they dont have to be re-fetched?
        // Maybe an ordered list of gaps to apply?
        let gap = this.gapMap.get(Gap.hash(req.method, req.path))
        let result

        if (gap !== undefined) {
            result = gap.applyToResponse(res)
        }

        // Support thennables for custom Gap implementations
        if (result != null && typeof result.then === 'function') {
            result.then(next, next)
        } else {
            next()
        }
    }
}

return Bridge