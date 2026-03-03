import { useState, useEffect } from "react";

const SUPABASE_URL = "https://sjwnpbfqmyntpznpsnot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd25wYmZxbXludHB6bnBzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MDQsImV4cCI6MjA4ODA3NDYwNH0.KVVmZa9xreX3L8_F9Adt79VlLfuSE3Fa54_3vwGsKmQ";

async function fetchTarifas() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tarifas?select=*&order=id.asc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error("Error al obtener datos");
  return res.json();
}

export default function App() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState("");
  const [filterMes, setFilterMes] = useState("Todos");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchTarifas();
      setData(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const meses = ["Todos", ...new Set(data.map(r => r.mes).filter(Boolean))];

  const filtered = data.filter(r => {
    const matchSearch = Object.values(r).some(v =>
      String(v).toLowerCase().includes(search.toLowerCase())
    );
    const matchMes = filterMes === "Todos" || r.mes === filterMes;
    return matchSearch && matchMes;
  });

  const totalCosto = filtered.reduce((acc, r) => acc + (parseFloat(r.costo) || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:#07101f; font-family:'DM Sans',sans-serif; color:#cce8ff; min-height:100vh; }

        .app {
          min-height:100vh;
          background: radial-gradient(ellipse at 0% 0%, rgba(0,120,255,0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 100% 100%, rgba(0,200,180,0.08) 0%, transparent 50%),
                      #07101f;
        }

        .header {
          background: linear-gradient(90deg, #0a2a5e, #0d3d8a, #0a2a5e);
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 24px rgba(0,0,0,0.5);
          position: sticky; top:0; z-index:100;
        }
        .logo {
          font-family:'Syne',sans-serif;
          font-weight:800; font-size:20px; letter-spacing:2px;
          color:#fff; text-shadow:0 0 20px rgba(0,200,255,0.5);
        }
        .logo span { color:#00C9FF; }
        .header-sub { font-size:12px; opacity:0.45; letter-spacing:1px; }

        .main { padding:28px 32px 60px; max-width:1200px; margin:0 auto; }

        .top-row {
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:12px; margin-bottom:24px;
        }
        .page-title {
          font-family:'Syne',sans-serif;
          font-size:22px; font-weight:800; color:#fff;
        }
        .page-title span { color:#00C9FF; }

        .refresh-btn {
          background: linear-gradient(135deg,#0d3d8a,#00C9FF);
          border:none; color:#fff;
          font-family:'Syne',sans-serif;
          font-size:12px; font-weight:700; letter-spacing:1px;
          padding:9px 20px; border-radius:100px; cursor:pointer;
          transition:all 0.2s;
          box-shadow:0 2px 16px rgba(0,180,255,0.3);
        }
        .refresh-btn:hover { filter:brightness(1.15); transform:translateY(-1px); }

        .kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
        @media(max-width:700px){ .kpi-row{ grid-template-columns:1fr 1fr; } }

        .kpi-card {
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(0,180,255,0.15);
          border-radius:16px; padding:20px;
          position:relative; overflow:hidden;
        }
        .kpi-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:2px;
          background:var(--c,#00C9FF);
        }
        .kpi-lbl { font-size:11px; opacity:0.45; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; }
        .kpi-val {
          font-family:'Syne',sans-serif;
          font-size:28px; font-weight:800; color:#fff;
        }
        .kpi-val span { font-size:14px; opacity:0.5; margin-left:4px; }

        .filters {
          display:flex; gap:12px; flex-wrap:wrap; margin-bottom:18px; align-items:center;
        }
        .search-input {
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(0,180,255,0.2);
          border-radius:10px; color:#cce8ff;
          padding:9px 14px; font-size:13px;
          font-family:'DM Sans',sans-serif;
          outline:none; width:240px;
          transition:border-color 0.2s;
        }
        .search-input:focus { border-color:#00C9FF; }
        .search-input::placeholder { opacity:0.35; }

        .filter-select {
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(0,180,255,0.2);
          border-radius:10px; color:#cce8ff;
          padding:9px 14px; font-size:13px;
          font-family:'DM Sans',sans-serif;
          outline:none; cursor:pointer;
        }
        .filter-select option { background:#07101f; }

        .table-card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(0,180,255,0.1);
          border-radius:16px; overflow:hidden;
        }
        .table-wrap { overflow-x:auto; }
        table { width:100%; border-collapse:collapse; font-size:14px; }
        thead tr {
          background:rgba(0,80,180,0.25);
          border-bottom:1px solid rgba(0,180,255,0.15);
        }
        thead th {
          text-align:left; padding:14px 18px;
          font-family:'Syne',sans-serif;
          font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:1.5px;
          color:#7dd6ff; white-space:nowrap;
        }
        tbody tr {
          border-bottom:1px solid rgba(255,255,255,0.04);
          transition:background 0.15s;
        }
        tbody tr:hover { background:rgba(0,150,255,0.07); }
        tbody td { padding:13px 18px; }

        .badge-base {
          display:inline-block; padding:3px 10px;
          border-radius:100px; font-size:11px; font-weight:700;
          background:rgba(0,180,255,0.12); color:#00C9FF;
          border:1px solid rgba(0,180,255,0.2);
        }
        .badge-tarifa {
          display:inline-block; padding:3px 10px;
          border-radius:100px; font-size:11px; font-weight:700;
          background:rgba(160,120,255,0.12); color:#a78bfa;
          border:1px solid rgba(160,120,255,0.2);
        }
        .costo-val {
          font-family:'Syne',sans-serif; font-weight:700; color:#4ECDC4;
        }

        .state-box {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:60px; gap:12px; opacity:0.5;
        }
        .state-icon { font-size:40px; }
        .state-txt { font-size:14px; }

        .footer-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:12px 18px;
          border-top:1px solid rgba(0,180,255,0.08);
          font-size:12px; opacity:0.4;
        }
      `}</style>

      <div className="app">
        <header className="header">
          <div className="logo">Pulse<span>KPI</span></div>
          <div className="header-sub">Dashboard de Tarifas — Supabase conectado ✅</div>
        </header>

        <main className="main">
          <div className="top-row">
            <div className="page-title">Tabla de <span>Tarifas</span></div>
            <button className="refresh-btn" onClick={load}>↻ Actualizar datos</button>
          </div>

          <div className="kpi-row">
            <div className="kpi-card" style={{"--c":"#00C9FF"}}>
              <div className="kpi-lbl">Total registros</div>
              <div className="kpi-val">{filtered.length}<span>filas</span></div>
            </div>
            <div className="kpi-card" style={{"--c":"#4ECDC4"}}>
              <div className="kpi-lbl">Costo total</div>
              <div className="kpi-val">S/ {totalCosto.toFixed(2)}</div>
            </div>
            <div className="kpi-card" style={{"--c":"#A78BFA"}}>
              <div className="kpi-lbl">Distritos únicos</div>
              <div className="kpi-val">
                {new Set(filtered.map(r=>r.base)).size}
                <span>bases</span>
              </div>
            </div>
          </div>

          <div className="filters">
            <input className="search-input" placeholder="🔍 Buscar por base, tarifa..."
              value={search} onChange={e=>setSearch(e.target.value)} />
            <select className="filter-select" value={filterMes} onChange={e=>setFilterMes(e.target.value)}>
              {meses.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="table-card">
            <div className="table-wrap">
              {loading ? (
                <div className="state-box">
                  <div className="state-icon">⏳</div>
                  <div className="state-txt">Cargando datos desde Supabase...</div>
                </div>
              ) : error ? (
                <div className="state-box">
                  <div className="state-icon">❌</div>
                  <div className="state-txt">{error}</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="state-box">
                  <div className="state-icon">📭</div>
                  <div className="state-txt">No se encontraron registros</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Base</th>
                      <th>Tarifas</th>
                      <th>Costo</th>
                      <th>Fecha</th>
                      <th>Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => (
                      <tr key={row.id}>
                        <td style={{opacity:0.3, fontSize:12}}>{i+1}</td>
                        <td><span className="badge-base">{row.base}</span></td>
                        <td><span className="badge-tarifa">{row.tarifas}</span></td>
                        <td><span className="costo-val">S/ {parseFloat(row.costo).toFixed(2)}</span></td>
                        <td style={{opacity:0.7}}>{row.fecha}</td>
                        <td style={{opacity:0.7}}>{row.mes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="footer-row">
              <span>Total: {filtered.length} de {data.length} registros</span>
              <span>Fuente: Supabase — tarifas</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
