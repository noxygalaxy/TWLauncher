const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Registry = require('winreg');

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    resizable: false,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  createTray();
}

function getSteamPath() {
  return new Promise((resolve) => {
    const registryKey = new Registry({ hive: Registry.HKCU, key: '\\Software\\Valve\\Steam' });
    registryKey.get('SteamPath', (error, item) => {
      if (error) {
        console.error('Error getting Steam path:', error);
        resolve(null);
      } else {
        resolve(item ? item.value : null);
      }
    });
  });
}

function parseLibraryFolders(steamPath) {
  try {
    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    if (!fs.existsSync(vdfPath)) {
      console.log('libraryfolders.vdf not found at:', vdfPath);
      return {};
    }

    const content = fs.readFileSync(vdfPath, 'utf8');
    const libraryFolders = {};
    let currentFolder = null;
    let inAppsSection = false;

    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      const folderMatch = trimmedLine.match(/^"(\d+)"$/);
      if (folderMatch && !inAppsSection) {
        currentFolder = folderMatch[1];
        libraryFolders[currentFolder] = { path: '', apps: {} };
      } else if (currentFolder && trimmedLine.startsWith('"path"')) {
        const pathMatch = trimmedLine.match(/"path"\s+"(.+)"/);
        if (pathMatch) libraryFolders[currentFolder].path = pathMatch[1].replace(/\\\\/g, '\\');
      } else if (trimmedLine === '"apps"') {
        inAppsSection = true;
      } else if (trimmedLine === '}' && inAppsSection) {
        inAppsSection = false;
      } else if (inAppsSection && trimmedLine.match(/^"(\d+)"/)) {
        const appMatch = trimmedLine.match(/"(\d+)"\s+"(\d+)"/);
        if (appMatch) libraryFolders[currentFolder].apps[appMatch[1]] = appMatch[2];
      }
    });
    return libraryFolders;
  } catch (error) {
    console.error('Error parsing library folders:', error);
    return {};
  }
}

async function isSteamGameInstalled(steamPath, appId, gameFolder) {
  try {
    const directPath = path.join(steamPath, 'steamapps', 'common', gameFolder);
    if (fs.existsSync(directPath)) return true;

    const libraryFolders = parseLibraryFolders(steamPath);
    for (const folder in libraryFolders) {
      if (libraryFolders[folder].apps[appId]) {
        const gamePath = path.join(libraryFolders[folder].path, 'steamapps', 'common', gameFolder);
        if (fs.existsSync(gamePath)) return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking Steam game installation:', error);
    return false;
  }
}

async function getGamePath(gameId) {
  const appDataPath = app.getPath('appData');
  const games = {
    'tw': { steamAppId: '380840', steamGameFolder: 'Teeworlds' },
    'ddnet': { steamAppId: '412220', steamGameFolder: 'DDraceNetwork' },
    'tclient': { clientName: 'TClient' },
    'cactus': { clientName: 'Cactus' }
  };

  const gameData = games[gameId];
  if (!gameData) return false;

  if (gameData.steamAppId) {
    const steamPath = await getSteamPath();
    if (!steamPath) return false;
    return await isSteamGameInstalled(steamPath, gameData.steamAppId, gameData.steamGameFolder);
  } else if (gameData.clientName) {
    const clientPath = path.join(appDataPath, 'TWLauncher', 'clients', gameData.clientName);
    return fs.existsSync(clientPath);
  }
  return false;
}

async function buildTrayMenu() {
  try {
    const isTeeworldsInstalled = await getGamePath('tw');
    const isDdnetInstalled = await getGamePath('ddnet');
    const isTclientInstalled = await getGamePath('tclient');
    const isCactusInstalled = await getGamePath('cactus');

    console.log('Building tray menu with status:', {
      Teeworlds: isTeeworldsInstalled,
      DDraceNetwork: isDdnetInstalled,
      TClient: isTclientInstalled,
      Cactus: isCactusInstalled
    });

    const launchSubmenu = Menu.buildFromTemplate([
      { 
        label: 'Teeworlds', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'tw.png'), 
        click: () => launchGame('tw'),
        enabled: isTeeworldsInstalled
      },
      { 
        label: 'DDraceNetwork', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'ddnet.png'), 
        click: () => launchGame('ddnet'),
        enabled: isDdnetInstalled
      },
      { 
        label: 'TClient', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'tclient.png'), 
        click: () => launchGame('tclient'),
        enabled: isTclientInstalled
      },
      { 
        label: 'Cactus', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'cactus.png'), 
        click: () => launchGame('cactus'),
        enabled: isCactusInstalled
      }
    ]);

    return Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Launch', submenu: launchSubmenu },
      { label: 'Close App', click: () => {
          mainWindow.destroy();
          app.quit();
      }},
    ]);
  } catch (error) {
    console.error('Error building tray menu:', error);
    return Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Close App', click: () => {
          mainWindow.destroy();
          app.quit();
      }}
    ]);
  }
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'));
  tray.setToolTip('TWLauncher by noxygalaxy');

  tray.on('right-click', async () => {
    console.log('Tray right-clicked');
    const menu = await buildTrayMenu();
    tray.popUpContextMenu(menu);
  });

  buildTrayMenu().then(menu => {
    tray.setContextMenu(menu);
  });
}

function launchGame(id) {
  console.log(`Launching game: ${id}`);
  mainWindow.webContents.send('launch-game', id);
}

ipcMain.on('minimize-window', () => {
    mainWindow.minimize();
});
  
ipcMain.on('hide-window', () => {
    mainWindow.hide();
    tray.displayBalloon({
        title: 'TWLauncher',
        content: 'Launcher will work in background, to close it right click on the tray icon',
        icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
    });
});

ipcMain.on('launch-game', async () => {
  const menu = await buildTrayMenu();
  tray.setContextMenu(menu);
});

app.whenReady().then(() => {
  const appDataPath = app.getPath('appData');
  const clientsPath = path.join(appDataPath, 'TWLauncher', 'clients');

  if (!fs.existsSync(clientsPath)) {
    fs.mkdirSync(clientsPath, { recursive: true });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
  tray.displayBalloon({
    title: 'TWLauncher',
    content: 'Goodbye! <3',
    icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
  });
});