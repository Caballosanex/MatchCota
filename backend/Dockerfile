FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# Retry amb --fix-missing per problemes de xarxa temporals
RUN apt-get update && \
    apt-get install -y --no-install-recommends --fix-missing \
    gcc \
    libpq-dev \
    || (apt-get update && apt-get install -y --no-install-recommends --fix-missing gcc libpq-dev) \
    # Clean up immediately to reduce image size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Command will be overridden in docker-compose.yml for dev
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
