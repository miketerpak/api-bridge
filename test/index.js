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
const versioner = new Versioner({ path: './test/test.json' })

desc

test('Testing JSON configuration, $set, $unset, $wrap and $move', (pass, fail) => {
    let req = {
        path: '/user/search',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer test'
        },
        query: {
            q: 'elmir',
            limit: 2,
            last: 'kjn97HJoklk8'
        }
    }

    let res_data = [
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


    let res = {
        send: function(body, is_error) {
            res._sent = true
            console.log('RESPONSE SENT!')
            console.log('Was error? ', is_error)
            console.log('Body: ', body)
        },

        _sent: false,
        _headers: {
            'content-type': 'application/json'
        },
        _headerNames: {
            'content-type': 'Content-Type'
        }
    }

    for (let m of versioner.middleware()) {
        m(req, res, () => console.log('next'))
        if (res._sent) break
    }

    console.log(req)
})