'use strict'

const assert = require('assert')
const Gap = require('../lib/Gap')

describe('Gap', function() {
    let gap_respond = new Gap({
        path: '/user',
        method: 'GET',

        request: {
            params: {

            },
            query: {

            },
            body: {

            },
            headers: {

            }
        },
        response: {
            body: {

            },
            headers: {

            },
            status: 200
        },
        error: {
            body: {

            },
            headers: {

            },
            status: {

            }
        }
    })
    let gap_reply = new Gap({
        path: '/user',
        method: 'post',
        reply: {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            },
            body: '{"error":"not-found","code":404}'
        }
    })

    describe('#test', function() {
        it('should match paths with URL params', function() {
            let _gap = new Gap({
                path: '/user/*/update',
                method: 'put'
            })

            assert.equal(_gap.test('PUT', '/user/barry/update'), true)
            assert.equal(_gap.test('put', '/user/barry%20jones/update'), true)
            assert.equal(_gap.test('PUT', '/user/barry+jones/update'), true)
            assert.equal(_gap.test('PUT', '/user/update'), false)
            assert.equal(_gap.test('POST', '/user/barry/update'), false)
            assert.equal(_gap.test('PUT', '/user/barry/jones/update'), false)
        })
    })

    describe('#shouldReply', function() {
        // Mock ExpressJS response object
        let res = {
            _status: -1,
            _headers: {},
            _body: null,

            status: code => res._status = code,
            set: (name, val) => {
                if (typeof name === 'object'){
                    for (let key in name) res._headers[key] = name[key]
                } else {
                    res._headers[name] = val
                }
            },
            send: body => res._body = body,
            end: () => {}
        }

        it('should return false if `reply` is not set', function() {
            assert.equal(gap_respond.shouldReply(res), false)
            assert.equal(res._status, -1)
            assert.equal(res._body, null)
            assert.equal(Object.keys(res._headers).length, 0)
        })
        it('should send a response, since reply is set', function() {
            assert.equal(gap_reply.shouldReply(res), true)
            assert.equal(res._status, 404)
            assert.equal(res._body, '{"error":"not-found","code":404}')
            assert.equal(Object.keys(res._headers).length, 1)
            assert.equal(res._headers['Content-Type'], 'application/json')
        })
    })

    describe('#addOperation', function() {
        let _gap = new Gap({
            path: '/test',
            method: 'get',
            request: {
                body: [
                    { $move: { that: 'there' } },
                    { $tag: 'first', $set: { eyy: 'ohh' } },
                    { $tag: 'third', $unset: ['eyy'] }
                ]
            }
        })

        it('should add a step to the end of the steps array', function() {
            _gap.request('body').add({ $tag: 'fifth', $set: { eyy: 'ohh' } })
            assert.equal(_gap.request('body').get(3).$tag, 'fifth')
        })
        it('should add a step after the step tagged "first"', function() {
            _gap.request('body').add({ $tag: 'second', $set: { eyy: 'ohh' } }, { after: 'first' })
            assert.equal(_gap.request('body').get(2).$tag, 'second')
        })
        it('should add a step before the step tagged "fifth"', function() {
            _gap.request('body').add({ $tag: 'fourth', $set: { eyy: 'ohh' } }, { before: 'fifth' })
            assert.equal(_gap.request('body').get(4).$tag, 'fourth')
        })
    })
})