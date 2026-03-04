import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const SUPABASE_URL = "https://sjwnpbfqmyntpznpsnot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd25wYmZxbXludHB6bnBzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MDQsImV4cCI6MjA4ODA3NDYwNH0.KVVmZa9xreX3L8_F9Adt79VlLfuSE3Fa54_3vwGsKmQ";

const MESES_ORDER = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const COLORS = ["#00C9FF","#FF6B6B","#FFE66D","#4ECDC4","#A78BFA","#FFA07A","#00E676","#FF6E40","#F06292","#AED581","#FFD54F"];

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params)
  });
  return res.json();
}



const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"rgba(2,20,50,0.97)",border:"1px solid rgba(0,201,255,0.3)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#e0f4ff"}}>
      <p style={{margin:"0 0 6px",opacity:0.6}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{margin:"2px 0",color:p.color}}>{p.name}: <strong>{Number(p.value).toLocaleString()}</strong></p>
      ))}
    </div>
  );
};

export default function Modulo1() {
  const [grafico, setGrafico]     = useState([]);
  const [detalle, setDetalle]     = useState([]);
  const [opciones, setOpciones]   = useState({anios:[],zonas:[],distritos:[],tipos:[],tarifas:[]});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [filtros, setFiltros]     = useState({anio:"",zona:"",distrito:"",tipo:"",tarifa:""});
  const [aplicados, setAplicados] = useState({anio:"",zona:"",distrito:"",tipo:"",tarifa:""});

  // Cargar opciones de filtros
  useEffect(() => {
    rpc("get_anios").then(rows => {
      if (Array.isArray(rows))
        setOpciones(prev => ({...prev, anios: rows.map(r=>r.anio)}));
    });
    rpc("get_filtros").then(rows => {
      if (!Array.isArray(rows)) return;
      setOpciones(prev => ({
        ...prev,
        zonas:     [...new Set(rows.map(r=>r.zona))].filter(Boolean).sort(),
        distritos: [...new Set(rows.map(r=>r.distrito))].filter(Boolean).sort(),
        tipos:     [...new Set(rows.map(r=>r.tipo))].filter(Boolean).sort(),
        tarifas:   [...new Set(rows.map(r=>r.tarifa))].filter(Boolean).sort(),
      }));
    });
  }, []);

  // Cargar gráfico y detalle cuando cambian filtros
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = {
      p_anio: aplicados.anio ? parseInt(aplicados.anio) : null,
      p_zona:     aplicados.zona     || null,
      p_distrito: aplicados.distrito || null,
      p_tipo:     aplicados.tipo     || null,
      p_tarifa:   aplicados.tarifa   || null,
    };

    Promise.all([
      rpc("get_tagvalor_por_mes", params),
      rpc("get_detalle", params)
    ]).then(([graf, det]) => {
      setGrafico(Array.isArray(graf) ? graf : []);
      setDetalle(Array.isArray(det) ? det : []);
      setLoading(false);
    }).catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [aplicados]);

  // Procesar datos para el gráfico
  const aniosEnDatos = [...new Set(grafico.map(r=>r.anio))].sort();
  console.log("grafico data:", grafico);
