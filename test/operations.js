'use strict'

/**
 * Testing for...
 *      - OPERATION SET TESTS
 *      - Test $func
 *      - Test $tag
 */

const assert = require('assert')
const Operations = require('../lib/Operations')

/**
 * Checks that two objects are exactly the same
 * TODO THIS SHOULDNT BE HERE
 * NOTE: Type sensitive
 * 
 * @param {object} o1
 * @param {object} o2
 * 
 * @returns {boolean}
 */

describe('Operations', function() {
    let obj = {
        info: {
            time: 1479738679324,
            code: "6",
            signature: 'tyfhi4532yjf78435xko9j'
        },
        data: [
            {
                name: 'Bob Jones',
                age: 75,
                state: 'NJ',
                location: [10, 10]
            },
            {
                name: 'Bob Jones',
                age: 75,
                state: 'NY',
                location: [10, 10]
            }
        ]
    }

    describe('$cast', function() {
        it('should cast the given field to the given type', function() {
            Operations.$cast(obj, 'info.code', 'number')
            assert.equal(typeof obj.info.code, 'number')
        })
        it('should cast the given fields to the given type (array matching with $)', function() {
            Operations.$cast(obj, 'data.$.age', 'string')
            obj.data.forEach(_data => {
                assert.equal(typeof _data.age, 'string')
            })
        })
    })

    describe('$set', function() {
        it('should set the value at the given location', function() {
            Operations.$set(obj, 'info.authenticated', false)
            assert.equal(obj.info.authenticated, false)
        })
        it('should set the values at the given locations (array matching with $)', function() {
            Operations.$set(obj, 'data.$.object', 'user')
            obj.data.forEach(_data => {
                assert.equal(_data.object, 'user')
            })
        })
    })

    describe('$unset', function() {
        it('should delete the value at the given location', function() {
            Operations.$unset(obj, 'info.authenticated')
            assert.equal(typeof obj.info.authenticated, 'undefined')
        })
        it('should delete the values at the given locations (array matching with $)', function() {
            Operations.$unset(obj, 'data.$.object')
            obj.data.forEach(_data => {
                assert.equal(typeof _data.object, 'undefined')
            })
        })
    })

    describe('$wrap', function() {
        it('should wrap the values in an array', function() {
            Operations.$wrap(obj, 'info.time', [])
            assert.equal(obj.info.time[0], 1479738679324)
        })
        it('should wrap the values in an object (array matching with $)', function() {
            Operations.$wrap(obj, 'data.$.location', 'coordinates')
            Operations.$set(obj, 'data.$.location.type', 'Point')
            obj.data.forEach(_data => {
                assert.equal(_data.location.coordinates[0], 10)
                assert.equal(_data.location.coordinates[1], 10)
                assert.equal(_data.location.type, 'Point')
            })
        })
    })

    describe('$map', function() {
        it('should map the value using given key value pairs', function() {
            Operations.$map(obj, 'info.code', {
                2: 'ok',
                4: 'aight',
                6: 'bad',
                8: 'worse'
            })
            assert.equal(obj.info.code, 'bad')
            Operations.$map(obj, 'info.code', {
                'ok': 'red',
                'aight': 'green',
                'worse': 'yellow',
                '': 'blue'
            })
            assert.equal(obj.info.code, 'blue')
        })
        it('should map the values using given key value pairs (array matching with $)', function() {
            Operations.$map(obj, 'data.$.state', {
                NH: 'New Hampshire',
                NJ: 'New Jersey',
                NM: 'New Mexico',
                '': 'egg'
            })
            assert.equal(obj.data[0].state, 'New Jersey')
            assert.equal(obj.data[1].state, 'egg')
        })
    })

    describe('$copy', function() {
        it('should copy the value from the given field to the specified location', function() {
            Operations.$copy(obj, 'info.signature', 'signature')
            assert.equal(obj.info.signature, 'tyfhi4532yjf78435xko9j')
            assert.equal(obj.signature, 'tyfhi4532yjf78435xko9j')
        })
        it('should map the values using given key value pairs (array matching with $)', function() {
            // TODO
        })
    })

    describe('$move', function() {
        it('should move the value from the given field to the specified location', function() {
            Operations.$move(obj, 'info', 'information')
            assert.equal(obj.information.signature, 'tyfhi4532yjf78435xko9j')
        })
        it('should map the values using given key value pairs (array matching with $)', function() {
            // TODO
            assert(false, 'NOT IMPLEMENTED')
        })
    })
})