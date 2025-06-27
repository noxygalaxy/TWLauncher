const { app, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const DiscordRPC = require('discord-rpc');
const os = require('os');

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

const configPath = path.join(app.getPath('userData'), 'twlconfig.json');
let config = {
  installPath: path.join(app.getPath('userData'), 'clients'),
  theme: 'default',
  streamerMode: false,
  enableTransitions: true,
  transitionSpeed: 1,
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

async function getGamePath(gameId) {
  const appDataPath = app.getPath('userData');
  const games = {
    'tw': { clientName: 'Teeworlds', executable: process.platform === 'linux' ? 'teeworlds' : 'teeworlds.exe' },
    'ddnet': { clientName: 'DDraceNetwork', executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe' },
    'tclient': { clientName: 'TClient', executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe' },
    'cactus': { clientName: 'Cactus', executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe' }
  };

  const gameData = games[gameId];
  if (!gameData) return false;

  const clientPath = path.join(config.installPath, gameData.clientName);
  return fs.existsSync(clientPath) ? clientPath : false;
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
  console.log(`Received launch request for game: ${gameId}`);
  const gamePath = await getGamePath(gameId);
  if (!gamePath) {
    console.error(`Game path not found for ${gameId}`);
    mainWindow.webContents.send('launch-error', `Game ${gameId} is not installed or path not found.`);
    return;
  }

  const games = {
    'tw': { executable: process.platform === 'linux' ? 'teeworlds' : 'teeworlds.exe' },
    'ddnet': { executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe' },
    'tclient': { executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe' },
    'cactus': { executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe' }
  };

  const gameData = games[gameId];
  if (!gameData) {
    console.error(`No game data for ${gameId}`);
    mainWindow.webContents.send('launch-error', `No game data for ${gameId}`);
    return;
  }

  const clientExe = path.join(gamePath, gameData.executable);
  if (!fs.existsSync(clientExe)) {
    console.error(`Executable not found at: ${clientExe}`);
    mainWindow.webContents.send('launch-error', `Executable not found for ${gameId}`);
    return;
  }

  if (process.platform === 'linux') {
    try {
      fs.chmodSync(clientExe, '755');
      console.log(`Set executable permissions for ${clientExe}`);
    } catch (err) {
      console.error(`Failed to set permissions for ${clientExe}:`, err);
      mainWindow.webContents.send('launch-error', `Failed to set permissions for ${gameId}: ${err.message}`);
      return;
    }
  }

  try {
    const options = {
      cwd: gamePath,
      detached: true,
      stdio: 'ignore'
    };

    const child = spawn(clientExe, [], options);
    
    child.unref();

    console.log(`Launched ${gameId} at ${clientExe} as detached process`);
  } catch (err) {
    console.error(`Error launching ${gameId}:`, err);
    mainWindow.webContents.send('launch-error', `Error launching ${gameId}: ${err.message}`);
  }
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

ipcMain.on('save-settings', (event, { installPath, theme, streamerMode, enableTransitions, transitionSpeed, enableSounds }) => {
  config.installPath = installPath;
  config.theme = theme;
  config.streamerMode = streamerMode;
  config.enableTransitions = enableTransitions;
  config.transitionSpeed = parseFloat(transitionSpeed);
  config.enableSounds = enableSounds;
  saveConfig();
  mainWindow.webContents.send('apply-settings', { theme, streamerMode, enableTransitions, transitionSpeed, enableSounds });
});

ipcMain.handle('get-initial-settings', () => {
  return {
      theme: config.theme,
      streamerMode: config.streamerMode,
      enableTransitions: config.enableTransitions,
      transitionSpeed: config.transitionSpeed,
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

ipcMain.on('show-update-notification', (event, { clientName, currentVersion, latestVersion }) => {
  if (tray) {
      tray.displayBalloon({
          title: `${clientName} Update Available`,
          content: `A new version of ${clientName} is available!\nCurrent: ${currentVersion}\nLatest: ${latestVersion}`,
          icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
      });
  }
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
});