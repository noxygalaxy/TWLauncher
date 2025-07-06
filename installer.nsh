!macro customInit
  ; Custom initialization code can go here
!macroend

!macro customInstall
  ; Custom installation steps
  CreateDirectory "$INSTDIR\resources"
  SetOutPath "$INSTDIR"
  File /r "src\*.*"
  File "main.js"
  File "mod.json"
!macroend

!macro customUninstall
  ; Custom uninstallation steps
  Delete "$INSTDIR\resources\*.*"
  RMDir "$INSTDIR\resources"
  Delete "$INSTDIR\main.js"
  Delete "$INSTDIR\mod.json"
!macroend