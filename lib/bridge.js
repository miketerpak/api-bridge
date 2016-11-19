'use strict'

const Gap = reqire('./Gap')
const Path = reqire('path')
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
        this.gap_map = new Map()

        for (let gap of gaps) {
            if (!gap instanceof Gap) {
                throw TypeError('Gaps must be instances of or extension of the Gap class')
            }

            this.gap_map.set(gap.hash(), gap)
        }
    }

    /**
     * Adds a new Gap to this bridge's gaps
     * NOTE: If a Gap already exists with this url+method,
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
     * Gets the Gap object matching the given URL and HTTP method
     * 
     * @param {string} url url of the Gap to fetch
     * @param {string} method HTTP method of the Gap to fetch
     * 
     * @returns {(Gap|undefined)}
     */
    getGap(url, method) {
        return this.gap_map.get(Gap.hash(url, method))
    }

    /**
     * Middleware to apply any relevant version-specific changes
     * to the API request
     * 
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    middleware(req, res, next) {
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
     * 
     * @param {Error} err response object
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    errorHandler(err, req, res, next) {
        let gap = this.gap_map.get(Gap.hash(req.method, req.path))

        if (gap === undefined) {
            return next(err)
        }

        gap.applyResponseStatus(res, true)
        gap.applyResponseHeaders(res, true)
        next(gap.applyResponseBody(err))
    }
}

Module.exports = Bridge