'use strict'

const assert = require('assert')
const Versioner = require('../index')

describe('Versioner', function() {
	// TODO rest of tests here

	describe('#loadFromFile', function() {
		it('should correctly load and parse json file', function() {
			const versioner = new Versioner({ path: './test/test.json' })
			assert.equal(versioner.bridges.length, 2)
			assert.equal(versioner.bridges[0].gap_map.size, 1)
			assert.equal(versioner.bridges[1].gap_map.size, 1)
		})
	})
})