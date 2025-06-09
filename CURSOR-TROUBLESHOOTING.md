# 🔧 Solución de Problemas MCP en Cursor

## ❌ Problema: "Las herramientas MCP no responden en Cursor"

### ✅ **PASO 1: Verificar que el servidor MCP funciona**

**Tu servidor MCP está funcionando correctamente** ✅ - Lo hemos verificado.

### 🔍 **PASO 2: Diagnóstico de Configuración en Cursor**

#### A. Verificar Ubicación del Archivo de Configuración

**Cursor busca la configuración MCP en estas ubicaciones:**

1. **Global:** `~/.cursor/mcp.json` 
2. **Proyecto:** `./cursor/mcp.json`

#### B. Verificar Configuración Actual

Tu configuración actual debería ser:

```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "node",
      "args": [
        "C:\\Users\\pabli\\Documents\\PRACTICAS\\LEGACY\\MCP\\dist\\index.js",
        "--mcp-server"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 🛠️ **PASO 3: Soluciones Ordenadas por Prioridad**

#### **Solución 1: Verificar Path Absoluto**
```bash
# Verifica que el archivo existe
ls -la "C:\Users\pabli\Documents\PRACTICAS\LEGACY\MCP\dist\index.js"

# Si no existe, compila el proyecto
cd C:\Users\pabli\Documents\PRACTICAS\LEGACY\MCP
npm run build
```

#### **Solución 2: Probar con Path Relativo**
Si tienes problemas con paths absolutos, usa:

```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "node",
      "args": [
        "./dist/index.js",
        "--mcp-server"
      ],
      "cwd": "C:\\Users\\pabli\\Documents\\PRACTICAS\\LEGACY\\MCP",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### **Solución 3: Usar npx (Recomendado para problemas de path)**
```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "npx",
      "args": [
        "-p", "ts-node",
        "ts-node",
        "C:\\Users\\pabli\\Documents\\PRACTICAS\\LEGACY\\MCP\\src\\mcp-server.ts"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### **Solución 4: Configuración Debug**
Para ver errores detallados:

```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "node",
      "args": [
        "C:\\Users\\pabli\\Documents\\PRACTICAS\\LEGACY\\MCP\\dist\\index.js",
        "--mcp-server",
        "--verbose"
      ],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  }
}
```

### 🎯 **PASO 4: Proceso de Verificación en Cursor**

#### A. Reiniciar Cursor Completamente
1. Cerrar Cursor completamente
2. Matar procesos de Cursor en Task Manager si es necesario
3. Reabrir Cursor

#### B. Verificar Status del MCP
1. Ir a **Settings → MCP**
2. Buscar "legacy-migrator"
3. **Estado debe ser:** 🟢 "Running"
4. **Si está rojo:** Click en "Start" o "Restart"

#### C. Verificar en Chat
1. Abrir Chat (Ctrl+I)
2. **Cambiar a "Agent Mode"** (crucial)
3. Escribir: `"List available MCP tools"`
4. Deberías ver las herramientas legacy-migrator

### ⚠️ **PROBLEMAS COMUNES Y SOLUCIONES**

#### ❌ "Server failed to start"
**Causas:**
- Path incorrecto al archivo
- Node.js no está en PATH
- Permisos de archivo

**Solución:**
```bash
# Verificar Node.js
node --version

# Verificar que el archivo es ejecutable
chmod +x C:\Users\pabli\Documents\PRACTICAS\LEGACY\MCP\dist\index.js
```

#### ❌ "Tools not appearing in Agent"
**Causas:**
- No estás en modo "Agent"
- MCP server no está "Running"
- Cursor cache corrupto

**Solución:**
1. **Verificar modo Agent activado**
2. **Restart MCP server**
3. **Clear Cursor cache:** Settings → Advanced → Clear Cache

#### ❌ "JSON parse errors"
**Causas:**
- JSON mal formateado
- Caracteres especiales en paths

**Solución:**
```json
// Usar dobles backslashes en Windows
"C:\\Users\\pabli\\Documents\\PRACTICAS\\LEGACY\\MCP\\dist\\index.js"

// O forward slashes
"C:/Users/pabli/Documents/PRACTICAS/LEGACY/MCP/dist/index.js"
```

### 🔧 **PASO 5: Configuración de Emergencia (Siempre Funciona)**

Si nada más funciona, usa esta configuración:

```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "cmd",
      "args": [
        "/c",
        "cd C:\\Users\\pabli\\Documents\\PRACTICAS\\LEGACY\\MCP && node dist\\index.js --mcp-server"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 📝 **PASO 6: Test de Conectividad**

Una vez configurado, prueba con estos prompts:

```
🧪 Test 1: "Usa las herramientas MCP para listar las funciones disponibles"

🧪 Test 2: "Analiza el proyecto en ./test-sample/ usando analyze_vb_project"

🧪 Test 3: "Convierte este código VB a C# usando apply_migration_rules:
Private Sub Button1_Click()
    MsgBox \"Hello World\"
End Sub"
```

### 🚨 **Si NADA funciona:**

#### Alternativa 1: Usar el CLI directamente
```bash
# En terminal de Cursor
cd C:\Users\pabli\Documents\PRACTICAS\LEGACY\MCP
node dist/index.js --analyze-only --path ./test-sample/
```

#### Alternativa 2: Servidor HTTP Local
```bash
# Modificar el servidor para HTTP en lugar de stdio
# (Requiere cambios en el código)
```

---

## 🎯 **CONFIGURACIÓN FINAL RECOMENDADA**

Basado en tu sistema, usa esta configuración:

```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "node",
      "args": [
        "C:/Users/pabli/Documents/PRACTICAS/LEGACY/MCP/dist/index.js",
        "--mcp-server"
      ],
      "env": {
        "NODE_ENV": "production",
        "PATH": "C:\\Program Files\\nodejs;%PATH%"
      }
    }
  }
}
```

¡Tu MCP debería funcionar perfectamente con esta configuración! 🚀 