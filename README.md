# MongoCrud

CRUD de usuarios con **Node.js + Express + MongoDB Replica Set** ejecutado en Docker. El proyecto permite crear, listar, actualizar y eliminar usuarios desde una interfaz web, mientras demuestra replicación y failover de MongoDB de forma práctica. 

## Descripción

Este proyecto combina dos objetivos:

1. Construir un CRUD sencillo con Express y MongoDB.
2. Probar alta disponibilidad con un Replica Set en Docker.

La aplicación web se conecta a MongoDB usando el driver oficial de Node.js, y los archivos estáticos del frontend se sirven desde la carpeta `public/`.

## Estructura

| Ruta | Propósito |
|---|---|
| `docker-compose.yml` | Levanta los contenedores de MongoDB, el init del replica set y la app. |
| `crudMongo/Dockerfile` | Construye la imagen de la aplicación Node.js. |
| `crudMongo/server.js` | Backend Express, conexión a MongoDB y rutas CRUD. |
| `crudMongo/package.json` | Dependencias, scripts y metadatos del proyecto. |
| `crudMongo/public/index.html` | Interfaz principal del CRUD. |
| `crudMongo/public/script.js` | Lógica del frontend para crear, listar, editar y borrar usuarios. |
| `crudMongo/public/style.css` | Estilos de la interfaz. |
| `crudMongo/.dockerignore` | Evita enviar archivos innecesarios al build de Docker. |
| `.gitignore` | Ignora archivos locales y temporales del proyecto. |

## Arquitectura

| Componente | Función | Puerto externo |
|---|---|---|
| `mongo1` | Nodo de MongoDB | 27017 |
| `mongo2` | Nodo de MongoDB | 27018 |
| `mongo3` | Nodo de MongoDB | 27019 |
| `mongo-arbiter` | Árbitro del replica set | 27020 |
| `mongo-init` | Inicializa el replica set una vez que los nodos están saludables | Sin puerto publicado |
| `crud-app` | Aplicación Express + frontend | 4000 |

## Tecnologías

| Tecnología | Uso |
|---|---|
| Node.js | Runtime del backend. |
| Express | Servidor HTTP y rutas del CRUD. |
| MongoDB | Base de datos NoSQL. |
| Docker Compose | Orquestación de contenedores. |
| MongoDB Compass | Visualización de nodos y datos durante las pruebas. |

## Funcionalidades

| Función | Estado |
|---|---|
| Listar usuarios | Implementado. |
| Crear usuario | Implementado. |
| Actualizar usuario | Implementado. |
| Eliminar usuario | Implementado. |
| Replica Set en Docker | Implementado. |
| Failover manual para pruebas | Implementado y verificable con Docker + terminal. |

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/usuarios` | Devuelve todos los usuarios. |
| `POST` | `/usuarios` | Crea un nuevo usuario. |
| `PUT` | `/usuarios/:id` | Actualiza un usuario por ID. |
| `DELETE` | `/usuarios/:id` | Elimina un usuario por ID. |

## Datos manejados

La colección usada por la app es `usuarios` dentro de la base `test_db`. El backend convierte `edad` a número antes de guardarla y sirve los archivos estáticos desde `public/`.

## Requisitos

| Requisito | Versión recomendada |
|---|---|
| Docker Desktop | Actual |
| Docker Compose | Incluido en Docker Desktop |
| Node.js | 18 o superior para desarrollo local. |
| MongoDB Compass | Opcional, para monitoreo visual |

## Cómo ejecutar

### 1. Clonar el repositorio

```bash
git clone [https://github.com/JohanYP/MongoCrud-.git](https://github.com/JohanYP/MongoCrud-.git)
cd MongoCrud-
```

### 2. Levantar los contenedores

```bash
docker compose down -v
docker compose up --build
```

Esto construye la app, levanta los nodos de MongoDB y ejecuta el contenedor `mongo-init` para inicializar el replica set cuando los servicios están saludables.

### 3. Abrir la aplicación

Abre en tu navegador:

```text
http://localhost:4000
```

La aplicación expone el puerto 4000 en Docker Compose.

## Conexión a MongoDB Compass

### Conexiones por nodo

Para observar cada nodo por separado en local, puedes usar conexiones directas:

| Nodo | Conexión |
|---|---|
| mongo1 | `mongodb://localhost:27017/?directConnection=true` |
| mongo2 | `mongodb://localhost:27018/?directConnection=true` |
| mongo3 | `mongodb://localhost:27019/?directConnection=true` |

### Nota importante en Windows

Si tienes MongoDB instalado localmente en Windows, puede ocupar el puerto 27017 y hacer que Compass se conecte al servicio local en vez del contenedor. En ese caso, detén el servicio local antes de probar el cluster Docker.

Ejemplo:

```powershell
net stop MongoDB
```

## Monitor del failover por terminal

### Loop en CMD

```cmd
:loop
cls
docker exec mongo1 mongosh --port 27017 --quiet --eval "rs.status().members.forEach(m => print(m.name.padEnd(25), m.stateStr))"
timeout /t 2 /nobreak > nul
goto loop
```

Si el primario cae y el comando deja de responder porque estabas consultando ese contenedor, repite el loop cambiando `mongo1` por `mongo2` o `mongo3`.

### Verificación puntual

```cmd
docker exec mongo1 mongosh --port 27017 --quiet --eval "rs.status().members.forEach(m => print(m.name.padEnd(25), m.stateStr))"
```

## Cómo probar el failover

### Opción visual desde Docker Desktop

1. Abre Docker Desktop.
2. Ve a **Containers**.
3. Detén el contenedor del primario, por ejemplo `mongo1`.
4. Observa cómo uno de los secundarios asume el rol de `PRIMARY`.

### Opción por terminal

```cmd
docker stop mongo1
```

Luego revisa el estado desde otro nodo:

```cmd
docker exec mongo2 mongosh --port 27017 --quiet --eval "rs.status().members.forEach(m => print(m.name.padEnd(25), m.stateStr))"
```

Y para volver a levantarlo:

```cmd
docker start mongo1
```

## Validación rápida del proyecto

| Punto verificado | Resultado |
|---|---|
| Existe `docker-compose.yml` en la raíz | Sí. |
| Existe `crudMongo/server.js` | Sí. |
| Existe `crudMongo/public/` con `index.html`, `script.js`, `style.css` | Sí. |
| Existe `.dockerignore` | Sí. |
| Existe `Dockerfile` | Sí. |
| Existe `package.json` | Sí. |
| La app expone puerto 4000 | Sí. |
| Los nodos Mongo publican puertos 27017, 27018, 27019 y 27020 | Sí. |

## Observaciones

| Tema | Comentario |
|---|---|
| Estructura | Está bastante ordenada y separa backend de archivos públicos. |
| Docker | La configuración tiene healthchecks y un init específico para el replica set. |
| Frontend | Es simple, claro y suficiente para demostrar el CRUD. |
| Backend | Implementa validación básica y reconexión inicial razonable. |
| Repo | Falta un README completo en la raíz; este documento cubre esa necesidad. |

## Autor

Proyecto desarrollado por **JohanYP** y orientado a practicar CRUD, Docker, MongoDB Replica Sets y failover local.
```
