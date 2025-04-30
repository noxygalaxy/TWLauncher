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
// only stupid kids gonna steal the code and make this app as theirs :p

async function displayVersion() {
    try {
        const version = await ipcRenderer.invoke('get-version');
        const versionElement = document.getElementById('app-version');
        console.log('Version Element:', document.getElementById('app-version'));
        console.log('Version:', version);
        if (!versionElement) throw new Error('Version element not found');
        versionElement.textContent = `v${version}`;
    } catch (error) {
        console.error('Error fetching version:', error);
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            versionElement.textContent = 'Error Loading Version';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const helpIcon = document.querySelector('.help-icon');
    const container = document.querySelector('.container');
    const gameContainer = document.querySelector('.game-container');
    const sidebarIcons = document.querySelectorAll('.sidebar-icon');
    const settingsIcon = document.querySelector('.settings-icon');
    const settingsPage = document.querySelector('.settings-page');
    const backBtn = settingsPage ? settingsPage.querySelector('.back-btn') : null;
    const installPathInput = document.querySelector('#install-path');
    const changePathBtn = document.querySelector('.change-path-btn');
    const themeSelect = document.querySelector('#theme-select');
    const saveSettingsBtn = document.querySelector('.save-settings-btn');
    const contentBrowserPage = document.querySelector('.content-browser-page');
    const browserBackBtn = contentBrowserPage ? contentBrowserPage.querySelector('.back-btn') : null;
    const tabButtons = document.querySelectorAll('.tab-btn');
    const addIcon = document.querySelector('.add-icon');
    const tabContents = document.querySelectorAll('.tab-content');
    const searchInput = document.querySelector('#search-input');
    const searchBtn = document.querySelector('#search-btn');
    const streamerModeToggle = document.querySelector('#streamer-mode');

    let currentTheme = 'default';

    function playOpen() {
        const sound = document.getElementById('openSound');
        sound.play().catch(error => {
            console.error('Error playing open sound:', error);
        });
    }
    
    function playChange() {
        const sound = document.getElementById('changeSound');
        sound.play().catch(error => {
            console.error('Error playing change sound:', error);
        });
    }

    setTimeout(() => {
        displayVersion();
    }, 500);

    ipcRenderer.invoke('get-initial-theme').then((theme) => {
      currentTheme = theme || 'default';
      themeSelect.value = currentTheme;
      document.body.className = `theme-${currentTheme}`;
    });

    ipcRenderer.invoke('get-initial-settings').then(settings => {
        currentTheme = settings.theme || 'default';
        themeSelect.value = currentTheme;
        streamerModeToggle.checked = settings.streamerMode || false;
        document.body.className = `theme-${currentTheme}${settings.streamerMode ? ' streamer-mode' : ''}`;
    });

    ipcRenderer.on('initial-game-statuses', (event, gameStatuses) => {
        console.log('Received initial game statuses:', gameStatuses);
        Object.keys(gameStatuses).forEach(gameId => {
            const sidebarIconMain = document.querySelector(`.sidebar-icon[data-id="${gameId}"]`).parentElement;
            if (sidebarIconMain) {
                const statusElement = sidebarIconMain.querySelector('.sidebar-icon-status');
                if (statusElement) {
                    statusElement.style.backgroundColor = gameStatuses[gameId] ? '#8B5CF6' : '#ff7777';
                    statusElement.style.display = 'block';
                }
            }
        });
        updateGameContent('tw', gameStatuses['tw']);
    });

    // Easter egg :0
    let versionClickCount = 0;
    const versionElement = document.getElementById('app-version');
    versionElement.style.cursor = 'pointer';
    versionElement.addEventListener('click', () => {
        versionClickCount++;
        if (versionClickCount >= 5) {
            const musicPlayer = document.getElementById('music-player');
            musicPlayer.classList.add('active');
            versionClickCount = 0;
        }
    });

    function updateDiscordRPC(clientId) {
      try {
        ipcRenderer.send('update-discord-rpc', { clientId, theme: currentTheme });
        console.log(`Discord RPC updated with clientId: ${clientId} and theme: ${currentTheme}`);
      } catch (error) {
        console.error('Error updating Discord RPC:', error);
      }
    }

    ipcRenderer.on('rpc-error', (event, message) => {
        console.log('RPC Error from main:', message);
        alert(message);
    });

    const appDataPath = process.env.APPDATA || 
                       (process.platform === 'darwin' ? 
                        path.join(process.env.HOME, 'Library', 'Preferences') : 
                        path.join(process.env.HOME || '~', '.local', 'share'));
    const tempPath = process.env.TEMP || os.tmpdir();

    const games = {
        'tw': {
            logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Teeworlds_logo.png',
            image: 'https://www.teeworlds.com/images/screens/screenshot_grass.png',
            icon: 'https://avatars.githubusercontent.com/u/705559',
            clientName: 'Teeworlds',
            smallName: 'tw',
            steamAppId: '380840',
            steamGameFolder: 'Teeworlds'
        },
        'ddnet': {
            logo: 'https://cdn2.steamgriddb.com/logo_thumb/77d3dc866959ff8e2ec72beceaa43a92.png',
            image: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/412220/library_hero_2x.jpg?t=1733738444',
            icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/412220/4fb73658f000e318c8abc88b98fb2ddb27f1288b.ico',
            clientName: 'DDNet',
            smallName: 'ddnet',
            steamAppId: '412220',
            steamGameFolder: 'DDraceNetwork'
        },
        'tclient': {
            logo: 'assets/fulllogos/tclient.png',
            image: 'assets/bgs/tclient.png',
            icon: 'assets/logos/tclient.png',
            clientName: 'TClient',
            smallName: 'tclient',
            githubRepo: 'sjrc6/TaterClient-ddnet',
            executable: 'DDNet.exe'
        },
        'cactus': {
            logo: 'assets/fulllogos/cactus.png',
            image: 'assets/bgs/cactus.png',
            icon: 'assets/logos/cactus.png',
            smallName: 'cactus',
            clientName: 'Cactus',
            executable: 'DDNet.exe'
        },
        'cbux': {
            logo: 'assets/fulllogos/cbux.png',
            image: 'assets/bgs/cbux.png',
            smallName: 'cbux',
            icon: 'https://avatars.githubusercontent.com/u/45486474',
            clientName: 'ChillerBoxUX',
            executable: 'DDNet.exe'
        }
    };

    const apis = {
        skins: 'https://teedata.net/api/skin/read?status=accepted',
        game: 'https://teedata.net/api/gameskin/read?status=accepted',
        emoticons: 'https://teedata.net/api/emoticon/read?status=accepted',
        particles: 'https://teedata.net/api/particle/read?status=accepted',
        entities: 'https://teedata.net/api/entity/read?status=accepted'
    };

    const downloadPath = path.join(process.env.APPDATA || process.env.HOME, 'DDNet');
    const downloadPathElse = path.join(process.env.APPDATA || process.env.HOME, 'DDNet', 'assets');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    let cachedSteamPath = null;

    setTimeout(() => {
        displayVersion();
    }, 500);

    function showInfoPage() {
        let infoPage = document.querySelector('.info-page');
        if (!infoPage) {
            infoPage = document.createElement('div');
            infoPage.className = 'info-page';
            infoPage.innerHTML = `
                <button class="back-btn" onclick="playOpen()"><i class="fas fa-arrow-left"></i></button>
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
            infoPage.querySelector('.issues-btn').addEventListener('click', () => shell.openExternal('https://github.com/noxygalaxy/twlauncher/issues'));
            infoPage.querySelector('.source-btn').addEventListener('click', () => shell.openExternal('https://github.com/noxygalaxy/twlauncher'));
            infoPage.querySelector('.website-btn').addEventListener('click', () => shell.openExternal('https://twlauncher.netlify.app'));
            infoPage.querySelector('.discord-btn').addEventListener('click', () => shell.openExternal('https://discord.gg/mwPZAQwrDB'));
            infoPage.querySelector('.telegram-btn').addEventListener('click', () => shell.openExternal('https://t.me/twlauncher'));
        }
        infoPage.classList.add('active');
    }

    function hideInfoPage() {
        const infoPage = document.querySelector('.info-page');
        if (infoPage) infoPage.classList.remove('active');
    }

    if (helpIcon) helpIcon.addEventListener('click', showInfoPage);

    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            sidebarIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            playChange();
            setTimeout(() => {
                updateGameContent(icon.getAttribute('data-id'));
                updateDiscordRPC(icon.getAttribute('id'));
            }, 500);
        });
    });

    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            if (settingsPage) settingsPage.classList.add('active');
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (settingsPage) settingsPage.classList.remove('active');
        });
    }

    if (installPathInput && changePathBtn) {
        ipcRenderer.invoke('get-install-path').then(path => {
            installPathInput.value = path || appDataPath + '/TWLauncher/clients';
        });

        changePathBtn.addEventListener('click', async () => {
            const newPath = await ipcRenderer.invoke('change-install-path');
            if (newPath) installPathInput.value = newPath;
        });
    }

    if (themeSelect && saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const newInstallPath = installPathInput.value;
            const newTheme = themeSelect.value;
            const streamerMode = streamerModeToggle.checked;
            currentTheme = newTheme;
            ipcRenderer.send('save-settings', { 
                installPath: newInstallPath, 
                theme: newTheme,
                streamerMode,
            });
            if (settingsPage) settingsPage.classList.remove('active');
            updateDiscordRPC(document.querySelector('.sidebar-icon.active')?.getAttribute('id') || 'tw');
        });
    }

    if (addIcon) {
        addIcon.addEventListener('click', () => {
            if (contentBrowserPage) contentBrowserPage.classList.add('active');
        });
    }

    if (browserBackBtn) {
        browserBackBtn.addEventListener('click', () => {
            if (contentBrowserPage) contentBrowserPage.classList.remove('active');
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => content.style.display = 'none');
            const tabId = button.getAttribute('data-tab');
            const contentDiv = document.getElementById(`${tabId}-content`);
            if (contentDiv) {
                contentDiv.style.display = 'flex';
                loadTabContent(tabId, contentDiv, 1, searchInput.value.trim());
            }
        });
    });

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active');
            if (!activeTab) return;
            const tabId = activeTab.getAttribute('data-tab');
            const contentDiv = document.getElementById(`${tabId}-content`);
            const query = searchInput.value.trim();
            console.log(`Search button clicked: Tab=${tabId}, Query="${query}"`);
            if (contentDiv) {
                loadTabContent(tabId, contentDiv, 1, query);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log(`Enter pressed: Query="${searchInput.value.trim()}"`);
                searchBtn.click();
            }
        });
    }

    ipcRenderer.on('apply-theme', (event, theme) => {
        document.body.className = `theme-${theme}`;
        themeSelect.value = theme;
        currentTheme = theme;
        updateDiscordRPC(document.querySelector('.sidebar-icon.active')?.getAttribute('id') || 'tw');
    });

    ipcRenderer.on('apply-settings', (event, { theme, streamerMode }) => {
        document.body.className = `theme-${theme}${streamerMode ? ' streamer-mode' : ''}`;
        themeSelect.value = theme;
        streamerModeToggle.checked = streamerMode;
        currentTheme = theme;
        updateDiscordRPC(document.querySelector('.sidebar-icon.active')?.getAttribute('id') || 'tw');
    });

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
        const installPath = await ipcRenderer.invoke('get-install-path');
        const clientPath = path.join(installPath, gameData.clientName);
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
            const extractPath = installPath;
            
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
        const installPath = await ipcRenderer.invoke('get-install-path');
        const clientPath = path.join(installPath, gameData.clientName);
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
            const extractPath = installPath;
            
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

    async function loadTabContent(tabId, contentDiv, page, searchQuery = '') {
        contentDiv.innerHTML = '<p>Loading...</p>';
        const url = `${apis[tabId]}&page=${page}${searchQuery ? `&name=${encodeURIComponent(searchQuery)}` : ''}`;
        console.log(`Loading ${tabId} page ${page} from ${url}`);

        try {
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;
            console.log(`Received data for ${tabId} page ${page}:`, data);

            contentDiv.innerHTML = '';

            if (data.result && data.result.items) {
                if (data.result.items.length === 0) {
                    contentDiv.innerHTML = '<p>No items found on this page.</p>';
                } else {
                    data.result.items.forEach(item => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'skin-item';
                        if (tabId === 'skins') {
                            itemDiv.innerHTML = `
                                <img src="https://teedata.net/api/skin/render/name/${item.name}" alt="${item.name}" onerror="this.src='assets/placeholder.png';">
                                <p>${item.name} by ${item.author.name}</p>
                                <button class="download-btn" data-skin-name="${item.name}">Download</button>
                            `;
                        } else if (tabId === 'game') {
                            itemDiv.innerHTML = `
                                <img src="https://teedata.net/databasev2/gameskins/${item.name}/${item.name}.thumbnail.png" alt="${item.name}" onerror="this.src='assets/placeholder.png';">
                                <p>${item.name} by ${item.author.name}</p>
                                <button class="download-btn" data-else-name="${item.name}">Download</button>
                            `;
                        } else {
                            itemDiv.innerHTML = `
                                <img src="https://teedata.net/databasev2/${tabId}/${item.name}/${item.name}.thumbnail.png" alt="${item.name}" onerror="this.src='assets/placeholder.png';">
                                <p>${item.name} by ${item.author.name}</p>
                                <button class="download-btn" data-else-name="${item.name}">Download</button>
                            `;
                        }
                        contentDiv.appendChild(itemDiv);
                    });

                    const downloadButtons = contentDiv.querySelectorAll('.download-btn');
                    downloadButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            if (tabId === 'skins') {
                                downloadSkin(btn);
                            } else {
                                downloadElse(btn);
                            }
                        });
                    });

                    const itemsPerPage = data.result.items.length;
                    const totalPages = Math.ceil(data.result.totalCount / itemsPerPage) || 1;
                    console.log(`Total count: ${data.result.totalCount}, Items per page: ${itemsPerPage}, Total pages: ${totalPages}`);
                    addPaginationControls(contentDiv, tabId, page, totalPages, searchQuery);
                }
            } else {
                contentDiv.innerHTML = '<p>Data not available or unexpected format.</p>';
                console.log(`Unexpected data format for ${tabId}:`, data);
            }
        } catch (error) {
            console.error(`Error loading ${tabId} page ${page}:`, error.message);
            contentDiv.innerHTML = `<p>Error loading content: ${error.message}</p>`;
        }
    }

    async function downloadSkin(button) {
        const skinName = button.getAttribute('data-skin-name');
        const downloadUrl = `https://teedata.net/api/skin/resolve/${skinName}`;
        const filePath = path.join(downloadPath, 'skins', `${skinName}.png`);

        button.disabled = true;
        button.textContent = 'Downloading...';

        try {
            const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 10000 });
            fs.writeFileSync(filePath, Buffer.from(response.data));
            console.log(`Downloaded ${skinName} to ${filePath}`);
            button.textContent = 'Open Folder';
            button.disabled = false;
            button.removeEventListener('click', downloadSkin);
            button.addEventListener('click', () => shell.openPath(downloadPath));
            ipcRenderer.send('skin-installed', skinName);
        } catch (error) {
            console.error(`Error downloading ${skinName}:`, error.message);
            button.textContent = 'Error';
            setTimeout(() => {
                button.textContent = 'Download';
                button.disabled = false;
            }, 2000);
        }
    }

    async function downloadElse(button) {
        const activeTab = document.querySelector('.tab-btn.active');
        const tabId = activeTab.getAttribute('data-tab');
        const elseName = button.getAttribute('data-else-name');
        let downloadUrl = `https://teedata.net/databasev2/${tabId}/${elseName}/${elseName}.png`;
        let filePath = path.join(downloadPathElse, `${tabId}`, `${elseName}.png`);

        button.disabled = true;
        button.textContent = 'Downloading...';

        if (tabId === 'game') {
            downloadUrl = `https://teedata.net/databasev2/gameskins/${elseName}/${elseName}.png`;
            filePath = path.join(downloadPathElse, `${tabId}`, `${elseName}.png`);
        } else if (tabId === 'entities') {
            downloadUrl = `https://teedata.net/databasev2/entities/${elseName}/${elseName}.png`;
        }

        try {
            const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 10000 });
            fs.writeFileSync(filePath, Buffer.from(response.data));
            console.log(`Downloaded ${elseName} to ${filePath}`);
            button.textContent = 'Open Folder';
            button.disabled = false;
            button.removeEventListener('click', downloadElse);
            button.addEventListener('click', () => shell.openPath(downloadPathElse));
        } catch (error) {
            console.error(`Error downloading ${elseName}:`, error.message);
            button.textContent = 'Error';
            setTimeout(() => {
                button.textContent = 'Download';
                button.disabled = false;
            }, 2000);
        }
    }

    function addPaginationControls(contentDiv, tabId, currentPage, totalPages, searchQuery) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';

        const prevButton = document.createElement('button');
        prevButton.textContent = '<';
        prevButton.className = 'pagination-btn prev-btn';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                console.log(`Navigating to previous page: ${currentPage - 1}`);
                loadTabContent(tabId, contentDiv, currentPage - 1, searchQuery);
            }
        });
        paginationDiv.appendChild(prevButton);

        const pageIndicator = document.createElement('span');
        pageIndicator.textContent = `${currentPage} / ${totalPages}`;
        pageIndicator.className = 'page-indicator';
        paginationDiv.appendChild(pageIndicator);

        const nextButton = document.createElement('button');
        nextButton.textContent = '>';
        nextButton.className = 'pagination-btn next-btn';
        nextButton.disabled = currentPage >= totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                console.log(`Navigating to next page: ${currentPage + 1}`);
                loadTabContent(tabId, contentDiv, currentPage + 1, searchQuery);
            }
        });
        paginationDiv.appendChild(nextButton);

        contentDiv.appendChild(paginationDiv);
    }

    function getGamePath(gameData) {
        return new Promise((resolve) => {
            if (gameData.steamAppId) {
                getSteamPath().then(steamPath => {
                    if (steamPath) {
                        getSteamGamePath(steamPath, gameData.steamAppId, gameData.steamGameFolder).then(resolve);
                    } else {
                        resolve(null);
                    }
                });
            } else if (gameData.clientName) {
                ipcRenderer.invoke('get-install-path').then(installPath => {
                    const clientPath = path.join(installPath, gameData.clientName);
                    resolve(fs.existsSync(clientPath) ? clientPath : null);
                });
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
        let buttonClass, buttonText, buttonIcon, statusColor;
    
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
                statusColor = '#77ffff';
            } else if (hasFolder) {
                buttonClass = 'launch-btn';
                buttonText = 'LAUNCH';
                buttonIcon = 'fas fa-play';
                statusColor = '#77ff77';
            } else {
                buttonClass = 'install-btn';
                buttonText = 'INSTALL';
                buttonIcon = 'fas fa-download';
                statusColor = '#ff7777';
            }
        } else if (gameData.githubRepo) {
            const release = await getLatestGitHubRelease(gameData.githubRepo);
            const latestVersion = release.tag_name;
            const currentVersion = hasFolder ? await getClientVersion(folderPath) : null;
            
            if (hasFolder && currentVersion && currentVersion < latestVersion) {
                buttonClass = 'update-btn';
                buttonText = 'UPDATE';
                buttonIcon = 'fas fa-arrow-up';
                statusColor = '#77ff77';
            } else if (hasFolder) {
                buttonClass = 'launch-btn';
                buttonText = 'LAUNCH';
                buttonIcon = 'fas fa-play';
                statusColor = '#8B5CF6';
            } else {
                buttonClass = 'install-btn';
                buttonText = 'INSTALL';
                buttonIcon = 'fas fa-download';
                statusColor = '#ff7777';
            }
        } else {
            buttonClass = hasFolder ? 'launch-btn' : 'install-btn';
            buttonText = hasFolder ? 'LAUNCH' : 'INSTALL';
            buttonIcon = hasFolder ? 'fas fa-play' : 'fas fa-download';
            statusColor = hasFolder ? '#8B5CF6' : '#ff7777';
        }
    
        gameContainer.innerHTML = `
            <img src="${gameData.logo}" draggable="false" class="game-logo">
            <img src="${gameData.image}" draggable="false" class="game-image">
            <div class="button-container">
                <button class="${buttonClass}" onclick="playClick()" data-steam-id="${gameData.steamAppId || ''}">
                    <i class="${buttonIcon}"></i> ${buttonText}
                    <div class="progress-bar" style="width: 0%"></div>
                </button>
                ${hasFolder ? `<i class="fas fa-folder folder-icon" data-path="${folderPath || ''}"></i>` : ''}
                ${hasFolder && gameData.clientName && !gameData.steamAppId ? `<i class="fas fa-trash delete-icon" onclick="playOpen()" data-path="${folderPath || ''}" data-client="${gameData.clientName}"></i>` : ''}
            </div>
        `;
    
        const actionButton = gameContainer.querySelector(`.${buttonClass}`);
        actionButton.addEventListener('click', async () => {
            if (gameData.steamAppId) {
                const url = hasFolder ? `steam://rungameid/${gameData.steamAppId}` : `steam://install/${gameData.steamAppId}`;
                shell.openExternal(url);
            } else if (gameId === 'cactus') {
                if (!hasFolder || buttonClass === 'update-btn') {
                    await downloadAndInstallCactus(actionButton);
                } else if (buttonClass === 'launch-btn' && hasFolder) {
                    const clientExe = path.join(folderPath, gameData.executable || 'DDNet.exe');
                    if (fs.existsSync(clientExe)) {
                        shell.openPath(clientExe).catch(err => console.error('Failed to launch DDNet.exe:', err));
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
                        shell.openPath(clientExe).catch(err => console.error('Failed to launch DDNet.exe:', err));
                    } else {
                        console.error(`Executable not found at: ${clientExe}`);
                    }
                }
            }
        });
    
        const folderIcon = gameContainer.querySelector('.folder-icon');
        if (folderIcon) {
            folderIcon.addEventListener('click', () => {
                playOpen();
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
                        
                        await updateGameContent(gameId, false);
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

    updateGameContent('tw');

    const skinsTab = document.querySelector('.tab-btn[data-tab="skins"]');
    if (skinsTab) {
        skinsTab.click();
    }
});