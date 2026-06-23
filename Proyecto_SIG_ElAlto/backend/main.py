import os
import jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from database import obtener_conexion

# ¡Esta es la línea clave! Debe llamarse "app" en minúsculas
app = FastAPI()

# Configuración de CORS para que tu mapa se conecte sin problemas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# CONFIGURACIÓN DE SEGURIDAD (ADMIN)
# ==========================================
from dotenv import load_dotenv
load_dotenv() # Cargar variables del .env

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "mi_contraseña_secreta_123")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "clave_secreta_super_larga_y_dificil_de_adivinar_123")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def verificar_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="No tienes permisos")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

class LoginRequest(BaseModel):
    password: str

class InstitucionCreate(BaseModel):
    nombre: str
    tipo: str
    distrito: int
    oferta_academica: str
    longitud: float
    latitud: float

@app.post("/api/login")
def login(request: LoginRequest):
    if request.password == ADMIN_PASSWORD:
        token = jwt.encode(
            {"role": "admin", "exp": datetime.utcnow() + timedelta(hours=24)},
            JWT_SECRET_KEY,
            algorithm=ALGORITHM
        )
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Contraseña incorrecta")

@app.post("/api/instituciones")
def crear_institucion(inst: InstitucionCreate, token: str = Depends(verificar_token)):
    conn = None
    try:
        conn = obtener_conexion()
        with conn.cursor() as cursor:
            query = """
                INSERT INTO instituciones (nombre, tipo, distrito, oferta_academica, longitud, latitud, geom)
                VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            """
            cursor.execute(query, (
                inst.nombre, inst.tipo, inst.distrito, inst.oferta_academica,
                inst.longitud, inst.latitud, inst.longitud, inst.latitud
            ))
            conn.commit()
            return {"message": "Institución creada exitosamente"}
    except Exception as e:
        print(f"Error al crear institución: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Error interno al guardar")
    finally:
        if conn:
            conn.close()

@app.get("/api/instituciones")
def listar_instituciones(tipo: str = None, distrito: int = None):
    conn = None
    try:
        conn = obtener_conexion()
        with conn.cursor() as cursor:
            query = "SELECT id, nombre, tipo, distrito, oferta_academica, longitud, latitud FROM instituciones WHERE 1=1"
            params = []
            
            if tipo:
                query += " AND tipo = %s"
                params.append(tipo)
            if distrito:
                query += " AND distrito = %s"
                params.append(distrito)
                
            cursor.execute(query, params)
            resultados = cursor.fetchall()
            return resultados
    except Exception as e:
        # Registrar el error en consola y responder con 500
        print(f"Error al listar instituciones: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor al consultar la base de datos.")
    finally:
        if conn:
            conn.close()

# Servir el frontend (index.html, styles.css, app.js, etc.) directamente desde la raíz
from fastapi.staticfiles import StaticFiles
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Cargar variables de host y puerto
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8000"))
    
    print(f"Iniciando servidor de desarrollo en http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)