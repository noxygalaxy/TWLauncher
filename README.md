<div align="center">
  <div>
    <img src="src/assets/logos/twl.png" width="150" alt="TWL Logo"/>  
  </div>
  <h1>TWLauncher</h1>
  <img src="https://img.shields.io/github/downloads/noxygalaxy/twlauncher/total?style=for-the-badge"></img>  
  <a href="https://discord.gg/mwPZAQwrDB"><img src="https://dcbadge.limes.pink/api/server/yvvJW2z9zB"></img></a>  
  <img src="https://img.shields.io/github/created-at/noxygalaxy/twlauncher?style=for-the-badge"></img>  
</div>

Teeworlds Launcher ( or TWL ) is a windows application designed to manage and launch various Teeworlds clients easily. It provides a modern interface to launch Teeworlds most popular clients, with features like automatic updates.

## Features

- **Game Management**: Launch all most popular clients.
- **Steam Integration**: Detects and launches Steam-installed clients.
- **Clients Support**: Downloads clients always with LATEST version.
- **System Tray**: Minimize to tray with quick access menu.
- **Modern UI**: Customizable interface with a nice modern design.
- **Auto Updates**: Check and update clients to the latest versions.
- **Cross-Platform**: Built with Electron for potential multi-platform support (currently Windows-focused).

## Dependencies

- `electron`: Framework for building desktop applications
- `electron-builder`: To build `electron`-based apps.
- `winreg`: Windows registry access for Steam path detection
- `axios`: HTTP client for downloading updates
- `adm-zip`: ZIP file handling for client installation
- `font-awesome`: Icons for the UI

## Usage

1. Launch the application
2. Use the sidebar to select a client
3. Click "INSTALL" to download and new client OR Click "LAUNCH" to start an installed game
5. Use the tray icon to minimize or access quick launch options
6. Click the "?" icon for more information and links

## Supported Clients

- **Teeworlds** - Steam
- **DDraceNetwork** - Steam
- **TClient**
- **CactusClient**

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

Report issues at: https://github.com/noxygalaxy/twlauncher/issues

## Credits

- Created by [@noxygalaxy](https://noxy.netlify.app)
- Made with love <3

## License

This project is open-source and available under the [MIT License](LICENSE).

## Support

- Discord: https://discord.gg/mwPZAQwrDB
- Telegram: https://t.me/twlauncher
- Website: https://twlauncher.netlify.app
