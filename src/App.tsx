import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography
} from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  FileSearchOutlined,
  FilterOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  TeamOutlined
} from "@ant-design/icons";
import type { MenuProps, TableProps } from "antd";

import { loadLeads } from "./services/leadsApi";
import { Classification, LeadRecord } from "./types";

type FilterOption = "TODOS" | Classification;
type RefreshMode = "MANUAL" | "AUTO_5M";

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;
const FILTERS: FilterOption[] = ["TODOS", "NO_VIABLE", "VIABLE", "ALTAMENTE_VIABLE"];

const SIDE_ITEMS: MenuProps["items"] = [
  { key: "dashboard", icon: <HomeOutlined />, label: "Dashboard" },
  { key: "leads", icon: <TeamOutlined />, label: "Leads" },
  { key: "politica", icon: <SafetyCertificateOutlined />, label: "Política" },
  { key: "validaciones", icon: <AuditOutlined />, label: "Validaciones" },
  { key: "reportes", icon: <AppstoreOutlined />, label: "Reportes" }
];

function classificationLabel(value: Classification): string {
  if (value === "NO_VIABLE") return "No Viable";
  if (value === "ALTAMENTE_VIABLE") return "Altamente Viable";
  return "Viable";
}

function classificationColor(value: Classification): string {
  if (value === "NO_VIABLE") return "red";
  if (value === "ALTAMENTE_VIABLE") return "green";
  return "blue";
}

function policyColor(result: string): "red" | "blue" | "green" {
  const normalized = result.toUpperCase();
  if (normalized.includes("DESCARTADO")) return "red";
  if (normalized.includes("REVISION")) return "blue";
  return "green";
}

function sourceStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("error")) return "red";
  if (normalized.includes("manual") || normalized.includes("pendiente")) return "gold";
  if (normalized.includes("consultado")) return "green";
  return "blue";
}

