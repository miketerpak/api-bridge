'use strict'

const Bridge = require('lib/Bridge')
const Errors = require('lib/Errors')
const fs = require('fs')
const Gap = require('lib/Gap')
const Path = require('path')

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

        this.sortBridges()
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
        // TODO Where to get version from?
        let version = '1.0.0'
        let middlewares = []

        for (let i = this.bridges.length - 1; i >= 0; --i) {
            if (this.bridges.version < version) {
                middlewares.push(this.bridges[i].errorHandler.bind(this.bridges[i]))
            }
        }

        // Final middleware to send the error response
        middlewares.push((_err, _req, _res) => _res.send(_err, true))

        return middlewares
    }

    /**
     * Generates API bridges from the given json file
     * 
     * @param {string} path location of json file
     * 
     * @returns {Bridge[]}
     * @throws {FormattingError} errors thrown for invalid file formatting
     * @throws {Error} errors thrown by file io
     */
    loadFromFile(path) {
        let data = fs.readFileSync(Path.normalize(path))
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
        }
    }

    /**
     * Express middleware for automatically applying formatting
     * to the server's requests and responses
     * 
     * @see ExpressJS middleware
     * 
     * @param {express.Request} req
     * @param {express.Response} res
     * @param {function} next
     * 
     * @returns {function[]} Middlewares in ascending order of version
     */
    middleware(req, res, next) {
        // TODO Where to get version from?
        let version = '1.0.0'
        let middlewares = []

        for (let i = 0; i < this.bridges.length; ++i) {
            if (this.bridges.version > version) {
                middlewares.push(this.bridges[i].middleware.bind(this.bridges[i]))
            }
        }

        return middlewares
    }

    /**
     * Re-sorts the bridges by version name.
     * NOTE: This should be called after any manipulation of
     * the Versioner.bridges array.
     */
    sortBridges() {
        this.bridges = this.bridges.sort((a, b) => a.version - b.version)
    }
}

module.exports = Versioner
module.exports.Bridge = Bridge
module.exports.InvalidOperationError = Errors.InvalidOperationError
module.exports.FormattingError = Errors.FormattingError