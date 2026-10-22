const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const LIVE_URL = 'https://tejawmd.github.io/SalesDashboard/';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 420,
    minHeight: 500,
    title: 'Sales & Collection Dashboard',
    backgroundColor: '#070b19',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../public/app-icon.jpg'),
  });

  // Load the live deployed GitHub Pages dashboard so every push updates automatically
  mainWindow.loadURL(LIVE_URL).catch((err) => {
    console.warn('Could not load live URL, falling back to local build:', err);
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  // Optional: keep menu bar hidden for an app-like clean TV/desktop view
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
