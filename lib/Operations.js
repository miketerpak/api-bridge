'use strict'

const InvalidOperationError = require('./Errors').InvalidOperationError
const TYPES = ['number', 'string', 'boolean']

/**
 * BUILT-IN FORMATTING FUNCTIONS:
 *  $move - move a field (use this for renaming)
 *  $set - set a new field
 *  $unset - unset a new field
 *  $cast - case a field to a certain value
 *  $wrap - encase value within an object, under the given key, or in an array if []
 *  $map - map the values in the
 * 
 * SPECIAL
 * 	$replace - overwrite the field with the given data
 *  $raw - manually set response text
 */

// Casts between primitives
function cast(value, type) {
	if (type === 'number') {
		return isNaN(value) ? null : Number(value)
	} else if (type === 'string') {
		return String(value)
	} else if (type === 'boolean') {
		return Boolean(value)
	}
}

// Used by $move and $copy, as $copy is a $move that preserves the copied value
// @see module.exports.$move, module.exports.$copy
// TODO allow $ in $move for moving relatively within an array of objects
function move(obj, from, to, __keep = false) {
	if (typeof obj !== 'object') {
		return obj
	}

	let segs = from.split('.')
	let _obj = obj
	let value

	// Drill down to fetch the value
	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj[seg])) {
			throw InvalidOperationError('Cannot use $ iterator in from key for $copy and $move')
		} else if (i === segs.length - 1) {
			value = _obj[seg]
			if (!__keep) delete _obj[seg]
		} else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
			_obj = _obj[seg]
		} else {
			// TODO throw error here?
			break
		}
	}

	return module.exports.$set(obj, to, value)
}

