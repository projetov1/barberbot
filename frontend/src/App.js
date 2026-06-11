import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats, getLeads, getAppointments, updateAppointmentStatus, getServices, createService, deleteService } from './services/api';

const TEMP_COLOR = { frio: '#60a5fa', morno: '#fbbf24', quente: '#f87171' };
const TEMP_LABEL = { frio: 'Frio', morno: 'Morno', quente: 'Quente' };
const STATUS_COLOR = { pendente: '#fbbf24', confirmado: '#34d399', cancelado: '#f87171', concluido: '#818cf8' };

const Icons = {
  overview: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
  leads: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  appointments: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  services: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>),
};

function Badge({ text, color }) {
  return <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{text}</span>;
}

function MetricCard({ label, value, color, icon }) {
  return (
    <div style={{ background: color, borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 150, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: 0.15, position: 'absolute', right: 16, top: 16, transform: 'scale(2.5)', transformOrigin: 'top right' }}>{icon}</div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

function Overview({ stats }) {
  if (!stats) return <div style={{ color: '#555', padding: 60, textAlign: 'center' }}>Carregando...</div>;
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
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricCard icon={Icons.leads} label="Total de Leads" value={stats.totals.totalLeads} color="#0ea5e9" />
        <MetricCard icon={Icons.leads} label="Novos Contatos" value={stats.totals.newClients} color="#8b5cf6" />
        <MetricCard icon={Icons.leads} label="Recorrentes" value={stats.totals.returning} color="#06b6d4" />
        <MetricCard icon={Icons.appointments} label="Agend. Pendentes" value={stats.appointments.pending} color="#f59e0b" />
        <MetricCard icon={Icons.overview} label="Mensagens Hoje" value={stats.activity.todayMessages} color="#ec4899" />
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ background: '#131320', border: '1px solid #ffffff0d', borderRadius: 16, padding: 24, flex: 2, minWidth: 280 }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Leads por dia (7 dias)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#333" tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis stroke="#333" tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0a0a1a', border: '1px solid #ffffff11', borderRadius: 8, color: '#fff' }} />
              <Line type="monotone" dataKey="leads" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#131320', border: '1px solid #ffffff0d', borderRadius: 16, padding: 24, flex: 1, minWidth: 200 }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Temperatura dos Leads</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0a0a1a', border: '1px solid #ffffff11', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: pieColors[i], display: 'inline-block' }} />
                <span style={{ color: '#888', flex: 1 }}>{d.name}</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: '#131320', border: '1px solid #ffffff0d', borderRadius: 16, padding: 24 }}>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Leads Recentes</div>
        {stats.recentLeads.map(lead => (
          <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #ffffff06' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0ea5e920', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontSize: 15, fontWeight: 700 }}>
              {(lead.name || lead.phone)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{lead.name || 'Sem nome'}</div>
              <div style={{ color: '#555', fontSize: 12 }}>{lead.phone}</div>
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
    getLeads(filter ? { temperature: filter } : {}).then(d => setLeads(d.leads || [])).finally(() => setLoading(false));
  }, [filter]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'frio', 'morno', 'quente'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ background: filter === t ? '#0ea5e9' : '#131320', color: filter === t ? '#fff' : '#666', border: `1px solid ${filter === t ? '#0ea5e9' : '#ffffff11'}`, borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t === '' ? 'Todos' : TEMP_LABEL[t]}
          </button>
        ))}
      </div>
      <div style={{ background: '#131320', border: '1px solid #ffffff0d', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ffffff0d' }}>
              {['Nome', 'Telefone', 'Temperatura', 'Etapa', 'Tipo', 'Desde'].map(h => (
                <th key={h} style={{ color: '#555', fontSize: 11, fontWeight: 600, padding: '14px 18px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 40, color: '#555', textAlign: 'center' }}>Carregando...</td></tr>
            : leads.length === 0 ? <tr><td colSpan={6} style={{ padding: 40, color: '#555', textAlign: 'center' }}>Nenhum lead encontrado</td></tr>
            : leads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #ffffff05' }}>
                <td style={{ padding: '13px 18px', color: '#fff', fontSize: 14 }}>{lead.name || '—'}</td>
                <td style={{ padding: '13px 18px', color: '#666', fontSize: 13 }}>{lead.phone}</td>
                <td style={{ padding: '13px 18px' }}><Badge text={TEMP_LABEL[lead.temperature]} color={TEMP_COLOR[lead.temperature]} /></td>
                <td style={{ padding: '13px 18px', color: '#666', fontSize: 13 }}>{lead.stage}</td>
                <td style={{ padding: '13px 18px' }}><Badge text={lead.isClient ? 'Cliente' : 'Novo'} color={lead.isClient ? '#34d399' : '#818cf8'} /></td>
                <td style={{ padding: '13px 18px', color: '#555', fontSize: 12 }}>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
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
  const load = useCallback(() => { getAppointments({ status: filter }).then(setAppointments); }, [filter]);
  useEffect(() => { load(); }, [load]);
  async function handleStatus(id, status) { await updateAppointmentStatus(id, status); load(); }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pendente', 'confirmado', 'concluido', 'cancelado'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? STATUS_COLOR[s] : '#131320', color: filter === s ? '#000' : '#666', border: `1px solid ${filter === s ? STATUS_COLOR[s] : '#ffffff11'}`, borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{s}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {appointments.length === 0 ? <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Nenhum agendamento</div>
        : appointments.map(a => (
          <div key={a.id} style={{ background: '#131320', border: '1px solid #ffffff0d', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{a.lead?.name || a.lead?.phone}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{a.service} · {a.date} · {a.time}</div>
            </div>
            <Badge text={a.status} color={STATUS_COLOR[a.status]} />
            {a.status === 'pendente' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleStatus(a.id, 'confirmado')} style={{ background: '#34d39915', color: '#34d399', border: '1px solid #34d39933', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Confirmar</button>
                <button onClick={() => handleStatus(a.id, 'cancelado')} style={{ background: '#f8717115', color: '#f87171', border: '1px solid #f8717133', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            )}
            {a.status === 'confirmado' && <button onClick={() => handleStatus(a.id, 'concluido')} style={{ background: '#818cf815', color: '#818cf8', border: '1px solid #818cf833', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Concluir</button>}
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
  async function handleDelete(id) { await deleteService(id); load(); }
  const inputStyle = { background: '#0a0a1a', border: '1px solid #ffffff15', borderRadius: 8, color: '#fff', padding: '9px 13px', fontSize: 14, outline: 'none' };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: '#666', fontSize: 14 }}>Serviços cadastrados no bot</div>
        <button onClick={() => setAdding(!adding)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>+ Novo Serviço</button>
      </div>
      {adding && (
        <div style={{ background: '#131320', border: '1px solid #0ea5e922', borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input placeholder="Nome do serviço" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 160 }} />
          <input placeholder="Preço (ex: 35)" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, width: 120 }} />
          <input placeholder="Duração (min)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ ...inputStyle, width: 130 }} />
          <input placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, flex: 3, minWidth: 180 }} />
          <button onClick={handleAdd} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontWeight: 700 }}>Salvar</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {services.map(s => (
          <div key={s.id} style={{ background: '#131320', border: '1px solid #ffffff0d', borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600 }}>{s.name}</div>
              {s.description && <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>{s.description}</div>}
            </div>
            <div style={{ color: '#0ea5e9', fontWeight: 700, fontSize: 16 }}>R$ {s.price.toFixed(2)}</div>
            {s.duration && <div style={{ color: '#666', fontSize: 13 }}>{s.duration} min</div>}
            <button onClick={() => handleDelete(s.id)} style={{ background: '#f8717115', color: '#f87171', border: '1px solid #f8717133', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
    const interval = setInterval(() => { getDashboardStats().then(setStats).catch(console.error); setTime(new Date()); }, 30000);
    return () => clearInterval(interval);
  }, []);
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Icons.overview },
    { id: 'leads', label: 'Leads', icon: Icons.leads },
    { id: 'appointments', label: 'Agendamentos', icon: Icons.appointments },
    { id: 'services', label: 'Serviços', icon: Icons.services },
  ];
  const tabTitles = { overview: 'Visão Geral', leads: 'Leads', appointments: 'Agendamentos', services: 'Serviços' };
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* SIDEBAR */}
      <div style={{ width: 240, background: '#0f0f23', borderRight: '1px solid #ffffff0d', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #ffffff0d' }}>
          <img src="/logojohnbarber.png" alt="John Barber" style={{ width: '100%', maxWidth: 160, mixBlendMode: 'screen'
            
           }} />
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ffffff0d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, background: '#34d399', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #34d399' }} />
            <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>Bot Ativo</span>
          </div>
          <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: tab === t.id ? '#0ea5e915' : 'none', color: tab === t.id ? '#0ea5e9' : '#666', border: 'none', borderLeft: tab === t.id ? '3px solid #0ea5e9' : '3px solid transparent', borderRadius: '0 8px 8px 0', padding: '11px 16px', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.15s', textAlign: 'left', marginBottom: 4 }}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #ffffff0d', color: '#333', fontSize: 11 }}>BarberBot v1.0 · Projetov1</div>
      </div>
      {/* CONTEÚDO */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0f0f23', borderBottom: '1px solid #ffffff0d', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{tabTitles[tab]}</div>
          <div style={{ color: '#444', fontSize: 13 }}>John Barber Market Place</div>
        </div>
        <div style={{ padding: '32px', flex: 1 }}>
          {tab === 'overview' && <Overview stats={stats} />}
          {tab === 'leads' && <Leads />}
          {tab === 'appointments' && <Appointments />}
          {tab === 'services' && <Services />}
        </div>
      </div>
    </div>
  );
}
