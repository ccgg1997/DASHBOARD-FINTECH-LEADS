import { LeadRecord } from "../types";

export const mockLeads: LeadRecord[] = [
  {
    id: "lead-001",
    nombre: "Juan Camilo Torres",
    cedula: "79811234",
    celularLead: "573001112233",
    telefonoTitular: "573001112233",
    origenLead: "whatsapp",
    clasificacion: "VIABLE",
    esApto: true,
    alertas: ["Responsable fiscal en Contraloria", "Coincidencia parcial OFAC por nombre"],
    caracteristicas: {
      ciudad: "Bogota",
      ocupacion: "Comerciante",
      ingresos: 5400000,
      score_credito: 612,
      cupo_solicitado: 18000000
    },
    fuentes: [
      { nombre: "PROCURADURIA_GENERAL", estado: "consultado", detalle: "Sin antecedentes disciplinarios" },
      { nombre: "CONTRALORIA_GENERAL", estado: "consultado", detalle: "Registra responsable fiscal" },
      { nombre: "OFAC_SDN_LIST", estado: "consultado", detalle: "1 coincidencia parcial por nombre" },
      { nombre: "ONU_CONSOLIDATED_SANCTIONS", estado: "consultado", detalle: "Sin coincidencias" }
    ],
    politica: [
      { regla: "Listas restrictivas OFAC/ONU", resultado: "REVISION", razon: "Coincidencia parcial por nombre", valor: "1 coincidencia" },
      { regla: "Responsabilidad fiscal", resultado: "REVISION", razon: "Registra responsable fiscal", valor: "CONTRALORIA=TRUE" },
      { regla: "Clasificacion final", resultado: "APROBADO", razon: "Pasa con observaciones", valor: "VIABLE" }
    ],
    fechaValidacion: "2026-02-28T15:22:10.000Z",
    raw: {}
  },
  {
    id: "lead-002",
    nombre: "Maria Fernanda Rios",
    cedula: "1019876543",
    celularLead: "573105554433",
    telefonoTitular: "573105554433",
    origenLead: "facebook_lead_ads",
    clasificacion: "ALTAMENTE_VIABLE",
    esApto: true,
    alertas: [],
    caracteristicas: {
      ciudad: "Medellin",
      ocupacion: "Ingeniera civil",
      ingresos: 8200000,
      score_credito: 745,
      cupo_solicitado: 32000000
    },
    fuentes: [
      { nombre: "PROCURADURIA_GENERAL", estado: "consultado", detalle: "Sin registros" },
      { nombre: "CONTRALORIA_GENERAL", estado: "consultado", detalle: "No responsable fiscal" },
      { nombre: "OFAC_SDN_LIST", estado: "consultado", detalle: "Sin coincidencias" },
      { nombre: "ONU_CONSOLIDATED_SANCTIONS", estado: "consultado", detalle: "Sin coincidencias" }
    ],
    politica: [
      { regla: "Listas restrictivas OFAC/ONU", resultado: "APROBADO", razon: "Sin coincidencias" },
      { regla: "Antecedentes y fiscal", resultado: "APROBADO", razon: "Sin hallazgos" },
      { regla: "Score de credito", resultado: "APROBADO", razon: "Score alto", valor: "745" },
      { regla: "Clasificacion final", resultado: "APROBADO", razon: "Lead premium", valor: "ALTAMENTE_VIABLE" }
    ],
    fechaValidacion: "2026-03-01T07:11:45.000Z",
    raw: {}
  },
  {
    id: "lead-003",
    nombre: "Carlos Alberto Mora",
    cedula: "91455008",
    celularLead: "573208889977",
    telefonoTitular: "573208889977",
    origenLead: "whatsapp",
    clasificacion: "NO_VIABLE",
    esApto: false,
    alertas: ["Posible coincidencia en lista ONU", "Posible coincidencia en OFAC por documento"],
    caracteristicas: {
      ciudad: "Cali",
      ocupacion: "Importador",
      ingresos: 12500000,
      score_credito: 501,
      cupo_solicitado: 60000000
    },
    fuentes: [
      { nombre: "OFAC_SDN_LIST", estado: "consultado", detalle: "Coincidencia por identificacion" },
      { nombre: "ONU_CONSOLIDATED_SANCTIONS", estado: "consultado", detalle: "Coincidencia por nombre" },
      { nombre: "POLICIA_NACIONAL", estado: "consulta_manual_requerida", detalle: "Requiere captcha manual" }
    ],
    politica: [
      { regla: "Listas restrictivas OFAC/ONU", resultado: "DESCARTADO", razon: "Coincidencia positiva", valor: "OFAC=TRUE / ONU=TRUE" },
      { regla: "Clasificacion final", resultado: "DESCARTADO", razon: "Descartado por politica SARLAFT", valor: "NO_VIABLE" }
    ],
    fechaValidacion: "2026-02-27T19:05:00.000Z",
    raw: {}
  },
  {
    id: "lead-004",
    nombre: "Lorena Diaz Ruiz",
    cedula: "43580981",
    celularLead: "573154442211",
    telefonoTitular: "573154442211",
    origenLead: "formulario_web",
    clasificacion: "ALTAMENTE_VIABLE",
    esApto: true,
    alertas: [],
    caracteristicas: {
      ciudad: "Barranquilla",
      ocupacion: "Medica",
      ingresos: 9800000,
      score_credito: 787,
      cupo_solicitado: 40000000
    },
    fuentes: [
      { nombre: "PROCURADURIA_GENERAL", estado: "consultado", detalle: "Sin registros" },
      { nombre: "CONTRALORIA_GENERAL", estado: "consultado", detalle: "Sin hallazgos" }
    ],
    politica: [
      { regla: "Listas restrictivas OFAC/ONU", resultado: "APROBADO", razon: "Sin coincidencias" },
      { regla: "Validacion documental", resultado: "APROBADO", razon: "Cedula valida" },
      { regla: "Score de credito", resultado: "APROBADO", razon: "Score excelente", valor: "787" },
      { regla: "Clasificacion final", resultado: "APROBADO", razon: "Riesgo bajo", valor: "ALTAMENTE_VIABLE" }
    ],
    fechaValidacion: "2026-03-01T04:28:13.000Z",
    raw: {}
  },
  {
    id: "lead-005",
    nombre: "Andres Felipe Correa",
    cedula: "1122334455",
    celularLead: "573216667788",
    telefonoTitular: "573216667788",
    origenLead: "whatsapp",
    clasificacion: "VIABLE",
    esApto: true,
    alertas: ["Consulta manual pendiente en Policia Nacional"],
    caracteristicas: {
      ciudad: "Bucaramanga",
      ocupacion: "Administrador",
      ingresos: 4600000,
      score_credito: 590,
      cupo_solicitado: 14000000
    },
    fuentes: [
      { nombre: "POLICIA_NACIONAL", estado: "consulta_manual_requerida", detalle: "Captcha pendiente de resolver" },
      { nombre: "RAMA_JUDICIAL", estado: "consultado", detalle: "Sin procesos activos" }
    ],
    politica: [
      { regla: "Validacion Policia Nacional", resultado: "REVISION", razon: "Consulta manual pendiente por captcha" },
      { regla: "Clasificacion final", resultado: "APROBADO", razon: "Viable condicionado a cierre manual", valor: "VIABLE" }
    ],
    fechaValidacion: "2026-03-01T08:52:52.000Z",
    raw: {}
  },
  {
    id: "lead-006",
    nombre: "Sofia Milena Buitrago",
    cedula: "52344190",
    celularLead: "573117770099",
    telefonoTitular: "573117770099",
    origenLead: "facebook_lead_ads",
    clasificacion: "VIABLE",
    esApto: true,
    alertas: ["2 coincidencias parciales por nombre en OFAC"],
    caracteristicas: {
      ciudad: "Pereira",
      ocupacion: "Consultora",
      ingresos: 6900000,
      score_credito: 664,
      cupo_solicitado: 22000000
    },
    fuentes: [
      { nombre: "OFAC_SDN_LIST", estado: "consultado", detalle: "Coincidencias parciales por nombre" },
      { nombre: "PROCURADURIA_GENERAL", estado: "consultado", detalle: "Sin antecedentes" }
    ],
    politica: [
      { regla: "Listas restrictivas OFAC/ONU", resultado: "REVISION", razon: "Coincidencias parciales por nombre", valor: "2 matches" },
      { regla: "Score de credito", resultado: "APROBADO", razon: "Rango medio", valor: "664" },
      { regla: "Clasificacion final", resultado: "APROBADO", razon: "Apto con seguimiento", valor: "VIABLE" }
    ],
    fechaValidacion: "2026-02-28T22:09:00.000Z",
    raw: {}
  }
];
