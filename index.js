'use strict'

const Bridge = require('./lib/Bridge')
const Errors = require('./lib/Errors')
const fs = require('fs')
const Gap = require('./lib/Gap')
const Operations = require('./lib/Operations')

/**
 * TODO
 *      - Multi-file support
 *      - Response status can be set or mapped with an object in gap response?
 */

class Versioner {

    /**
     * Constructor
     * 
     * @param {object} options option hash
     * @param {string} [options.path] path to a json file containing an api-bridge config
     * @param {Bridge[]} [options.bridges] any programatically generated Bridges
     */
    constructor({ path, bridges = [] } = {}) {
        this.bridges = [] // Stores the bridges in version-order so that it can be traversed linearly in order to apply any necessary version changes
        this.bridge_map = {} // Used to reference bridges by version string

        if (!Array.isArray(bridges)) {
            bridges = [bridges]
        }

        if (typeof path === 'string') {
            bridges = bridges.concat(this.loadFromFile(path))
        }

        this.addBridges(bridges)
    }

    /**
     * Adds new API bridges to the array of ordered bridges
     * 
     * @param {(Bridge|Bridge[])} bridge
     * 
     * @throws {TypeError}
     */
    addBridges(bridges = []) {
        if (!Array.isArray(bridges)) bridges = [bridges]

        for (let _bridge of bridges) {
            if (!_bridge instanceof Bridge) {
                throw new TypeError('Bridges must be instances of the Bridge class')
            }

            this.bridges.push(_bridge)
            this.bridge_map[_bridge.version] = _bridge
        }

        this.bridges.sort((a, b) => a.compareVersions(b))
    }

    /**
     * Gets a bridge by version number.
     * 
     * @param {string} version_code
     * @param {boolean} [generate_new=true] If true, generates a blank bridge that is added to the versioner's bridges and returned
     * 
     * @returns {(Bridge|null)}
     */
    getBridge(version_code, generate_new = true) {
        let bridge = this.bridge_map[version_code] || null

        if (bridge === null && generate_new) {
            bridge = new Bridge({ version: version_code })
            this.addBridges(bridge)
        }

        return bridge
    }

    /**
     * Express middleware for automatically applying formatting
     * to the server's error responses
     * 
     * @see ExpressJS middleware error handler
     * 
     * @param {*} err error object
     * @param {express.Request} req
     * @param {express.Response} res
     * @param {function} next
     * 
     * @returns {function[]} Middlewares in ascending order of version
     */
    errorHandler() {
        return (err, req, res, next) => {
            // If the middleware was never called for any reason, return the unchanged error response
            if (!res._versionerParameters) {
                throw new Error('Error handler called before middleware! Are you missing `app.use(versioner.middleware())`?')
            }

            let headers = {}
            for (let key of Object.keys(res._headerNames)) {
                headers[res._headerNames[key]] = res._headers[key]
            }

            for (let _gap of res._versionerParameters.responseGaps) {
                // TODO test if these break when not set on the Gap
                _gap.error('headers').process(headers)
                err = _gap.error('body').process(err)
            }

            res._headers = {}
            res._headerNames = {}
            res.set(headers)

            res._versionerParameters.skipFormatting = true
            res.send(err) // 2nd argument for skipping response formatting
        }
    }

    /**
     * Generates API bridges from the given json file
     * 
     * @param {string} path location of json file
     * 
     * @returns {Bridge[]}
     * @throws {FormattingError} errors thrown for invalid file formatting
     * @throws {SyntaxError} errors thrown parsing JSON
     * @throws {Error} errors thrown by file io
     */
    loadFromFile(path) {
        let data = JSON.parse(fs.readFileSync(path))
        let bridges = []

        if (!data) return bridges;
        if (!Array.isArray(data)) data = [data]

        for (let _data of data) {
            if (!typeof _data === 'object' || Array.isArray(_data)) {
                throw new Errors.FormattingError('Bridges must be defined as objects, got: ' + JSON.stringify(_data))
            }

            let _bridge = new Bridge({
                version: _data.version,
                description: _data.description,
                procedures: _data.procedures
            })

            for (let _gap of _data.gaps) {
                _gap.bridge = _bridge // set parent
                _gap.endpoint = _gap.endpoint || _gap.endpoints // alias
                // If gap has "path" set, don't check endpoint string
                if (typeof _gap.path === 'string') {
                    _bridge.addGap(new Gap(_gap))
                    continue
                }
                if (!_gap.endpoint) {
                    console.log(_gap)
                    throw new Errors.FormattingError('Gaps must have at least the `endpoint` or `path` field set')
                }
                if (!Array.isArray(_gap.endpoint)) _gap.endpoint = [_gap.endpoint]

                _gap.endpoint.forEach(endpoint => {
                    if (typeof endpoint !== 'string') throw new Errors.FormattingError('Gap endpoint(s) must be string(s)')
                    let [_method = null, _path = null] = endpoint.trim().split(' ')

                    if (_path) {
                        _gap.path = _path
                        _gap.method = _method
                    } else { // If no method was provided (e.g. "/users" vs "GET /users"), swap the extracted values
                        _gap.path = _method
                        _gap.method = null
                    }

                    _bridge.addGap(new Gap(_gap))
                })
            }

            bridges.push(_bridge)
        }

        return bridges
    }

    /**
     * Express middlewares for automatically applying formatting
     * to the server's requests and responses
     * 
     * @param {string} [versionParam=version] Parameter within `res.locals` that contains a string representation of the request's version number
     * 
     * @returns {function[]} Middlewares in ascending order of version
     */
    middleware(versionParam = 'version') {
        return (req, res, next) => {
            res._versionerParameters = {
                responseGaps: [] // Will be in reverse order from bridges
            }

            for (let bridge of this.bridges) {
                if (bridge.compareVersions(res.locals[versionParam]) <= 0) continue

                let gap = bridge.getGap(req.method, req.path)
                if (gap === undefined) continue
                if (gap.shouldReply(res)) {
                    // Response was sent from inside Gap#shouldReply
                    return
                }

                // TODO test if these break when not set on the Gap
                gap.request('headers').process(req.headers)
                gap.request('body').process(req.body)
                gap.request('query').process(req.query)
                gap.request('params').process(req.params)

                res._versionerParameters.responseGaps.unshift(gap)
            }

            let tmp = res.send.bind(res)
            res.send = function(data) {
                if (res._versionerParameters.skipFormatting) {
                    return tmp(data)
                }
                let headers = {}
                for (let key of Object.keys(res._headerNames)) {
                    headers[res._headerNames[key]] = res._headers[key]
                }

                for (let _gap of res._versionerParameters.responseGaps) {
                    headers = _gap.response('headers').process(headers)
                    data = _gap.response('body').process(data)
                }

                res._headers = {}
                res._headerNames = {}
                res.set(headers)

                tmp(data)
            }

            next()
        }
    }
}

module.exports = Versioner
module.exports.Bridge = Bridge
module.exports.Gap = Gap
module.exports.InvalidOperationError = Errors.InvalidOperationError
module.exports.FormattingError = Errors.FormattingError