/**
 * Cast the value at 'field' in 'obj' to the given type
 * NOTE: This function will set values that cannot be cast to null
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj object to cast values within
 * @param {string} field location of value in obj to cast, in dot notation
 * @param {string} type NodeJS data type to case to (@see TYPES)
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$cast = (obj, field, type) => {
	if (typeof field !== 'string') {
		throw new InvalidOperationError('Invalid field key for $cast. Expected string, got ' + typeof field)
	}
	if (!TYPES.includes(type)) {
		throw new InvalidOperationError('Invalid type value for $cast. Expected a value NodeJS type, got ' + typeof map)
	}
	if (typeof obj !== 'object') {
		return (field !== '' && field !== '.') ? obj : cast(obj, type)
	}

	let segs = field.split('.')
	let _obj = obj

	// Drill down to fetch the value
	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$cast(_obj[j], segs.slice(i + 1, segs.length).join('.'), type)
			}

			return obj
		} else if (i === segs.length - 1) {
			_obj[seg] = cast(_obj[seg], type)
		} else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
			_obj = _obj[seg]
		} else {
			// TODO throw error here?
			break
		}
	}

	return obj
}

/**
 * Copy the value from and to their drilled down positions
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj object to copy fields within
 * @param {string} from location of value to copy, in dot notation
 * @param {string} to location of where to paste value, in dot notation
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$copy = (obj, from, to) => {
	if (typeof from !== 'string') {
		throw new InvalidOperationError('Invalid from key for $move. Expected string, got ' + typeof from)
	}
	if (typeof to !== 'string') {
		throw new InvalidOperationError('Invalid to key for $move. Expected string, got ' + typeof to)
	}
	
	return move(obj, from, to, true)
}

/**
 * Change the value at 'field' in 'obj' by looking up its current
 * value in the map and setting it tot he correcponsing value
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj object to map fields within
 * @param {string} field location of value in obj to map, in dot notation
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$map = (obj, field, map) => {
	if (typeof field !== 'string') {
		throw new InvalidOperationError('Invalid field key for $map. Expected string, got ' + typeof field)
	}
	if (typeof map !== 'object') {
		throw new InvalidOperationError('Invalid map key for $map. Expected object, got ' + typeof map)
	}
	if (typeof obj !== 'object') {
		return obj
	}

	let segs = field.split('.')
	let _obj = obj

	// Drill down to fetch the value
	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$map(_obj[j], segs.slice(i + 1, segs.length).join('.'), map)
			}

			return obj
		} else if (i === segs.length - 1) {
			_obj[seg] = map[_obj[seg]]
		} else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
			_obj = _obj[seg]
		} else {
			// TODO throw error here?
			break
		}
	}

	return obj
},

/**
 * Copy the value from and to their drilled down positions, deleting the old value
 * NOTE: This function mutates the 'obj' parameter
 * 
 * TODO should the function throw errors if the to/from fields don't exist on obj
 * 
 * @param {object} obj object to move fields within
 * @param {string} from location of value to copy, in dot notation
 * @param {string} to location of where to paste value, in dot notation
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$move = (obj, from, to) => {
	if (typeof from !== 'string') {
		throw new InvalidOperationError('Invalid from key for $move. Expected string, got ' + typeof from)
	}
	if (typeof to !== 'string') {
		throw new InvalidOperationError('Invalid to key for $move. Expected string, got ' + typeof to)
	}

	return move(obj, from, to)
},

/**
 * Set the drilled down field on the object to a value
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj the object to mutate
 * @param {string} field field to update on object, in dot notation
 * @param {*} value value which to set field to
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$set = (obj, field = '', value) => {
	if (typeof field !== 'string') {
		throw new InvalidOperationError('Invalid value for $set. Expected string, got ' + typeof field)
	}
	if (field === '' || field === '.') {
		return value
	}
	if (typeof obj !== 'object') {
		return obj
	}

	let segs = field.split('.')
	let _obj = obj

	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$set(_obj[j], segs.slice(i + 1, segs.length).join('.'), value)
			}

			return obj
		} else if (i === segs.length - 1) {
			_obj[seg] = value
		} else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
			_obj = _obj[seg]
		} else {
			// TODO throw error here?
			break
		}
	}

	return obj
},

/**
 * Unset the drilled down field on the object to a value
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj the object to mutate
 * @param {string} field field to update on object, in dot notation
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$unset = (obj, field = '') => {
	if (typeof field !== 'string') {
		throw new InvalidOperationError('Invalid value for $unset. Expected string, got ' + typeof field)
	}
	if (field === '' || field === '.') {
		return
	}
	if (typeof obj !== 'object') {
		return obj
	}

	let segs = field.split('.')
	let _obj = obj

	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$unset(_obj[j], segs.slice(i + 1, segs.length).join('.'))
			}

			return obj
		} else if (i === segs.length - 1) {
			delete _obj[seg]
		} else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
			_obj = _obj[seg]
		} else {
			// TODO throw error here?
			break
		}
	}

	return obj
},

/**
 * Wraps the object at the given field with either an object (if wrapper
 * is a string) or an array (if wrapper is an array)
 * NOTE: This function mutates the 'obj' argument
 * 
 * @param {object} obj the object within which to wrap a field
 * @param {string} field field to wrap within object, in dot notation
 * @param {(string|array)} wrapper  if string, the key for the wrapped object
 *                                  if array, sets wrapped object as first element of an array
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$wrap = (obj, field, wrapper) => {
	if (typeof field !== 'string') {
		throw new InvalidOperationError('Invalid key for $wrap. Expected string, got ' + typeof field)
	}
	if (typeof wrapper !== 'string' && !Array.isArray(wrapper)) {
		throw new InvalidOperationError('Invalid value for $wrap. Expected string or array, got ' + typeof wrapper)
	}
	if (typeof obj !== 'object') {
		return obj
	}
	if (field === '.' || field === '') {
		if (Array.isArray(wrapper)) {
			return [obj]
		} else {
			return {
				[wrapper]: obj
			}
		}
	}

	let segs = field.split('.')
	let _obj = obj

	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$wrap(_obj[j], segs.slice(i + 1, segs.length).join('.'), wrapper)
			}

			return obj
		} else if (i === segs.length - 1) {
			if (Array.isArray(wrapper)) {
				_obj[seg] = [_obj[seg]]
			} else {
				_obj[seg] = {
					[wrapper]: _obj[seg]
				}
			}
		} else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
			_obj = _obj[seg]
		} else {
			// TODO throw error here?
			break
		}
	}

	return obj
}