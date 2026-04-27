
---

## 🔭 Conexión a MongoDB Compass

### Por nodo individual (recomendado para Windows)

| Nodo | URL de conexión |
|---|---|
| mongo1 | `mongodb://localhost:27017/?directConnection=true` |
| mongo2 | `mongodb://localhost:27018/?directConnection=true` |
| mongo3 | `mongodb://localhost:27019/?directConnection=true` |

>  **Windows:** Si tienes MongoDB instalado localmente puede ocupar el puerto `27017`. Detén el servicio antes de conectar con Compass:
> ```powershell
> net stop MongoDB
> ```

---

##  Cómo probar el failover

### Monitor en tiempo real (CMD)

Abre una terminal y ejecuta:

```cmd
:loop
cls
docker exec mongo1 mongosh --port 27017 --quiet --eval "rs.status().members.forEach(m => print(m.name.padEnd(25), m.stateStr))"
timeout /t 2 /nobreak > nul
goto loop
```

> Si mongo1 está caído cambia `mongo1` por `mongo2` en el comando.

### Simular caída del primario

```cmd
# Caer el primario
docker stop mongo1

# Verificar que un secondary asumió como PRIMARY
docker exec mongo2 mongosh --port 27017 --quiet --eval "rs.status().members.forEach(m => print(m.name.padEnd(25), m.stateStr))"

# Revivir mongo1 (vuelve como SECONDARY)
docker start mongo1

# Devolver el PRIMARY a mongo1 (tiene priority 2)
docker exec -it mongo2 mongosh --port 27017 --eval "rs.stepDown()"
```

### Comportamiento esperado

| Momento | mongo1 | mongo2 | mongo3 |
|---|---|---|---|
| Inicio normal | `PRIMARY` | `SECONDARY` | `SECONDARY` |
| Después de `docker stop mongo1` |  `DOWN` | `PRIMARY` ó `SECONDARY` | `PRIMARY` ó `SECONDARY` |
| Después de `docker start mongo1` | `SECONDARY` | `PRIMARY` | `SECONDARY` |

> La elección tarda entre **2 y 10 segundos** según la configuración de `electionTimeoutMillis`.

---

##  Comandos de diagnóstico

```cmd
# Ver quién es el PRIMARY
docker exec mongo1 mongosh --port 27017 --quiet --eval "rs.isMaster().primary"

# Ver lag de replicación
docker exec mongo1 mongosh --port 27017 --quiet --eval "rs.printSecondaryReplicationInfo()"

# Ver estado completo
docker exec mongo1 mongosh --port 27017 --quiet --eval "rs.status().members.forEach(m => print(m.name, '|', m.stateStr, '| uptime:', m.uptime))"
```

---


## 👤 Autor

Proyecto desarrollado por **JohanYP** para practicar CRUD, Docker, MongoDB Replica Sets y failover local.
