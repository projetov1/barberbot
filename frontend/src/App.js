import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats, getLeads, getLead, getAppointments, updateAppointmentStatus, createAppointment, deleteAppointment, getServices, createService, deleteService, replyLead, resetBot } from './services/api';

// Tema: preto / branco / amarelo
const T = {
  bg:       '#000000',   // fundo principal
  sidebar:  '#0d0d0d',   // sidebar e cards escuros
  card:     '#111111',   // cards e painéis
  border:   '#1f1f1f',   // bordas sutis
  border2:  '#2a2a2a',   // bordas levemente mais visíveis
  yellow:   '#f5c518',   // amarelo destaque
  yellowDim:'#f5c51820', // amarelo transparente
  text:     '#ffffff',
  muted:    '#888888',
  muted2:   '#444444',
};

const TEMP_COLOR = { frio: '#60a5fa', morno: '#f5c518', quente: '#f87171' };
const TEMP_LABEL = { frio: 'Frio', morno: 'Morno', quente: 'Quente' };
const STATUS_COLOR = { pendente: '#f5c518', confirmado: '#34d399', cancelado: '#f87171', concluido: '#a78bfa' };

const Icons = {
  overview: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
  leads: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  appointments: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  services: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>),
  conversations: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
};

function Badge({ text, color }) {
  return <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{text}</span>;
}

