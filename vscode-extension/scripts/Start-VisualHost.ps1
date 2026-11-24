param([int]$Port = 9338)
$ErrorActionPreference = 'Stop'
$packageRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$visualDirectory = Join-Path $packageRoot '.runtime\visual'
$profile = Join-Path $visualDirectory 'profile'
$settingsDirectory = Join-Path $profile 'User'
[void][IO.Directory]::CreateDirectory($settingsDirectory)
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "Port $Port is already occupied; reuse the task host or choose another port" }
$codePath = if ($env:VSCODE_EXE) { $env:VSCODE_EXE } else { 'C:\Program Files\Microsoft VS Code\Code.exe' }
if (-not (Test-Path -LiteralPath $codePath -PathType Leaf)) { throw 'Install desktop VS Code or set VSCODE_EXE to Code.exe' }
$settings = @{
  'workbench.startupEditor'='none'; 'window.restoreWindows'='none'; 'files.hotExit'='off'
  'window.title'='PJ1 Phase 2 - SVG verification'
  'window.zoomLevel'=0; 'editor.fontSize'=18; 'editor.minimap.enabled'=$false
  'explorer.compactFolders'=$false; 'explorer.decorations.badges'=$true
  'outline.collapseItems'='alwaysExpand'; 'outline.followCursor'=$false
  'workbench.colorTheme'='Default Dark Modern'
  'workbench.secondarySideBar.defaultVisibility'='hidden'
  'git.openRepositoryInParentFolders'='never'
  'workbench.editorAssociations'=@{'*.svg'='default'}
  'telemetry.telemetryLevel'='off'; 'update.mode'='none'
}
$encoding = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $settingsDirectory 'settings.json'),($settings | ConvertTo-Json),$encoding)
$env:P2_VISUAL_DIR = $visualDirectory
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
foreach ($name in @('state.json','request.json')) {
  $target = Join-Path $visualDirectory $name
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
}
$launchArgs = @(
  '--new-window','--disable-updates','--disable-workspace-trust','--skip-welcome','--skip-release-notes'
  '--disable-gpu','--disable-renderer-backgrounding','--disable-background-timer-throttling'
  "--remote-debugging-port=$Port",'--remote-debugging-address=127.0.0.1'
  ('--user-data-dir="'+$profile+'"')
  ('--extensions-dir="'+(Join-Path $visualDirectory 'extensions')+'"')
  ('--extensionDevelopmentPath="'+$packageRoot+'"')
  ('--extensionTestsPath="'+(Join-Path $packageRoot 'test\visual-host.cjs')+'"')
  ('"'+(Join-Path $packageRoot 'examples')+'"')
)
$process = Start-Process -FilePath $codePath -ArgumentList $launchArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $visualDirectory 'stdout.log') -RedirectStandardError (Join-Path $visualDirectory 'stderr.log')
@{pid=$process.Id;port=$Port;directory=$visualDirectory} | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $visualDirectory 'launcher.json')
Write-Output "Started isolated task host PID=$($process.Id), port=$Port"
