@echo off
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 iniciar.py
    pause
    exit /b
)
python --version >nul 2>&1
if not errorlevel 1 (
    python iniciar.py
    pause
    exit /b
)
echo Python 3 nao foi encontrado.
echo Instale pelo site https://www.python.org/downloads/ ou use o Live Server no VS Code.
echo Consulte o arquivo LEIA-PRIMEIRO.txt.
pause
