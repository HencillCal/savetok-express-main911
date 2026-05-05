FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/requirements.txt

# Install system deps (including Playwright dependencies) and Python packages
RUN apt-get update && \
        apt-get install -y --no-install-recommends \
            gcc libbz2-dev libssl-dev libffi-dev ca-certificates wget gnupg \
            libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libxdamage1 libgbm1 libgtk-3-0 libasound2 libpangocairo-1.0-0 libxss1 \
        && python -m pip install --upgrade pip setuptools wheel \
        && pip install --no-cache-dir -r requirements.txt \
        && python -m playwright install --with-deps chromium || true \
        && apt-get purge -y --auto-remove gcc wget gnupg \
        && rm -rf /var/lib/apt/lists/*

COPY . /app
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
