import { mockLeads } from "../data/mockLeads";
import { Classification, LeadLoadResult, LeadRecord, LeadValidationSource, PolicyStep, PolicyStepResult } from "../types";

const LEADS_API_URL = import.meta.env.VITE_LEADS_API_URL || "/api/v1/leads";
const ENABLE_MOCK_DATA = String(import.meta.env.VITE_ENABLE_MOCK_DATA ?? "false").trim().toLowerCase() === "true";

const CLASSIFICATION_ORDER: Record<Classification, number> = {
  NO_VIABLE: 0,
  VIABLE: 1,
  ALTAMENTE_VIABLE: 2
};

type LoadLeadsOptions = {
  refresh?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function pickBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

function primitiveValue(value: unknown): string | number | boolean | null | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeClassification(value: unknown, scoreCredito?: number): Classification {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  // Clasificacion nativa esperada
  if (normalized.includes("NO_VIABLE")) return "NO_VIABLE";
  if (normalized.includes("ALTAMENTE_VIABLE")) return "ALTAMENTE_VIABLE";
  if (normalized === "VIABLE" || normalized.endsWith("_VIABLE")) return "VIABLE";

  // Mapping exacto de policy.py (Sureti)
  if (normalized === "RECHAZADO") return "NO_VIABLE";
  if (normalized === "APROBADO_CON_NOTAS") return "VIABLE";
  if (normalized === "APROBADO") return "ALTAMENTE_VIABLE";

  // Equivalencias legadas
  if (normalized.includes("BLOQUE") || normalized.includes("RECHAZ") || normalized.includes("DESCART")) {
    return "NO_VIABLE";
  }
  if (normalized.includes("LIMPIO") || normalized.includes("HIGH") || normalized.includes("EXCELENTE")) {
    return "ALTAMENTE_VIABLE";
  }
  if (normalized.includes("ALERTA") || normalized.includes("PENDIENTE")) {
    return "VIABLE";
  }

  // Fallback por score cuando no viene clasificacion/decision
  if (typeof scoreCredito === "number") {
    if (scoreCredito >= 730) return "ALTAMENTE_VIABLE";
    if (scoreCredito >= 580) return "VIABLE";
    return "NO_VIABLE";
  }

  return "VIABLE";
}

function extractArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const candidates = [payload.data, payload.items, payload.leads, payload.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function extractAlertas(base: Record<string, unknown>, identidad: Record<string, unknown>): string[] {
  const alertsRaw = Array.isArray(identidad.alertas)
    ? identidad.alertas
    : Array.isArray(base.alertas)
      ? base.alertas
      : [];
  return alertsRaw
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function extractCharacteristics(base: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const persona = isRecord(base.persona) ? base.persona : {};
  const contacto = isRecord(base.contacto) ? base.contacto : {};
  const caracteristicas = isRecord(base.caracteristicas) ? base.caracteristicas : {};

  const result: Record<string, string | number | boolean | null> = {};
  const keys = [
    "ciudad",
    "departamento",
    "edad",
    "ocupacion",
    "actividad_economica",
    "ingresos",
    "ingresos_mensuales",
    "egresos_mensuales",
    "cuotas_vigentes",
    "score_credito",
    "estrato",
    "segmento",
    "cupo_solicitado",
    "valor_inmueble",
    "tipo_inmueble",
    "plazo_meses",
    "celular",
    "celular_lead",
    "telefono_titular",
    "telefono",
    "email"
  ];

  for (const key of keys) {
    const candidate = primitiveValue(caracteristicas[key] ?? contacto[key] ?? persona[key] ?? base[key]);
    if (candidate !== undefined) {
      result[key] = candidate;
    }
  }

  return result;
}

function extractSources(base: Record<string, unknown>, identidad: Record<string, unknown>): LeadValidationSource[] {
  const sources: LeadValidationSource[] = [];
  const listasRestrictivas = isRecord(identidad.listas_restrictivas) ? identidad.listas_restrictivas : {};
  const known = [
    "procuraduria",
    "contraloria",
    "policia",
    "rama_judicial",
    "ramaJudicial",
    "ofac",
    "onu"
  ];

  for (const key of known) {
    const source = isRecord(identidad[key])
      ? identidad[key]
      : (key === "ofac" || key === "onu") && isRecord(listasRestrictivas[key])
        ? listasRestrictivas[key]
        : undefined;
    if (!isRecord(source)) continue;

    const nombre = pickString(source.fuente, key.toUpperCase().replace(/_/g, " "));
    if (!nombre) continue;

    sources.push({
      nombre,
      estado: pickString(source.estado, "desconocido") || "desconocido",
      detalle: pickString(source.detalle, source.instrucciones, source.error)
    });
  }

  for (const value of Object.values(base)) {
    if (!isRecord(value)) continue;
    const nombre = pickString(value.fuente);
    if (!nombre) continue;

    const alreadyIncluded = sources.some((source) => source.nombre === nombre);
    if (alreadyIncluded) continue;

    sources.push({
      nombre,
      estado: pickString(value.estado, "desconocido") || "desconocido",
      detalle: pickString(value.detalle, value.instrucciones, value.error)
    });
  }

  return sources;
}

function normalizePolicyStepResult(value: unknown): PolicyStepResult {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (
    normalized.includes("DESCART") ||
    normalized.includes("RECHAZ") ||
    normalized.includes("DENEG") ||
    normalized.includes("NO_VIABLE") ||
    normalized.includes("BLOQUE")
  ) {
    return "DESCARTADO";
  }

  if (
    normalized.includes("REVISION") ||
    normalized.includes("PENDIENTE") ||
    normalized.includes("MANUAL") ||
    normalized.includes("ALERTA")
  ) {
    return "REVISION";
  }

  return "APROBADO";
}

function inferResultFromCumple(cumple: unknown, motivo?: string): PolicyStepResult {
  if (typeof cumple !== "boolean") return "REVISION";
  if (cumple) return "APROBADO";

  const text = (motivo || "").toUpperCase();
  const hardRejectHints = [
    "RECHAZO",
    "EXCEDE",
    "POR DEBAJO",
    "FUERA DE COBERTURA",
    "NO ELEGIBLE",
    "NO ACEPTADO",
    "BLOQUEANTE",
    "EMBARGO",
    "FALSA TRADIC"
  ];

  if (hardRejectHints.some((hint) => text.includes(hint))) {
    return "DESCARTADO";
  }

  return "REVISION";
}

function normalizePolicyStep(item: unknown, index: number): PolicyStep | null {
  if (typeof item === "string" && item.trim().length > 0) {
    return {
      regla: `Regla ${index + 1}`,
      resultado: normalizePolicyStepResult(item),
      razon: item.trim()
    };
  }

  if (!isRecord(item)) return null;

  const regla = pickString(item.regla, item.rule, item.nombre, item.name, item.check, item.step, item.aspecto);
  const razon = pickString(item.razon, item.reason, item.detalle, item.message, item.descripcion, item.description, item.motivo);
  const valor = pickString(item.valor, item.value, item.input, item.metric);

  let resultado: PolicyStepResult;
  if (item.resultado !== undefined || item.result !== undefined || item.status !== undefined || item.decision !== undefined) {
    resultado = normalizePolicyStepResult(item.resultado ?? item.result ?? item.status ?? item.decision);
  } else {
    resultado = inferResultFromCumple(item.cumple, razon);
  }

  if (!regla && !razon) return null;

  return {
    regla: regla || `Regla ${index + 1}`,
    resultado,
    razon,
    valor
  };
}

function finalClassificationStep(clasificacion: Classification): PolicyStep {
  if (clasificacion === "NO_VIABLE") {
    return {
      regla: "Clasificacion final",
      resultado: "DESCARTADO",
      razon: "Lead descartado por politica",
      valor: "NO_VIABLE"
    };
  }
  if (clasificacion === "ALTAMENTE_VIABLE") {
    return {
      regla: "Clasificacion final",
      resultado: "APROBADO",
      razon: "Lead de alta prioridad",
      valor: "ALTAMENTE_VIABLE"
    };
  }
  return {
    regla: "Clasificacion final",
    resultado: "APROBADO",
    razon: "Lead viable con observaciones o datos pendientes",
    valor: "VIABLE"
  };
}

function mapDecisionToStep(decision: string): PolicyStep {
  const normalized = decision.toUpperCase().trim();
  if (normalized === "RECHAZADO") {
    return {
      regla: "Decision del motor de politicas",
      resultado: "DESCARTADO",
      razon: "El motor retorno RECHAZADO",
      valor: "RECHAZADO"
    };
  }

  if (normalized === "APROBADO_CON_NOTAS") {
    return {
      regla: "Decision del motor de politicas",
      resultado: "REVISION",
      razon: "Aprobado con observaciones",
      valor: "APROBADO_CON_NOTAS"
    };
  }

  return {
    regla: "Decision del motor de politicas",
    resultado: "APROBADO",
    razon: "Aprobado sin observaciones bloqueantes",
    valor: normalized || "APROBADO"
  };
}

function extractPolicyTrace(
  base: Record<string, unknown>,
  identidad: Record<string, unknown>,
  clasificacion: Classification,
  caracteristicas: Record<string, string | number | boolean | null>
): PolicyStep[] {
  const validaciones = isRecord(base.validaciones) ? base.validaciones : {};
  const decisionSureti = isRecord(base.decision_sureti) ? base.decision_sureti : {};
  const politica = isRecord(validaciones.politicas)
    ? validaciones.politicas
    : isRecord(validaciones.politica)
      ? validaciones.politica
      : isRecord(base.politicas)
        ? base.politicas
        : isRecord(base.politica)
          ? base.politica
          : {};

  const candidates = [
    politica.traza,
    politica.trace,
    politica.pasos,
    politica.steps,
    politica.criterios_evaluados,
    base.politicas_evaluadas,
    base.traza_politica,
    base.policy_trace,
    base.policy_steps,
    base.decision_path,
    base.descartes,
    base.reglas
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const normalized = candidate
      .map((item, index) => normalizePolicyStep(item, index))
      .filter((item): item is PolicyStep => item !== null);

    if (normalized.length > 0) {
      const rechazos = Array.isArray(base.rechazos)
        ? base.rechazos.filter((it): it is string => typeof it === "string" && it.trim().length > 0)
        : [];
      const notas = Array.isArray(base.notas)
        ? base.notas.filter((it): it is string => typeof it === "string" && it.trim().length > 0)
        : [];

      for (const rechazo of rechazos) {
        normalized.push({
          regla: "Rechazo consolidado",
          resultado: "DESCARTADO",
          razon: rechazo
        });
      }
      for (const nota of notas) {
        normalized.push({
          regla: "Nota de politica",
          resultado: "REVISION",
          razon: nota
        });
      }

      const decision = pickString(base.decision, politica.decision, decisionSureti.decision, decisionSureti.clasificacion);
      if (decision) {
        normalized.push(mapDecisionToStep(decision));
      }

      const hasFinal = normalized.some((step) => step.regla.toLowerCase().includes("clasificacion final"));
      return hasFinal ? normalized : [...normalized, finalClassificationStep(clasificacion)];
    }
  }

  const derived: PolicyStep[] = [];
  const formatoCedulaValido = pickBoolean(base.formato_cedula_valido, identidad.formato_cedula_valido);
  if (formatoCedulaValido === false) {
    derived.push({
      regla: "Formato de cedula",
      resultado: "DESCARTADO",
      razon: "Documento invalido",
      valor: "formato_cedula_valido=false"
    });
  }

  const listasRestrictivas = isRecord(identidad.listas_restrictivas) ? identidad.listas_restrictivas : {};
  const ofac = isRecord(identidad.ofac)
    ? identidad.ofac
    : isRecord(listasRestrictivas.ofac)
      ? listasRestrictivas.ofac
      : isRecord(base.ofac)
        ? base.ofac
        : {};
  const onu = isRecord(identidad.onu)
    ? identidad.onu
    : isRecord(listasRestrictivas.onu)
      ? listasRestrictivas.onu
      : isRecord(base.onu)
        ? base.onu
        : {};
  const contraloria = isRecord(identidad.contraloria)
    ? identidad.contraloria
    : isRecord(base.contraloria)
      ? base.contraloria
      : {};
  const policia = isRecord(identidad.policia) ? identidad.policia : isRecord(base.policia) ? base.policia : {};

  if (pickBoolean(ofac.en_lista_ofac, ofac.coincidencia) === true || pickBoolean(onu.posible_coincidencia) === true) {
    derived.push({
      regla: "Listas restrictivas OFAC/ONU",
      resultado: "DESCARTADO",
      razon: "Coincidencia positiva en listas",
      valor: `OFAC=${pickBoolean(ofac.en_lista_ofac) ? "TRUE" : "FALSE"} / ONU=${pickBoolean(onu.posible_coincidencia) ? "TRUE" : "FALSE"}`
    });
  } else {
    derived.push({
      regla: "Listas restrictivas OFAC/ONU",
      resultado: "APROBADO",
      razon: "Sin coincidencia bloqueante"
    });
  }

  if (pickBoolean(contraloria.es_responsable_fiscal) === true) {
    derived.push({
      regla: "Responsabilidad fiscal",
      resultado: "REVISION",
      razon: "Registra responsabilidad fiscal"
    });
  }

  const policiaEstado = pickString(policia.estado);
  if (policiaEstado && policiaEstado.toLowerCase().includes("manual")) {
    derived.push({
      regla: "Antecedentes Policia Nacional",
      resultado: "REVISION",
      razon: "Requiere validacion manual (captcha)"
    });
  }

  const score = asNumber(caracteristicas.score_credito);
  if (typeof score === "number") {
    derived.push({
      regla: "Score de credito",
      resultado: score < 580 ? "DESCARTADO" : score >= 730 ? "APROBADO" : "REVISION",
      razon: score < 580 ? "Score por debajo del umbral" : score >= 730 ? "Score alto" : "Score intermedio",
      valor: String(score)
    });
  }

  const decision = pickString(base.decision, politica.decision, decisionSureti.decision, decisionSureti.clasificacion);
  if (decision) {
    derived.push(mapDecisionToStep(decision));
  }

  derived.push(finalClassificationStep(clasificacion));
  return derived;
}

function normalizeLead(payload: unknown, index: number): LeadRecord {
  const base = isRecord(payload) ? payload : {};
  const persona = isRecord(base.persona) ? base.persona : {};
  const contacto = isRecord(base.contacto) ? base.contacto : {};
  const validaciones = isRecord(base.validaciones) ? base.validaciones : {};
  const decisionSureti = isRecord(base.decision_sureti) ? base.decision_sureti : {};
  const politicas = isRecord(validaciones.politicas)
    ? validaciones.politicas
    : isRecord(validaciones.politica)
      ? validaciones.politica
      : {};
  const identidad = isRecord(validaciones.identidad)
    ? validaciones.identidad
    : isRecord(base.identidad)
      ? base.identidad
      : {};

  const caracteristicas = extractCharacteristics(base);
  const scoreCredito = asNumber(caracteristicas.score_credito);
  const clasificacion = normalizeClassification(
    base.clasificacion_lead ??
      base.clasificacion ??
      base.resultado ??
      base.decision ??
      decisionSureti.clasificacion ??
      decisionSureti.decision ??
      politicas.clasificacion ??
      politicas.decision ??
      identidad.resultado ??
      base.status,
    scoreCredito
  );

  const nombre =
    pickString(base.nombre, base.nombre_completo, persona.nombre_completo) ||
    `Lead ${index + 1}`;
  const cedula = pickString(base.cedula, persona.cedula, base.documento) || "Sin cedula";
  const celularLead =
    pickString(
      contacto.celular,
      contacto.telefono,
      base.celular_lead,
      base.celular,
      base.telefono_contacto,
      base.telefono,
      persona.telefono
    ) || "Sin celular";
  const telefonoTitular = pickString(persona.telefono, base.telefono_titular, base.telefonoTitular);
  const origenLead = pickString(base.origen, base.source, base.canal, base.canal_origen, contacto.origen);

  if (caracteristicas.celular_lead === undefined) {
    caracteristicas.celular_lead = celularLead;
  }
  if (telefonoTitular && caracteristicas.telefono_titular === undefined) {
    caracteristicas.telefono_titular = telefonoTitular;
  }
  if (origenLead && caracteristicas.origen_lead === undefined) {
    caracteristicas.origen_lead = origenLead;
  }
  const alertas = extractAlertas(base, identidad);
  const fuentes = extractSources(base, identidad);
  const esApto = pickBoolean(base.es_apto, identidad.es_apto) ?? clasificacion !== "NO_VIABLE";
  const politica = extractPolicyTrace(base, identidad, clasificacion, caracteristicas);
  const fechaValidacion = pickString(base.fecha_validacion, identidad.fecha_validacion, base.updated_at, base.created_at, base.fecha_evaluacion);
  const id = pickString(base.id, base._id, base.uuid, base.lead_id) || `lead-${index + 1}`;

  return {
    id,
    nombre,
    cedula,
    celularLead,
    telefonoTitular,
    origenLead,
    clasificacion,
    esApto,
    alertas,
    caracteristicas,
    fuentes,
    politica,
    fechaValidacion,
    raw: payload
  };
}

function sortLeads(leads: LeadRecord[]): LeadRecord[] {
  return [...leads].sort((a, b) => {
    const severity = CLASSIFICATION_ORDER[a.clasificacion] - CLASSIFICATION_ORDER[b.clasificacion];
    if (severity !== 0) return severity;

    const dateA = a.fechaValidacion ? new Date(a.fechaValidacion).getTime() : 0;
    const dateB = b.fechaValidacion ? new Date(b.fechaValidacion).getTime() : 0;
    return dateB - dateA;
  });
}

function buildLeadsApiUrl(refresh: boolean): string {
  if (!refresh) return LEADS_API_URL;
  return `${LEADS_API_URL}${LEADS_API_URL.includes("?") ? "&" : "?"}refresh=1`;
}

function buildEmptyResult(endpoint: string, message?: string): LeadLoadResult {
  return {
    leads: [],
    fromMock: false,
    endpoint,
    message
  };
}

export async function loadLeads(options: LoadLeadsOptions = {}): Promise<LeadLoadResult> {
  const endpoint = buildLeadsApiUrl(Boolean(options.refresh));

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const rawLeads = extractArrayPayload(payload);
    const normalized = sortLeads(rawLeads.map((item, index) => normalizeLead(item, index)));

    if (normalized.length === 0) {
      if (!ENABLE_MOCK_DATA) {
        return buildEmptyResult(endpoint, "La API no devolvio leads");
      }
      throw new Error("La API no devolvio leads");
    }

    return {
      leads: normalized,
      fromMock: false,
      endpoint
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    if (!ENABLE_MOCK_DATA) {
      return buildEmptyResult(endpoint, message);
    }
    return {
      leads: sortLeads(mockLeads),
      fromMock: true,
      endpoint,
      message
    };
  }
}

