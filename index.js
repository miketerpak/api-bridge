'use strict'

// TODO left of debugging $move with the following code

// let a = {
// 	data: [
// 		{
// 			id: "Zb485MBbN8xo",
// 			tags: [
// 				"postruth",
// 				"fresco"
// 			],
// 			location: [
// 				-74.0059413,
// 				40.7127837
// 			],
// 			rating: "highlighted",
// 			is_nsfw: 0,
// 			created_at: "2016-11-16T22:58:43.177Z",
// 			posts: [
// 				{
// 					id: "11111111",
// 					width: 1920,
// 					height: 1080,
// 					captured_at: null,
// 					blocked: false,
// 					object: "post"
// 				},
// 				{
// 					id: "22222222",
// 					width: 8,
// 					height: 56,
// 					captured_at: null,
// 					blocked: false,
// 					object: "post"
// 				}
// 			]
// 		}
// 	]
// }

// // Built-in formatting operations
// const OPERATIONS = {

//     /**
//      * Copy the value from and to their drilled down positions
//      * NOTE: This function mutates the 'obj' parameter
//      * 
//      * TODO should the function throw errors if the to/from fields don't exist on obj
//      * 
//      * @param {object} obj object to move fields within
//      * @param {string} from location of value to copy
//      * @param {string} to location of where to paste value
//      * 
//      * @returns {object}
//      * @throws {InvalidOperationError}
//      */
//     move: (obj, from, to) => {
//         if (typeof from !== 'string') {
//             throw new InvalidOperationError('Invalid from key for $move. Expected string, got ' + typeof from)
//         }
//         if (typeof to !== 'string') {
//             throw new InvalidOperationError('Invalid to key for $move. Expected string, got ' + typeof to)
//         }
//         if (typeof obj !== 'object') {
//             return obj
//         }

//         let segs = from.split('.')
//         let _obj = obj
//         let value

//         // Drill down to fetch the value
//         for (let i = 0; i < segs.length; ++i) {
//             let seg = segs[i]

//             if (seg === '$') {
//                 throw InvalidOperationError('Cannot use $ iterator in keys of $move')
//             } else if (i === segs.length - 1) {
//                 value = obj[seg]
//                 delete obj[seg]
//             } else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
//                 _obj = _obj[seg]
//             } else {
// console.log(_obj, seg)
//                 // TODO throw error here?
//                 break
//             }
//         }

//         return OPERATIONS.$set(obj, to, value)
//     },

//     /**
//      * Set the drilled down field on the object to a value
//      * NOTE: This function mutates the 'obj' parameter
//      * 
//      * @param {object} obj the object to mutate
//      * @param {string} field dot-notation field to update on object
//      * @param {*} value value which to set field to
//      * 
//      * @returns {object}
//      * @throws {InvalidOperationError}
//      */
//     $set: (obj, field = '', value) => {
//         if (typeof field !== 'string') {
//             throw new InvalidOperationError('Invalid value for $set. Expected string, got ' + typeof field)
//         }
//         if (field === '' || field === '.') {
//             return value
//         }
//         if (typeof obj !== 'object') {
//             return obj
//         }

//         let segs = field.split('.')
//         let _obj = obj

//         for (let i = 0; i < segs.length; ++i) {
//             let seg = segs[i]

//             if (seg === '$' && Array.isArray(_obj)) {
//                 for (let j = _obj.length - 1; j >= 0; --j) {
//                     _obj[j] = OPERATIONS.$set(_obj[j], segs.slice(i + 1, segs.length).join('.'), value)
//                 }

//                 return obj
//             } else if (i === segs.length - 1) {
//                 _obj[seg] = value
//             } else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
//                 _obj = _obj[seg]
//             } else {
//                 // TODO throw error here?
//                 break
//             }
//         }

//         return obj
//     },

//     /**
//      * Unset the drilled down field on the object to a value
//      * NOTE: This function mutates the 'obj' parameter
//      * 
//      * @param {object} obj the object to mutate
//      * @param {string} field dot-notation field to update on object
//      * 
//      * @returns {object}
//      * @throws {InvalidOperationError}
//      */
//     $unset: (obj, field = '') => {
//         if (typeof field !== 'string') {
//             throw new InvalidOperationError('Invalid value for $unset. Expected string, got ' + typeof field)
//         }
//         if (field === '' || field === '.') {
//             return
//         }
//         if (typeof obj !== 'object') {
//             return obj
//         }

//         let segs = field.split('.')
//         let _obj = obj

//         for (let i = 0; i < segs.length; ++i) {
//             let seg = segs[i]

//             if (seg === '$' && Array.isArray(_obj)) {
//                 for (let j = _obj.length - 1; j >= 0; --j) {
//                     _obj[j] = OPERATIONS.$unset(_obj[j], segs.slice(i + 1, segs.length).join('.'))
//                 }

//                 return obj
//             } else if (i === segs.length - 1) {
//                 delete _obj[seg]
//             } else if (typeof _obj[seg] === 'object') { // NOTE this works for objects AND arrays
//                 _obj = _obj[seg]
//             } else {
//                 // TODO throw error here?
//                 break
//             }
//         }

//         return obj
//     }
// }

// OPERATIONS.$move(a, 'data.0.posts', 'posts');
// console.log(a)

// [
// 	{
// 		"$wrap": {
// 			"": "data"
// 		}
// 	},
// 	{
// 		"$unset": ["data.$.owner_id"],
// 		"$set": {
// 			"data.$.posts.$.blocked": false
// 		},
// 		"$move": {
// 			"data.$.location.coordinates[0]": "data.$.location"
// 		},
// 		"$cast": {
// 			"data.$.is_nsfw": "boolean"
// 		},
// 		"$map": {
// 			"data.$.rating": {
// 				"0": "unrated",
// 				"1": "skipped",
// 				"2": "verified",
// 				"3": "highlighted"
// 			}
// 		}
// 	}
// ]


const Bridge = require('lib/Bridge')
const InvalidOperationError = require('lib/InvalidOperationError')

module.exports

module.exports.Bridge = Bridge
module.exports.InvalidOperationError = InvalidOperationError