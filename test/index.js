'use strict'

const Gap = require('../lib/Gap')

let gap = new Gap({
    "path": "/user/search",
    "method": "get",
    
    "request": {
        "query": [
            {
                "$set": {
                    "pagination": {}
                }
            },
            {
                "$move": {
                    "limit": "pagination.limit",
                    "last": "pagination.last"
                }
            }
        ]
    },
    "response": {
        "body": [
            {
                "$unset": ["$.following_count", "$.followed_count"],
                "$set": {
                    "$.object": "user"
                }
            },
            {
                "$wrap": {
                    ".": "data"
                }
            }
        ]
    }
})

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

console.log('####################################################################')
console.log()
console.log('Unformatted request: ')
console.log(JSON.stringify(request, null, 4))

gap.applyToRequest(request)

console.log()
console.log()
console.log('Formatted request: ')
console.log(JSON.stringify(request, null, 4))

console.log('####################################################################')
console.log()
console.log('Unformatted response: ')
console.log(JSON.stringify(response, null, 4))

response = gap.applyToResponse(response)

console.log()
console.log()
console.log('Formatted response: ')
console.log(JSON.stringify(response, null, 4))