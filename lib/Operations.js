'use strict'

const Errors = require('./Errors')
const InvalidOperationError = Errors.InvalidOperationError
const FormattingError = Errors.FormattingError
const TYPES = ['number', 'string', 'boolean']

class OperationSet {

	/**
	 * Constructor
	 * 
	 * @param {(object|object[])} ops operations for this set
	 * 
	 * @throws {FormattingError}
	 */
    constructor(ops = []) {
		this.operations = Array.isArray(ops) ? ops : [ops]
		this.operations.forEach(this.verify)
    }

    /**
     * Add a new operation hash into the operation set
     * 
     * @param {(object|object[])} new_ops operations to insert into the set
     * @param {object} options options hash
     * @param {string} options.before optional, insert before operation with the given $tag
     * @param {string} options.after optional, insert after operation with the given $tag
     * @param {integer} options.at optional, insert at this position
     * 
     * @returns {OperationSet}
     */
    add(new_ops = [], { before, after, at } = {}) {
        if (typeof new_ops !== 'object') {
            throw new TypeError('Invalid operations. Expected object or object array, got ' + typeof after)
        } else if (!Array.isArray(new_ops)) {
            new_ops = [new_ops]
        }
        if (at != null && typeof at !== 'number') {
            throw new TypeError('Invalid "at" index. Expected number, got ' + typeof at)
        } else if (after && typeof after !== 'string') {
            throw new TypeError('Invalid "after" $tag. Expected string, got ' + typeof after)
        } else if (before && typeof before !== 'string') {
            throw new TypeError('Invalid "before" $tag. Expected string, got ' + typeof before)
        }
        for (let new_op of new_ops) {
            this.verify(new_op)
        }

        let index = -1
        if (at != null) {
            index = at
        } else if (after || before) {
            for (index = this.operations.length - 1; index > -1 && this.operations[index].$tag !== (after || before); --index);
            if (index === -1) {
                throw new FormattingError('Cannot find operation with $tag of ' + (after || before))
            }
        }

        if (index >= 0) {
            if (after) {
                this.operations.splice(index + 1, 0, ...new_ops)
            } else {
                this.operations.splice(index, 0, ...new_ops)
            }
        } else {
            this.operations = this.operations.concat(new_ops)
        }

        return this
    }

    /**
     * Get the operation from this operation set
     * 
     * @param {(string|number)} id index or tag of the operations to get
     * 
     * @returns {(object|undefined)}
     * @throws {TypeError}
     */
    get(id) {
        if (typeof id === 'string') {
            id = this.getIndexByTag(id)
        } else if (typeof id !== 'number') {
            throw new TypeError('Invalid identifier. Expected number or string, got ' + typeof id)
        }

        return this.operations[id]
    }

	/**
	 * Get the index of the operation containing the given tag
	 * 
	 * @param {string} tag
	 * 
	 * @returns {number} index of operation in set, -1 if not found
	 * @throws {TypeError}
	 */
	getIndexByTag(tag) {
		if (typeof tag !== 'string') {
			throw new TypeError('Tags must be strings, does not accept ' + typeof tag)
		}

		for (let i = this.operations.length - 1; i >= 0; --i) {
			if (this.operations[i].$tag === tag) {
				return i
			}
		}

		return -1
	}

