'use strict'

const { BrowserWindow, webContents } = require('electron')
const { ipcMainInternal } = require('@electron/internal/browser/ipc-main-internal')

const hasProp = {}.hasOwnProperty
const frameToGuest = new Map()

// Security options that child windows will always inherit from parent windows
const inheritedWebPreferences = new Map([
  ['contextIsolation', true],
  ['javascript', false],
  ['nodeIntegration', false],
  ['enableRemoteModule', false],
  ['sandbox', true],
  ['webviewTag', false],
  ['nodeIntegrationInSubFrames', false]
])

// Copy attribute of |parent| to |child| if it is not defined in |child|.
const mergeOptions = function (child, parent, visited) {
  // Check for circular reference.
  if (visited == null) visited = new Set()
  if (visited.has(parent)) return

  visited.add(parent)
  for (const key in parent) {
    if (key === 'isBrowserView') continue
    if (!hasProp.call(parent, key)) continue
    if (key in child && key !== 'webPreferences') continue

    const value = parent[key]
    if (typeof value === 'object') {
      child[key] = mergeOptions(child[key] || {}, value, visited)
    } else {
      child[key] = value
    }
  }
  visited.delete(parent)

  return child
}

// Merge |options| with the |embedder|'s window's options.
const mergeBrowserWindowOptions = function (embedder, options) {
  if (options.webPreferences == null) {
    options.webPreferences = {}
  }
  if (embedder.browserWindowOptions != null) {
    let parentOptions = embedder.browserWindowOptions

    // if parent's visibility is available, that overrides 'show' flag (#12125)
    const win = BrowserWindow.fromWebContents(embedder.webContents)
    if (win != null) {
      parentOptions = { ...embedder.browserWindowOptions, show: win.isVisible() }
    }

    // Inherit the original options if it is a BrowserWindow.
    mergeOptions(options, parentOptions)
  } else {
    // Or only inherit webPreferences if it is a webview.
    mergeOptions(options.webPreferences, embedder.getLastWebPreferences())
  }

  // Inherit certain option values from parent window
  const webPreferences = embedder.getLastWebPreferences()
  for (const [name, value] of inheritedWebPreferences) {
    if (webPreferences[name] === value) {
      options.webPreferences[name] = value
    }
  }

  return options
}

// Setup a new guest with |embedder|
const setupGuest = function (embedder, frameName, guest, options) {
  // When |embedder| is destroyed we should also destroy attached guest, and if
  // guest is closed by user then we should prevent |embedder| from double
  // closing guest.
  const guestId = guest.webContents.id
  const closedByEmbedder = function () {
    guest.removeListener('closed', closedByUser)
    guest.destroy()
  }
  const closedByUser = function () {
    embedder._sendInternal('ELECTRON_GUEST_WINDOW_MANAGER_WINDOW_CLOSED_' + guestId)
    embedder.removeListener('current-render-view-deleted', closedByEmbedder)
  }
  embedder.once('current-render-view-deleted', closedByEmbedder)
  guest.once('closed', closedByUser)
  if (frameName) {
    frameToGuest.set(frameName, guest)
    guest.frameName = frameName
    guest.once('closed', function () {
      frameToGuest.delete(frameName)
    })
  }
  return guestId
}

// Create a new guest created by |embedder| with |options|.
const createGuest = function (embedder, url, frameName, options) {
  let guest = frameToGuest.get(frameName)
  if (frameName && (guest != null)) {
    guest.loadURL(url)
    return guest.webContents.id
  }

  // Remember the embedder window's id.
  if (options.webPreferences == null) {
    options.webPreferences = {}
  }

  guest = new BrowserWindow(options)
  if (!options.webContents) {
    // We should not call `loadURL` if the window was constructed from an
    // existing webContents (window.open).
    //
    // Navigating to the url when creating the window from an existing
    // webContents is not necessary (it will navigate there anyway).
    guest.loadURL(url)
  }

  return setupGuest(embedder, frameName, guest, options)
}

const getGuestWindow = function (guestContents) {
  let guestWindow = BrowserWindow.fromWebContents(guestContents)
  if (guestWindow == null) {
    const hostContents = guestContents.hostWebContents
    if (hostContents != null) {
      guestWindow = BrowserWindow.fromWebContents(hostContents)
    }
  }
  return guestWindow
}

// Routed window.open messages with fully parsed options
ipcMainInternal.on('ELECTRON_GUEST_WINDOW_MANAGER_INTERNAL_WINDOW_OPEN', function (event, url, referrer,
  frameName, disposition, options) {
  options = mergeBrowserWindowOptions(event.sender, options)
  event.sender.emit('new-window', event, url, frameName, disposition, options, '', referrer)
  const { newGuest } = event
  if ((event.sender.isGuest() && event.sender.getLastWebPreferences().disablePopups) || event.defaultPrevented) {
    if (newGuest != null) {
      if (options.webContents === newGuest.webContents) {
        // the webContents is not changed, so set defaultPrevented to false to
        // stop the callers of this event from destroying the webContents.
        event.defaultPrevented = false
      }
      event.returnValue = setupGuest(event.sender, frameName, newGuest, options)
    } else {
      event.returnValue = null
    }
  } else {
    event.returnValue = createGuest(event.sender, url, frameName, options)
  }
})
