FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2 (PostgreSQL)
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requerimientos e instalar
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend y frontend
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Cambiar el directorio de trabajo al backend donde está main.py
WORKDIR /app/backend

# Exponer el puerto
EXPOSE 8000

# Iniciar el servidor web
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
