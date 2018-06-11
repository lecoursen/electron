const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0
  })

  mainWindow.loadURL(`${path.resolve(__dirname, 'harness.html')}?spec=${process.argv[2]}`);
})
