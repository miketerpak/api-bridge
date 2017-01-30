'use strict'

const FormattingError = require('./Errors').FormattingError
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
     * TODO response.status, error.status?
     * 
     * @param {object} options options hash
     * @param {string} options.path URL path to API resource (i.e. /users/list)
     * @param {string} [options.method=GET] HTTP method of request
     * @param {string} [options.description] description of changes
     * @param {object} [options.request] options hash for request mutation
     * @param {object} [options.response] options hash for response mutation
     * @param {object} [options.error] options hash for error handler mutation
     * @param {object} [options.reply=false] response to immediately reply with, ending the connection
     * @param {object} [options.bridge=null] parent bridge of this gap
     * 
     * @throws {TypeError}
     */
    constructor({
        path,
        method = 'GET',
        description,

        request = {},
        response = {},
        error = {},
        reply = false,
        bridge = null
    } = {}) {
        if (typeof path === 'string') {
            this.path = Path.posix.normalize('/' + path)
            this.pathRegex = new RegExp(this.path.replace('*', '([^\/]*)'))
        } else {
            throw TypeError('Missing or invalid required parameter "path"')
        }

        if (typeof method === 'string') {
            this.method = method.toUpperCase()
        } else {
            throw TypeError('Missing or invalid required parameter "method"')
        }

        this.bridge = bridge
        this.description = description
        this._operations = {
            request: {
                body: new Operations.Set(request.body),
                headers: new Operations.Set(request.headers),
                query: new Operations.Set(request.query),
                params: new Operations.Set(request.params)
            },
            response: {
                body: new Operations.Set(response.body),
                headers: new Operations.Set(response.headers)
            },
            error: {
                body: new Operations.Set(error.body),
                headers: new Operations.Set(error.headers)
            }
        }

        if (reply === false) {
            this.reply = reply
        } else if (typeof reply === 'object') {
            this.reply = {
                status: reply.status || 200,
                headers: reply.headers || {
                    'Content-Type': 'text/plain'
                },
                body: reply.body || 'OK'
            }
        } else {
            throw new FormattingError('Invalid value for reply parameter')
        }
    }

    /**
     * Used to fetch the operation sets for the error and its parts
     * 
     * @param {string} medium body, headers, query, params
     */
    error(medium) {
        if (typeof medium === undefined) {
            return this._operations.error
        } else if(this._operations.error[medium]) {
            return this._operations.error[medium]
        } else {
            throw new ReferenceError('Unknown error medium: ' + medium)
        }
    }

    /**
     * @see Gap#hash
     */
    hash() {
        return Gap.hash(this)
    }

    /**
     * Used to fetch the operation sets for the request and its parts
     * 
     * @param {string} medium body, headers, query, params
     */
    request(medium) {
        if (typeof medium === undefined) {
            return this._operations.request
        } else if(this._operations.request[medium]) {
            return this._operations.request[medium]
        } else {
            throw new ReferenceError('Unknown request medium: ' + medium)
        }
    }

    /**
     * Used to fetch the operation sets for the response and its parts
     * 
     * @param {string} medium body, headers
     */
    response(medium) {
        if (typeof medium === undefined) {
            return this._operations.response
        } else if(this._operations.response[medium]) {
            return this._operations.response[medium]
        } else {
            throw new ReferenceError('Unknown response medium: ' + medium)
        }
    }

    /**
     * Returns true if this Gap returns a static reply, else false
     * NOTE: This function will complete the express request, closing the connection
     * 
     * @param {express.Response} res express response object
     * 
     * @returns {boolean} true if replied, else false
     */
    shouldReply(res) {
        if (this.reply) {
            // unset any headers on the response
            res._headers = {}
            res._headerNames = {}

            res.status(this.reply.status)
            res.set(this.reply.headers)
            res.send(this.reply.body)
            res.end()
            return true
        } else {
            return false
        }
    }

    /**
     * Tests the given URI to see if it matches the regex of this Gap
     * 
     * @param {string} method the method of the gap to fetch 
     * @param {string} path path to test
     * 
     * @returns {boolean} true if match, else false
     */
    test(method, path) {
        return (method.toUpperCase() === this.method) && (path === this.path || this.pathRegex.test(path))
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
        return `${arg1.method} ${arg1.path}`
    } else {
        return `${arg1.toUpperCase()} ${Path.posix.normalize(arg2)}`
    }
}

module.exports = Gap