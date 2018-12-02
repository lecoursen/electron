'use strict'

class EventEmitter {
  on (event, listener) {
    this.addListener(event, listener)
  }

  off (event, listener) {
    this.removeListener(event, listener)
  }

  once (event, listener) {
    this.addListener(event, (...args) => {
      this.removeListener(event, listener)
      listener(...args)
    })
  }

  addListener (event, listener) {
    this.listeners(event).push(listener)
  }

  removeListener (event, listener) {
    const listeners = this.listeners(event)
    let i = listeners.length
    while (i--) {
      if (listeners[i] === listener) {
        listeners.splice(i, 1)
      }
    }
  }

  removeAllListeners (event) {
    if (event) {
      this.listeners(event).length = 0
    } else {
      this._listeners = new Map()
    }
  }

  prependListener (event, listener) {
    this.listeners(event).unshift(listener)
  }

  prependOnceListener (event, listener) {
    this.prependListener(event, (...args) => {
      this.removeListener(event, listener)
      listener(...args)
    })
  }

  emit (event, ...args) {
    for (const listener of [...this.listeners(event)]) {
      try {
        listener(...args)
      } catch (e) {
        // ignore
      }
    }
  }

  listeners (event) {
    this._listeners = this._listeners || new Map()

    if (!this._listeners.has(event)) {
      this._listeners.set(event, [])
    }

    return this._listeners.get(event)
  }
}

module.exports = EventEmitter
