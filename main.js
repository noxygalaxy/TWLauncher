const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Registry = require('winreg');

let wnxKjd;
let tryxNoxy = null;

function crtWndFksj() {
  wnxKjd = new BrowserWindow({
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

  wnxKjd.loadFile('src/index.html');
  wnxKjd.on('close', (evntPqr) => {
    evntPqr.preventDefault();
    wnxKjd.hide();
  });

  crtTryGhl();
}

function gtStmPthJkl() {
  return new Promise((rslvMno) => {
    const rgKyAbc = new Registry({ hive: Registry.HKCU, key: '\\Software\\Valve\\Steam' });
    rgKyAbc.get('SteamPath', (errXyz, itmDef) => {
      if (errXyz) {
        console.error('Error getting Steam path:', errXyz);
        rslvMno(null);
      } else {
        rslvMno(itmDef ? itmDef.value : null);
      }
    });
  });
}

function prsLbrFldsQwe(stmPthRty) {
  try {
    const vdfPthUio = path.join(stmPthRty, 'steamapps', 'libraryfolders.vdf');
    if (!fs.existsSync(vdfPthUio)) {
      console.log('libraryfolders.vdf not found at:', vdfPthUio);
      return {};
    }

    const cntntPas = fs.readFileSync(vdfPthUio, 'utf8');
    const lbrFldsDfg = {};
    let crrntFldrHjk = null;
    let inAppsLmn = false;

    cntntPas.split('\n').forEach(lnOpq => {
      const trmmdRst = lnOpq.trim();
      const fldrMtchUvw = trmmdRst.match(/^"(\d+)"$/);
      if (fldrMtchUvw && !inAppsLmn) {
        crrntFldrHjk = fldrMtchUvw[1];
        lbrFldsDfg[crrntFldrHjk] = { path: '', apps: {} };
      } else if (crrntFldrHjk && trmmdRst.startsWith('"path"')) {
        const pthMtchXyz = trmmdRst.match(/"path"\s+"(.+)"/);
        if (pthMtchXyz) lbrFldsDfg[crrntFldrHjk].path = pthMtchXyz[1].replace(/\\\\/g, '\\');
      } else if (trmmdRst === '"apps"') {
        inAppsLmn = true;
      } else if (trmmdRst === '}' && inAppsLmn) {
        inAppsLmn = false;
      } else if (inAppsLmn && trmmdRst.match(/^"(\d+)"/)) {
        const appMtchBcd = trmmdRst.match(/"(\d+)"\s+"(\d+)"/);
        if (appMtchBcd) lbrFldsDfg[crrntFldrHjk].apps[appMtchBcd[1]] = appMtchBcd[2];
      }
    });
    return lbrFldsDfg;
  } catch (errEfg) {
    console.error('Error parsing library folders:', errEfg);
    return {};
  }
}

async function isStmGmInstldHij(stmPthJkl, appIdMno, gmFldrPqr) {
  try {
    const drctPthStu = path.join(stmPthJkl, 'steamapps', 'common', gmFldrPqr);
    if (fs.existsSync(drctPthStu)) return true;

    const lbrFldsVwx = prsLbrFldsQwe(stmPthJkl);
    for (const fldrYza in lbrFldsVwx) {
      if (lbrFldsVwx[fldrYza].apps[appIdMno]) {
        const gmPthBcd = path.join(lbrFldsVwx[fldrYza].path, 'steamapps', 'common', gmFldrPqr);
        if (fs.existsSync(gmPthBcd)) return true;
      }
    }
    return false;
  } catch (errDef) {
    console.error('Error checking Steam game installation:', errDef);
    return false;
  }
}

async function gtGmPthGhi(gmIdJkl) {
  const appDtaPthMno = app.getPath('appData');
  const gmsPqr = {
    'tw': { steamAppId: '380840', steamGameFolder: 'Teeworlds' },
    'ddnet': { steamAppId: '412220', steamGameFolder: 'DDraceNetwork' },
    'tclient': { clientName: 'TClient' },
    'cactus': { clientName: 'Cactus' }
  };

  const gmDtaStu = gmsPqr[gmIdJkl];
  if (!gmDtaStu) return false;

  if (gmDtaStu.steamAppId) {
    const stmPthVwx = await gtStmPthJkl();
    if (!stmPthVwx) return false;
    return await isStmGmInstldHij(stmPthVwx, gmDtaStu.steamAppId, gmDtaStu.steamGameFolder);
  } else if (gmDtaStu.clientName) {
    const clntPthYza = path.join(appDtaPthMno, 'TWLauncher', 'clients', gmDtaStu.clientName);
    return fs.existsSync(clntPthYza);
  }
  return false;
}

async function bldTryMnuAbc() {
  try {
    const isTwInstldDef = await gtGmPthGhi('tw');
    const isDdnetInstldGhi = await gtGmPthGhi('ddnet');
    const isTclntInstldJkl = await gtGmPthGhi('tclient');
    const isCctsInstldMno = await gtGmPthGhi('cactus');

    console.log('Building tray menu with status:', {
      Teeworlds: isTwInstldDef,
      DDraceNetwork: isDdnetInstldGhi,
      TClient: isTclntInstldJkl,
      Cactus: isCctsInstldMno
    });

    const lnchSubmnuPqr = Menu.buildFromTemplate([
      { 
        label: 'Teeworlds', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'tw.png'), 
        click: () => lnchGmStu('tw'),
        enabled: isTwInstldDef
      },
      { 
        label: 'DDraceNetwork', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'ddnet.png'), 
        click: () => lnchGmStu('ddnet'),
        enabled: isDdnetInstldGhi
      },
      { 
        label: 'TClient', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'tclient.png'), 
        click: () => lnchGmStu('tclient'),
        enabled: isTclntInstldJkl
      },
      { 
        label: 'Cactus', 
        icon: path.join(__dirname, 'src', 'assets', 'tray', 'cactus.png'), 
        click: () => lnchGmStu('cactus'),
        enabled: isCctsInstldMno
      }
    ]);

    return Menu.buildFromTemplate([
      { label: 'Show App', click: () => wnxKjd.show() },
      { label: 'Launch', submenu: lnchSubmnuPqr },
      { label: 'Close App', click: () => {
          wnxKjd.destroy();
          app.quit();
      }},
    ]);
  } catch (errVwx) {
    console.error('Error building tray menu:', errVwx);
    return Menu.buildFromTemplate([
      { label: 'Show App', click: () => wnxKjd.show() },
      { label: 'Close App', click: () => {
          wnxKjd.destroy();
          app.quit();
      }}
    ]);
  }
}