console.log("aniosEnDatos:", aniosEnDatos);
  const chartData = MESES_ORDER.map(mes => {
    const obj = { mes };
    aniosEnDatos.forEach(anio => {
      const fila = grafico.find(r => r.mes === mes && r.anio === anio);
      obj[`${anio}`] = fila ? parseFloat(fila.tagvalor) : 0;
    });
    return obj;
  });


  // Procesar tabla de detalle (pivot por tarifa)
  const tarifasUnicas = [...new Set(detalle.map(r=>r.tarifa))].filter(Boolean).sort();
  const tablaAgrupada = Object.values(
    detalle.reduce((acc, r) => {
      const key = `${r.anio}__${r.equipo}`;
      if (!acc[key]) acc[key] = { anio: r.anio, equipo: r.equipo };
      acc[key][r.tarifa] = (acc[key][r.tarifa] || 0) + parseFloat(r.tagvalor || 0);
      return acc;
    }, {})
  ).sort((a,b) => a.anio - b.anio);

  // KPIs
  const totalTagValor  = detalle.reduce((acc,r) => acc + parseFloat(r.tagvalor||0), 0);
  const totalRegistros = tablaAgrupada.length;
  const zonasUnicas    = new Set(detalle.map(r=>r.equipo)).size;
 const setFiltro = (key, val) => setFiltros(f => ({...f, [key]: val === "" ? "" : val}));
  console.log("filtros al aplicar:", filtros);
  console.log("aplicados:", aplicados);
  console.log("params:", {
    p_anio: aplicados.anio ? parseInt(aplicados.anio) : null,
    p_zona: aplicados.zona || null,
    p_distrito: aplicados.distrito || null,
    p_tipo: aplicados.tipo || null,
    p_tarifa: aplicados.tarifa || null,
});














  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#1565c0;font-family:'Barlow',sans-serif;color:#fff;}
        .root{min-height:100vh;background:#1565c0;}
        .topbar{background:#0d47a1;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:54px;box-shadow:0 2px 20px rgba(0,0,0,0.3);}
        .topbar-logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;letter-spacing:2px;color:#fff;}
        .topbar-btn{background:transparent;border:2px solid rgba(255,255,255,0.8);color:#fff;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:2px;padding:6px 28px;border-radius:100px;cursor:pointer;}
        .back-link{background:rgba(255,255,255,0.15);border:none;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;padding:6px 16px;border-radius:100px;cursor:pointer;}
        .subtitle-bar{background:#0d47a1;padding:10px 28px;font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;letter-spacing:1px;color:#90caf9;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);}
        .layout{display:flex;min-height:calc(100vh - 108px);}
        .sidebar{width:190px;flex-shrink:0;background:#0d47a1;border-right:1px solid rgba(255,255,255,0.1);padding:16px 14px;display:flex;flex-direction:column;gap:12px;}
        .filter-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#90caf9;text-transform:uppercase;margin-bottom:3px;}
        .filter-select{width:100%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;padding:7px 10px;font-size:12px;font-family:'Barlow',sans-serif;outline:none;cursor:pointer;}
        .filter-select option{background:#0d47a1;color:#fff;}
        .apply-btn{background:#1976d2;border:2px solid rgba(255,255,255,0.4);color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;padding:9px;border-radius:8px;cursor:pointer;text-transform:uppercase;}
        .apply-btn:hover{background:#1e88e5;}
        .clear-btn{background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:1px;padding:7px;border-radius:8px;cursor:pointer;}
        .kpi-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;}
        .kpi-card{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px 12px;text-align:center;}
        .kpi-val{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#fff;}
        .kpi-lbl{font-size:10px;opacity:0.6;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
        .main{flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow:hidden;}
        .page-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:1px;}
        .page-title span{color:#90caf9;}

        {/*frafico de barras  */}
        .content-row{display:grid;grid-template-columns:1fr;gap:16px;flex:1;}
        @media(max-width:900px){.content-row{grid-template-columns:1fr;}}
        .chart-card{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:20px;}
        .chart-title{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;color:#90caf9;margin-bottom:14px;text-align:center;}
        .table-wrap{overflow:auto;max-height:420px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        thead tr{background:rgba(13,71,161,0.8);position:sticky;top:0;z-index:1;}
        thead th{text-align:left;padding:10px 12px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#90caf9;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.1);}
        tbody tr{border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s;}
        tbody tr:hover{background:rgba(255,255,255,0.08);}
        tbody td{padding:9px 12px;white-space:nowrap;}
        .tag-val{font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#00C9FF;}
        .state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;opacity:0.6;}
        .state-icon{font-size:40px;}
        .state-txt{font-size:14px;}
        .footer{background:#0d47a1;padding:10px 28px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#90caf9;text-align:center;}
      `}</style>

      <div className="root">
        <div className="topbar">
          <div className="topbar-logo">SEDAPAL</div>
          <button className="topbar-btn">PRINCIPAL</button>
          <button className="back-link" onClick={()=>window.location.href="/"}>← Volver al Menú</button>
        </div>
        <div className="subtitle-bar">Catastro de Conexiones — TAGValor por Mes</div>

        <div className="layout">
          <aside className="sidebar">
            <div>
              <div className="filter-label">Año</div>
              <select className="filter-select" value={filtros.anio} onChange={e=>setFiltro("anio", e.target.value)}>
                <option value="">Todos</option>
               {opciones.anios.map(a=><option key={a} value={String(a)}>{a}</option>)}
              </select>
            </div>
            <div>
              <div className="filter-label">Zona</div>
              <select className="filter-select" value={filtros.zona} onChange={e=>setFiltro("zona",e.target.value)}>
                <option value="">Todas</option>
                {opciones.zonas.map(z=><option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <div className="filter-label">Distrito</div>
              <select className="filter-select" value={filtros.distrito} onChange={e=>setFiltro("distrito",e.target.value)}>
                <option value="">Todos</option>
                {opciones.distritos.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div className="filter-label">Tipo</div>
              <select className="filter-select" value={filtros.tipo} onChange={e=>setFiltro("tipo",e.target.value)}>
                <option value="">Todos</option>
                {opciones.tipos.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="filter-label">Tarifa</div>
              <select className="filter-select" value={filtros.tarifa} onChange={e=>setFiltro("tarifa",e.target.value)}>
                <option value="">Todas</option>
                {opciones.tarifas.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>


            
            <button className="apply-btn" onClick={()=>{
  console.log("aplicando filtros:", filtros);
  setAplicados({...filtros});
}}>APLICAR FILTROS</button>
            <button className="clear-btn" onClick={()=>{
              setFiltros({anio:"",zona:"",distrito:"",tipo:"",tarifa:""});
              setAplicados({anio:"",zona:"",distrito:"",tipo:"",tarifa:""});
            }}>Limpiar filtros</button>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-val">{totalRegistros.toLocaleString()}</div>
                <div className="kpi-lbl">Equipos</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val">{totalTagValor.toLocaleString()}</div>
                <div className="kpi-lbl">TAGValor Total</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val">{zonasUnicas}</div>
                <div className="kpi-lbl">Equipos únicos</div>
              </div>
            </div>
          </aside>

          <main className="main">
            <div className="page-title">
              Conexiones — <span>TAGValor por Mes</span>
              {aplicados.anio && <span style={{fontSize:14,marginLeft:12,opacity:0.7}}>Año {aplicados.anio}</span>}
            </div>

            {loading ? (
              <div className="state-box"><div className="state-icon">⏳</div><div className="state-txt">Cargando datos...</div></div>
            ) : error ? (
              <div className="state-box"><div className="state-icon">❌</div><div className="state-txt">{error}</div></div>
            ) : (
              <div className="content-row">
                {/* GRÁFICO */}
                <div className="chart-card">
                  <div className="chart-title">TAGValor por Mes {aplicados.anio ? `— ${aplicados.anio}` : "— Todos los años"}</div>
                  {chartData.length === 0 ? (
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={chartData} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="mes" tick={{fill:"rgba(255,255,255,0.7)",fontSize:11}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill:"rgba(255,255,255,0.5)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                        <Tooltip content={<CustomTooltip/>} />
                        <Legend wrapperStyle={{fontSize:11,opacity:0.8}} />
                        {aniosEnDatos.map((anio,i)=>(
                          <Line 
                                  key={anio} 
                                  type="monotone" 
                                  dataKey={`${anio}`} 
                                  name={`${anio}`} 
                                  stroke={COLORS[i%COLORS.length]} 
                                  strokeWidth={2} 
                                  dot={{r:3}} 
                                  activeDot={{r:5}}
                                  label={{ 
                                    position: "top", 
                                    fontSize: 10, 
                                    fill: COLORS[i%COLORS.length],
                                    formatter: (v) => v > 0 ? v.toLocaleString() : ""
                                  }}
/>

                        
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

               {/* {/* TABLA 
                <div className="chart-card">
                  <div className="chart-title">Detalle — Año / Equipo / Tarifa</div>
                  {tablaAgrupada.length === 0 ? (
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Año</th>
                            <th>Equipo</th>
                            {tarifasUnicas.map(t=><th key={t}>{t}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {tablaAgrupada.map((row,i)=>(
                            <tr key={i}>
                              <td style={{opacity:0.7}}>{row.anio}</td>
                              <td style={{fontSize:11}}>{row.equipo}</td>
                              {tarifasUnicas.map(t=>(
                                <td key={t}>
                                  {row[t] ? <span className="tag-val">{Number(row[t]).toLocaleString()}</span> : <span style={{opacity:0.3}}>—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}    
                </div>
               */}     


            
              </div>
            )}
          </main>
        </div>

        <div className="footer">SEDAPAL — Catastro de Conexiones</div>
      </div>
    </>
  );
}