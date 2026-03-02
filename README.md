# Sureti Dashboard

Frontend React para seguimiento de leads hipotecarios conectados a la API de Sureti.

## Objetivo

- Mostrar cada lead con su clasificacion final.
- Mostrar telefono de llegada (`contacto.celular`) como dato operativo principal.
- Ver trazabilidad de politicas y validaciones por lead.
- Refrescar datos manualmente o cada 5 minutos.

## Clasificacion mostrada

- `NO_VIABLE`
- `VIABLE`
- `ALTAMENTE_VIABLE`

## Funcionalidades

- Tabla de leads con busqueda por nombre, cedula o celular.
- Filtro por clasificacion.
- KPIs de conteo por clasificacion.
- Modal de detalle con:
  - politica paso a paso
  - caracteristicas del lead
  - fuentes consultadas
  - payload crudo
- Modo de actualizacion:
  - Manual (boton)
  - Auto cada 5 minutos

## Fuente de datos

Variable de entorno:

```env
VITE_LEADS_API_URL=/api/v1/leads
```

Por defecto usa `/api/v1/leads`.
Para forzar recalc de politicas usa query `?refresh=1` (lo maneja la UI al refrescar).

## Estructura esperada desde API

La UI soporta respuesta en:

- arreglo directo `[]`
- objeto con `items`, `data`, `leads` o `results`

Campos mas usados por la UI:

- `lead_id`
- `contacto.celular`
- `persona.nombre_completo`
- `persona.cedula`
- `validaciones.politicas`
- `decision_sureti`
- `updated_at`

## Ejecutar local

```bash
cd dashboard
npm install
npm run dev
```

App local:

- `http://localhost:4173`

## Build de produccion

```bash
cd dashboard
npm run build
```

## Docker

```bash
docker build -t sureti-dashboard ./dashboard
docker run -p 8080:80 sureti-dashboard
```

App:

- `http://localhost:8080`

## EasyPanel

En el servicio del dashboard define:

- `VITE_LEADS_API_URL=https://TU_API/api/v1/leads`

Importante: al ser Vite, esta variable se inyecta en build time. Si cambia, hay que reconstruir la imagen.
