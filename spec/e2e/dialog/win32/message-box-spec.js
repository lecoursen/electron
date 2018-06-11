const { remote } = require('electron');

writeResult(remote.dialog.showMessageBox({
  type: 'none',
  title: 'None Test',
  message: 'None Test Content'
}));

writeResult(remote.dialog.showMessageBox({
  type: 'info',
  title: 'Info Test',
  message: 'Info Test Content'
}));

writeResult(remote.dialog.showMessageBox({
  type: 'error',
  title: 'Error Test',
  message: 'Error Test Content'
}));

writeResult(remote.dialog.showMessageBox({
  type: 'warning',
  title: 'Warning Test',
  message: 'Warning Test Content'
}));
