@echo off
title ConversorG - Conversor de PDF Profesional
chcp 65001 >nul
cls

echo ======================================================================
echo    ____                                              ____ 
echo   / ___|___  _ ____   _____ _ __ ___  ___  _ __ / ___^|
echo  ^| ^|   / _ \^| '_ \ \ / / _ \ '__/ __^|/ _ \^| '__^| ^|  _ 
echo  ^| ^|__^| (_) ^| ^| ^| \ V /  __/ ^|  \__ \ (_) ^| ^|  ^| ^|_^| ^|
echo   \____\___/^|_^| ^|_^|\_/ \___^|_^|  ^|___/\___/^|_^|   \____^|
echo ======================================================================
echo   DESARROLLADO POR: Estiven Garces
echo   CORREO:           estivenabreo@gmail.com
echo   DISPOSITIVOS:     Windows PC y Celular Android (WiFi Local)
echo ======================================================================
echo.
echo [1/2] Iniciando servidor local en segundo plano...
echo [2/2] Abriendo interfaz en el navegador web...
echo.

start "" "http://localhost:3000"
node server.js

pause
