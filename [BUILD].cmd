@echo off
echo Choose build option:
echo 1. Build Separate Files
echo 2. Build Single File
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo Running Build Separate Files...
    npm run build:rpgmv
) else if "%choice%"=="2" (
    echo Running Build Single File...
    npm run build:rpgmv:rollup
) else (
    echo Invalid choice.
)

pause