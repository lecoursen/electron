const EventEmitter = require('events').EventEmitter

let ipcFilters = [];

class IPCMain extends EventEmitter {
  constructor() {
    super()
    // Do not throw exception when channel name is "error".
    this.on('error', () => {})
  }

  removeAllListeners(...args) {
    if (args.length === 0) {
      throw new Error('Removing all listeners from ipcMain will make Electron internals stop working.  Please specify a event name')
    }
    super.removeAllListeners(...args)
  }

  addFilter(fn) {
    if (!ipcFilters.some(testFunction => testFunction === fn)) {
      ipcFilters.push(fn)
    }
  }

  removeFilter(fn) {
    ipcFilters = ipcFilters.filter(testFunction => testFunction === fn)
  }

  getFilters() {
    return Object.freeze([].concat(ipcFilters))
  }
}

module.exports = new IPCMain()
