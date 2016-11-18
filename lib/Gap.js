'use strict'

// TODO regex gap paths for URL params?

const InvalidOperationError = require('./Errors').InvalidOperationError
const Operations = require('./Operations')
const Path = require('path')

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
        response = {},
        reject = false
    } = {}) {
        // TODO error handling in root or response?
        if (typeof path === 'string') {
            this.path = Path.normalize('/' + path)
        } else {
            throw TypeError('Missing or invalid required parameter "path"')
        }

        if (typeof method === 'string') {
            this.method = method.toUpperCase()
        } else {
            throw TypeError('Missing or invalid required parameter "method"')
        }

        this.description = description
        this.reject = reject // TODO rejecting
        this.request = {
            body: request.body,
            headers: request.headers,
            query: request.query
        }
        this.response = {
            body: response.body,
            headers: response.headers,
            status: response.status
        }
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
        if (!this.request) return req

        if (this.request.body) {
            this.process(this.request.body, req.body)
        }
        if (this.request.query) {
            this.process(this.request.query, req.query)
        }
        if (this.request.params) {
            this.process(this.request.params, req.params)
        }
        if (this.request.headers) {
            this.process(this.request.headers, req.headers)
        }

        return req
    }

    /**
     * Apply the gap changes to the response object
     * NOTE: This function mutates the response argument
     * NOTE: This function can be overridden
     * 
     * 
     * @param {*} res response data
     * 
     * @returns {*}
     */
    applyToResponse(res) {
        if (!this.response) return res

        // TODO status code handling
        // TODO header handling

        if (this.response.body) {

            res = this.process(this.response.body, res)
        }

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
            format.forEach(f => obj = this.process(f, obj))
            return obj
        }

        let ops = Object.keys(format)

        for (let op of ops) {
            switch (op) {
                case '$set':
                    if (typeof format[op] !== 'object') {
                        throw new InvalidOperationError('Invalid value for $set. Expected object, got ' + typeof format[op])
                    }

                    Object.keys(format[op]).forEach(field => obj = Operations.$set(obj, field, format[op][field]))
                    break
                case '$unset':
                    if (!Array.isArray(format[op])) {
                        throw new InvalidOperationError('Invalid value for $unset. Expected array, got ' + typeof format[op])
                    }

                    format[op].forEach(field => obj = Operations.$unset(obj, field))
                    break
                case '$move':
                    if (typeof format[op] !== 'object') {
                        throw new InvalidOperationError('Invalid value for $move. Expected object, got ' + typeof format[op])
                    }

                    Object.keys(format[op]).forEach(field => obj = Operations.$move(obj, field, format[op][field]))
                    break
                case '$wrap':
                    if (typeof format[op] !== 'object') {
                        throw new InvalidOperationError('Invalid value for $wrap. Expected object, got ' + typeof format[op])
                    }

                    Object.keys(format[op]).forEach(field => obj = Operations.$wrap(obj, field, format[op][field]))
                    break
                case '$cast':
                    if (typeof format[op] !== 'object') {
                        throw new InvalidOperationError('Invalid value for $cast. Expected object, got ' + typeof format[op])
                    }

                    Object.keys(format[op]).forEach(field => obj = Operations.$cast(obj, field, format[op][field]))
                    break
                case '$map':
                    if (typeof format[op] !== 'object') {
                        throw new InvalidOperationError('Invalid value for $map. Expected object, got ' + typeof format[op])
                    }

                    Object.keys(format[op]).forEach(field => obj = Operations.$map(obj, field, format[op][field]))
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

module.exports = Gap