function crtTryGhl() {
  tryxNoxy = new Tray(path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'));
  tryxNoxy.setToolTip('TWLauncher by noxygalaxy');

  tryxNoxy.on('right-click', async () => {
    console.log('Tray right-clicked');
    const mnuYza = await bldTryMnuAbc();
    tryxNoxy.popUpContextMenu(mnuYza);
  });

  bldTryMnuAbc().then(mnuBcd => {
    tryxNoxy.setContextMenu(mnuBcd);
  });
}

function lnchGmStu(idEfg) {
  console.log(`Launching game: ${idEfg}`);
  wnxKjd.webContents.send('launch-game', idEfg);
}

ipcMain.on('minimize-window', () => {
    wnxKjd.minimize();
});
  
ipcMain.on('hide-window', () => {
    wnxKjd.hide();
    tryxNoxy.displayBalloon({
        title:'TWLauncher',
        content:'Launcher will work in background, to close it right click on the tray icon',
        icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
    });
});

ipcMain.on('launch-game', async () => {
  const mnuHij = await bldTryMnuAbc();
  tryxNoxy.setContextMenu(mnuHij);
});

app.whenReady().then(() => {
  const appDtaPthJkl = app.getPath('appData');
  const clntsPthMno = path.join(appDtaPthJkl, 'TWLauncher', 'clients');

  if (!fs.existsSync(clntsPthMno)) {
    fs.mkdirSync(clntsPthMno, { recursive: true });
  }

  crtWndFksj();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crtWndFksj();
    else wnxKjd.show();
  });
});

app.on('window-all-closed', (ePqr) => {
  ePqr.preventDefault();
  tryxNoxy.displayBalloon({
    title:'TWLauncher',
    content:'Goodbye! <3',
    icon: path.join(__dirname, 'src', 'assets', 'logos', 'twl.png'),
  });
});
