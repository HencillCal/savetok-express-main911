#!/usr/bin/env bash
# Run the Udemy scraper service locally
python -m uvicorn app:app --host 127.0.0.1 --port 8080
