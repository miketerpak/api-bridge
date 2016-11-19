'use strict'

/**
 * Testing for...
 *      - Programatically generated Gaps
 *      - Programatically generated bridges
 *      - Bridges from json file
 *      - Test request objects
 *      - Test response objects
 *      - Test reply objects
 *      - Test $move
 *      - Test $set
 *      - Test $unset
 *      - Test $cast
 *      - Test $wrap
 *      - Test $map
 *      - Test $func
 *      - Test $tag
 */

const Versioner = require('../index')
const versioner = new Versioner({ path: '' })

/**
 * Function for unit testing
 * 
 * @param {string} msg message to display for a test
 * @param {function} t a testing function which calls argument 0 on success and argument 1 on failure
 * 
 * @throws {*} on failure, messages are thrown as exceptions
 */
function test(msg, t) {
    console.info(msg)
    t(
        () => { console.info('\x1b[32m Passed \x1b[0m') },
        (err) => { throw err || 'Failed' }
    )
}

let request = {
    query: {
        q: 'elmir',
        limit: 2,
        last: 'kjn97HJoklk8'
    }
}

let response = [
    {
        "id": "B9a1eo2r8AkZ",
        "username": "elmirk",
        "full_name": "Bobby Kouliev",
        "bio": "Hello",
        "location": "New York",
        "avatar": "https://cdn.dev.fresconews.com/images/259c1e330d64806d8a417c014f6d9a30_1477073851430_avatar.jpg",
        "twitter_handle": null,
        "created_at": "2016-10-20T18:06:23.687Z",
        "suspended_until": null,
        "following_count": 4,
        "followed_count": 2
    },
    {
        "id": "ieurmghihf",
        "username": "eyoyoyo",
        "full_name": "Eyoyo Yoyo",
        "bio": "Hello",
        "location": "Ey Yooooooo Ville",
        "avatar": "https://cdn.dev.fresconews.com/images/259c1e330d64806d8a417c014f6d9a30_1477073851430_avatar.jpg",
        "twitter_handle": 'yoyo',
        "created_at": "2016-10-20T18:06:23.687Z",
        "suspended_until": null,
        "following_count": 78,
        "followed_count": 6
    }
]

test('Testing JSON configuration, $set, $unset, $wrap and $move', (pass, fail) => {
    versioner
})