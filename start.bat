@echo off
REM RudyProtect - Scripts de démarrage

echo.
echo ==========================================
echo      RudyProtect v2.0 - Démarrage
echo ==========================================
echo.

REM Vérifier Node.js
where /q node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js non trouvé! Installez-le d'abord.
    exit /b 1
)

REM Vérifier PHP
where /q php >nul 2>nul
if errorlevel 1 (
    echo ❌ PHP non trouvé! Installez-le d'abord.
    exit /b 1
)

echo ✓ Node.js et PHP détectés
echo.
echo Choisissez une option: