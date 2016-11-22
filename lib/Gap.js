'use strict'

const FormattingError = require('./Errors').FormattingError
const InvalidOperationError = require('./Errors').InvalidOperationError
const Operations = require('./Operations')
const Path = require('path')

class OperationSet {

    constructor(operations = []) {
        this.operations = operations
        this.verify(this.operations)
    }

    /**
     * Add a new operation hash into the operation set
     * 
     * @param {(object|object[])} new_ops operations to insert into the set
     * @param {object} options options hash
     * @param {string} options.before optional, insert before operation with the given $tag
     * @param {string} options.after optional, insert after operation with the given $tag
     * @param {integer} options.at optional, insert af this position
     * 
     * @returns {OperationSet}
     */
    add(new_ops = [], { before, after, at } = {}) {
        if (typeof new_ops !== 'object') {
            throw new TypeError('Invalid operations. Expected object or object array, got ' + typeof after)
        } else if (!Array.isArray(new_ops)) {
            new_ops = [new_ops]
        }
        if (at != null && typeof at !== 'number') {
            throw new TypeError('Invalid "at" index. Expected number, got ' + typeof at)
        } else if (after && typeof after !== 'string') {
            throw new TypeError('Invalid "after" $tag. Expected string, got ' + typeof after)
        } else if (before && typeof before !== 'string') {
            throw new TypeError('Invalid "before" $tag. Expected string, got ' + typeof before)
        }
        for (let new_op of new_ops) {
            this.verify(new_op)
        }

        let index = -1
        if (at != null) {
            index = at
        } else if (after || before) {
            for (index = this.operations.length - 1; index > -1 && this.operations[index].$tag !== (after || before); --index);
            if (index === -1) {
                throw new FormattingError('Cannot find operation with $tag of ' + (after || before))
            }
        }

        if (index >= 0) {
            if (after) {
                this.operations.splice(index + 1, 0, ...new_ops)
            } else {
                this.operations.splice(index, 0, ...new_ops)
            }
        } else {
            this.operations = this.operations.concat(new_ops)
        }

        return this
    }

    /**
     * Get the operation from this operation set
     * 
     * @param {(string|number)} id index or tag of the operations to get
     * 
     * @returns {(object|undefined)}
     * @throws {TypeError}
     */
    get(id) {
        if (typeof id === 'string') {
            let tag = id
            for (id = this.operations.length - 1; id > -1 && tag !== this.operations[id]; --id);
        } else if (typeof id !== 'number') {
            throw new TypeError('Invalid identifier. Expected number or string, got ' + typeof id)
        }

        return this.operations[id]
    }

    /**
     * Apply this operation set to the given object
     * 
     * @param {object} obj object to apply changes to
     * 
     * @returns {object}
     * @throws {InvalidOperationError} when operations are formatted incorrectly
     */
    process(obj) {
        for (let op_set of this.operations) {
            for (let op of Object.keys(op_set)) {
                switch (op) {
                    case '$func':
                        if (typeof format[op] !== 'function') {
                            throw new InvalidOperationError('Invalid value for $func. Expected function, got ' + typeof format[op])
                        }

                        obj = format[op](obj)
                        break
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
                    case '$tag':
                        // Used to identify an operation set within a Gap programatically
                        break
                    default:
                        throw new InvalidOperationError('Invalid formatting operation: ' + op)
                }
            }
        }

        return obj
    }

    /**
     * Removes the operation from this op set
     * 
     * @param {(string|number)} id the index (number) or $tag (string) of the gap to remove
     * 
     * @returns {(object|undefined)} removed operation
     */
    remove(id) {
        let _op = undefined
        if (typeof id === 'string') {
            let tag = id
            for (id = this.operations.length - 1; id > -1 && tag !== this.operations[id]; --id);
        } else if (typeof id !== 'number') {
            throw new TypeError('Invalid identifier. Expected number or string, got ' + typeof id)
        }

        if (id >= 0) {
            _op = this.operations.splice(id, 1).pop()
        }

        return _op
    }

    /**
     * Verifies the format of the option set
     * 
     * @param {object} ops operations object
     */
    verify(ops) {
        // TODO startup verification of syntax
        return true
    }
}

class RequestOperationSet extends OperationSet {

}

class ResponseOperationSet extends OperationSet {

}

class ErrorOperationSet extends OperationSet {

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
        this.request = {
            body: request.body || {},
            headers: request.headers || {},
            query: request.query || {},
            params: request.params || {}
        }
        this.response = {
            body: response.body || {},
            headers: response.headers || {},
            status: response.status
        }
        this.error = {
            body: error.body || {},
            headers: error.headers || {},
            status: error.status
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
     * Inserts new operation sets into the Gap's request
     * and/or response handling
     * 
     * @param {string} request_or_response either "request" or "response" depending on the operations being edited
     * @param {string} medium the medium available on the request
     * @param {object} options
     * @param {(object|object[])} options.operations operations to insert into this Gap's
     * @param {string} options.after optional, the operation tag (assigned with $tag) after which to place these operations
     * @param {string} options.before optional, the operation tag (assigned with $tag) before which to place these operations
     * 
     * @returns {Gap}
     * @throws {TypeError}
     * @throws {FormattingError} if first two arguments are invalid
     */
    addOperation(request_or_response, medium, operations = [], {
        after,
        before
    } = {}) {
        if (typeof medium === 'string') {
            if (request_or_response === 'request') {
                if (medium !== 'headers' && medium !== 'params' && medium !== 'query' && medium !== 'body') {
                    throw new FormattingError('Invalid medium passed. Expected "headers", "params", "query" or "body", got ' + medium)
                }
            } else if (request_or_response === 'response') {
                if (medium !== 'headers' && medium !== 'body') {
                    throw new FormattingError('Invalid medium passed. Expected "headers" or "body", got ' + medium)
                }
            } else {
                throw new FormattingError('Must alter either "request" or "response". Got ' + request_or_response)
            }
        } else {
            throw new FormattingError('Invalid medium passed. Expected a string, got ' + typeof medium)
        }
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

    /**
     * Set this Gap's status code as the current HTTP response code
     * 
     * @param {express.Response} res express response object
     * @param {boolean} is_error true if triggered from an error handler, else false
     */
    applyResponseStatus(res, is_error = false) {
        if (is_error && this.error.status) {
            res.status(this.error.status)
        } else if (!is_error && this.response.status) {
            res.status(this.response.status)
        }
    }

    /**
     * @see Gap#hash
     */
    hash() {
        return Gap.hash(this)
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