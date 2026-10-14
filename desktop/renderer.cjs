'use strict';
document.querySelector('#external').addEventListener('click', () => {
  window.mathCuratorDesktop.openExternal();
});
document.querySelector('#integrated').addEventListener('click', () => {
  window.mathCuratorDesktop.openIntegrated();
});
