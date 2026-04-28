@echo off
setlocal

echo ============================================
echo  MACI/SRESEAUX - Build Frontend + Backend
echo ============================================
echo.

:: --- Frontend (Angular) ---
echo [1/2] Build Frontend (Angular)...
echo --------------------------------------------
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installation des dependances npm...
    call npm run deps:install
    if errorlevel 1 (
        echo ERREUR: npm install a echoue.
        exit /b 1
    )
)
echo Note: ce script build l'application mais ne met pas a jour les dependances.
echo Pour mettre a jour les paquets frontend, utilisez: npm run deps:update
call npm run build
if errorlevel 1 (
    echo ERREUR: Build frontend echoue.
    exit /b 1
)
echo Frontend OK.
echo.

:: --- Backend (Spring Boot / Maven) ---
echo [2/2] Build Backend (Spring Boot)...
echo --------------------------------------------
cd /d "%~dp0backend"
call mvn package -DskipTests -q
if errorlevel 1 (
    echo ERREUR: Build backend echoue.
    exit /b 1
)
echo Backend OK.
echo.

echo ============================================
echo  Build termine avec succes.
echo  - Frontend : frontend\dist\frontend
echo  - Backend  : backend\target\backend-0.0.1-SNAPSHOT.jar
echo ============================================

docker compose up --build
endlocal
