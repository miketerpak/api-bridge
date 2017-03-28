'use strict'

class Trie {

    constructor(delim = '/') {
        this.head = Trie.Node()
        this.delim = delim
    }

    insert() {

    }

    find(key) {
        if (!Array.isArray(key)) {
            key = [key]
        }

        let cursor = this.head
        for (let i = 0; i < key.length; ++i) {
            if (cursor.next[key[i]] === undefined) {
                cursor.next[key[i]] = Trie.Node(key[i])
            }
            if (i === key.length - 1) {
                
            }
        }
    }

    static Node(key = null, data = [], next = {}) {
        let test = 
        return { key, test, data, next }
    }
}

module.exports = Trie