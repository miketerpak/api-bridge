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
        this.description = description
        this.gap_pipeline = []
        this.gap_map = new Map()
        
        if (typeof version === 'string') {
            this.version = version
            this.version_segments = version.split('.').map(n => parseInt(n, 10))
        } else {
            throw TypeError('version must be a period-delimited string of numbers')
        }

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
     * Compares this bridge's version to that of the other bridge's
     * 
     * @param {(string|Bridge)} other bridge to compare against
     * 
     * @returns {number} -1 if this < other, 0 if this = other, 1 if this > other
     * @throws {TypeError}
     */
    compareVersions(other) {
        let v_segs

        if (other instanceof Bridge) {
            v_segs = other.version_segments
        } else if (typeof other === 'string') {
            v_segs = other.split('.').map(n => parseInt(n, 10))
        } else {
            throw TypeError('Compared object must be a string or an instance of Bridge')
        }

        for (let i = 0; i < this.version_segments.length; ++i) {
            if (v_segs[i] === undefined || this.version_segments[i] > v_segs[i]) {
                return 1
            } else if (this.version_segments[i] < v_segs[i]) {
                return -1
            }
        }

        if (v_segs.length > this.version_segments.length) {
            return -1
        } else {
            return 0
        }
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
}

module.exports = Bridge