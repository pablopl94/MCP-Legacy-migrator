# 🚀 Guía de Instalación MCP Legacy Migrator en Cursor

## 📋 Prerrequisitos

1. **Cursor IDE** actualizado a la última versión
2. **Node.js** instalado (v16 o superior)
3. Tu proyecto MCP compilado (`npm run build`)

## 🔧 Instalación en Cursor

### Método 1: Configuración Global (Recomendado)

#### Paso 1: Abrir Configuración MCP en Cursor
1. Abrir **Cursor**
2. Ir a **Settings** (Ctrl/Cmd + ,)
3. Buscar **"MCP"** en la barra de búsqueda
4. Hacer clic en **"Model Context Protocol"**

#### Paso 2: Agregar Servidor MCP
1. Hacer clic en **"Add new global MCP server"**
2. Se abrirá un archivo `.json`
3. Reemplazar el contenido con:

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

#### Paso 3: Verificar Configuración
1. **Guardar** el archivo de configuración
2. Hacer clic en el **botón de refresh** ⟳ en la página MCP
3. Verificar que aparezca **punto verde** 🟢 junto a "legacy-migrator"
4. Estado debe mostrar: **"Running"**

### Método 2: Configuración por Proyecto

Si prefieres que solo funcione en proyectos específicos:

1. Crear carpeta `.cursor` en tu proyecto
2. Crear archivo `.cursor/mcp.json` con el mismo contenido JSON

## ✅ Verificar Instalación

### Comprobar en Chat de Cursor:
1. Abrir panel de **Chat** (Ctrl/Cmd + I)
2. Cambiar a modo **"Agent"** (no "Ask")
3. Escribir: `"Analiza un proyecto VB.NET usando las herramientas MCP"`
4. Deberías ver mensaje: **"Use Tool"** con opciones de herramientas legacy-migrator

### Herramientas Disponibles:
- ✅ `analyze_vb_project`
- ✅ `generate_csharp_migration` 
- ✅ `apply_migration_rules`
- ✅ `estimate_migration_effort`
- ✅ `analyze_vb_module_details`
- ✅ `generate_modern_architecture_proposal`
- ✅ `migrate_specific_module`

## 🎯 Ejemplos de Prompts por Herramienta

### 🔍 **1. analyze_vb_project**
*Analiza estructura completa de proyectos VB.NET/VB6*

#### Ejemplos de Prompts:
```
📝 "Analiza el proyecto VB.NET ubicado en C:\MiEmpresa\SistemaVentas\Ventas.vbproj"

📝 "Haz un análisis completo del proyecto legacy en D:\Legacy\Inventario con métricas de calidad"

📝 "Revisa este proyecto VB6 en C:\Sistemas\Facturacion y dame un reporte de preparación para migración"

📝 "Analiza la complejidad y code smells del proyecto en ./test-sample/"
```

#### Lo que obtienes:
- Estructura del proyecto y dependencias
- Métricas de complejidad ciclomática
- Code smells detectados
- Evaluación de preparación para migración
- Recomendaciones de mejora

---

### 🔄 **2. generate_csharp_migration**
*Migración completa VB → C# moderna*

#### Ejemplos de Prompts:
```
📝 "Migra el proyecto VB.NET en C:\Legacy\Sistema.vbproj a C# con arquitectura Clean en D:\Output"

📝 "Convierte este proyecto VB6 a C# moderno usando .NET 8 y arquitectura Layered"

📝 "Genera migración completa de C:\Ventas\Sistema.vbproj a C# con patrón MVC y guárdalo en ./migrated"

📝 "Migra a C# usando .NET Framework 4.8 y arquitectura Simple para este proyecto legacy"
```

#### Parámetros que puedes especificar:
- **Target Framework:** net8.0, net7.0, net6.0, net48
- **Arquitectura:** Clean, Layered, MVC, Simple
- **Ruta de salida personalizada**

---

### ⚙️ **3. apply_migration_rules**
*Conversión de código específico VB → C#*

#### Ejemplos de Prompts:
```
📝 "Convierte este código VB.NET a C#:
Private Sub Button1_Click(sender As Object, e As EventArgs)
    Dim resultado As String = TextBox1.Text & TextBox2.Text
    MessageBox.Show(resultado)
End Sub"

📝 "Aplica las reglas de migración a este módulo VB6:
Public Function CalcularTotal(precio As Double, cantidad As Integer) As Double
    CalcularTotal = precio * cantidad * 1.16
End Function"

📝 "Migra esta clase VB.NET a C# moderno con patrones async/await si es necesario"

📝 "Convierte este formulario VB6 a C# WinForms moderno"
```

#### Tipos de proyecto soportados:
- WinForms, Console, Library, WebForms