    /**
     * Apply this operation set to the given object
     * 
     * @param {object} obj object to apply changes to
     * 
     * @returns {object}
     * @throws {InvalidOperationError} when operations are formatted incorrectly
     */
    process(obj) {
        for (let op_set of this.operations) {
            for (let op of Object.keys(op_set)) {
                switch (op) {
					/**
					 * Format:
					 * 	{
					 * 		$func: function() { ... }
					 * 	}
					 */
                    case '$func':
                        if (typeof op_set[op] !== 'function') {
                            throw new InvalidOperationError('Invalid value for $func. Expected function, got ' + typeof op_set[op])
                        }

                        obj = op_set[op](obj)
                        break
					/**
					 * Format:
					 * 	{
					 * 		$set: {				// field = '' or '.' for root object
					 * 			field: value
					 * 		}
					 * 	}
					 */
                    case '$set':
                        if (typeof op_set[op] !== 'object' || Array.isArray(op_set[op])) {
                            throw new InvalidOperationError('Invalid value for $set. Expected object, got ' + typeof op_set[op])
                        }

                        Object.keys(op_set[op]).forEach(field => obj = module.exports.$set(obj, field, op_set[op][field]))
                        break
					/**
					 * Format:
					 * 	{
					 * 		$unset: [field1, field2, ...]
					 * 			OR
					 * 		$unset: field
					 * 			OR
					 * 		$unset: ''/'.'/[]
					 * 	}
					 */
                    case '$unset':
                        if (!Array.isArray(op_set[op])) {
							// Treat strings as references to the root object
							if (typeof op_set[op] === 'string') {
								obj = module.exports.$unset(obj, op_set[op])
							} else {
                            	throw new InvalidOperationError('Invalid value for $unset. Expected array or string, got ' + typeof op_set[op])
							}
                        } else {
                        	op_set[op].forEach(field => obj = module.exports.$unset(obj, field))
						}

                        break
					/**
					 * Format:
					 * 	{
					 * 		$move: {
					 * 			from: to,
					 * 			...
					 * 		}
					 * 	}
					 */
                    case '$move':
                        if (typeof op_set[op] !== 'object') {
                            throw new InvalidOperationError('Invalid value for $move. Expected object, got ' + typeof op_set[op])
                        }

                        Object.keys(op_set[op]).forEach(field => obj = module.exports.$move(obj, field, op_set[op][field]))
                        break
					/**
					 * Format:
					 * 	{
					 * 		$copy: {
					 * 			from: to,
					 * 			...
					 * 		}
					 * 	}
					 */
                    case '$copy':
                        if (typeof op_set[op] !== 'object') {
                            throw new InvalidOperationError('Invalid value for $move. Expected object, got ' + typeof op_set[op])
                        }

                        Object.keys(op_set[op]).forEach(field => obj = module.exports.$copy(obj, field, op_set[op][field]))
                        break
					/**
					 * Format:
					 * 	{
					 * 		$wrap: {
					 * 			field: 'string' || [] 	// string to wrap in object under the given field name, or array if specified
					 * 		}
					 * 			OR
					 * 		$wrap: 'string' || []		// wraps the root object
					 * 	}
					 */
                    case '$wrap':
                        if (typeof op_set[op] === 'string' || Array.isArray(op_set[op])) {
							obj = module.exports.$wrap(obj, '', op_set[op])
                        } else if (op_set[op] !== null && typeof op_set[op] === 'object') {
                        	Object.keys(op_set[op]).forEach(field => obj = module.exports.$wrap(obj, field, op_set[op][field]))
						} else {
                            throw new InvalidOperationError('Invalid value for $wrap. Expected string or object, got ' + typeof op_set[op])
						}

                        break
					/**
					 * Format:
					 * 	{
					 * 		$cast: {
					 * 			field: number|string|boolean
					 * 		}
					 * 	}
					 */
                    case '$cast':
                        if (typeof op_set[op] !== 'object') {
                            throw new InvalidOperationError('Invalid value for $cast. Expected object, got ' + typeof op_set[op])
                        }

                        Object.keys(op_set[op]).forEach(field => obj = module.exports.$cast(obj, field, op_set[op][field]))
                        break
					/**
					 * Format:
					 * 	{
					 * 		$map: {
					 * 			field: {
					 * 				'': null,		// Default value
					 * 				val1: newVal1,
					 * 				val2: newVal2,
					 * 				...
					 * 			}
					 * 		}
					 * 	}
					 */
                    case '$map':
                        if (typeof op_set[op] !== 'object') {
                            throw new InvalidOperationError('Invalid value for $map. Expected object, got ' + typeof op_set[op])
                        }

                        Object.keys(op_set[op]).forEach(field => obj = module.exports.$map(obj, field, op_set[op][field]))
                        break
					/**
					 * Format:
					 * 	{
					 * 		$tag: string
					 * 	}
					 */
                    case '$tag':
                        // Used to identify an operation set within a Gap programatically
                        break
                    default:
                        throw new InvalidOperationError('Invalid formatting operation: ' + op)
                }
            }
        }

        return obj
    }

