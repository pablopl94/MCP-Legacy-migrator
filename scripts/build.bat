@echo off
echo 🛠️ Building Legacy VB to C# Migrator...

echo 🧹 Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist coverage rmdir /s /q coverage

echo 📦 Installing dependencies...
call npm install

echo 🔨 Building TypeScript...
call npm run build

echo ✅ Build completed successfully!
echo 📁 Distribution files are in dist/

echo 🧪 Testing the build...
node dist/index.js --version

echo 🎉 Ready to use!
echo.
echo Usage examples:
echo   node dist/index.js --help
echo   node dist/mcp-server.js
echo.
pause
