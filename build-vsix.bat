@echo off
setlocal

cd /d "%~dp0"

where bun >nul 2>nul
if errorlevel 1 (
  echo Error: bun was not found on PATH.
  echo Install Bun first, then run this script again.
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call bun install
  if errorlevel 1 exit /b 1
)

for /f "usebackq delims=" %%V in (`bun -e "const pkg = await Bun.file('packages/kilo-vscode/package.json').json(); console.log(pkg.version)"`) do set "VERSION=%%V"
if not defined VERSION (
  echo Error: failed to read packages\kilo-vscode\package.json version.
  exit /b 1
)

set "OUT=%CD%\dist-vsix"
set "VSIX=%OUT%\kilo-code-%VERSION%.vsix"

if not exist "%OUT%" mkdir "%OUT%"
if errorlevel 1 exit /b 1

echo Building Kilo Code VS Code extension...
pushd packages\kilo-vscode
call bun run package
if errorlevel 1 (
  popd
  exit /b 1
)

echo Packaging VSIX...
call bunx vsce package --no-dependencies --skip-license -o "%VSIX%"
if errorlevel 1 (
  popd
  exit /b 1
)
popd

echo.
echo VSIX created:
echo %VSIX%
