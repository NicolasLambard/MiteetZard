@echo off
cls
echo ====================================================================
echo =     Demarrage de l'application Mite & Zard avec acces mobile     =
echo ====================================================================

echo.
echo [1/4] Fermeture des processus existants...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>NUL
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8100') do (
    taskkill /F /PID %%a 2>NUL
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4040') do (
    taskkill /F /PID %%a 2>NUL
)
timeout /t 2 /nobreak > NUL

echo.
echo [2/4] Demarrage de l'API (port 3000)...
start cmd /k "echo === API MITE & ZARD (PORT 3000) === & echo. & node server.js"

echo.
echo [3/4] Demarrage du frontend avec parametres pour acces externe...
start cmd /k "echo === FRONTEND MITE & ZARD (PORT 8100) === & echo. & echo Demarrage avec support des connexions externes... & ionic serve --external --host=0.0.0.0 --disable-host-check --address=0.0.0.0"

echo.
echo [4/4] Attente du demarrage complet des services (15 secondes)...
echo Preparation de l'acces mobile...
timeout /t 15 /nobreak > NUL
echo Demarrage du tunnel ngrok...
start cmd /k "title Acces Mobile via Ngrok & echo === ACCES MOBILE VIA NGROK === & echo. & echo Tunnel pour le FRONTEND (port 8100)... & echo. & echo LIENS D'ACCES MOBILE: & echo. & ngrok http --host-header=rewrite 8100"

echo.
echo ====================================================================
echo =         ACCES A L'APPLICATION MITE & ZARD                        =
echo ====================================================================
echo.
echo Acces local (sur cet ordinateur):
echo - API:      http://localhost:3000
echo - Frontend: http://localhost:8100
echo.
echo Acces mobile (telephone, tablette):
echo - Regardez la fenetre "Acces Mobile via Ngrok"
echo - Utilisez le lien https:// a cote de "Forwarding"
echo - Copiez ce lien sur votre telephone mobile
echo.
echo IMPORTANT:
echo - Si vous voyez encore une erreur ngrok, fermez toutes les fenetres 
echo   et relancez le script
echo - Verifiez que le port 8100 est bien ouvert (pas bloque par le firewall)
echo.
echo ====================================================================
echo.
echo L'application est en cours d'execution.
echo Pour tout arreter, fermez simplement toutes les fenetres.
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause > NUL 