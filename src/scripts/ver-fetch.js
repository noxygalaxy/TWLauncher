async function compareVersions(currentVersion, newVersion) {
    currentVersion = currentVersion.replace(/^v/, '');
    newVersion = newVersion.replace(/^v/, '');

    const currParts = currentVersion.split('-');
    const newParts = newVersion.split('-');
    const currMain = currParts[0].split('.').map(Number);
    const newMain = newParts[0].split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        if (newMain[i] > currMain[i]) return true;
        if (newMain[i] < currMain[i]) return false;
    }

    if (currParts[1] && !newParts[1]) return false;
    if (!currParts[1] && newParts[1]) return true;
    if (!currParts[1] && !newParts[1]) return false;

    const currBeta = parseInt(currParts[1].match(/\d+$/)[0], 10);
    const newBeta = parseInt(newParts[1].match(/\d+$/)[0], 10);
    return newBeta > currBeta;
}

async function checkForUpdates() {
    try {
        const response = await fetch('https://api.github.com/repos/noxygalaxy/TWLauncher/releases');
        if (!response.ok) throw new Error('Failed to fetch releases');
        
        const releases = await response.json();
        const latestRelease = releases[0];
        const latestVersion = latestRelease.tag_name;
        const currentVersion = await ipcRenderer.invoke('get-version');
        
        const updateBanner = document.getElementById('update-banner');
        if (!updateBanner) throw new Error('Update banner element not found');

        if (await compareVersions(currentVersion, latestVersion)) {
            updateBanner.style.display = 'flex';
            updateBanner.innerHTML = `
                Update Available: ${currentVersion} -> ${latestVersion}
                <a href="${latestRelease.html_url}" target="_blank" class="update-link">Download</a>
            `;
        } else {
            updateBanner.style.display = 'none';
        }

        const versionElement = document.getElementById('app-version');
        if (!versionElement) throw new Error('Version element not found');
        versionElement.textContent = `v${currentVersion}`;
    } catch (error) {
        console.error('Error checking for updates:', error);
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            versionElement.textContent = 'Error Loading Version';
        }
        const updateBanner = document.getElementById('update-banner');
        if (updateBanner) {
            updateBanner.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', checkForUpdates);