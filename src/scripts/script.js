const { shell } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const os = require('os');
const { ipcRenderer } = require('electron');

// Messy code by noxygalaxy - steal this and I'll haunt you! <3
// Probably all this thing was easier to do, but i'm a shit coder, blame me for my shit code!! <3
// only stupid kids gonna steal the code and claim this app as their own :p

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
    const enableSoundsToggle = document.querySelector('#enable-sounds');
    const enableTransitionsToggle = document.querySelector('#enable-transitions');
    const transitionSpeedSelect = document.querySelector('#transition-speed');

    let currentTheme = 'default';
    let enableSounds = true;
    let enableTransitions = true;
    let transitionSpeed = 1;

    function playOpen() {
        if (enableSounds) {
            const sound = document.getElementById('openSound');
            sound.volume = enableSounds ? 1 : 0;
            sound.play().catch(error => {
                console.error('Error playing open sound:', error);
            });
        }
    }
    
    function playChange() {
        if (enableSounds) {
            const sound = document.getElementById('changeSound');
            sound.volume = enableSounds ? 1 : 0;
            sound.play().catch(error => {
                console.error('Error playing change sound:', error);
            });
        }
    }

    function playClick() {
        if (enableSounds) {
            const sound = document.getElementById('clickSound');
            sound.volume = enableSounds ? 1 : 0;
            sound.play().catch(error => {
                console.error('Error playing click sound:', error);
            });
        }
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
        console.log('Received initial settings:', settings);
        currentTheme = settings.theme || 'default';
        enableSounds = settings.enableSounds !== undefined ? settings.enableSounds : true;
        enableTransitions = settings.enableTransitions !== undefined ? settings.enableTransitions : true;
        transitionSpeed = settings.transitionSpeed !== undefined ? parseFloat(settings.transitionSpeed) : 1;
        themeSelect.value = currentTheme;
        streamerModeToggle.checked = settings.streamerMode || false;
        enableSoundsToggle.checked = enableSounds;
        enableTransitionsToggle.checked = enableTransitions;
        if (transitionSpeedSelect) transitionSpeedSelect.value = transitionSpeed;
        document.body.className = `theme-${currentTheme}${settings.streamerMode ? ' streamer-mode' : ''}${enableTransitions ? '' : ' no-transitions'}`;

        const header = document.querySelector('.header');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (enableTransitions) {
            setTimeout(() => {
                mainContent.classList.add('transition', 'transitionfade');
                console.log('Main-content classes added:', mainContent.className);
            }, transitionSpeed * 100);
            setTimeout(() => {
                sidebar.classList.add('transition');
                console.log('Sidebar classes added:', sidebar.className);
            }, transitionSpeed * 350);
            setTimeout(() => {
                header.classList.add('transition');
                console.log('Header classes added:', header.className);
            }, transitionSpeed * 600);

            sidebarIcons.forEach(icon => {
                icon.addEventListener('click', () => {
                    playChange();
                    mainContent.classList.remove('transitionfade');
                    console.log('Main-content fade out:', mainContent.className);
                    setTimeout(() => {
                        mainContent.classList.add('transitionfade');
                        console.log('Main-content fade in:', mainContent.className);
                    }, transitionSpeed * 1000);
                });
            });
        } else {
            header.classList.add('transition');
            sidebar.classList.add('transition');
            mainContent.classList.add('transition', 'transitionfade');
            console.log('Final classes applied (no transitions):', {
                header: header.className,
                sidebar: sidebar.className,
                mainContent: mainContent.className
            });

            sidebarIcons.forEach(icon => {
                icon.addEventListener('click', () => {
                    if (enableSounds) {
                        const sound = document.getElementById('changeSound');
                        sound.volume = enableSounds ? 1 : 0;
                        sound.play().catch(error => {
                            console.error('Error playing change sound:', error);
                        });
                    }
                    console.log('Sidebar icon clicked (no transitions), main-content unchanged:', mainContent.className);
                });
            });
        }
    });

    ipcRenderer.on('initial-game-statuses', (event, gameStatuses) => {
        console.log('Received initial game statuses:', gameStatuses);
        Object.keys(gameStatuses).forEach(gameId => {
            updateSidebarStatus(gameId, gameStatuses[gameId]);
        });
        updateGameContent('tw', gameStatuses['tw']);
    });

    function updateSidebarStatus(gameId, isInstalled) {
        const sidebarIconMain = document.querySelector(`.sidebar-icon[data-id="${gameId}"]`)?.parentElement;
        if (sidebarIconMain) {
            const statusElement = sidebarIconMain.querySelector('.sidebar-icon-status');
            if (statusElement) {
                statusElement.style.backgroundColor = isInstalled ? '#8B5CF6' : '#ff7777';
                statusElement.style.display = 'block';
            }
        }
    }

    // Easter egg :0
    let versionClickCount = 0;
    const versionElement = document.getElementById('app-version');
    versionElement.style.cursor = 'pointer';
    versionElement.addEventListener('click', () => {
        versionClickCount++;
        if (versionClickCount >= 5) {
            const musicPlayer = document.getElementById('music-player');
            musicPlayer.classList.add('active');
            musicPlayer.volume = 1;
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

    const downloadPath = path.join(process.platform === 'linux' ? path.join(process.env.HOME || '~', '.local', 'share', 'ddnet') : path.join(process.env.APPDATA || process.env.HOME, 'TWLauncher', 'clients'));
    const downloadPathElse = path.join(downloadPath, 'assets');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }
    if (!fs.existsSync(downloadPathElse)) {
        fs.mkdirSync(downloadPathElse, { recursive: true });
    }

    setTimeout(() => {
        displayVersion();
    }, 500);

    let notifiedUpdates = new Set();

    async function checkClientUpdates() {
        try {
            const installPath = await ipcRenderer.invoke('get-install-path');
    
            const tclientData = games['tclient'];
            const tclientPath = path.join(installPath, tclientData.clientName);
            if (fs.existsSync(tclientPath)) {
                const currentTclientVersion = await getClientVersion(tclientPath);
                const release = await getLatestGitHubRelease(tclientData.githubRepo);
                const latestTclientVersion = release.tag_name;
    
                if (currentTclientVersion && currentTclientVersion !== latestTclientVersion && !notifiedUpdates.has('tclient')) {
                    console.log(`TClient update available: ${currentTclientVersion} -> ${latestTclientVersion}`);
                    ipcRenderer.send('show-update-notification', {
                        clientName: tclientData.clientName,
                        currentVersion: currentTclientVersion,
                        latestVersion: latestTclientVersion
                    });
                    notifiedUpdates.add('tclient');
                }
            }

            const chillerbotUxData = games['chillerbot-ux'];
            const chillerbotUxPath = path.join(installPath, tclientData.clientName);
            if (fs.existsSync(chillerbotUxPath)) {
                const currentChillerbotUxVersion = await getClientVersion(chillerbotUxPath);
                const release = await getLatestGitHubRelease(chillerbotUxData.githubRepo);
                const latestChillerbotUxVersion = release.tag_name;
    
                if (currentChillerbotUxVersion && currentChillerbotUxVersion !== latestChillerbotUxVersion && !notifiedUpdates.has('chillerbot-ux')) {
                    console.log(`chillerbot-ux update available: ${currentChillerbotUxVersion} -> ${latestChillerbotUxVersion}`);
                    ipcRenderer.send('show-update-notification', {
                        clientName: chillerbotUxData.clientName,
                        currentVersion: currentChillerbotUxVersion,
                        latestVersion: latestChillerbotUxVersion
                    });
                    notifiedUpdates.add('chillerbot-ux');
                }
            }

            const cactusData = games['cactus'];
            const cactusPath = path.join(installPath, cactusData.clientName);
            if (fs.existsSync(cactusPath)) {
                const currentCactusVersion = await getClientVersion(cactusPath);
                const versionResponse = await axios.get('https://cactus.denchik.top/info');
                const latestCactusVersion = versionResponse.data.version;
    
                if (currentCactusVersion && currentCactusVersion !== latestCactusVersion && !notifiedUpdates.has('cactus')) {
                    console.log(`Cactus update available: ${currentCactusVersion} -> ${latestCactusVersion}`);
                    ipcRenderer.send('show-update-notification', {
                        clientName: cactusData.clientName,
                        currentVersion: currentCactusVersion,
                        latestVersion: latestCactusVersion
                    });
                    notifiedUpdates.add('cactus');
                }
            }

            const ddnetData = games['ddnet'];
            const ddnetPath = path.join(installPath, ddnetData.clientName);
            if (fs.existsSync(ddnetPath)) {
                const currentDDNetVersion = await getClientVersion(ddnetPath);
                const latestDDNetVersion = await getLatestDDNetVersion();
    
                if (currentDDNetVersion && currentDDNetVersion !== latestDDNetVersion && !notifiedUpdates.has('ddnet')) {
                    console.log(`DDNet update available: ${currentDDNetVersion} -> ${latestDDNetVersion}`);
                    ipcRenderer.send('show-update-notification', {
                        clientName: ddnetData.clientName,
                        currentVersion: currentDDNetVersion,
                        latestVersion: latestDDNetVersion
                    });
                    notifiedUpdates.add('ddnet');
                }
            }

            const twData = games['tw'];
            const twPath = path.join(installPath, twData.clientName);
            if (fs.existsSync(twPath)) {
                const currentTWVersion = await getClientVersion(twPath);
                const latestTWVersion = '0.7.5'; // Fixed version for Teeworlds
    
                if (currentTWVersion && currentTWVersion !== latestTWVersion && !notifiedUpdates.has('tw')) {
                    console.log(`Teeworlds update available: ${currentTWVersion} -> ${latestTWVersion}`);
                    ipcRenderer.send('show-update-notification', {
                        clientName: twData.clientName,
                        currentVersion: currentTWVersion,
                        latestVersion: latestTWVersion
                    });
                    notifiedUpdates.add('tw');
                }
            }
        } catch (error) {
            console.error('Error checking client updates:', error);
        }
    }
    checkClientUpdates();
    setInterval(checkClientUpdates, 60 * 1000);

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
            installPathInput.value = path || path.join(process.platform === 'linux' ? path.join(process.env.HOME || '~', '.local', 'share', 'ddnet') : path.join(process.env.APPDATA || process.env.HOME, 'TWLauncher', 'clients'));
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
            enableSounds = enableSoundsToggle.checked;
            enableTransitions = enableTransitionsToggle.checked;
            transitionSpeed = parseFloat(transitionSpeedSelect.value);
            currentTheme = newTheme;
            ipcRenderer.send('save-settings', { 
                installPath: newInstallPath, 
                theme: newTheme,
                streamerMode,
                enableSounds,
                enableTransitions,
                transitionSpeed
            });
            document.body.className = `theme-${newTheme}${streamerMode ? ' streamer-mode' : ''}${enableTransitions ? '' : ' no-transitions'}`;
            updateTransitionSpeeds();
            if (settingsPage) settingsPage.classList.remove('active');
            updateDiscordRPC(document.querySelector('.sidebar-icon.active')?.getAttribute('id') || 'tw');

            const musicPlayer = document.getElementById('music-player');
            if (musicPlayer) {
                musicPlayer.volume = 1;
            }
        });
    }

    function updateTransitionSpeeds() {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
          .header.transition {
            transition: all ${transitionSpeed}s ease;
          }
          .sidebar.transition {
            transition: all ${transitionSpeed * 1.25}s ease;
          }
          .main-content {
            transition: 
              top ${transitionSpeed * 1.5}s ease,
              opacity ${transitionSpeed * 0.5}s ease;
          }
          .sidebar-icon, .sidebar-icon-main, .sidebar-icon-status {
            transition: all ${transitionSpeed * 0.3}s ease-in-out;
          }
          .settings-page, .content-browser-page, .info-page {
            transition: opacity ${transitionSpeed * 0.3}s ease;
          }
          .music-player {
            transition: right ${transitionSpeed * 0.5}s ease-in-out, opacity ${transitionSpeed * 0.3}s ease;
          }
        `;
        document.head.appendChild(styleElement);
    }

    enableTransitionsToggle.addEventListener('change', () => {
        const transitionSpeedSetting = document.querySelector('#transition-speed-setting');
        if (enableTransitionsToggle.checked) {
          transitionSpeedSetting.style.opacity = '1';
          transitionSpeedSetting.style.pointerEvents = 'auto';
        } else {
          transitionSpeedSetting.style.opacity = '0.5';
          transitionSpeedSetting.style.pointerEvents = 'none';
        }
    });

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

    ipcRenderer.on('apply-settings', (event, { theme, streamerMode, enableSounds: newEnableSounds, enableTransitions: newEnableTransitions, transitionSpeed: newTransitionSpeed }) => {
        currentTheme = theme;
        enableSounds = newEnableSounds !== undefined ? newEnableSounds : true;
        enableTransitions = newEnableTransitions !== undefined ? newEnableTransitions : true;
        transitionSpeed = newTransitionSpeed !== undefined ? parseFloat(newTransitionSpeed) : 1;
        document.body.className = `theme-${theme}${streamerMode ? ' streamer-mode' : ''}${enableTransitions ? '' : ' no-transitions'}`;
        themeSelect.value = theme;
        streamerModeToggle.checked = streamerMode;
        enableSoundsToggle.checked = enableSounds;
        enableTransitionsToggle.checked = enableTransitions;
        transitionSpeedSelect.value = transitionSpeed;
        updateTransitionSpeeds();
        updateDiscordRPC(document.querySelector('.sidebar-icon.active')?.getAttribute('id') || 'tw');
    });

    async function getLatestGitHubRelease(repo) {
        const response = await axios.get(`https://api.github.com/repos/${repo}/releases`);
        return response.data[0];
    }

    async function getLatestDDNetVersion() {
        try {
            const response = await axios.get('https://api.github.com/repos/ddnet/ddnet/tags');
            const tags = response.data;
            const versionTags = tags
                .map(tag => tag.name)
                .filter(name => /^\d+\.\d+$/.test(name))
                .sort((a, b) => {
                    const [aMajor, aMinor] = a.split('.').map(Number);
                    const [bMajor, bMinor] = b.split('.').map(Number);
                    return bMajor - aMajor || bMinor - aMinor;
                });
            return versionTags[0] || '19.2'; // Fallback to 19.2
        } catch (error) {
            console.error('Error fetching DDNet tags:', error);
            return '19.2'; // Fallback version
        }
    }

    async function getClientVersion(clientPath) {
        const versionFile = path.join(clientPath, 'clientver.txt');
        return fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null;
    }

    async function downloadAndInstallFromGithub(button, clientName, folderName) {
        const gameData = games[clientName];
        const installPath = await ipcRenderer.invoke('get-install-path');
        const clientPath = path.join(installPath, gameData.clientName);
        const tempZipPath = path.join(os.tmpdir(), process.platform === 'linux' ? `${folderName}-ubuntu.tar.xz` : `${folderName}-windows.zip`);
    
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
            const downloadUrl = process.platform === 'linux'
                ? `https://github.com/${gameData.githubRepo}/releases/download/${version}/${folderName}-ubuntu.tar.xz`
                : `https://github.com/${gameData.githubRepo}/releases/download/${version}/${folderName}-windows.zip`;
    
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
            if (process.platform === 'linux') {
                const { execSync } = require('child_process');
                try {
                    execSync(`tar -xJf "${tempZipPath}" -C "${installPath}"`);
                    progressBar.style.width = '70%';
                } catch (err) {
                    throw new Error(`Failed to extract tar.xz: ${err.message}`);
                }
            } else {
                const zip = new AdmZip(tempZipPath);
                await new Promise((resolve, reject) => {
                    zip.extractAllToAsync(installPath, true, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
                progressBar.style.width = '70%';
            }
    
            statusText.textContent = 'Renaming Folder...';
            let extractedFolder;
            if (process.platform === 'linux') {
                const extractedFiles = fs.readdirSync(installPath).filter(file => 
                    fs.statSync(path.join(installPath, file)).isDirectory()
                );
                extractedFolder = extractedFiles.find(file => file !== gameData.clientName) || folderName;
                console.log('Extracted folders:', extractedFiles);
            } else {
                extractedFolder = new AdmZip(tempZipPath).getEntries()[0].entryName.split('/')[0];
            }
            const oldFolderPath = path.join(installPath, extractedFolder);
            if (fs.existsSync(clientPath)) fs.rmSync(clientPath, { recursive: true });
            if (fs.existsSync(oldFolderPath)) {
                fs.renameSync(oldFolderPath, clientPath);
            } else {
                throw new Error(`Extracted folder not found at ${oldFolderPath}. Available folders: ${fs.readdirSync(installPath).join(', ')}`);
            }
            progressBar.style.width = '90%';
    
            statusText.textContent = 'Writing Version...';
            fs.writeFileSync(path.join(clientPath, 'clientver.txt'), version);
            progressBar.style.width = '100%';
    
            notifiedUpdates.delete(clientName);
            setTimeout(() => updateGameContent(clientName), 500);
        } catch (err) {
            console.error('Install error:', err);
            statusText.textContent = 'Installation Failed';
            progressBar.style.width = '0%';
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-download"></i> INSTALL';
        }
    }

    async function downloadAndInstallTClient(button) {
		downloadAndInstallFromGithub(button, 'tclient', 'TClient')
    }

    async function downloadAndInstallChillerbotUx(button) {
		downloadAndInstallFromGithub(button, 'chillerbot-ux', 'chillerbot-ux')
    }

    async function downloadAndInstallCactus(button) {
        const gameData = games['cactus'];
        const installPath = await ipcRenderer.invoke('get-install-path');
        const clientPath = path.join(installPath, gameData.clientName);
        const tempZipPath = path.join(os.tmpdir(), process.platform === 'linux' ? 'CactusClient.tar.xz' : 'Cactus-windows.zip');
    
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
            const latestVersion = versionResponse.data.version;
    
            statusText.textContent = 'Downloading...';
            progressBar.style.width = '0%';
            const downloadUrl = process.platform === 'linux' ? 'https://cactus.denchik.top/linux' : 'https://cactus.denchik.top/windows';
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
            if (process.platform === 'linux') {
                const { execSync } = require('child_process');
                try {
                    execSync(`tar -xJf "${tempZipPath}" -C "${installPath}"`);
                    progressBar.style.width = '70%';
                } catch (err) {
                    throw new Error(`Failed to extract tar.xz: ${err.message}`);
                }
            } else {
                const zip = new AdmZip(tempZipPath);
                await new Promise((resolve, reject) => {
                    zip.extractAllToAsync(installPath, true, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
                progressBar.style.width = '70%';
            }
    
            statusText.textContent = 'Renaming Folder...';
            let extractedFolder;
            if (process.platform === 'linux') {
                const extractedFiles = fs.readdirSync(installPath).filter(file => 
                    fs.statSync(path.join(installPath, file)).isDirectory()
                );
                extractedFolder = extractedFiles.find(file => file !== gameData.clientName) || 'Cactus';
                console.log('Extracted folders:', extractedFiles);
            } else {
                extractedFolder = new AdmZip(tempZipPath).getEntries()[0].entryName.split('/')[0];
            }
            const oldFolderPath = path.join(installPath, extractedFolder);
            if (fs.existsSync(clientPath)) fs.rmSync(clientPath, { recursive: true });
            if (fs.existsSync(oldFolderPath)) {
                fs.renameSync(oldFolderPath, clientPath);
            } else {
                throw new Error(`Extracted folder not found at ${oldFolderPath}. Available folders: ${fs.readdirSync(installPath).join(', ')}`);
            }
            progressBar.style.width = '90%';
    
            statusText.textContent = 'Writing Version...';
            fs.writeFileSync(path.join(clientPath, 'clientver.txt'), latestVersion);
            progressBar.style.width = '100%';
    
            notifiedUpdates.delete('cactus');
            setTimeout(() => updateGameContent('cactus'), 500);
        } catch (err) {
            console.error('Cactus install error:', err);
            statusText.textContent = 'Installation Failed';
            progressBar.style.width = '0%';
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-download"></i> INSTALL';
        }
    }

    async function downloadAndInstallDDNet(button) {
        const gameData = games['ddnet'];
        const installPath = await ipcRenderer.invoke('get-install-path');
        const clientPath = path.join(installPath, gameData.clientName);
        const tempZipPath = path.join(os.tmpdir(), process.platform === 'linux' ? 'DDNet-linux.tar.xz' : 'DDNet-windows.zip');
    
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INSTALLING...';
        button.disabled = true;
        const progressBar = button.querySelector('.progress-bar') || document.createElement('div');
        progressBar.className = 'progress-bar';
        button.appendChild(progressBar);
        const statusText = button.parentElement.querySelector('.status-text') || document.createElement('div');
        statusText.className = 'status-text';
        button.parentElement.appendChild(statusText);
    
        try {
            const version = await getLatestDDNetVersion();
            const downloadUrl = process.platform === 'linux' 
                ? `https://ddnet.org/downloads/DDNet-${version}-linux_x86_64.tar.xz`
                : `https://ddnet.org/downloads/DDNet-${version}-win64.zip`;
    
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
            if (process.platform === 'linux') {
                const { execSync } = require('child_process');
                try {
                    execSync(`tar -xJf "${tempZipPath}" -C "${installPath}"`);
                    progressBar.style.width = '70%';
                } catch (err) {
                    throw new Error(`Failed to extract tar.xz: ${err.message}`);
                }
            } else {
                const zip = new AdmZip(tempZipPath);
                await new Promise((resolve, reject) => {
                    zip.extractAllToAsync(installPath, true, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
                progressBar.style.width = '70%';
            }
    
            statusText.textContent = 'Renaming Folder...';
            let extractedFolder;
            if (process.platform === 'linux') {
                const extractedFiles = fs.readdirSync(installPath).filter(file => 
                    fs.statSync(path.join(installPath, file)).isDirectory()
                );
                extractedFolder = extractedFiles.find(file => file !== gameData.clientName) || 'DDNet';
                console.log('Extracted folders:', extractedFiles);
            } else {
                extractedFolder = new AdmZip(tempZipPath).getEntries()[0].entryName.split('/')[0];
            }
            const oldFolderPath = path.join(installPath, extractedFolder);
            if (fs.existsSync(clientPath)) fs.rmSync(clientPath, { recursive: true });
            if (fs.existsSync(oldFolderPath)) {
                fs.renameSync(oldFolderPath, clientPath);
            } else {
                throw new Error(`Extracted folder not found at ${oldFolderPath}. Available folders: ${fs.readdirSync(installPath).join(', ')}`);
            }
            progressBar.style.width = '90%';
    
            statusText.textContent = 'Writing Version...';
            fs.writeFileSync(path.join(clientPath, 'clientver.txt'), version);
            progressBar.style.width = '100%';

            notifiedUpdates.delete('ddnet');

            setTimeout(() => updateGameContent('ddnet'), 500);
        } catch (err) {
            console.error('DDNet install error:', err);
            statusText.textContent = 'Installation Failed';
            progressBar.style.width = '0%';
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-download"></i> INSTALL';
        }
    }

    async function downloadAndInstallTeeworlds(button) {
        const gameData = games['tw'];
        const installPath = await ipcRenderer.invoke('get-install-path');
        const clientPath = path.join(installPath, gameData.clientName);
        const tempZipPath = path.join(os.tmpdir(), process.platform === 'linux' ? 'Teeworlds-linux.tar.gz' : 'Teeworlds-windows.zip');
    
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INSTALLING...';
        button.disabled = true;
        const progressBar = button.querySelector('.progress-bar') || document.createElement('div');
        progressBar.className = 'progress-bar';
        button.appendChild(progressBar);
        const statusText = button.parentElement.querySelector('.status-text') || document.createElement('div');
        statusText.className = 'status-text';
        button.parentElement.appendChild(statusText);
    
        try {
            const version = '0.7.5'; // Fixed version for Teeworlds
            const downloadUrl = process.platform === 'linux' 
                ? `https://github.com/teeworlds/teeworlds/releases/download/${version}/teeworlds-${version}-linux_x86_64.tar.gz`
                : `https://github.com/teeworlds/teeworlds/releases/download/${version}/teeworlds-${version}-win64.zip`;
    
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
            if (process.platform === 'linux') {
                const { execSync } = require('child_process');
                try {
                    execSync(`tar -zxf "${tempZipPath}" -C "${installPath}"`);
                    progressBar.style.width = '70%';
                } catch (err) {
                    throw new Error(`Failed to extract tar.gz: ${err.message}`);
                }
            } else {
                const zip = new AdmZip(tempZipPath);
                await new Promise((resolve, reject) => {
                    zip.extractAllToAsync(installPath, true, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
                progressBar.style.width = '70%';
            }
    
            statusText.textContent = 'Renaming Folder...';
            let extractedFolder;
            if (process.platform === 'linux') {
                const extractedFiles = fs.readdirSync(installPath).filter(file => 
                    fs.statSync(path.join(installPath, file)).isDirectory()
                );
                extractedFolder = extractedFiles.find(file => file !== gameData.clientName && file.includes('teeworlds')) || 'teeworlds-0.7.5-linux_x86_64';
                console.log('Extracted folders for Teeworlds:', extractedFiles);
            } else {
                extractedFolder = new AdmZip(tempZipPath).getEntries()[0].entryName.split('/')[0];
            }
                const oldFolderPath = path.join(installPath, extractedFolder);
                if (fs.existsSync(clientPath)) fs.rmSync(clientPath, { recursive: true });
                if (fs.existsSync(oldFolderPath)) {
                fs.renameSync(oldFolderPath, clientPath);
            } else {
                throw new Error(`Extracted folder not found at ${oldFolderPath}. Available folders: ${fs.readdirSync(installPath).join(', ')}`);
            }
                progressBar.style.width = '90%';
    
            statusText.textContent = 'Writing Version...';
            fs.writeFileSync(path.join(clientPath, 'clientver.txt'), version);
            progressBar.style.width = '100%';

            notifiedUpdates.delete('tw');

            setTimeout(() => updateGameContent('tw'), 500);
        } catch (err) {
            console.error('Teeworlds install error:', err);
            statusText.textContent = 'Installation Failed';
            progressBar.style.width = '0%';
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-download"></i> INSTALL';
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
            if (gameData.unavailableOnLinux && process.platform === 'linux') {
                resolve(null);
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

    async function updateGameContent(gameId, forceStatus = null) {
        console.log('Updating game content for:', gameId);
        const gameData = games[gameId];
        if (!gameData) {
            console.error('No game data for:', gameId);
            return;
        }
        const isLinux = process.platform === 'linux';
        const folderPath = await getGamePath(gameData);
        const hasFolder = !!folderPath;
        let buttonClass, buttonText, buttonIcon, statusColor;

        if (isLinux && gameData.unavailableOnLinux) {
            buttonClass = 'unavailable-btn';
            buttonText = 'UNAVAILABLE';
            buttonIcon = 'fas fa-ban';
            statusColor = '#ff7777';
        } else if (gameId === 'cactus') {
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
        } else if (gameId === 'ddnet') {
            const latestVersion = await getLatestDDNetVersion();
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
        } else if (gameId === 'tw') {
            const latestVersion = '0.7.5';
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
                <button class="${buttonClass}" ${buttonClass === 'unavailable-btn' ? 'disabled' : ''} onclick="playClick()" data-steam-id="${gameData.steamAppId || ''}">
                    <i class="${buttonIcon}"></i> ${buttonText}
                    <div class="progress-bar" style="width: 0%"></div>
                </button>
                ${hasFolder ? `<i class="fas fa-folder folder-icon" data-path="${folderPath || ''}"></i>` : ''}
                ${hasFolder && gameData.clientName && !gameData.unavailableOnLinux ? `<i class="fas fa-trash delete-icon" onclick="playOpen()" data-path="${folderPath || ''}" data-client="${gameData.clientName}"></i>` : ''}
            </div>
        `;

        updateSidebarStatus(gameId, hasFolder);
    
        const actionButton = gameContainer.querySelector(`.${buttonClass}`);
        if (buttonClass !== 'unavailable-btn') {
            actionButton.addEventListener('click', async () => {
                playClick();
                if (buttonClass === 'install-btn' || buttonClass === 'update-btn') {
                    if (gameId === 'cactus') {
                        await downloadAndInstallCactus(actionButton);
                    } else if (gameId === 'ddnet') {
                        await downloadAndInstallDDNet(actionButton);
                    } else if (gameId === 'tw') {
                        await downloadAndInstallTeeworlds(actionButton);
                    } else if (gameId === 'tclient') {
                        await downloadAndInstallTClient(actionButton);
                    } else if (gameId === 'chillerbot-ux') {
                        await downloadAndInstallChillerbotUx(actionButton);
                    }
                } else if (buttonClass === 'launch-btn' && hasFolder) {
                    console.log(`Sending launch request for ${gameId}`);
                    ipcRenderer.send('launch-game', gameId);
                }
            });
        }
    
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

    const games = {
        'tw': {
            logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Teeworlds_logo.png',
            image: 'https://www.teeworlds.com/images/screens/screenshot_grass.png',
            icon: 'https://avatars.githubusercontent.com/u/705559',
            clientName: 'Teeworlds',
            smallName: 'tw',
            executable: process.platform === 'linux' ? 'teeworlds' : 'teeworlds.exe'
        },
        'ddnet': {
            logo: 'https://cdn2.steamgriddb.com/logo_thumb/77d3dc866959ff8e2ec72beceaa43a92.png',
            image: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/412220/library_hero_2x.jpg?t=1733738444',
            icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/412220/4fb73658f000e318c8abc88b98fb2ddb27f1288b.ico',
            clientName: 'DDraceNetwork',
            smallName: 'ddnet',
            executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe'
        },
        'tclient': {
            logo: 'assets/fulllogos/tclient.png',
            image: 'assets/bgs/tclient.png',
            icon: 'assets/logos/tclient.png',
            clientName: 'TClient',
            smallName: 'tclient',
            githubRepo: 'sjrc6/TaterClient-ddnet',
            executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe'
        },
        'cactus': {
            logo: 'assets/fulllogos/cactus.png',
            image: 'assets/bgs/cactus.png',
            icon: 'assets/logos/cactus.png',
            smallName: 'cactus',
            clientName: 'Cactus',
            executable: process.platform === 'linux' ? 'DDNet' : 'DDNet.exe'
        },
        'chillerbot-ux': {
            logo: 'assets/fulllogos/chillerbot-ux.png',
            image: 'assets/bgs/chillerbot-ux.png',
            smallName: 'ux',
            icon: 'https://avatars.githubusercontent.com/u/45486474',
            clientName: 'chillerbot-ux',
            githubRepo: 'chillerbot/chillerbot-ux',
            executable: process.platform === 'linux' ? 'chillerbot-ux' : 'chillerbot-ux.exe'
        }
    };

    const apis = {
        skins: 'https://teedata.net/api/skin/read?status=accepted',
        game: 'https://teedata.net/api/gameskin/read?status=accepted',
        emoticons: 'https://teedata.net/api/emoticon/read?status=accepted',
        particles: 'https://teedata.net/api/particle/read?status=accepted',
        entities: 'https://teedata.net/api/entity/read?status=accepted'
    };

    updateGameContent('tw');

    const skinsTab = document.querySelector('.tab-btn[data-tab="skins"]');
    if (skinsTab) {
        skinsTab.click();
    }
});
