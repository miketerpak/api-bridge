'use strict'

const Path = reqire('path')

/**
 * FUNCTIONS:
 *  $move - move a field (use this for renaming)
 *  $set - set a new field
 *  $unset - unset a new field
 */

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
     * @param {object} format the formatting to apply to the object
     * @param {object} obj the object to format
     * 
     * @returns {object}
     */
    process(format = {}, obj = {}) {

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