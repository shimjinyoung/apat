@echo off
REM Scheduled pipeline run. Windows Task Scheduler calls this daily.
REM Can also be run manually by double-clicking.

cd /d "%~dp0"

set LOGFILE=logs\pipeline.log

echo. >> "%LOGFILE%"
echo ===== %date% %time% ===== >> "%LOGFILE%"

".venv\Scripts\python.exe" -m data_pipeline.run >> "%LOGFILE%" 2>&1
".venv\Scripts\python.exe" -m data_pipeline.export_json >> "%LOGFILE%" 2>&1
".venv\Scripts\python.exe" -m data_pipeline.export_history >> "%LOGFILE%" 2>&1

echo ===== done ===== >> "%LOGFILE%"
