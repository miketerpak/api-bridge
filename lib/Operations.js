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
     * @param {object} [procedures] reference to a bridge's procedures hash
     * 
     * @throws {FormattingError}
     */
    constructor(ops = [], procedures = {}) {
        this.operations = Array.isArray(ops) ? ops : [ops]
        this.operations.forEach(this.verify)
        this.procedures = procedures
    }

    /**
     * Add a new operation hash into the operation set
     * 
     * @param {(object|object[])} newOps operations to insert into the set
     * @param {object} options options hash
     * @param {string} options.before optional, insert before operation with the given $tag
     * @param {string} options.after optional, insert after operation with the given $tag
     * @param {integer} options.at optional, insert at this position
     * 
     * @returns {OperationSet}
     */
    add(newOps = [], { before, after, at } = {}) {
        if (typeof newOps !== 'object') {
            throw new TypeError('Invalid operations. Expected object or object array, got ' + typeof after)
        } else if (!Array.isArray(newOps)) {
            newOps = [newOps]
        }
        if (at != null && typeof at !== 'number') {
            throw new TypeError('Invalid "at" index. Expected number, got ' + typeof at)
        } else if (after && typeof after !== 'string') {
            throw new TypeError('Invalid "after" $tag. Expected string, got ' + typeof after)
        } else if (before && typeof before !== 'string') {
            throw new TypeError('Invalid "before" $tag. Expected string, got ' + typeof before)
        }
        for (let newOp of newOps) {
            this.verify(newOp)
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
                this.operations.splice(index + 1, 0, ...newOps)
            } else {
                this.operations.splice(index, 0, ...newOps)
            }
        } else {
            this.operations = this.operations.concat(newOps)
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
     * Returns true if this operation set has no operations
     * 
     * @returns {boolean}
     */
    isEmpty() {
        return this.operations.length === 0
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
        for (let opSet of this.operations) {
            for (let op of Object.keys(opSet)) {
                let _value = opSet[op]
                switch (op) {
                    /**
                     * Format:
                     *     {
                     *         $func: function() { ... }
                     *     }
                     */
                    case '$func':
                        if (typeof _value !== 'function') {
                            throw new InvalidOperationError('Invalid value for $func. Expected function, got ' + typeof _value)
                        }

                        obj = _value(obj)
                        break
                    /**
                     * Format:
                     *     {
                     *         $set: {                // field = '' or '.' for root object
                     *             field: value
                     *         }
                     *     }
                     */
                    case '$set':
                        if (typeof _value !== 'object' || Array.isArray(_value)) {
                            throw new InvalidOperationError('Invalid value for $set. Expected object, got ' + typeof _value)
                        }

                        Object.keys(_value).forEach(field => obj = module.exports.$set(obj, field, _value[field]))
                        break
                    /**
                     * Format:
                     *     {
                     *         $unset: [field1, field2, ...]
                     *             OR
                     *         $unset: field
                     *             OR
                     *         $unset: ''/'.'/[]
                     *     }
                     */
                    case '$unset':
                        if (!Array.isArray(_value)) {
                            // Treat strings as references to the root object
                            if (typeof _value === 'string') {
                                obj = module.exports.$unset(obj, _value)
                            } else {
                                throw new InvalidOperationError('Invalid value for $unset. Expected array or string, got ' + typeof _value)
                            }
                        } else {
                            _value.forEach(field => obj = module.exports.$unset(obj, field))
                        }

                        break
                    /**
                     * Format:
                     *     {
                     *         $move: {
                     *             from: to,
                     *             ...
                     *         }
                     *     }
                     */
                    case '$move':
                        if (typeof _value !== 'object') {
                            throw new InvalidOperationError('Invalid value for $move. Expected object, got ' + typeof _value)
                        }

                        Object.keys(_value).forEach(field => obj = module.exports.$move(obj, field, _value[field]))
                        break
                    /**
                     * Format:
                     *     {
                     *         $copy: {
                     *             from: to,
                     *             ...
                     *         }
                     *     }
                     */
                    case '$copy':
                        if (typeof _value !== 'object') {
                            throw new InvalidOperationError('Invalid value for $move. Expected object, got ' + typeof _value)
                        }

                        Object.keys(_value).forEach(field => obj = module.exports.$copy(obj, field, _value[field]))
                        break
                    /**
                     * Format:
                     *     {
                     *         $wrap: {
                     *             field: 'string' || []     // string to wrap in object under the given field name, or array if specified
                     *         }
                     *             OR
                     *         $wrap: 'string' || []        // wraps the root object
                     *     }
                     */
                    case '$wrap':
                        if (typeof _value === 'string' || Array.isArray(_value)) {
                            obj = module.exports.$wrap(obj, '', _value)
                        } else if (_value !== null && typeof _value === 'object') {
                            Object.keys(opSet[op]).forEach(field => obj = module.exports.$wrap(obj, field, _value[field]))
                        } else {
                            throw new InvalidOperationError('Invalid value for $wrap. Expected string or object, got ' + typeof _value)
                        }

                        break
                    /**
                     * Format:
                     *     {
                     *         $cast: {
                     *             field: number|string|boolean
                     *         }
                     *     }
                     */
                    case '$cast':
                        if (typeof _value !== 'object') {
                            throw new InvalidOperationError('Invalid value for $cast. Expected object, got ' + typeof _value)
                        }


                        Object.keys(_value).forEach(field => {
							obj = OperationSet.applyOperationAt(module.exports.$cast, obj, field, [_value[field]])
							// obj = module.exports.$cast(obj, field, _value[field])
						})
                        break
                    /**
                     * Format:
                     *     {
                     *         $map: {
                     *             field: {
                     *                 '': null,        // Default value
                     *                 val1: newVal1,
                     *                 val2: newVal2,
                     *                 ...
                     *             }
                     *         }
                     *     }
                     */
                    case '$map':
                        if (typeof _value !== 'object') {
                            throw new InvalidOperationError('Invalid value for $map. Expected object, got ' + typeof _value)
                        }

                        Object.keys(_value).forEach(field => obj = module.exports.$map(obj, field, _value[field]))
                        break
                    /**
                     * Format:
                     *     {
                     *         $procedures: string
                     * 
                     *         OR
                     * 
                     *         $proc: {
                     *             'path.to.field': 'procedure'
                     *         }
                     * 
                     *         OR
                     * 
                     *         $proc: {
                     *             'path.to.field': ['procedure1', 'procedure2']
                     *         }
                     *     }
                     */
                    case '$procedures':
                        // handle alias of { $proc: 'procedure' } => { $proc: { '.': ['procedure'] } }
                        if (typeof _value === 'string') _value = { '.': _value }
                        if (typeof _value !== 'object') {
                            throw new InvalidOperationError('Invalid value for $procedures. Expected string or object, got ' + typeof _value)
                        }

                        Object.keys(_value).forEach(_path => {
                            let _procs = _value[_path]
                            if (!Array.isArray(_procs)) _procs = [_procs]
                            _procs.forEach(_proc => {
                                if (!this.procedures[_proc]) {
                                    throw new InvalidOperationError('No such procedure: ' + _proc)
                                } else {
                                    obj = OperationSet.applySet(this.procedures[_proc], obj, _path)
                                }
                            })
                        })
                        break
                    case '$tag':
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
     * Reset the stored procedures used by this operation set to the given procedure set
     * 
     * @param {object} procedures the new procedure set (format { [procedureName]: <OperationSet> })
     */
    resetProcedures(procedures) {
        this.procedures = procedures
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
                case '$procedures':
                    break
                default:
                    throw new FormattingError('Invalid operation: ' + key)
            }
        }
    }
}

/**
 * Apply an operation set to the field of a given object
 * 
 * @param {OperationSet} opSet the operations to perform on the object
 * @param {object} obj the object to perform the operations on
 * @param {(string|string[])} [keys=] the field on the object to perform the operations on as period-delimited keys
 *
 * @returns {object} mutated `obj` argument
 * @throws {TypeError}
 */
OperationSet.applySet = function(opSet, obj, keys = '') {
    if (!(opSet instanceof OperationSet)) {
        throw new TypeError('Invalid operation set')
    }
    if (typeof obj !== 'object') { // NOTE 'object' includes arrays, too
        return obj
    }

    if (!Array.isArray(keys)) {
        keys = String(keys).split('.').filter(k => (k !== ''))
    }

    let _keys = keys.slice(1, keys.length)
    if (keys.length === 0) {
        return opSet.process(obj)
    } else if (keys[0] === '$' && Array.isArray(obj)) {
        return obj.map(o => {
            return OperationSet.applySet(opSet, o, _keys)
        })
    } else {
        let key = keys[0]
        if (keys.length === 1) {
            obj[key] = opSet.process(obj[key])
        } else {
            obj[key] = OperationSet.applySet(opSet, obj[key], _keys)
        }

        return obj
    }
}

/**
 * Apply an operation to the specified field within an object
 * 
 * @param {function} op operation to apply (requires parameter structure of [obj, field, ...])
 * @param {any} obj
 * @param {(string|string[])} keys
 * @param {any[]} arg arguments to pass to the given operation
 * 
 * @returns {any}
 * @throws {TypeError}
 */
OperationSet.applyOperationAt = function(op, obj, keys = [], args = []) {
    if (typeof op !== 'function') {
        throw new TypeError('Invalid operation')
    }
    if (typeof obj !== 'object' && keys.length > 0) { // NOTE 'object' includes arrays, too
        return obj
    }

    if (!Array.isArray(args)) {
		args = [args]
	}
    if (!Array.isArray(keys)) {
        keys = String(keys).split('.').filter(k => (k !== ''))
    }

	// Get next steps in field traversal
    let _keys = keys.slice(1, keys.length)
	let _key = keys[0]

    if (_key === '$' && Array.isArray(obj)) {
        obj = obj.map(o => {
            return OperationSet.applyOperationAt(op, o, _keys, args)
        })
    } else if (keys.length === 0) {
		obj = op(obj, '', ...args)
	} else if (keys.length === 1) {
		obj = op(obj, _key, ...args)
	} else {
        obj[_key] = OperationSet.applyOperationAt(op, obj[_key], _keys, args)
    }

	return obj
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
 * 	$procedures - list of stored bridge procedures to apply in this opset
 *  $func - a function that takes 1 parameter (the response/request object) and returns the new version
 *  $tag - tags an update set for allowing programatic manipulation (first instance of tag is used)
 */

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
module.exports.$cast = (obj, field = '', type) => {
    if (typeof field !== 'string') {
        throw new InvalidOperationError('Invalid field key for $cast. Expected string, got ' + typeof field)
    }
    if (!TYPES.includes(type)) {
        throw new InvalidOperationError('Invalid type value for $cast. Expected a value NodeJS type, got ' + typeof map)
    }
	if (obj === undefined) {
		// return undefined, cannot cast nothing
		return
	}
	if (field) {
		if (typeof obj !== 'object') return obj // abort if obj should be an object, but isnt
		// if field is specified, re-call $cast on specified field
		obj[field] = module.exports.$cast(obj[field], '', type)
		return obj
	}
	if (type === 'number') {
        return isNaN(obj) ? null : Number(obj)
    }
	if (type === 'string') {
        return String(obj)
    }
	if (type === 'boolean') {
        return Boolean(obj)
    }

	// never happens as long as TYPES includes type
	return obj
}

/**
 * Copy the value from and to their drilled down positions
 * NOTE: This function mutates the 'obj' parameter
 * 
 * @param {object} obj object to copy fields within
 * @param {string} from location of value to copy, in dot notation
 * @param {string} to location of where to paste value, in dot notation
 * @param {boolean} [__keepSource=true] if false, performs a $move, deleting the source value
 * 
 * @returns {object}
 * @throws {InvalidOperationError}
 */
module.exports.$copy = (obj, fromKeys = [], toKeys = [], __keepSource = true) => {
    if (!Array.isArray(fromKeys)) {
        throw new InvalidOperationError('Invalid from key for $move. Expected string, got ' + typeof from)
    }
    if (!Array.isArray(toKeys)) {
		throw new InvalidOperationError('Invalid to key for $move. Expected string, got ' + typeof to)
    }

    if (typeof obj !== 'object') {
        return obj
    }

	if (toKeys.length === 0) {
		return 
	}

	let _obj, clipboard
	clipboard = _obj = obj

/**
 * TODO
 * 	- Figure out a way to allow things like $copy(obj, ['field'], []) and $copy(obj, ['sub', field'], ['sub'])
 */

	// this loop goes through all common object keys (i.e. data.user.firstname & data.user.name.first => firstname & name.first, _obj = obj.data.user)
	// once all common fields are removed, then fetches value to copy/move
	for (let trimming = true, i = 0; i < fromKeys.length; ++i) {
		let fromKey = fromKeys[i]
		if (trimming && fromKey === toKeys[i]) {
			clipboard = _obj = _obj[fromKey]
			if (typeof _obj !== 'object') {
				// if the field being copied from does not exist, abort
				return obj
			}
			toKeys.shift() // normalize destination keys
		} else {
			trimming = false // stop trimming the like fields

			if (i === fromKeys.length - 1) {
				let tmp = clipboard[fromKey]
				delete clipboard[fromKey]
				clipboard = tmp
			} else {
				clipboard = clipboard[fromKey]
				if (typeof clipboard !== 'object') {
					// if the field being copied from does not exist, abort
					return obj
				}
			}
		}
	}

	// clipboard now contains data to be copied

	for (let i = 0; i < toKeys.length - 1; ++i) {
		let toKey = toKeys[i]
		if (typeof _obj[toKey] !== 'object' || Array.isArray(_obj[toKey])) {
			console.warn('api-bridge > WARNING! Attempting to call $move on invalid field ' + toKey);
			console.warn('api-bridge > Existing field will be overwritten by the $move operation')
			_obj[toKey] = {}
		}
		if (i === toKeys.length - 1) {
			_obj[toKey] = clipboard
		} else {
			_obj = _obj[toKey]
		}
	}

	return obj
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
module.exports.$map = (obj, field = '', map = {}) => {
    if (typeof field !== 'string') {
        throw new InvalidOperationError('Invalid field key for $map. Expected string, got ' + typeof field)
    }
    if (typeof map !== 'object') {
        throw new InvalidOperationError('Invalid map key for $map. Expected object, got ' + typeof map)
    }
	if (field) {
		if (typeof obj !== 'object') return obj // abort if obj should be an object, but isnt
		// if field is specified, re-call $cast on specified field
		obj[field] = module.exports.$map(obj[field], '', map)
		return obj
	}

	// return mapped value or default (mapped value at key = '')
	return map[obj] === undefined ? map[''] : map[obj]
}

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

    return module.exports.$copy(obj, from, to, false)
}

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
        throw new InvalidOperationError('Invalid field key for $set. Expected string, got ' + typeof field)
    }
	if (field) {
		if (typeof obj !== 'object') return obj // abort if obj should be an object, but isnt
		// if field is specified, re-call $set on specified field
		obj[field] = module.exports.$set(obj[field], '', value)
		return obj
	}

	return value
}

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
        throw new InvalidOperationError('Invalid field key for $unset. Expected string, got ' + typeof field)
    }
	if (field) {
		if (typeof obj !== 'object') return obj // abort if obj should be an object, but isnt
		delete obj[field]
		return obj
	}
}

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
module.exports.$wrap = (obj, field = '', wrapper) => {
    if (typeof field !== 'string') {
        throw new InvalidOperationError('Invalid field key for $wrap. Expected string, got ' + typeof field)
    }
    if (typeof wrapper !== 'string' && !Array.isArray(wrapper)) {
        throw new InvalidOperationError('Invalid value for $wrap. Expected string or array, got ' + typeof wrapper)
    }
	if (field) {
		if (typeof obj !== 'object') return obj // abort if obj should be an object, but isnt
		// if field is specified, re-call $cast on specified field
		obj[field] = module.exports.$wrap(obj[field], '', wrapper)
		return obj
	}

	// return mapped value or default (mapped value at key = '')
	return (typeof wrapper === 'string') ? { [wrapper]: obj } : [obj]
}