function MetricCard({ label, value, color, icon }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${color}33`, borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 150, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: 0.12, position: 'absolute', right: 16, top: 16, transform: 'scale(2.5)', transformOrigin: 'top right', color }}>{icon}</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>{label}</div>
      <div style={{ color, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{value ?? '—'}</div>
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
        <MetricCard icon={Icons.leads} label="Total de Leads" value={stats.totals.totalLeads} color={T.yellow} />
        <MetricCard icon={Icons.leads} label="Novos Contatos" value={stats.totals.newClients} color="#a78bfa" />
        <MetricCard icon={Icons.leads} label="Recorrentes" value={stats.totals.returning} color="#34d399" />
        <MetricCard icon={Icons.appointments} label="Agend. Pendentes" value={stats.appointments.pending} color="#f87171" />
        <MetricCard icon={Icons.overview} label="Mensagens Hoje" value={stats.activity.todayMessages} color="#60a5fa" />
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, flex: 2, minWidth: 280 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Leads por dia (7 dias)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke={T.border2} tick={{ fill: T.muted2, fontSize: 12 }} />
              <YAxis stroke={T.border2} tick={{ fill: T.muted2, fontSize: 12 }} />
              <Tooltip contentStyle={{ background: T.sidebar, border: `1px solid ${T.border2}`, borderRadius: 8, color: '#fff' }} />
              <Line type="monotone" dataKey="leads" stroke={T.yellow} strokeWidth={2} dot={{ fill: T.yellow, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, flex: 1, minWidth: 200 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 8 }}>Temperatura dos Leads</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: T.sidebar, border: `1px solid ${T.border2}`, borderRadius: 8, color: '#fff' }} />
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
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Leads Recentes</div>
        {stats.recentLeads.map(lead => (
          <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.yellowDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.yellow, fontSize: 15, fontWeight: 700 }}>
              {(lead.name || lead.phone)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 500 }}>{lead.name || 'Sem nome'}</div>
              <div style={{ color: T.muted2, fontSize: 12 }}>{lead.phone}</div>
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
          <button key={t} onClick={() => setFilter(t)} style={{ background: filter === t ? T.yellow : T.card, color: filter === t ? '#000' : T.muted, border: `1px solid ${filter === t ? T.yellow : T.border}`, borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t === '' ? 'Todos' : TEMP_LABEL[t]}
          </button>
        ))}
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['Nome', 'Telefone', 'Temperatura', 'Etapa', 'Tipo', 'Desde'].map(h => (
                <th key={h} style={{ color: T.muted2, fontSize: 11, fontWeight: 600, padding: '14px 18px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 40, color: T.muted, textAlign: 'center' }}>Carregando...</td></tr>
            : leads.length === 0 ? <tr><td colSpan={6} style={{ padding: 40, color: T.muted, textAlign: 'center' }}>Nenhum lead encontrado</td></tr>
            : leads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '13px 18px', color: T.text, fontSize: 14 }}>{lead.name || '—'}</td>
                <td style={{ padding: '13px 18px', color: T.muted, fontSize: 13 }}>{lead.phone}</td>
                <td style={{ padding: '13px 18px' }}><Badge text={TEMP_LABEL[lead.temperature]} color={TEMP_COLOR[lead.temperature]} /></td>
                <td style={{ padding: '13px 18px', color: T.muted, fontSize: 13 }}>{lead.stage}</td>
                <td style={{ padding: '13px 18px' }}><Badge text={lead.isClient ? 'Cliente' : 'Novo'} color={lead.isClient ? '#34d399' : '#a78bfa'} /></td>
                <td style={{ padding: '13px 18px', color: T.muted2, fontSize: 12 }}>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SERVICES_LIST = ['Corte', 'Barba', 'Sobrancelha', 'Corte + Barba'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function Appointments() {
  const [view, setView] = useState('month'); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({ leadId: '', service: 'Corte', date: '', time: '09:00', notes: '' });
  const [leadSearch, setLeadSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;

  const load = useCallback(() => {
    getAppointments({ month: monthStr }).then(setAppointments);
  }, [monthStr]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getLeads({ limit: 200 }).then(d => setLeads(d.leads || [])); }, []);

  const apptByDate = {};
  for (const a of appointments) {
    if (!apptByDate[a.date]) apptByDate[a.date] = [];
    apptByDate[a.date].push(a);
  }

  function dateStr(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  async function handleCreate() {
    if (!form.leadId || !form.date || !form.time) return;
    setSaving(true);
    try {
      await createAppointment(form);
      setShowForm(false);
      setForm({ leadId: '', service: 'Corte', date: '', time: '09:00', notes: '' });
      setLeadSearch('');
      load();
    } catch(e) { alert('Erro ao criar agendamento'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover agendamento?')) return;
    await deleteAppointment(id);
    load();
  }

  async function handleStatus(id, status) {
    await updateAppointmentStatus(id, status);
    load();
  }

  function openNewForm(date) {
    setForm(f => ({ ...f, date }));
    setShowForm(true);
  }

  const filteredLeads = leads.filter(l =>
    (l.name || '').toLowerCase().includes(leadSearch.toLowerCase()) ||
    (l.phone || '').includes(leadSearch)
  );

  // ── Navegação ──
  function prev() {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }
  function next() {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }
  function goToday() { setCurrentDate(new Date()); }

  const todayStr = dateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  // ── Render mês ──
  function renderMonth() {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
          {WEEKDAYS.map(w => <div key={w} style={{ textAlign: 'center', color: T.muted, fontSize: 12, fontWeight: 600, padding: '8px 0', textTransform: 'uppercase' }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ minHeight: 90 }} />;
            const ds = dateStr(y, m, d);
            const dayApts = apptByDate[ds] || [];
            const isToday = ds === todayStr;
            return (
              <div key={i} onClick={() => { setSelectedDay(ds); }}
                style={{ minHeight: 90, background: isToday ? T.yellowDim : T.card, border: `1px solid ${isToday ? T.yellow : T.border}`, borderRadius: 10, padding: '6px 8px', cursor: 'pointer', transition: 'border 0.1s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: isToday ? T.yellow : T.text, fontWeight: isToday ? 700 : 400, fontSize: 14 }}>{d}</span>
                  <span onClick={e => { e.stopPropagation(); openNewForm(ds); }} style={{ color: T.yellow, fontSize: 18, lineHeight: 1, cursor: 'pointer', opacity: 0.7 }} title="Novo agendamento">+</span>
                </div>
                {dayApts.slice(0,3).map(a => (
                  <div key={a.id} style={{ background: STATUS_COLOR[a.status] + '22', border: `1px solid ${STATUS_COLOR[a.status]}44`, borderRadius: 4, padding: '2px 6px', marginBottom: 2, fontSize: 11, color: STATUS_COLOR[a.status], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.time} {a.lead?.name || a.lead?.phone}
                  </div>
                ))}
                {dayApts.length > 3 && <div style={{ color: T.muted, fontSize: 10 }}>+{dayApts.length-3} mais</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render semana ──
  function renderWeek() {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const days = Array.from({length:7}, (_, i) => {
      const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d;
    });
    const hours = Array.from({length:14}, (_, i) => i + 7); // 7h-20h

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', minWidth: 600 }}>
          <div />
          {days.map((d, i) => {
            const ds = dateStr(d.getFullYear(), d.getMonth(), d.getDate());
            const isToday = ds === todayStr;
            return (
              <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ color: T.muted, fontSize: 11 }}>{WEEKDAYS[d.getDay()]}</div>
                <div style={{ color: isToday ? T.yellow : T.text, fontWeight: isToday ? 700 : 400, fontSize: 18 }}>{d.getDate()}</div>
              </div>
            );
          })}
          {hours.map(h => (
            <React.Fragment key={h}>
              <div style={{ color: T.muted2, fontSize: 11, textAlign: 'right', paddingRight: 8, paddingTop: 4 }}>{String(h).padStart(2,'0')}h</div>
              {days.map((d, di) => {
                const ds = dateStr(d.getFullYear(), d.getMonth(), d.getDate());
                const slotApts = (apptByDate[ds] || []).filter(a => a.time && parseInt(a.time) === h);
                return (
                  <div key={di} onClick={() => openNewForm(ds)} style={{ borderBottom: `1px solid ${T.border}`, borderLeft: `1px solid ${T.border}`, minHeight: 48, padding: 2, cursor: 'pointer', position: 'relative' }}>
                    {slotApts.map(a => (
                      <div key={a.id} onClick={e => e.stopPropagation()} style={{ background: STATUS_COLOR[a.status] + '33', border: `1px solid ${STATUS_COLOR[a.status]}66`, borderRadius: 4, padding: '2px 5px', fontSize: 11, color: STATUS_COLOR[a.status], marginBottom: 2 }}>
                        {a.time} · {a.lead?.name || a.lead?.phone} · {a.service}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // ── Render dia ──
  function renderDay() {
    const ds = dateStr(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayApts = (apptByDate[ds] || []).sort((a,b) => (a.time||'').localeCompare(b.time||''));
    const hours = Array.from({length:14}, (_, i) => i + 7);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 0 }}>
        {hours.map(h => {
          const slotApts = dayApts.filter(a => a.time && parseInt(a.time) === h);
          return (
            <React.Fragment key={h}>
              <div style={{ color: T.muted2, fontSize: 11, textAlign: 'right', paddingRight: 10, paddingTop: 6 }}>{String(h).padStart(2,'0')}h</div>
              <div onClick={() => openNewForm(ds)} style={{ borderBottom: `1px solid ${T.border}`, borderLeft: `2px solid ${T.border2}`, minHeight: 56, padding: 4, cursor: 'pointer' }}>
                {slotApts.map(a => (
                  <div key={a.id} onClick={e => e.stopPropagation()} style={{ background: STATUS_COLOR[a.status] + '22', border: `1px solid ${STATUS_COLOR[a.status]}55`, borderRadius: 8, padding: '6px 12px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{a.lead?.name || a.lead?.phone}</div>
                      <div style={{ color: T.muted, fontSize: 12 }}>{a.service} · {a.time}</div>
                    </div>
                    <Badge text={a.status} color={STATUS_COLOR[a.status]} />
                    {a.status === 'confirmado' && <button onClick={() => handleStatus(a.id,'concluido')} style={{ background:'#34d39918',color:'#34d399',border:'1px solid #34d39933',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12 }}>Concluir</button>}
                    <button onClick={() => handleDelete(a.id)} style={{ background:'#f8717118',color:'#f87171',border:'1px solid #f8717133',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12 }}>✕</button>
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  const titleLabel = view === 'month'
    ? `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : view === 'week'
    ? `Semana de ${currentDate.toLocaleDateString('pt-BR')}`
    : currentDate.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={goToday} style={{ background:T.yellow,color:'#000',border:'none',borderRadius:8,padding:'7px 16px',cursor:'pointer',fontWeight:700,fontSize:13 }}>Hoje</button>
        <button onClick={prev} style={{ background:T.card,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:16 }}>‹</button>
        <button onClick={next} style={{ background:T.card,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:16 }}>›</button>
        <span style={{ color:T.text,fontWeight:600,fontSize:15,flex:1,textTransform:'capitalize' }}>{titleLabel}</span>
        <div style={{ display:'flex',gap:4 }}>
          {['month','week','day'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background:view===v?T.yellow:T.card,color:view===v?'#000':T.muted,border:`1px solid ${view===v?T.yellow:T.border}`,borderRadius:8,padding:'7px 14px',cursor:'pointer',fontSize:13,fontWeight:600 }}>
              {v==='month'?'Mês':v==='week'?'Semana':'Dia'}
            </button>
          ))}
        </div>
        <button onClick={() => { setForm(f=>({...f,date:todayStr})); setShowForm(true); }} style={{ background:T.yellow,color:'#000',border:'none',borderRadius:8,padding:'7px 18px',cursor:'pointer',fontWeight:700,fontSize:13 }}>+ Novo</button>
      </div>

      {/* Calendário */}
      <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:16,marginBottom:selectedDay?0:0 }}>
        {view==='month' && renderMonth()}
        {view==='week' && renderWeek()}
        {view==='day' && renderDay()}
      </div>

      {/* Painel do dia selecionado (clique no mês) */}
      {selectedDay && view==='month' && (
        <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:20,marginTop:12 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <span style={{ color:T.text,fontWeight:600,fontSize:15 }}>
              {new Date(selectedDay+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}
            </span>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={() => openNewForm(selectedDay)} style={{ background:T.yellow,color:'#000',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontWeight:700,fontSize:13 }}>+ Novo</button>
              <button onClick={() => setSelectedDay(null)} style={{ background:T.card,color:T.muted,border:`1px solid ${T.border}`,borderRadius:8,padding:'6px 12px',cursor:'pointer' }}>✕</button>
            </div>
          </div>
          {(apptByDate[selectedDay]||[]).length === 0
            ? <div style={{ color:T.muted,textAlign:'center',padding:'24px 0' }}>Nenhum agendamento neste dia</div>
            : (apptByDate[selectedDay]||[]).sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map(a => (
              <div key={a.id} style={{ display:'flex',alignItems:'center',gap:14,padding:'10px 0',borderBottom:`1px solid ${T.border}` }}>
                <div style={{ color:T.yellow,fontWeight:700,fontSize:14,minWidth:40 }}>{a.time}</div>
                <Avatar name={a.lead?.name} phone={a.lead?.phone} size={36} />
                <div style={{ flex:1 }}>
                  <div style={{ color:T.text,fontWeight:600 }}>{a.lead?.name||a.lead?.phone}</div>
                  <div style={{ color:T.muted,fontSize:13 }}>{a.service}</div>
                </div>
                <Badge text={a.status} color={STATUS_COLOR[a.status]} />
                {a.status==='confirmado' && <button onClick={()=>handleStatus(a.id,'concluido')} style={{background:'#34d39918',color:'#34d399',border:'1px solid #34d39933',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>Concluir</button>}
                {a.status==='confirmado' && <button onClick={()=>handleStatus(a.id,'cancelado')} style={{background:'#f8717118',color:'#f87171',border:'1px solid #f8717133',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>Cancelar</button>}
                <button onClick={()=>handleDelete(a.id)} style={{background:'#f8717118',color:'#f87171',border:'1px solid #f8717133',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>✕</button>
              </div>
            ))
          }
        </div>
      )}

      {/* Modal novo agendamento */}
      {showForm && (
        <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:32,width:480,maxWidth:'95vw' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
              <span style={{ color:T.text,fontWeight:700,fontSize:18 }}>Novo Agendamento</span>
              <button onClick={()=>setShowForm(false)} style={{ background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div>
                <label style={{ color:T.muted,fontSize:12,marginBottom:6,display:'block' }}>CLIENTE</label>
                <input placeholder="Buscar por nome ou telefone..." value={leadSearch} onChange={e=>setLeadSearch(e.target.value)}
                  style={{ width:'100%',background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:'#fff',padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' }} />
                {leadSearch && (
                  <div style={{ background:T.sidebar,border:`1px solid ${T.border2}`,borderRadius:10,marginTop:4,maxHeight:160,overflowY:'auto' }}>
                    {filteredLeads.slice(0,8).map(l => (
                      <div key={l.id} onClick={()=>{ setForm(f=>({...f,leadId:l.id})); setLeadSearch(l.name||l.phone); }}
                        style={{ padding:'10px 14px',cursor:'pointer',borderBottom:`1px solid ${T.border}`,display:'flex',gap:10,alignItems:'center' }}>
                        <Avatar name={l.name} phone={l.phone} size={32} />
                        <div>
                          <div style={{ color:T.text,fontSize:14 }}>{l.name||'Sem nome'}</div>
                          <div style={{ color:T.muted,fontSize:12 }}>{l.phone}</div>
                        </div>
                      </div>
                    ))}
                    {filteredLeads.length === 0 && <div style={{ padding:'12px 14px',color:T.muted,fontSize:13 }}>Nenhum lead encontrado</div>}
                  </div>
                )}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ color:T.muted,fontSize:12,marginBottom:6,display:'block' }}>SERVIÇO</label>
                  <select value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))}
                    style={{ width:'100%',background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:'#fff',padding:'10px 12px',fontSize:14,outline:'none' }}>
                    {SERVICES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color:T.muted,fontSize:12,marginBottom:6,display:'block' }}>DATA</label>
                  <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                    style={{ width:'100%',background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:'#fff',padding:'10px 12px',fontSize:14,outline:'none',colorScheme:'dark' }} />
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ color:T.muted,fontSize:12,marginBottom:6,display:'block' }}>HORÁRIO</label>
                  <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}
                    style={{ width:'100%',background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:'#fff',padding:'10px 12px',fontSize:14,outline:'none',colorScheme:'dark' }} />
                </div>
                <div>
                  <label style={{ color:T.muted,fontSize:12,marginBottom:6,display:'block' }}>OBSERVAÇÕES</label>
                  <input placeholder="Opcional..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    style={{ width:'100%',background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:'#fff',padding:'10px 12px',fontSize:14,outline:'none' }} />
                </div>
              </div>
              <button onClick={handleCreate} disabled={!form.leadId||!form.date||saving}
                style={{ background:form.leadId&&form.date?T.yellow:'#333',color:form.leadId&&form.date?'#000':T.muted,border:'none',borderRadius:10,padding:'12px',cursor:form.leadId&&form.date?'pointer':'default',fontWeight:700,fontSize:15,marginTop:4,transition:'background 0.15s' }}>
                {saving?'Salvando...':'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const inputStyle = { background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 8, color: '#fff', padding: '9px 13px', fontSize: 14, outline: 'none' };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: T.muted, fontSize: 14 }}>Serviços cadastrados no bot</div>
        <button onClick={() => setAdding(!adding)} style={{ background: T.yellow, color: '#000', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>+ Novo Serviço</button>
      </div>
      {adding && (
        <div style={{ background: T.card, border: `1px solid ${T.yellow}33`, borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input placeholder="Nome do serviço" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 160 }} />
          <input placeholder="Preço (ex: 35)" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, width: 120 }} />
          <input placeholder="Duração (min)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ ...inputStyle, width: 130 }} />
          <input placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, flex: 3, minWidth: 180 }} />
          <button onClick={handleAdd} style={{ background: T.yellow, color: '#000', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontWeight: 700 }}>Salvar</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {services.map(s => (
          <div key={s.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.text, fontWeight: 600 }}>{s.name}</div>
              {s.description && <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>{s.description}</div>}
            </div>
            <div style={{ color: T.yellow, fontWeight: 700, fontSize: 16 }}>R$ {s.price.toFixed(2)}</div>
            {s.duration && <div style={{ color: T.muted, fontSize: 13 }}>{s.duration} min</div>}
            <button onClick={() => handleDelete(s.id)} style={{ background: '#f8717118', color: '#f87171', border: '1px solid #f8717133', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_GRADIENTS = [
  ['#f5c518','#e67e00'],
  ['#a78bfa','#7c3aed'],
  ['#34d399','#059669'],
  ['#f87171','#dc2626'],
  ['#60a5fa','#2563eb'],
  ['#fb923c','#ea580c'],
  ['#e879f9','#a21caf'],
];

function Avatar({ name, phone, size = 40 }) {
  const str = name || phone || '?';
  const idx = (str.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  const [c1, c2] = AVATAR_GRADIENTS[idx];
  const letter = str[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 800,
      boxShadow: `0 2px 8px ${c2}55`,
      letterSpacing: '-0.5px',
      userSelect: 'none',
    }}>
      {letter}
    </div>
  );
}

function formatMsgTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const SOURCE_LABEL = { trafego_pago: '📢 Tráfego Pago', organico: '🔗 Orgânico', indicacao: '🤝 Indicação' };
const SOURCE_COLOR = { trafego_pago: '#f59e0b', organico: '#34d399', indicacao: '#8b5cf6' };

function Conversations() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const selectedLeadRef = useRef(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    getLeads({ limit: 100 }).then(d => { setLeads(d.leads || []); setLoading(false); });
  }, []);

  // Auto-refresh das mensagens a cada 8s quando há lead selecionado
  useEffect(() => {
    if (!selectedLead) return;
    const interval = setInterval(() => {
      fetchMessages(selectedLead.id, false);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedLead]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function fetchMessages(leadId, resetScroll = true) {
    try {
      const data = await getLead(leadId);
      setMessages(prev => {
        const newMsgs = data.conversations || [];
        if (resetScroll) { isAtBottomRef.current = true; return newMsgs; }
        if (newMsgs.length !== prev.length) { isAtBottomRef.current = true; return newMsgs; }
        return prev;
      });
    } catch (e) {}
  }

  async function loadMessages(lead) {
    setSelectedLead(lead);
    selectedLeadRef.current = lead;
    setMessages([]);
    isAtBottomRef.current = true;
    await fetchMessages(lead.id, true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleSend() {
    if (!reply.trim() || !selectedLead || sending) return;
    setSending(true);
    try {
      await replyLead(selectedLead.id, reply.trim());
      const optimistic = { id: Date.now(), direction: 'outgoing', message: reply.trim(), createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, optimistic]);
      setReply('');
    } catch (e) {
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handleResetBot() {
    if (!selectedLead || resetting) return;
    setResetting(true);
    try {
      await resetBot(selectedLead.id);
      setSelectedLead(prev => ({ ...prev, stage: 'menu_principal' }));
    } catch (e) {
      alert('Erro ao liberar bot');
    } finally {
      setResetting(false);
    }
  }

  const filteredLeads = leads.filter(l =>
    (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || '').includes(search)
  );

  // Agrupa mensagens por data para separadores
  const grouped = [];
  let lastDate = null;
  for (const m of messages) {
    const d = new Date(m.createdAt).toDateString();
    if (d !== lastDate) { grouped.push({ type: 'sep', date: m.createdAt, key: 'sep_' + m.id }); lastDate = d; }
    grouped.push({ type: 'msg', ...m });
  }

  const lastMsgByLead = {};
  for (const lead of leads) {
    // placeholder — não temos a última msg aqui, mas deixamos vazio
    lastMsgByLead[lead.id] = null;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 124px)', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}` }}>

      {/* Painel esquerdo — lista de contatos */}
      <div style={{ width: 300, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${T.border}` }}>
          <input
            placeholder="Buscar contato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: T.card, border: `1px solid ${T.border2}`, borderRadius: 10, color: '#fff', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <div style={{ padding: 20, color: T.muted, textAlign: 'center' }}>Carregando...</div>
          : filteredLeads.length === 0 ? <div style={{ padding: 20, color: T.muted, textAlign: 'center' }}>Nenhum contato</div>
          : filteredLeads.map(lead => {
            const isActive = selectedLead?.id === lead.id;
            return (
              <div key={lead.id} onClick={() => loadMessages(lead)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', background: isActive ? T.yellowDim : 'transparent', borderLeft: `3px solid ${isActive ? T.yellow : 'transparent'}`, borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s' }}>
                <Avatar name={lead.name} phone={lead.phone} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name || 'Sem nome'}</span>
                    <span style={{ color: '#555', fontSize: 11, flexShrink: 0, marginLeft: 6 }}>
                      {lead.updatedAt ? new Date(lead.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ color: '#555', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.phone}</span>
                    {lead.source && (
                      <span style={{ fontSize: 10, color: SOURCE_COLOR[lead.source] || '#888', background: (SOURCE_COLOR[lead.source] || '#888') + '18', padding: '1px 6px', borderRadius: 6, flexShrink: 0, fontWeight: 600 }}>
                        {SOURCE_LABEL[lead.source] || lead.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel direito — chat */}
      <div style={{ flex: 1, background: T.bg, display: 'flex', flexDirection: 'column', backgroundImage: `radial-gradient(${T.border} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}>
        {!selectedLead ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.muted2, gap: 16 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={T.muted2} strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span style={{ fontSize: 15 }}>Selecione um contato para conversar</span>
          </div>
        ) : (
          <>
            {/* Header do chat */}
            <div style={{ padding: '12px 20px', background: T.sidebar, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={selectedLead.name} phone={selectedLead.phone} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>{selectedLead.name || 'Sem nome'}</div>
                <div style={{ color: T.muted, fontSize: 12 }}>{selectedLead.phone}</div>
              </div>
              <Badge text={selectedLead.stage || 'inicio'} color={selectedLead.stage === 'atendimento_humano' ? '#f87171' : T.yellow} />
              {selectedLead.stage === 'atendimento_humano' && (
                <button onClick={handleResetBot} disabled={resetting} style={{ background: '#34d39918', color: '#34d399', border: '1px solid #34d39933', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {resetting ? 'Liberando...' : '✓ Liberar Bot'}
                </button>
              )}
              {selectedLead.source && (
                <span style={{ fontSize: 11, color: SOURCE_COLOR[selectedLead.source] || '#888', background: (SOURCE_COLOR[selectedLead.source] || '#888') + '18', padding: '3px 10px', borderRadius: 8, fontWeight: 600, border: `1px solid ${(SOURCE_COLOR[selectedLead.source] || '#888')}33` }}>
                  {SOURCE_LABEL[selectedLead.source] || selectedLead.source}
                </span>
              )}
            </div>

            {/* Área de mensagens */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {messages.length === 0 ? (
                <div style={{ color: T.muted2, textAlign: 'center', marginTop: 60, fontSize: 14 }}>Nenhuma mensagem ainda</div>
              ) : grouped.map(item => {
                if (item.type === 'sep') return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 8px' }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ color: T.muted2, fontSize: 11, background: T.card, padding: '3px 12px', borderRadius: 20, border: `1px solid ${T.border2}` }}>{formatDateSep(item.date)}</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                  </div>
                );
                const isOut = item.direction === 'outgoing';
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                    {!isOut && (
                      <div style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}>
                        <Avatar name={selectedLead.name} phone={selectedLead.phone} size={28} />
                      </div>
                    )}
                    <div style={{
                      background: isOut ? '#1a1400' : T.card,
                      border: isOut ? `1px solid ${T.yellow}33` : `1px solid ${T.border2}`,
                      color: '#fff',
                      padding: '8px 12px 6px',
                      borderRadius: isOut ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      maxWidth: '68%',
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      wordBreak: 'break-word',
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{item.message}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{formatMsgTime(item.createdAt)}</span>
                        {isOut && (
                          <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
                            <path d="M1 5.5L5 9.5L15 1.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 5.5L9 9.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de resposta */}
            <div style={{ padding: '12px 16px', background: T.sidebar, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                rows={1}
                style={{
                  flex: 1, background: T.card, border: `1px solid ${T.border2}`, borderRadius: 22, color: '#fff', padding: '10px 16px', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
                }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              />
              <button
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                style={{ width: 44, height: 44, borderRadius: '50%', background: reply.trim() && !sending ? T.yellow : T.card, border: 'none', cursor: reply.trim() && !sending ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                {sending ? (
                  <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={reply.trim() && !sending ? '#000' : T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
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
    { id: 'conversations', label: 'Conversas', icon: Icons.conversations },
  ];
  const tabTitles = { overview: 'Visão Geral', leads: 'Leads', appointments: 'Agendamentos', services: 'Serviços', conversations: 'Conversas' };
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 240, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logojohnbarber.png" alt="John Barber" style={{ width: '100%', maxWidth: 190, height: 'auto', display: 'block' }} />
        </div>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, background: '#34d399', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #34d399' }} />
            <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>Bot Ativo</span>
          </div>
          <div style={{ color: T.muted2, fontSize: 11, marginTop: 4 }}>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: tab === t.id ? T.yellowDim : 'none', color: tab === t.id ? T.yellow : T.muted, border: 'none', borderLeft: tab === t.id ? `3px solid ${T.yellow}` : '3px solid transparent', borderRadius: '0 8px 8px 0', padding: '11px 16px', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.15s', textAlign: 'left', marginBottom: 4 }}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${T.border}`, color: T.muted2, fontSize: 11 }}>BarberBot v1.0 · Projetov1</div>
      </div>
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ color: T.text, fontWeight: 600, fontSize: 16 }}>{tabTitles[tab]}</div>
          <div style={{ color: T.muted2, fontSize: 13 }}>John Barber Market Place</div>
        </div>
        <div style={{ padding: '32px', flex: 1 }}>
          {tab === 'overview' && <Overview stats={stats} />}
          {tab === 'leads' && <Leads />}
          {tab === 'appointments' && <Appointments />}
          {tab === 'services' && <Services />}
          {tab === 'conversations' && <Conversations />}
        </div>
      </div>
    </div>
  );
}
