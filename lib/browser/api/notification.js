'use strict'

// const { EventEmitter } = require('events')
const { createNotification, isSupported } = process.electronBinding('notification')

module.exports = class Notification {
  constructor (...args) {
    return createNotification(...args)
  }
  static isSupported () {
    return isSupported()
  }
}
