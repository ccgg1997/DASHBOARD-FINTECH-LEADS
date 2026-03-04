export type Classification = "PENDIENTE" | "NO_VIABLE" | "VIABLE" | "ALTAMENTE_VIABLE";

export type PolicyStepResult = "APROBADO" | "DESCARTADO" | "REVISION";

export type PolicyStep = {
  regla: string;
  resultado: PolicyStepResult;
  razon?: string;
  valor?: string;
};

export type LeadValidationSource = {
  nombre: string;
  estado: string;
  detalle?: string;
};

export type LeadRecord = {
  id: string;
  nombre: string;
  cedula: string;
  celularLead: string;
  telefonoTitular?: string;
  origenLead?: string;
  clasificacion: Classification;
  esApto: boolean;
  alertas: string[];
  caracteristicas: Record<string, string | number | boolean | null>;
  fuentes: LeadValidationSource[];
  politica: PolicyStep[];
  fechaValidacion?: string;
  raw: unknown;
};

export type LeadLoadResult = {
  leads: LeadRecord[];
  fromMock: boolean;
  endpoint: string;
  message?: string;
};
