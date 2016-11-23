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
     * @param {string} options.method HTTP method of request
     * @param {string} options.description optional, description of changes
     * @param {object} options.request options hash for request mutation
     * @param {object} options.response options hash for response mutation
     * @param {object} options.error options hash for error handler mutation
     * @param {object} options.reply optional, response to immediately reply with, ending the connection
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
        reply = false
    } = {}) {
        if (typeof path === 'string') {
            this.path = Path.posix.normalize('/' + path)
            this.path_regex = new RegExp(this.path.replace('*', '([^\/]*)'))
        } else {
            throw TypeError('Missing or invalid required parameter "path"')
        }

        if (typeof method === 'string') {
            this.method = method.toUpperCase()
        } else {
            throw TypeError('Missing or invalid required parameter "method"')
        }

        this.description = description
        this.__operations = {
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
            return this.__operations.error
        } else if(this.__operations.error[medium]) {
            return this.__operations.error[medium]
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
            return this.__operations.request
        } else if(this.__operations.request[medium]) {
            return this.__operations.request[medium]
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
            return this.__operations.response
        } else if(this.__operations.response[medium]) {
            return this.__operations.response[medium]
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
        return (method.toUpperCase() === this.method) && (path === this.path || this.path_regex.test(path))
    }














    /**
     * Apply gap changes to request object
     * NOTE: This function mutates the request object
     * 
     * @param {express.Request} req express request object
     * 
     * @returns {express.Request}
     */
    applyRequest(req) {
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
     * 
     * 
     * @param {*} body response data
     * @param {boolean} is_error optional, true if called from error handler, else false
     * 
     * @returns {*}
     */
    applyResponseBody(body, is_error = false) {
        if (this.response) return body
        let format = is_error ? this.error : this.response

        if (format) {
            return this.process(format.body, body)
        }

        return body
    }

    /**
     * Apply the gal changes to the response headers
     * NOTE: This function mutates the response argument
     * 
     * @param {express.Response} res express response object
     * @param {boolean} is_error optional, true if called from error handler, else false
     */
    applyResponseHeaders(res, is_error = false) {
        let format = is_error ? this.error : this.response
        if (!format) return res

        // Requires special handling for headers, as response headers
        // are private values for the response object
        let headers = {}
        Object.keys(res._headerNames).forEach(h_name => {
            headers[res._headerNames[h_name]] = res._headers[h_name]
        })

        headers = this.process(format.headers, headers)
        res._headerNames = {}
        res._headers = {}
        Object.keys(headers).forEach(header => {
            let lwrcase = header.toLowerCase()
            res._headerNames[lwrcase] = header
            res._headers[lwrcase] = String(headers[header])
        })
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
        return `${arg1.toUpperCase()} ${Path.posix.normalize(arg2)}`
    }
}

module.exports = Gap