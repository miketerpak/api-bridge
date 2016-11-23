'use strict'

const Bridge = require('./lib/Bridge')
const Errors = require('./lib/Errors')
const fs = require('fs')
const Gap = require('./lib/Gap')
const Operations = require('./lib/Operations')

class Versioner {

    /**
     * Constructor
     * 
     * @param {object} options option hash
     * @param {string} options.path optional, path to a json file containing an api-bridge config
     * @param {Bridge[]} options.bridges optional, any programatically generated Bridges
     */
    constructor({ path, bridges = [] } = {}) {
        this.bridges = []

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
        }

        this.bridges.sort((a, b) => a.compareVersions(b))
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
    errorHandler(err, req, res, next) {
        return (req, res, next) => {
            for (let _gap of res.__versioner_parameters.response_gaps) {
                // TODO test if these break when not set on the Gap
                // gap.error('headers').process(req.headers) // TODO headers
                err = _gap.error('body').process(err)
            }

            res.__versioner_parameters.skip_formatting = true
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

        if (!Array.isArray(data)) data = [data]

        for (let _data of data) {
            if (!typeof _data === 'object' || Array.isArray(_data)) {
                throw new Error.FormattingError('Bridges must be defined as objects, got: ' + JSON.stringify(_data))
            }

            let _bridge = new Bridge({
                version: _data.version,
                description: _data.description
            })

            for (let _gap of _data.gaps) {
                _bridge.addGap(new Gap(_gap))
            }

            bridges.push(_bridge)
        }

        return bridges
    }

    /**
     * Express middlewares for automatically applying formatting
     * to the server's requests and responses
     * 
     * @returns {function[]} Middlewares in ascending order of version
     */
    middleware() {
        return (req, res, next) => {
            res.__versioner_parameters = {
                response_gaps: [] // Will be in reverse order from bridges
            }

            for (let bridge of this.bridges) {
                if (bridge.compareVersions(res.locals.version) <= 0) continue

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

                res.__versioner_parameters.gaps.unshift(gap)
            }

            let tmp = res.send.bind(res)
            res.send = function(data) {
                if (res.__versioner_parameters.skip_formatting) {
                    return tmp(data)
                }

                for (let _gap of res.__versioner_parameters.response_gaps) {
                    // TODO headers
                    data = _gap.response('body').process(data)
                }

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