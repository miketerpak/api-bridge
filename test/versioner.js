'use strict'

const assert = require('assert')
const Versioner = require('../index')

describe('Versioner', function() {
	describe('#loadFromFile', function() {
		it('should correctly load and parse json file', function() {
			const versioner = new Versioner({ path: './test/test.json' })
console.log(versioner.bridges[0])
		})
	})
})