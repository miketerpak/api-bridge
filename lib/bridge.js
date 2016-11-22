'use strict'

const Gap = require('./Gap')
const InvalidOperationError = require('./Errors').InvalidOperationError
const Operations = require('./Operations')

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
     * @param {string} options.version optional, description of this version bridge
     * @param {Gap[]} options.gaps array of endpoint alterations
     * 
     * @throws {TypeError}
     */
    constructor({
        version,
        description,
        gaps = []
    } = {}) {
        this.version = version
        this.description = description
        this.gap_pipeline = []
        this.gap_map = new Map()

        for (let gap of gaps) {
            if (!gap instanceof Gap) {
                throw TypeError('Gaps must be instances of or extension of the Gap class')
            }

            this.gap_map.set(gap.hash(), gap)
            this.gap_pipeline.push(gap)
        }
    }

    /**
     * Adds a new Gap to this bridge's gaps
     * NOTE: If a Gap already exists with this path+method,
     * it will be overwritten by the new Gap
     * 
     * @param {Gap} gap
     * @throws {TypeError}
     */
    addGap(gap) {
        if (!gap instanceof Gap) {
            throw TypeError('Gaps must be derivatives of the Gap class')
        }

        this.gap_map.set(gap.hash(), gap)
    }

    /**
     * Gets the Gap object matching the given path and HTTP method.
     * If not found explicitly, will check regex for any path parameters
     * NOTE: Direct path matches always take presidence over regex matches
     * 
     * @param {string} method HTTP method of the Gap to fetch
     * @param {string} path path of the Gap to fetch
     * 
     * @returns {(Gap|undefined)}
     */
    getGap(method, path) {
        let gap = this.gap_map.get(Gap.hash(path, method))
        if (gap !== undefined) {
            return gap
        }

        let it = gap_map.values()
        let val
        while (val = it.next().value) {
            if (val.test(method, path)) {
                return val
            }
        }

        return undefined
    }

    /**
     * Middleware to apply any relevant version-specific changes
     * to the API request
     * NOTE: Relies on res.locals.version being set
     * 
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    middleware(req, res, next) {
        // Only apply this bridge if version > the requested version
        if (Bridge.compareVersionStrings(res.locals.version, this.version) >= 0) {
            return next()
        }

        let gap = this.gap_map.get(Gap.hash(req.method, req.path))

        if (gap === undefined) {
            return next()
        }

        let _send = res.send
        res.send = function(body, skip_formatting = false) {
            if (!skip_formatting) {
                body = gap.applyResponseBody(body)
                gap.applyResponseHeaders(res)
            }

            _send.apply(res, body, skip_formatting)
        }

        if (gap.shouldReply(res)) {
            // Response was completed within Gap object
            return
        }

        gap.applyRequest(req)
        next()
    }

    /**
     * Middleware to apply any relevant version-specific changes
     * to the API request
     * NOTE: Relies on res.locals.version being set
     * 
     * @param {Error} err response object
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    errorHandler(err, req, res, next) {
        // Only apply this bridge if version > the requested version
        if (Bridge.compareVersionStrings(res.locals.version, this.version) >= 0) {
            return next()
        }

        let gap = this.gap_map.get(Gap.hash(req.method, req.path))

        if (gap === undefined) {
            return next(err)
        }

        gap.applyResponseStatus(res, true)
        gap.applyResponseHeaders(res, true)
        next(gap.applyResponseBody(err))
    }
}

/**
 * Callback for Array#sort for sorting version strings
 * 
 * @param {string} v1 first version string
 * @param {string} v2 second version string
 * 
 * @returns {integer} 1 if v1 > v1, 0 is v1 === v2, else -1
 */
Bridge.compareVersionStrings = (v1, v2) => {
    let v1_dot = v1.indexOf('.')
    let v2_dot = v2.indexOf('.')
    let _v1 = v1, _v2 = v2

    _v1 = parseInt((v1_dot >= 0) ? _v1.substr(0, v1_dot) : _v1, 10)
    _v2 = parseInt((v2_dot >= 0) ? _v2.substr(0, v2_dot) : _v2, 10)

    if (_v1 > _v2) {
        return 1
    } else if (_v1 < _v2) {
        return -1
    } else if (v1_dot === -1 && v2_dot === -1) {
        return 0
    } else {
        return Bridge.compareVersionStrings(
            (v1_dot >= 0) ? v1.substr(v1_dot + 1, v1.length) : v1,
            (v2_dot >= 0) ? v2.substr(v2_dot + 1, v2.length) : v2
        )
    }
}

module.exports = Bridge