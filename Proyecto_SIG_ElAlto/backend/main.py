import os
from fastapi import FastAPI, HTTPException
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