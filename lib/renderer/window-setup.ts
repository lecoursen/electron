import { ipcRendererInternal } from '@electron/internal/renderer/ipc-renderer-internal'

// This file implements the following APIs:
// - window.history.back()
// - window.history.forward()
// - window.history.go()
// - window.history.length
// - window.prompt()
// - document.hidden
// - document.visibilityState

const { defineProperty } = Object

export const windowSetup = (
  guestInstanceId: number, isHiddenPage: boolean
) => {
  if (guestInstanceId == null) {
    // Override default window.close.
    window.close = function () {
      ipcRendererInternal.sendSync('ELECTRON_BROWSER_WINDOW_CLOSE')
    }
  }

  // But we do not support prompt().
  window.prompt = function () {
    throw new Error('prompt() is and will not be supported.')
  }

  window.history.back = function () {
    ipcRendererInternal.send('ELECTRON_NAVIGATION_CONTROLLER_GO_BACK')
  }

  window.history.forward = function () {
    ipcRendererInternal.send('ELECTRON_NAVIGATION_CONTROLLER_GO_FORWARD')
  }

  window.history.go = function (offset: number) {
    ipcRendererInternal.send('ELECTRON_NAVIGATION_CONTROLLER_GO_TO_OFFSET', +offset)
  }

  defineProperty(window.history, 'length', {
    get: function () {
      return ipcRendererInternal.sendSync('ELECTRON_NAVIGATION_CONTROLLER_LENGTH')
    }
  })

  if (guestInstanceId != null) {
    // Webview `document.visibilityState` tracks window visibility (and ignores
    // the actual <webview> element visibility) for backwards compatibility.
    // See discussion in #9178.
    //
    // Note that this results in duplicate visibilitychange events (since
    // Chromium also fires them) and potentially incorrect visibility change.
    // We should reconsider this decision for Electron 2.0.
    let cachedVisibilityState = isHiddenPage ? 'hidden' : 'visible'

    // Subscribe to visibilityState changes.
    ipcRendererInternal.on('ELECTRON_GUEST_INSTANCE_VISIBILITY_CHANGE', function (_event, visibilityState: VisibilityState) {
      if (cachedVisibilityState !== visibilityState) {
        cachedVisibilityState = visibilityState
        document.dispatchEvent(new Event('visibilitychange'))
      }
    })

    // Make document.hidden and document.visibilityState return the correct value.
    defineProperty(document, 'hidden', {
      get: function () {
        return cachedVisibilityState !== 'visible'
      }
    })

    defineProperty(document, 'visibilityState', {
      get: function () {
        return cachedVisibilityState
      }
    })
  }
}
