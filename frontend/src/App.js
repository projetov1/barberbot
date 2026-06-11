import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats, getLeads, getAppointments, updateAppointmentStatus, getServices, createService, deleteService } from './services/api';

const TEMP_COLOR = { frio: '#60a5fa', morno: '#fbbf24', quente: '#f87171' };
const TEMP_LABEL = { frio: '🧊 Frio', morno: '🔥 Morno', quente: '⚡ Quente' };
const STATUS_COLOR = { pendente: '#fbbf24', confirmado: '#34d399', cancelado: '#f87171', concluido: '#818cf8' };

function Badge({ text, color }) {
  return (
    <span style={{
      background: color + '22',
      color: color,
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
    }}>{text}</span>
  );
}

function StatCard({ label, value, sub, color = '#34d399' }) {
  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #ffffff11',
      borderRadius: 12,
      padding: '20px 24px',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 32, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── ABAS ──────────────────────────────────────────────────────────────────────

function Overview({ stats }) {
  if (!stats) return <div style={{ color: '#888', padding: 40 }}>Carregando...</div>;

  const pieData = [
    { name: 'Frio', value: stats.temperature.frio },
    { name: 'Morno', value: stats.temperature.morno },
    { name: 'Quente', value: stats.temperature.quente },
  ];
  const pieColors = ['#60a5fa', '#fbbf24', '#f87171'];

  const chartData = (stats.activity.leadsPerDay || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    leads: parseInt(d.count),
  }));

  return (
    <div>
      {/* Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Total de Leads" value={stats.totals.totalLeads} />
        <StatCard label="Novos Contatos" value={stats.totals.newClients} color="#60a5fa" />
        <StatCard label="Clientes Recorrentes" value={stats.totals.returning} color="#818cf8" />
        <StatCard label="Agendamentos Pendentes" value={stats.appointments.pending} color="#fbbf24" />
        <StatCard label="Mensagens Hoje" value={stats.activity.todayMessages} color="#f472b6" />
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Gráfico leads por dia */}
        <div style={{ background: '#1a1a2e', border: '1px solid #ffffff11', borderRadius: 12, padding: 20, flex: 2, minWidth: 280 }}>
          <div style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>Leads por dia (7 dias)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" stroke="#444" tick={{ fill: '#888', fontSize: 12 }} />
              <YAxis stroke="#444" tick={{ fill: '#888', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0f0f23', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="leads" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pizza temperatura */}
        <div style={{ background: '#1a1a2e', border: '1px solid #ffffff11', borderRadius: 12, padding: 20, flex: 1, minWidth: 200 }}>
          <div style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>Temperatura dos Leads</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f0f23', border: 'none', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: pieColors[i], display: 'inline-block' }} />
                <span style={{ color: '#aaa' }}>{d.name}</span>
                <span style={{ color: '#fff', marginLeft: 'auto', fontWeight: 600 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leads recentes */}
      <div style={{ background: '#1a1a2e', border: '1px solid #ffffff11', borderRadius: 12, padding: 20, marginTop: 24 }}>
        <div style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>Leads Recentes</div>
        {stats.recentLeads.map(lead => (
          <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #ffffff08' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#34d39922', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontSize: 14, fontWeight: 700 }}>
              {(lead.name || lead.phone)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{lead.name || 'Sem nome'}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{lead.phone}</div>
            </div>
            <Badge text={TEMP_LABEL[lead.temperature]} color={TEMP_COLOR[lead.temperature]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Leads() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeads(filter ? { temperature: filter } : {})
      .then(d => setLeads(d.leads || []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'frio', 'morno', 'quente'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            background: filter === t ? '#34d399' : '#1a1a2e',
            color: filter === t ? '#000' : '#aaa',
            border: '1px solid #ffffff11',
            borderRadius: 8,
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {t === '' ? 'Todos' : TEMP_LABEL[t]}
          </button>
        ))}
      </div>

      <div style={{ background: '#1a1a2e', border: '1px solid #ffffff11', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ffffff11' }}>
              {['Nome', 'Telefone', 'Temperatura', 'Etapa', 'Tipo', 'Desde'].map(h => (
                <th key={h} style={{ color: '#666', fontSize: 12, fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, color: '#666', textAlign: 'center' }}>Carregando...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, color: '#666', textAlign: 'center' }}>Nenhum lead encontrado</td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #ffffff06' }}>
                <td style={{ padding: '12px 16px', color: '#fff', fontSize: 14 }}>{lead.name || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>{lead.phone}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge text={TEMP_LABEL[lead.temperature]} color={TEMP_COLOR[lead.temperature]} />
                </td>
                <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>{lead.stage}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge text={lead.isClient ? '✅ Cliente' : '🆕 Novo'} color={lead.isClient ? '#34d399' : '#818cf8'} />
                </td>
                <td style={{ padding: '12px 16px', color: '#666', fontSize: 12 }}>
                  {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('pendente');

  const load = useCallback(() => {
    getAppointments({ status: filter }).then(setAppointments);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleStatus(id, status) {
    await updateAppointmentStatus(id, status);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pendente', 'confirmado', 'concluido', 'cancelado'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? STATUS_COLOR[s] : '#1a1a2e',
            color: filter === s ? '#000' : '#aaa',
            border: '1px solid #ffffff11',
            borderRadius: 8,
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'capitalize',
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {appointments.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>Nenhum agendamento</div>
        ) : appointments.map(a => (
          <div key={a.id} style={{ background: '#1a1a2e', border: '1px solid #ffffff11', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600 }}>{a.lead?.name || a.lead?.phone}</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                ✂️ {a.service} &nbsp;·&nbsp; 📅 {a.date} &nbsp;·&nbsp; 🕐 {a.time}
              </div>
            </div>
            <Badge text={a.status} color={STATUS_COLOR[a.status]} />
            {a.status === 'pendente' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleStatus(a.id, 'confirmado')} style={{ background: '#34d39922', color: '#34d399', border: '1px solid #34d39944', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Confirmar</button>
                <button onClick={() => handleStatus(a.id, 'cancelado')} style={{ background: '#f8717122', color: '#f87171', border: '1px solid #f8717144', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            )}
            {a.status === 'confirmado' && (
              <button onClick={() => handleStatus(a.id, 'concluido')} style={{ background: '#818cf822', color: '#818cf8', border: '1px solid #818cf844', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Concluir</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Services() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', duration: '', description: '' });
  const [adding, setAdding] = useState(false);

  const load = () => getServices().then(setServices);
  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.name || !form.price) return;
    await createService(form);
    setForm({ name: '', price: '', duration: '', description: '' });
    setAdding(false);
    load();
  }

  async function handleDelete(id) {
    await deleteService(id);
    load();
  }

  const inputStyle = {
    background: '#0f0f23',
    border: '1px solid #ffffff22',
    borderRadius: 8,
    color: '#fff',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: '#aaa', fontSize: 14 }}>Serviços que aparecem no bot</div>
        <button onClick={() => setAdding(!adding)} style={{ background: '#34d399', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 700 }}>
          + Novo Serviço
        </button>
      </div>

      {adding && (
        <div style={{ background: '#1a1a2e', border: '1px solid #34d39933', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input placeholder="Nome do serviço" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 160 }} />
          <input placeholder="Preço (ex: 35)" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, width: 120 }} />
          <input placeholder="Duração (min)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ ...inputStyle, width: 130 }} />
          <input placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, flex: 3, minWidth: 180 }} />
          <button onClick={handleAdd} style={{ background: '#34d399', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 700 }}>Salvar</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {services.map(s => (
          <div key={s.id} style={{ background: '#1a1a2e', border: '1px solid #ffffff11', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600 }}>{s.name}</div>
              {s.description && <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{s.description}</div>}
            </div>
            <div style={{ color: '#34d399', fontWeight: 700 }}>R$ {s.price.toFixed(2)}</div>
            {s.duration && <div style={{ color: '#888', fontSize: 13 }}>{s.duration} min</div>}
            <button onClick={() => handleDelete(s.id)} style={{ background: '#f8717122', color: '#f87171', border: '1px solid #f8717144', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ──────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
    const interval = setInterval(() => {
      getDashboardStats().then(setStats).catch(console.error);
    }, 30000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'overview', label: '📊 Visão Geral' },
    { id: 'leads', label: '👥 Leads' },
    { id: 'appointments', label: '📅 Agendamentos' },
    { id: 'services', label: '✂️ Serviços' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', borderBottom: '1px solid #ffffff11', padding: '0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✂️</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>BarberBot</span>
            <span style={{ color: '#34d399', fontSize: 12, background: '#34d39922', padding: '2px 8px', borderRadius: 20 }}>● Ativo</span>
          </div>
          <div style={{ color: '#666', fontSize: 13 }}>
            Atualizado: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#1a1a2e', borderBottom: '1px solid #ffffff08', padding: '0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none',
              border: 'none',
              color: tab === t.id ? '#34d399' : '#666',
              borderBottom: tab === t.id ? '2px solid #34d399' : '2px solid transparent',
              padding: '16px 20px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 400,
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        {tab === 'overview' && <Overview stats={stats} />}
        {tab === 'leads' && <Leads />}
        {tab === 'appointments' && <Appointments />}
        {tab === 'services' && <Services />}
      </div>
    </div>
  );
}