---

### 📊 **4. estimate_migration_effort**
*Estimación de esfuerzo y complejidad*

#### Ejemplos de Prompts:
```
📝 "Estima el esfuerzo de migración para el proyecto en C:\Sistema\Facturacion.vbproj"

📝 "¿Cuánto tiempo tomará migrar este sistema legacy VB6 a C#? Incluye breakdown detallado"

📝 "Dame una estimación de costos de migración para el proyecto en ./legacy-app/ con análisis de riesgos"

📝 "Evalúa la complejidad y horas necesarias para migrar este proyecto VB.NET enterprise"
```

#### Lo que obtienes:
- Estimación en horas y semanas
- Breakdown por componentes
- Nivel de riesgo y complejidad
- Identificación de bloqueadores potenciales

---

### 🔍 **5. analyze_vb_module_details**
*Análisis específico de módulos/formularios*

#### Ejemplos de Prompts:
```
📝 "Analiza en detalle el módulo C:\Sistema\Formularios\FrmVentas.frm y extrae la lógica de negocio"

📝 "Examina este archivo VB.NET C:\Modulos\CalculosFinancieros.vb y analiza sus métodos"

📝 "Haz análisis detallado del formulario principal.frm incluyendo componentes UI"

📝 "Revisa la clase C:\Classes\CustomerManager.cls y extrae patrones y dependencias"
```

#### Lo que analiza:
- Lógica de negocio específica
- Componentes UI (para .frm)
- Métodos y eventos
- Dependencias internas

---

### 🏗️ **6. generate_modern_architecture_proposal**
*Propuesta de arquitectura moderna*

#### Ejemplos de Prompts:
```
📝 "Genera propuesta de arquitectura Clean para migrar el proyecto en C:\Sistema\Legacy.vbproj"

📝 "Crea recomendaciones de arquitectura MVVM con patrones modernos para este proyecto VB6"

📝 "Propón una arquitectura de microservicios para migrar este sistema monolítico VB.NET"

📝 "Diseña propuesta Layered con Repository pattern y DI para migración C:\ERP\Sistema.vbproj"
```

#### Opciones de arquitectura:
- Clean, Layered, MVC, MVVM, Microservices
- Incluye patrones modernos (DI, Repository, etc.)
- Recomendaciones de base de datos

---

### 🎯 **7. migrate_specific_module**
*Migración individual de módulos con lógica completa*

#### Ejemplos de Prompts:
```
📝 "Migra solo el formulario C:\Sistema\FrmFacturacion.frm a C# con arquitectura Clean y tests"

📝 "Convierte únicamente el módulo C:\Classes\ProductManager.cls a C# moderno con DI en ./output"

📝 "Migra este componente específico aplicando async/await y generando tests unitarios"

📝 "Transforma solo la clase de cálculos financieros a C# con patrón MVVM"
```

#### Características:
- Migración individual de componentes
- Generación automática de tests
- Aplicación de patrones modernos
- async/await y dependency injection

---

## 🚀 Flujo de Trabajo Recomendado

### Para Migración Completa:
```
1️⃣ "Analiza el proyecto en C:\MiSistema\App.vbproj"
2️⃣ "Estima el esfuerzo de migración para este proyecto"  
3️⃣ "Genera propuesta de arquitectura Clean para la migración"
4️⃣ "Migra el proyecto completo a C# con .NET 8"
```

### Para Migración Incremental:
```
1️⃣ "Analiza en detalle el formulario principal C:\App\MainForm.frm"
2️⃣ "Migra solo este formulario a C# con tests"
3️⃣ "Analiza el módulo de base de datos C:\App\DataModule.bas"
4️⃣ "Migra el módulo de datos aplicando Repository pattern"
```

## 🔧 Solución de Problemas

### ❌ Servidor no inicia (Punto rojo):
```bash
# Verificar que el proyecto está compilado
cd C:\Users\pabli\Documents\PRACTICAS\LEGACY\MCP
npm run build

# Probar inicio manual
node dist/index.js --mcp-server
```

### ❌ Herramientas no aparecen:
1. Verificar modo **"Agent"** activado
2. Refresh del servidor MCP
3. Comprobar permisos de archivos

### ❌ Path incorrecto:
- Ajustar la ruta en el JSON a tu ubicación real del proyecto

## 📝 Configuración Avanzada

### Variables de Entorno:
```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "node",
      "args": ["path/to/dist/index.js", "--mcp-server"],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "false",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Auto-Run (Opcional):
Para ejecutar herramientas sin confirmación:
1. Ir a Settings → Agent
2. Activar **"Auto-run MCP tools"**

---

¡Tu MCP Legacy Migrator está listo para usar en Cursor! 🎉 