const { app, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Registry = require('winreg');
const DiscordRPC = require('discord-rpc');

let mainWindow;
let tray = null;
let loadingWindow;

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const clientId = process.env.DISCORD_CLIENT_ID;
if (!clientId) {
  console.error('DISCORD_CLIENT_ID not found in .env file. Discord RPC will not work.');
}

const rpc = new DiscordRPC.Client({ transport: 'ipc' });
let rpcReady = false;

if (clientId) {
  DiscordRPC.register(clientId);

  rpc.on('ready', () => {
    console.log('Discord RPC is ready');
    rpcReady = true;
    updateDiscordActivity();
  });

  rpc.on('error', (err) => {
    console.error('Discord RPC error:', err);
  });

  rpc.login({ clientId }).catch(console.error);
}

function updateDiscordActivity(clientId = 'tw', theme = 'default') {
  if (!rpcReady) return;
  rpc.setActivity({
    details: `Using ${theme} theme`,
    state: `On ${clientId} Client Page`,
    startTimestamp: Math.floor(Date.now() / 1000),
    largeImageKey: 'twl_main',
    largeImageText: '@noxygalaxy',
    instance: false,
  });
  console.log(`Discord activity updated for ${clientId} with ${theme} theme`);
}

const configPath = path.join(app.getPath('appData'), 'TWLauncher', 'twlconfig.json');
let config = {
  installPath: path.join(app.getPath('appData'), 'TWLauncher', 'clients'),
  theme: 'default',
  streamerMode: false,
  enableTransitions: true,
  enableSounds: true,
};

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  loadingWindow.loadFile('src/load.html');
  loadingWindow.center();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
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
  mainWindow.openDevTools();
  mainWindow.once('ready-to-show', async () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
    mainWindow.webContents.send('apply-theme', config.theme);
    
    const gameStatuses = await getAllGameStatuses();
    mainWindow.webContents.send('initial-game-statuses', gameStatuses);
    
    createTray();
    initializeDiscordRPC();
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
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

async function getAllGameStatuses() {
  const gameIds = ['tw', 'ddnet', 'tclient', 'cactus'];
  const statuses = {};
  for (const gameId of gameIds) {
    const isInstalled = await getGamePath(gameId);
    statuses[gameId] = isInstalled;
  }
  return statuses;
}

async function buildTrayMenu() {
  try {
    return Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
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

function initializeDiscordRPC() {
  const DiscordRPC = require('discord-rpc');
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return;

  const rpc = new DiscordRPC.Client({ transport: 'ipc' });
  let retryCount = 0;
  const maxRetries = 3;

  function attemptConnection() {
    rpc.login({ clientId })
      .then(() => {
        console.log('Discord RPC connected');
        rpc.on('ready', () => updateDiscordActivity());
      })
      .catch((err) => {
        console.error('RPC connection attempt failed:', err.message);
        if (retryCount < maxRetries && err.message.includes('RPC_CONNECTION_TIMEOUT')) {
          retryCount++;
          console.log(`Retrying RPC connection (${retryCount}/${maxRetries})...`);
          setTimeout(attemptConnection, 5000);
        } else {
          console.log('Max retries reached or unrecoverable error. RPC disabled.');
        }
      });
  }

  attemptConnection();
}

ipcMain.on('launch-game', async (event, gameId) => {
  console.log(`Launching game: ${gameId}`);
  mainWindow.webContents.send('launch-game', gameId);
});

ipcMain.handle('change-install-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Installation Directory'
  });
  if (!result.canceled && result.filePaths.length > 0) {
      config.installPath = result.filePaths[0];
      saveConfig();
      return config.installPath;
  }
  return null;
});

ipcMain.handle('get-version', () => {
  return packageJson.version;
});

ipcMain.handle('get-install-path', () => {
  return config.installPath;
});

ipcMain.on('save-settings', (event, { installPath, theme, streamerMode, enableTransitions, enableSounds }) => {
  config.installPath = installPath;
  config.theme = theme;
  config.streamerMode = streamerMode;
  config.enableTransitions = enableTransitions;
  config.enableSounds = enableSounds;
  saveConfig();
  mainWindow.webContents.send('apply-settings', { theme, streamerMode, enableTransitions, enableSounds });
});

ipcMain.handle('get-initial-settings', () => {
  return {
      theme: config.theme,
      streamerMode: config.streamerMode,
      enableTransitions: config.enableTransitions,
      enableSounds: config.enableSounds
  };
});

ipcMain.on('select-client', (event, clientId) => {
  mainWindow.webContents.send('client-selected', clientId);
});

ipcMain.handle('get-initial-theme', () => {
  return config.theme;
});

ipcMain.on('update-discord-rpc', (event, { clientId, theme }) => {
  updateDiscordActivity(clientId, theme);
});

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
    if (rpcReady) {
      rpc.destroy();
    }
});

ipcMain.on('launch-game', async (event, clientId) => {
  console.log(`Launching game: ${clientId}`);
  mainWindow.webContents.send('launch-game', clientId);
});

app.whenReady().then(() => {
  const clientsPath = config.installPath;

  if (!fs.existsSync(clientsPath)) {
    fs.mkdirSync(clientsPath, { recursive: true });
  }

  createLoadingWindow();
  createMainWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoadingWindow();
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
  tray.displayBalloon({
    title: 'TWLauncher',
    content: 'Goodbye! <3',
    icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
  });
});