@echo off
title PolicyPilot RAG - Backend API (Port 8000)
echo ===================================================
echo Starting PolicyPilot RAG FastAPI Backend
echo URL: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo ===================================================
call .venv\Scripts\activate.bat
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
pause
