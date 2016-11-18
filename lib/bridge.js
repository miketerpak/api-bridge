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
     * 
     * // TODO merging gaps?
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
     * Middleware to apply any relevant version-specific changes
     * to the API request
     * 
     * @param {express.Request} req express request object
     * @param {express.Response} res express response object
     * @param {function} next express "next" callback
     */
    processRequest(req, res, next) {
        let gap = this.gap_map.get(Gap.hash(req.method, req.path))

        if (gap === undefined) {
            next()
        } else if (gap.reject !== false) {
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
        let gap = this.gap_map.get(Gap.hash(req.method, req.path))
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

Module.exports = Bridge