const { shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Registry = require('winreg');
const axios = require('axios');
const AdmZip = require('adm-zip');
const os = require('os');
const { ipcRenderer } = require('electron');

// Messy code by noxygalaxy - steal this and I'll haunt you! <3
// Probably all this thing was easier to do, but i'm a shit coder, blame me for my shit code!! <3
// noxygalaxy was here, making it harder for you script kids :p

document.addEventListener('DOMContentLoaded', () => {
    const helpIcon = document.querySelector('.help-icon');
    const container = document.querySelector('.container');

    function showInfoPage() {
        let infoPage = document.querySelector('.info-page');
        if (!infoPage) {
            infoPage = document.createElement('div');
            infoPage.className = 'info-page';
            infoPage.innerHTML = `
                <button class="back-btn"><i class="fas fa-arrow-left"></i></button>
                <div class="app-info">
                    <img src="assets/logos/twl.png" draggable="false" alt="TWL Icon">
                    <h1>TWLAUNCHER</h1>
                    <p>TWL ( TeeWorldsLauncher ) - was made so you can play all clients for Teeworlds easily, update them, and even more things!</p>
                </div>
                <div class="made-by">Made with <3 by <a href="https://noxy.netlify.app" class="noxygalaxy-link">@noxygalaxy</a></div>
                <div class="info-buttons">
                    <button class="info-btn issues-btn"><i class="fas fa-bug"></i> Issues</button>
                    <button class="info-btn source-btn"><i class="fas fa-code"></i> Source Code</button>
                    <button class="info-btn website-btn"><i class="fas fa-globe"></i> TWL Website</button>
                    <button class="info-btn discord-btn"><i class="fab fa-discord"></i> Discord</button>
                    <button class="info-btn telegram-btn"><i class="fab fa-telegram"></i> Telegram</button>
                </div>
            `;
            container.appendChild(infoPage);

            infoPage.querySelector('.back-btn').addEventListener('click', hideInfoPage);
            infoPage.querySelector('.noxygalaxy-link').addEventListener('click', (e) => {
                e.preventDefault();
                shell.openExternal('https://noxy.netlify.app');
            });
            infoPage.querySelector('.issues-btn').addEventListener('click', () => {
                shell.openExternal('https://github.com/noxygalaxy/twlauncher/issues');
            });
            infoPage.querySelector('.source-btn').addEventListener('click', () => {
                shell.openExternal('https://github.com/noxygalaxy/twlauncher');
            });
            infoPage.querySelector('.website-btn').addEventListener('click', () => {
                shell.openExternal('https://twlauncher.netlify.app');
            });
            infoPage.querySelector('.discord-btn').addEventListener('click', () => {
                shell.openExternal('https://discord.gg/mwPZAQwrDB');
            });
            infoPage.querySelector('.telegram-btn').addEventListener('click', () => {
                shell.openExternal('https://t.me/twlauncher');
            });
        }
        infoPage.classList.add('active');
    }

    function hideInfoPage() {
        const infoPage = document.querySelector('.info-page');
        if (infoPage) infoPage.classList.remove('active');
    }

    helpIcon.addEventListener('click', showInfoPage);

    const sidebarIcons = document.querySelectorAll('.sidebar-icon');
    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            sidebarIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            updateGameContent(icon.getAttribute('data-id'));
        });
    });
    const gameContainer = document.querySelector('.game-container');
    const appDataPath = process.env.APPDATA || 
                       (process.platform === 'darwin' ? 
                        path.join(process.env.HOME, 'Library', 'Preferences') : 
                        path.join(process.env.HOME || '~', '.local', 'share'));
    const tempPath = process.env.TEMP || os.tmpdir();

    const games = {
        'tw': {
            logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Teeworlds_logo.png',
            image: 'https://www.teeworlds.com/images/screens/screenshot_grass.png',
            steamAppId: '380840',
            steamGameFolder: 'Teeworlds'
        },
        'ddnet': {
            logo: 'https://cdn2.steamgriddb.com/logo_thumb/77d3dc866959ff8e2ec72beceaa43a92.png',
            image: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/412220/library_hero_2x.jpg?t=1733738444',
            steamAppId: '412220',
            steamGameFolder: 'DDraceNetwork'
        },
        'tclient': {
            logo: 'assets/fulllogos/tclient.png',
            image: 'assets/bgs/tclient.png',
            clientName: 'TClient',
            githubRepo: 'sjrc6/TaterClient-ddnet',
            executable: 'DDNet.exe'
        },
        'cactus': {
            logo: 'assets/fulllogos/cactus.png',
            image: 'assets/bgs/cactus.png',
            clientName: 'Cactus',
            executable: 'DDNet.exe'
        },
        'solly': {
            logo: 'assets/fulllogos/cactus.png',
            image: 'assets/bgs/tclient.png',
            clientName: 'Cactus',
            executable: 'DDNet.exe'
        }
    };

    let cachedSteamPath = null;

    updateGameContent('tw');
    
    function getSteamPath() {
        return new Promise((resolve) => {
            if (cachedSteamPath) return resolve(cachedSteamPath);
            const regKey = new Registry({ hive: Registry.HKCU, key: '\\Software\\Valve\\Steam' });
            regKey.get('SteamPath', (err, item) => {
                cachedSteamPath = err || !item ? null : item.value;
                resolve(cachedSteamPath);
            });
        });
    }

    function parseLibraryFolders(steamPath) {
        const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
        if (!fs.existsSync(vdfPath)) return {};

        const content = fs.readFileSync(vdfPath, 'utf8');
        const libraryFolders = {};
        let currentFolder = null;
        let inApps = false;

        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            const folderMatch = trimmed.match(/^"(\d+)"$/);
            if (folderMatch && !inApps) {
                currentFolder = folderMatch[1];
                libraryFolders[currentFolder] = { path: '', apps: {} };
            } else if (currentFolder && trimmed.startsWith('"path"')) {
                const pathMatch = trimmed.match(/"path"\s+"(.+)"/);
                if (pathMatch) libraryFolders[currentFolder].path = pathMatch[1].replace(/\\\\/g, '\\');
            } else if (trimmed === '"apps"') {
                inApps = true;
            } else if (trimmed === '}' && inApps) {
                inApps = false;
            } else if (inApps && trimmed.match(/^"(\d+)"/)) {
                const appMatch = trimmed.match(/"(\d+)"\s+"(\d+)"/);
                if (appMatch) libraryFolders[currentFolder].apps[appMatch[1]] = appMatch[2];
            }
        });
        return libraryFolders;
    }

    function getSteamGamePath(steamPath, appId, gameFolder) {
        return new Promise((resolve) => {
            const directPath = path.join(steamPath, 'steamapps', 'common', gameFolder);
            if (fs.existsSync(directPath)) return resolve(directPath);

            const libraryFolders = parseLibraryFolders(steamPath);
            for (const folder in libraryFolders) {
                if (libraryFolders[folder].apps[appId]) {
                    const gamePath = path.join(libraryFolders[folder].path, 'steamapps', 'common', gameFolder);
                    if (fs.existsSync(gamePath)) return resolve(gamePath);
                }
            }
            resolve(null);
        });
    }

    async function getLatestGitHubRelease(repo) {
        const response = await axios.get(`https://api.github.com/repos/${repo}/releases`);
        return response.data[0];
    }

    async function getClientVersion(clientPath) {
        const versionFile = path.join(clientPath, 'clientver.txt');
        return fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null;
    }

    async function downloadAndInstallTClient(button) {
        const gameData = games['tclient'];
        const clientPath = path.join(appDataPath, 'TWLauncher', 'clients', gameData.clientName);
        const tempZipPath = path.join(tempPath, 'TClient-windows.zip');
    
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INSTALLING...';
        button.disabled = true;
        const progressBar = button.querySelector('.progress-bar') || document.createElement('div');
        progressBar.className = 'progress-bar';
        button.appendChild(progressBar);
        const statusText = button.parentElement.querySelector('.status-text') || document.createElement('div');
        statusText.className = 'status-text';
        button.parentElement.appendChild(statusText);
    
        try {
            const release = await getLatestGitHubRelease(gameData.githubRepo);
            const version = release.tag_name;
            const downloadUrl = `https://github.com/${gameData.githubRepo}/releases/download/${version}/TClient-windows.zip`;
    
            statusText.textContent = 'Downloading...';
            progressBar.style.width = '0%';
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                onDownloadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 40) / progressEvent.total);
                    progressBar.style.width = `${percentCompleted}%`;
                }
            });
            fs.writeFileSync(tempZipPath, Buffer.from(response.data));
            progressBar.style.width = '40%';
    
            statusText.textContent = 'Extracting...';
            const zip = new AdmZip(tempZipPath);
            const extractPath = path.join(appDataPath, 'TWLauncher', 'clients');
            
            const totalEntries = zip.getEntries().length;
            let extractedCount = 0;
            zip.extractAllToAsync(extractPath, true, (err) => {
                if (err) throw err;
                extractedCount++;
                const extractProgress = 40 + Math.round((extractedCount / totalEntries) * 30);
                progressBar.style.width = `${extractProgress}%`;
            });
            await new Promise((resolve, reject) => {
                zip.extractAllToAsync(extractPath, true, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            progressBar.style.width = '70%';
    
            statusText.textContent = 'Renaming Folder...';
            const extractedFolder = zip.getEntries()[0].entryName.split('/')[0];
            const oldFolderPath = path.join(extractPath, extractedFolder);
            if (fs.existsSync(clientPath)) fs.rmSync(clientPath, { recursive: true });
            fs.renameSync(oldFolderPath, clientPath);
            progressBar.style.width = '90%';
    
            statusText.textContent = 'Writing Version...';
            fs.writeFileSync(path.join(clientPath, 'clientver.txt'), version);
            progressBar.style.width = '100%';

            setTimeout(() => updateGameContent('tclient'), 500);
        } catch (err) {
            console.error('Install error:', err);
            statusText.textContent = 'Installation Failed';
            progressBar.style.width = '0%';
        } finally {
            button.disabled = false;
        }
    }

    async function downloadAndInstallCactus(button) {
        const gameData = games['cactus'];
        const clientPath = path.join(appDataPath, 'TWLauncher', 'clients', gameData.clientName);
        const tempZipPath = path.join(tempPath, 'Cactus-windows.zip');
    
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INSTALLING...';
        button.disabled = true;
        const progressBar = button.querySelector('.progress-bar') || document.createElement('div');
        progressBar.className = 'progress-bar';
        button.appendChild(progressBar);
        const statusText = button.parentElement.querySelector('.status-text') || document.createElement('div');
        statusText.className = 'status-text';
        button.parentElement.appendChild(statusText);
    
        try {
            statusText.textContent = 'Checking version...';
            const versionResponse = await axios.get('https://cactus.denchik.top/info');
            const versionData = versionResponse.data;
            const latestVersion = versionData.version;
    
            statusText.textContent = 'Downloading...';
            progressBar.style.width = '0%';
            const response = await axios.get('https://cactus.denchik.top/windows', {
                responseType: 'arraybuffer',
                onDownloadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 40) / progressEvent.total);
                    progressBar.style.width = `${percentCompleted}%`;
                }
            });
            fs.writeFileSync(tempZipPath, Buffer.from(response.data));
            progressBar.style.width = '40%';
    
            statusText.textContent = 'Extracting...';
            const zip = new AdmZip(tempZipPath);
            const extractPath = path.join(appDataPath, 'TWLauncher', 'clients');
            
            zip.extractAllToAsync(extractPath, true, (err) => {
                if (err) throw err;
                progressBar.style.width = `60%`;
            });
            
            await new Promise((resolve, reject) => {
                zip.extractAllToAsync(extractPath, true, (err) => {
                    if (err) return reject(err);
                    progressBar.style.width = '70%';
                    resolve();
                });
            });
            progressBar.style.width = '70%';
    
            statusText.textContent = 'Setting up...';
            const extractedFolder = zip.getEntries()[0].entryName.split('/')[0];
            const oldFolderPath = path.join(extractPath, extractedFolder);
            if (fs.existsSync(clientPath)) fs.rmSync(clientPath, { recursive: true });
            fs.renameSync(oldFolderPath, clientPath);
            progressBar.style.width = '90%';
    
            statusText.textContent = 'Writing Version...';
            fs.writeFileSync(path.join(clientPath, 'clientver.txt'), latestVersion);
            progressBar.style.width = '100%';
    
            setTimeout(() => updateGameContent('cactus'), 500);
        } catch (err) {
            console.error('Cactus install error:', err);
            statusText.textContent = 'Installation Failed';
            progressBar.style.width = '0%';
        } finally {
            button.disabled = false;
        }
    }

    function getGamePath(gameData) {
        return new Promise((resolve) => {
            if (gameData.steamAppId) {
                getSteamPath().then(steamPath => {
                    if (steamPath) {
                        getSteamGamePath(steamPath, gameData.steamAppId, gameData.steamGameFolder)
                            .then(resolve);
                    } else {
                        resolve(null);
                    }
                });
            } else if (gameData.clientName) {
                const clientPath = path.join(appDataPath, 'TWLauncher', 'clients', gameData.clientName);
                resolve(fs.existsSync(clientPath) ? clientPath : null);
            } else {
                resolve(null);
            }
        });
    }

    async function updateGameContent(gameId) {
        const gameData = games[gameId];
        if (!gameData) return;
        
        const folderPath = await getGamePath(gameData);
        const hasFolder = !!folderPath;
        let buttonClass, buttonText, buttonIcon;
    
        if (gameId === 'cactus') {
            let latestVersion;
            try {
                const versionResponse = await axios.get('https://cactus.denchik.top/info');
                latestVersion = versionResponse.data.version;
            } catch (err) {
                console.error('Failed to fetch Cactus version:', err);
            }
            
            const currentVersion = hasFolder ? await getClientVersion(folderPath) : null;
    
            if (hasFolder && currentVersion && currentVersion < latestVersion) {
                buttonClass = 'update-btn';
                buttonText = 'UPDATE';
                buttonIcon = 'fas fa-arrow-up';
            } else if (hasFolder) {
                buttonClass = 'launch-btn';
                buttonText = 'LAUNCH';
                buttonIcon = 'fas fa-play';
            } else {
                buttonClass = 'install-btn';
                buttonText = 'INSTALL';
                buttonIcon = 'fas fa-download';
            }
        } else if (gameData.githubRepo) {
            const release = await getLatestGitHubRelease(gameData.githubRepo);
            const latestVersion = release.tag_name;
            const currentVersion = hasFolder ? await getClientVersion(folderPath) : null;
    
            if (hasFolder && currentVersion && currentVersion < latestVersion) {
                buttonClass = 'update-btn';
                buttonText = 'UPDATE';
                buttonIcon = 'fas fa-arrow-up';
            } else if (hasFolder) {
                buttonClass = 'launch-btn';
                buttonText = 'LAUNCH';
                buttonIcon = 'fas fa-play';
            } else {
                buttonClass = 'install-btn';
                buttonText = 'INSTALL';
                buttonIcon = 'fas fa-download';
            }
        } else {
            buttonClass = hasFolder ? 'launch-btn' : 'install-btn';
            buttonText = hasFolder ? 'LAUNCH' : 'INSTALL';
            buttonIcon = hasFolder ? 'fas fa-play' : 'fas fa-download';
        }
    
        gameContainer.innerHTML = `
            <img src="${gameData.logo}" draggable="false" class="game-logo">
            <img src="${gameData.image}" draggable="false" class="game-image">
            <div class="button-container">
                <button class="${buttonClass}" data-steam-id="${gameData.steamAppId || ''}">
                    <i class="${buttonIcon}"></i> ${buttonText}
                    <div class="progress-bar" style="width: 0%"></div>
                </button>
                ${hasFolder ? 
                    `<i class="fas fa-folder folder-icon" data-path="${folderPath || ''}"></i>` 
                    : ''}
                ${hasFolder && gameData.clientName ? 
                    `<i class="fas fa-trash delete-icon" data-path="${folderPath || ''}" data-client="${gameData.clientName}"></i>` 
                    : ''}
            </div>
        `;
    
        const actionButton = gameContainer.querySelector(`.${buttonClass}`);
        actionButton.addEventListener('click', async () => {
            if (gameData.steamAppId) {
                const url = hasFolder ? 
                    `steam://rungameid/${gameData.steamAppId}` : 
                    `steam://install/${gameData.steamAppId}`;
                shell.openExternal(url);
            } else if (gameId === 'cactus') {
                if (!hasFolder || buttonClass === 'update-btn') {
                    await downloadAndInstallCactus(actionButton);
                } else if (buttonClass === 'launch-btn' && hasFolder) {
                    const clientExe = path.join(folderPath, gameData.executable || 'DDNet.exe');
                    if (fs.existsSync(clientExe)) {
                        shell.openPath(clientExe).catch(err => {
                            console.error('Failed to launch DDNet.exe:', err);
                        });
                    } else {
                        console.error(`Executable not found at: ${clientExe}`);
                    }
                }
            } else if (gameData.githubRepo) {
                if (!hasFolder || buttonClass === 'update-btn') {
                    await downloadAndInstallTClient(actionButton);
                } else if (buttonClass === 'launch-btn' && hasFolder) {
                    const clientExe = path.join(folderPath, gameData.executable || 'DDNet.exe');
                    if (fs.existsSync(clientExe)) {
                        shell.openPath(clientExe).catch(err => {
                            console.error('Failed to launch DDNet.exe:', err);
                        });
                    } else {
                        console.error(`Executable not found at: ${clientExe}`);
                    }
                }
            }
        });
    
        const folderIcon = gameContainer.querySelector('.folder-icon');
        if (folderIcon) {
            folderIcon.addEventListener('click', () => {
                const pathToOpen = folderIcon.getAttribute('data-path');
                if (pathToOpen) shell.openPath(pathToOpen);
            });
        }

        const deleteIcon = gameContainer.querySelector('.delete-icon');
        if (deleteIcon) {
            deleteIcon.addEventListener('click', async () => {
                const clientPath = deleteIcon.getAttribute('data-path');
                const clientName = deleteIcon.getAttribute('data-client');
                
                if (clientPath && clientName) {
                    try {
                        const confirmed = confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`);
                        if (!confirmed) return;
    
                        deleteIcon.style.pointerEvents = 'none';
                        actionButton.disabled = true;
                        
                        fs.rmSync(clientPath, { recursive: true, force: true });
                        
                        await updateGameContent(gameId);
                    } catch (err) {
                        console.error(`Failed to delete ${clientName}:`, err);
                        alert(`Failed to delete ${clientName}. Please try again.`);
                    } finally {
                        if (deleteIcon) deleteIcon.style.pointerEvents = 'auto';
                        actionButton.disabled = false;
                    }
                }
            });
        }
    }
});