function formatDate(value?: string): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function prettyKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCharacteristic(value: string | number | boolean | null): string {
  if (typeof value === "number") return value.toLocaleString("es-CO");
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value === null) return "No aplica";
  return value;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("TODOS");
  const [refreshMode, setRefreshMode] = useState<RefreshMode>("MANUAL");
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined);
  const [sourceMessage, setSourceMessage] = useState<string | undefined>(undefined);
  const [endpoint, setEndpoint] = useState("");
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);

  const fetchLeads = useCallback(async (forceRefresh: boolean, initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await loadLeads({ refresh: forceRefresh });
      setLeads(response.leads);
      setSourceMessage(response.message);
      setEndpoint(response.endpoint);
      setLastSyncAt(new Date().toISOString());
    } finally {
      if (initialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchLeads(false, true);
  }, [fetchLeads]);

  useEffect(() => {
    if (refreshMode !== "AUTO_5M") return;
    void fetchLeads(true);
    const timerId = window.setInterval(() => {
      void fetchLeads(true);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timerId);
  }, [refreshMode, fetchLeads]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesFilter = filter === "TODOS" ? true : lead.clasificacion === filter;
      const matchesQuery =
        normalizedQuery.length === 0
          ? true
          : lead.nombre.toLowerCase().includes(normalizedQuery) ||
            lead.cedula.toLowerCase().includes(normalizedQuery) ||
            lead.celularLead.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [leads, query, filter]);

  const summary = useMemo(() => {
    const stats = {
      total: leads.length,
      noViable: 0,
      viable: 0,
      altamenteViable: 0
    };

    for (const lead of leads) {
      if (lead.clasificacion === "NO_VIABLE") stats.noViable += 1;
      if (lead.clasificacion === "VIABLE") stats.viable += 1;
      if (lead.clasificacion === "ALTAMENTE_VIABLE") stats.altamenteViable += 1;
    }

    return stats;
  }, [leads]);

  const columns: TableProps<LeadRecord>["columns"] = [
    {
      title: "Cliente",
      dataIndex: "nombre",
      key: "nombre",
      render: (_value, record) => (
        <Space>
          <Avatar style={{ backgroundColor: "#6d5fd4" }}>{record.nombre.slice(0, 1).toUpperCase()}</Avatar>
          <Space direction="vertical" size={0}>
            <Text strong>{record.nombre}</Text>
            <Text type="secondary">ID {record.id}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: "Cédula",
      dataIndex: "cedula",
      key: "cedula"
    },
    {
      title: "Celular Lead",
      dataIndex: "celularLead",
      key: "celularLead"
    },
    {
      title: "Clasificación",
      dataIndex: "clasificacion",
      key: "clasificacion",
      render: (value: Classification) => <Tag color={classificationColor(value)}>{classificationLabel(value)}</Tag>
    },
    {
      title: "Alertas",
      dataIndex: "alertas",
      key: "alertas",
      align: "center",
      render: (alerts: string[]) => alerts.length
    },
    {
      title: "Última Evaluación",
      dataIndex: "fechaValidacion",
      key: "fechaValidacion",
      render: (value?: string) => formatDate(value)
    },
    {
      title: "Acción",
      key: "action",
      align: "center",
      render: (_value, record) => (
        <Button type="primary" ghost onClick={() => setActiveLead(record)}>
          Ver Detalle
        </Button>
      )
    }
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#6d5fd4",
          borderRadius: 12,
          fontFamily: "Space Grotesk, Segoe UI, sans-serif"
        }
      }}
    >
      <Layout className="admin-layout">
        <Sider width={250} theme="light" className="admin-sider">
          <div className="brand-head">
            <div className="brand-mark">S</div>
            <div>
              <Text className="brand-subtitle">Sureti</Text>
              <Title level={4} className="brand-title">
                Lead Control
              </Title>
            </div>
          </div>

          <Menu mode="inline" selectedKeys={["dashboard"]} items={SIDE_ITEMS} className="sider-menu" />

          <Card className="sider-summary" bordered={false}>
            <Text type="secondary">Total Leads</Text>
            <Title level={3}>{summary.total}</Title>
            <Text type="secondary">Fuente API</Text>
          </Card>
        </Sider>

        <Layout>
          <Header className="admin-header">
            <div>
              <Title level={3} className="header-title">
                Panel de Clasificación de Leads
              </Title>
              <Text type="secondary">Vista de decisiones, descarte y trazabilidad por cliente.</Text>
            </div>
            <Space direction="vertical" align="end" size={2}>
              <Space>
                <Select
                  value={refreshMode}
                  onChange={(value) => setRefreshMode(value as RefreshMode)}
                  options={[
                    { value: "MANUAL", label: "Actualización Manual" },
                    { value: "AUTO_5M", label: "Cada 5 minutos" }
                  ]}
                  style={{ width: 210 }}
                />
                <Button type="primary" onClick={() => void fetchLeads(true)} loading={refreshing}>
                  Actualizar ahora
                </Button>
              </Space>
              <Space>
                <Tag color="green">API Real</Tag>
                <Tag color={refreshMode === "AUTO_5M" ? "blue" : "default"}>
                  {refreshMode === "AUTO_5M" ? "Auto 5m" : "Manual"}
                </Tag>
              </Space>
              <Text type="secondary" className="endpoint-label">
                {endpoint || "Sin endpoint"}
              </Text>
              <Text type="secondary" className="endpoint-label">
                Última sincronización: {lastSyncAt ? formatDate(lastSyncAt) : "Sin datos"}
              </Text>
            </Space>
          </Header>

          <Content className="admin-content">
            {sourceMessage ? (
              <Alert
                type="error"
                showIcon
                message="Error consultando API"
                description={sourceMessage}
                className="top-alert"
              />
            ) : null}

            <Row gutter={[12, 12]} className="kpi-row">
              <Col xs={12} lg={6}>
                <Card>
                  <Statistic title="Total" value={summary.total} />
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card>
                  <Statistic title="No Viables" value={summary.noViable} valueStyle={{ color: "#cf3f3f" }} />
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card>
                  <Statistic title="Viables" value={summary.viable} valueStyle={{ color: "#2f6bbb" }} />
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card>
                  <Statistic title="Altamente Viables" value={summary.altamenteViable} valueStyle={{ color: "#2d9f5f" }} />
                </Card>
              </Col>
            </Row>

            <Card className="table-card" title="Leads" extra={<Space><FilterOutlined /><Text>{filteredLeads.length} resultados</Text></Space>}>
              <Row gutter={10} className="table-filters">
                <Col xs={24} md={16}>
                  <Input
                    allowClear
                    placeholder="Buscar por nombre, cédula o celular…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    prefix={<FileSearchOutlined />}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Select
                    value={filter}
                    onChange={(value) => setFilter(value as FilterOption)}
                    style={{ width: "100%" }}
                    options={FILTERS.map((option) => ({
                      value: option,
                      label: option === "TODOS" ? "Todos" : classificationLabel(option)
                    }))}
                  />
                </Col>
              </Row>

              <Table<LeadRecord>
                rowKey="id"
                columns={columns}
                dataSource={filteredLeads}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                onRow={(record) => ({
                  onClick: () => setActiveLead(record)
                })}
              />
            </Card>
          </Content>
        </Layout>

        <Modal
          open={!!activeLead}
          onCancel={() => setActiveLead(null)}
          footer={null}
          width={1100}
          className="lead-modal"
          destroyOnHidden
          title={
            activeLead ? (
              <Space>
                <Avatar style={{ backgroundColor: "#6d5fd4" }}>{activeLead.nombre.slice(0, 1).toUpperCase()}</Avatar>
                <Space direction="vertical" size={0}>
                  <Text strong>{activeLead.nombre}</Text>
                  <Text type="secondary">
                    {activeLead.cedula} · {activeLead.celularLead}
                  </Text>
                </Space>
                <Tag color={classificationColor(activeLead.clasificacion)}>{classificationLabel(activeLead.clasificacion)}</Tag>
              </Space>
            ) : null
          }
        >
          {activeLead ? (
            <Row gutter={[14, 14]}>
              <Col xs={24} md={8}>
                <Card>
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Statistic title="Clasificación" value={classificationLabel(activeLead.clasificacion)} />
                    <Statistic title="Alertas" value={activeLead.alertas.length} />
                    <Statistic title="Políticas Evaluadas" value={activeLead.politica.length} />
                    <Statistic title="Fuentes" value={activeLead.fuentes.length} />
                    <Text type="secondary">Última evaluación: {formatDate(activeLead.fechaValidacion)}</Text>
                    <Descriptions size="small" bordered column={1}>
                      <Descriptions.Item label="Celular de llegada">{activeLead.celularLead}</Descriptions.Item>
                      <Descriptions.Item label="Teléfono titular">{activeLead.telefonoTitular || "Sin dato"}</Descriptions.Item>
                      <Descriptions.Item label="Origen">{activeLead.origenLead || "Sin dato"}</Descriptions.Item>
                    </Descriptions>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={16}>
                <Tabs
                  defaultActiveKey="policy"
                  items={[
                    {
                      key: "policy",
                      label: "Política",
                      children:
                        activeLead.politica.length > 0 ? (
                          <Timeline
                            items={activeLead.politica.map((step) => ({
                              color: policyColor(step.resultado),
                              children: (
                                <Space direction="vertical" size={2}>
                                  <Text strong>{step.regla}</Text>
                                  {step.razon ? <Text>{step.razon}</Text> : null}
                                  {step.valor ? <Text type="secondary">Valor: {step.valor}</Text> : null}
                                </Space>
                              )
                            }))}
                          />
                        ) : (
                          <Text type="secondary">Sin trazabilidad registrada.</Text>
                        )
                    },
                    {
                      key: "features",
                      label: "Características",
                      children:
                        Object.keys(activeLead.caracteristicas).length > 0 ? (
                          <Descriptions size="small" bordered column={1}>
                            {Object.entries(activeLead.caracteristicas).map(([key, value]) => (
                              <Descriptions.Item key={key} label={prettyKey(key)}>
                                {formatCharacteristic(value)}
                              </Descriptions.Item>
                            ))}
                          </Descriptions>
                        ) : (
                          <Text type="secondary">Sin características disponibles.</Text>
                        )
                    },
                    {
                      key: "sources",
                      label: "Fuentes",
                      children:
                        activeLead.fuentes.length > 0 ? (
                          <List
                            itemLayout="horizontal"
                            dataSource={activeLead.fuentes}
                            renderItem={(source) => (
                              <List.Item>
                                <List.Item.Meta title={source.nombre} description={source.detalle || "Sin detalle"} />
                                <Tag color={sourceStatusColor(source.estado)}>{source.estado}</Tag>
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Text type="secondary">Sin fuentes registradas.</Text>
                        )
                    },
                    {
                      key: "alerts",
                      label: "Alertas",
                      children:
                        activeLead.alertas.length > 0 ? (
                          <List dataSource={activeLead.alertas} renderItem={(item) => <List.Item>{item}</List.Item>} />
                        ) : (
                          <Text type="secondary">Sin alertas registradas.</Text>
                        )
                    },
                    {
                      key: "raw",
                      label: "Payload",
                      children: <pre className="raw-block">{JSON.stringify(activeLead.raw, null, 2)}</pre>
                    }
                  ]}
                />
              </Col>
            </Row>
          ) : null}
        </Modal>
      </Layout>
    </ConfigProvider>
  );
}
