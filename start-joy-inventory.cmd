@echo off
setlocal

cd /d "%~dp0"

set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if exist "%BUNDLED_NODE%" (
  set "NODE_EXE=%BUNDLED_NODE%"
) else (
  set "NODE_EXE=node"
)

echo Starting JoyInventory...
echo Open http://localhost:3000 in your browser.
echo.

"%NODE_EXE%" server.js

echo.
echo JoyInventory server stopped.
pause