    /**
     * Removes the operation from this op set
     * 
     * @param {(string|number)} id the index (number) or $tag (string) of the gap to remove
     * 
     * @returns {(object|undefined)} removed operation
     */
    remove(id) {
        let _op = undefined
        if (typeof id === 'string') {
            id = this.getIndexByTag(id)
        } else if (typeof id !== 'number') {
            throw new TypeError('Invalid identifier. Expected number or string, got ' + typeof id)
        }

        if (id >= 0) {
            _op = this.operations.splice(id, 1).pop()
        }

        return _op
    }

    /**
     * Verifies the format of the option set
     * TODO Do more than field checking, also check for valid value format
     * 
     * @param {object} ops operations object
     * 
     * @throws {FormattingError} when operation format is invalid
     */
    verify(ops) {
        // TODO startup verification of syntax
        for (let key in ops) {
            switch (key) {
                case '$set':
                case '$unset':
                case '$tag':
                case '$move':
                case '$copy':
                case '$cast':
                case '$wrap':
                case '$map':
                case '$func':
                    break
                default:
                    throw new FormattingError('Invalid operation: ' + key)
            }
        }
    }
}

module.exports.Set = OperationSet

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
 *  $func - a function that takes 1 parameter (the response/request object) and returns the new version
 * 	$tag - tags an update set for allowing programatic manipulation (first instance of tag is used)
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
function move(obj, from, to, __keep = false) {
	if (typeof obj !== 'object') {
		return obj
	}

	let _obj = obj
	let value
	let segs = (typeof from === 'string') ? from.split('.') : from

	// Drill down to fetch the value
	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj[seg])) {
			for (let j = 0; j < _obj[seg].length; ++j) {
				_obj[seg][j] = move(_obj[seg][j], segs.slice(i + 1, segs.length), to, __keep)
			}
			
			return _obj
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
	if (typeof field !== 'string' && !Array.isArray(field)) {
		throw new InvalidOperationError('Invalid field key for $cast. Expected string, got ' + typeof field)
	}
	if (!TYPES.includes(type)) {
		throw new InvalidOperationError('Invalid type value for $cast. Expected a value NodeJS type, got ' + typeof map)
	}
	if (typeof obj !== 'object') {
		return (field !== '' && field !== '.') ? obj : cast(obj, type)
	}

	let _obj = obj
	let segs = (typeof field === 'string') ? field.split('.') : field

	// Drill down to fetch the value
	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$cast(_obj[j], segs.slice(i + 1, segs.length), type)
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
	if (typeof from !== 'string' && !Array.isArray(from)) {
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
 * NOTE: A key of empty string represents the default value within map
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj object to map fields within
 * @param {string} field location of value in obj to map, in dot notation
 * @param {object} map map of values to apply to the field's value
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

	let _obj = obj
	let segs = (typeof field === 'string') ? field.split('.') : field

	// Drill down to fetch the value
	for (let i = 0; i < segs.length; ++i) {
		let seg = segs[i]

		if (seg === '$' && Array.isArray(_obj)) {
			for (let j = _obj.length - 1; j >= 0; --j) {
				_obj[j] = module.exports.$map(_obj[j], segs.slice(i + 1, segs.length).join('.'), map)
			}

			return obj
		} else if (i === segs.length - 1) {
			if (map[_obj[seg]] === undefined) {
				_obj[seg] = (map[''] === undefined)
								? _obj[seg]
								: map['']
			} else {
				_obj[seg] = map[_obj[seg]]
			}
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
 * NOTE: You can replace the entire object by setting field to '' or '.'
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