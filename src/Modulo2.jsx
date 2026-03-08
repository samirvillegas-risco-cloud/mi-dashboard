// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — Catastro de Conexiones por Estados
// Layout:
//   ARRIBA izquierda: tabla dinámica Año/Estado/Equipo/Tipo
//   ARRIBA derecha:   gráfico CValor por AÑO
//   ABAJO izquierda:  gráfico barras por Estado (función get_barras_m2)
//   ABAJO derecha:    gráfico CValor por MES (grande)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";

const SUPABASE_URL = "https://sjwnpbfqmyntpznpsnot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd25wYmZxbXludHB6bnBzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MDQsImV4cCI6MjA4ODA3NDYwNH0.KVVmZa9xreX3L8_F9Adt79VlLfuSE3Fa54_3vwGsKmQ";

const MESES_ORDER = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];
const COLORS = ["#00C9FF","#FF6B6B","#FFE66D","#4ECDC4","#A78BFA","#FFA07A","#00E676","#FF6E40","#F06292","#AED581","#FFD54F"];

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { ...headers, "Range": "0-9999", "Range-Unit": "items", "Prefer": "count=none" },
    body: JSON.stringify(params)
  });
  return res.json();
}

const arrONull = (arr) => arr.length > 0 ? arr : null;

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"rgba(2,20,50,0.97)",border:"1px solid rgba(0,201,255,0.3)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#e0f4ff"}}>
      <p style={{margin:"0 0 6px",opacity:0.6}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{margin:"2px 0",color:p.color}}>
          {p.name}: <strong>{Number(p.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── DROPDOWN CON CHECKBOXES ──────────────────────────────────────────────────
function DropdownCheck({ label, opciones, seleccionados, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val) => {
    if (seleccionados.includes(val)) {
      onChange(seleccionados.filter(x => x !== val));
    } else {
      onChange([...seleccionados, val]);
    }
  };

  const textoResumen = seleccionados.length === 0
    ? "Todos"
    : seleccionados.length === 1
      ? String(seleccionados[0])
      : `${seleccionados.length} selec.`;

  return (
    <div ref={ref} style={{position:"relative"}}>
      <div className="filter-label">{label}</div>
      <div onClick={() => setAbierto(a => !a)}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.07)",border:"1px solid rgba(0,0,0,0.15)",borderRadius:8,padding:"7px 10px",fontSize:12,cursor:"pointer",color:"#000",userSelect:"none"}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{textoResumen}</span>
        <span style={{fontSize:10,transition:"transform 0.2s",display:"inline-block",transform:abierto?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
      </div>
      {abierto && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,background:"#fff",border:"1px solid rgba(0,0,0,0.15)",borderRadius:8,marginTop:4,padding:"8px 10px",maxHeight:160,overflowY:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
          {opciones.map(op => (
            <label key={op} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer",color:"#000",padding:"3px 0"}}>
              <input type="checkbox" checked={seleccionados.includes(String(op))} onChange={() => toggle(String(op))} style={{accentColor:"#1976d2"}} />
              {op}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Modulo2() {

  const [grafico,  setGrafico]  = useState([]);
  const [detalle,  setDetalle]  = useState([]);
  const [barras,   setBarras]   = useState([]);
  const [opciones, setOpciones] = useState({anios:[], zonas:[], distritos:[], tipos:[], estados:[], equipos:[]});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [ordenCol, setOrdenCol] = useState("anio");
  const [ordenDir, setOrdenDir] = useState("desc");

  const toggleOrden = (col) => {
    if (ordenCol === col) {
      setOrdenDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setOrdenCol(col);
      setOrdenDir("desc");
    }
  };

  const [filtros,   setFiltros]   = useState({anio:[], zona:[], distrito:[], tipo:["CONEXIONES"], estado:[], mes:[], equipo:[]});
  const [aplicados, setAplicados] = useState({anio:[], zona:[], distrito:[], tipo:["CONEXIONES"], estado:[], mes:[], equipo:[]});

  // ── CARGAR OPCIONES AL INICIAR ───────────────────────────────────────────────
  useEffect(() => {
    rpc("get_anios_m2").then(rows => {
      if (!Array.isArray(rows)) return;
      const anios = rows.map(r=>r.anio).sort((a,b) => a - b);
      setOpciones(prev => ({...prev, anios}));
      const ultimos3 = anios.slice(-3).map(String);
      setFiltros(prev  => ({...prev, anio: ultimos3}));
      setAplicados(prev => ({...prev, anio: ultimos3}));
    });

    rpc("get_filtros_m2").then(rows => {
      if (!Array.isArray(rows)) return;
      setOpciones(prev => ({
        ...prev,
        zonas:     [...new Set(rows.map(r=>r.zona))].filter(Boolean).sort(),
        distritos: [...new Set(rows.map(r=>r.distrito))].filter(Boolean).sort(),
        tipos:     [...new Set(rows.map(r=>r.tipo))].filter(Boolean).sort(),
        estados:   [...new Set(rows.map(r=>r.estado))].filter(Boolean).sort(),
        equipos:   [...new Set(rows.map(r=>r.equipo))].filter(Boolean).sort(),
      }));
    });
  }, []);

  // ── CARGAR DATOS AL APLICAR FILTROS ─────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = {
      p_anio:     arrONull(aplicados.anio.map(Number)),
      p_zona:     arrONull(aplicados.zona),
      p_distrito: arrONull(aplicados.distrito),
      p_tipo:     arrONull(aplicados.tipo),
      p_estado:   arrONull(aplicados.estado),
      p_equipo:   arrONull(aplicados.equipo),
    };

    // Para barras usamos último año disponible
    const ultimoAnioParam = aplicados.anio.length > 0
      ? [Math.max(...aplicados.anio.map(Number))]
      : null;

    Promise.all([
      rpc("get_cvalor_por_mes", params),
      rpc("get_detalle_m2",     params),
     rpc("get_barras_m2", {
  ...params,
  p_anio: ultimoAnioParam,
}),
    ]).then(([graf, det, bar]) => {
      setGrafico(Array.isArray(graf) ? graf : []);
      setDetalle(Array.isArray(det)  ? det  : []);
      setBarras( Array.isArray(bar)  ? bar  : []);
      setLoading(false);
    }).catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [aplicados]);

  // ── GRÁFICO POR MES ──────────────────────────────────────────────────────────
  const aniosEnDatos = [...new Set(grafico.map(r => r.anio))]
    .filter(a => aplicados.anio.length === 0 || aplicados.anio.includes(String(a)))
    .sort();

  const chartData = MESES_ORDER.map(mes => {
    const obj = { mes };
    aniosEnDatos.forEach(anio => {
      const fila = grafico.find(r => r.mes === mes && r.anio === anio);
      obj[`${anio}`] = fila ? parseFloat(fila.cvalor) : 0;
    });
    return obj;
  });

  // ── GRÁFICO POR AÑO ──────────────────────────────────────────────────────────
  const mesSeleccionado = aplicados.mes.length === 1 ? aplicados.mes[0] : null;

  const chartAnios = opciones.anios.map(anio => {
    const filas = grafico.filter(r =>
      r.anio === anio && (mesSeleccionado ? r.mes === mesSeleccionado : true)
    );
    const total = filas.reduce((acc, r) => acc + parseFloat(r.cvalor || 0), 0);
    return { anio: String(anio), valor: total };
  });

  // ── TABLA ────────────────────────────────────────────────────────────────────
  const tiposUnicos = [...new Set(detalle.map(r=>r.tipo))].filter(Boolean).sort();

  const detalleFiltrado = aplicados.mes.length > 0
    ? detalle.filter(r => aplicados.mes.includes(r.mes))
    : detalle;

  const tablaAgrupada = Object.values(
    detalleFiltrado.reduce((acc, r) => {
      const key = `${r.anio}__${r.estado}__${r.equipo}`;
      if (!acc[key]) acc[key] = { anio: r.anio, estado: r.estado, equipo: r.equipo };
      acc[key][r.tipo] = (acc[key][r.tipo] || 0) + parseFloat(r.cvalor || 0);
      return acc;
    }, {})
  ).sort((a,b) => {
    const totalA = tiposUnicos.reduce((acc,t) => acc + (a[t]||0), 0);
    const totalB = tiposUnicos.reduce((acc,t) => acc + (b[t]||0), 0);
    const valA = ordenCol === "__total" ? totalA : ordenCol === "anio" ? a.anio : (a[ordenCol] || 0);
    const valB = ordenCol === "__total" ? totalB : ordenCol === "anio" ? b.anio : (b[ordenCol] || 0);
    return ordenDir === "asc" ? valA - valB : valB - valA;
  });

  // ── BARRAS ───────────────────────────────────────────────────────────────────
  const barData   = [...barras].sort((a,b) => b.cvalor - a.cvalor);
  const maxBarVal = barData.length > 0 ? barData[0].cvalor : 1;
  const ultimoAnioLabel = aplicados.anio.length > 0
    ? Math.max(...aplicados.anio.map(Number))
    : (grafico.length > 0 ? Math.max(...grafico.map(r=>r.anio)) : "");

  // ── KPI ──────────────────────────────────────────────────────────────────────
  const ultimoAnio = grafico.length > 0 ? Math.max(...grafico.map(r => r.anio)) : null;
  const ultimoMes  = ultimoAnio ? MESES_ORDER.slice().reverse().find(m =>
    grafico.some(r => r.anio === ultimoAnio && r.mes === m)
  ) : null;
  const filaKpi  = ultimoAnio ? grafico.find(r => r.anio === ultimoAnio && r.mes === ultimoMes) : null;
  const totalKpi = filaKpi ? parseFloat(filaKpi.cvalor) : 0;

  const setFiltro = (key, val) => setFiltros(f => ({...f, [key]: val}));

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#1565c0;font-family:'Barlow',sans-serif;color:#fff;}
        .root{min-height:100vh;background:#1565c0;}
        .topbar{background:#0d47a1;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:54px;box-shadow:0 2px 20px rgba(0,0,0,0.3);}
        .topbar-logo{font-family:'Arial',sans-serif;font-weight:800;font-size:45px;letter-spacing:2px;color:#fff;}
        .topbar-btn{background:transparent;border:2px solid rgba(255,255,255,0.8);color:#fff;font-family:'Arial',sans-serif;font-weight:700;font-size:14px;letter-spacing:2px;padding:6px 28px;border-radius:100px;cursor:pointer;}
        .back-link{background:rgba(255,255,255,0.15);border:none;color:#fff;font-family:'Arial',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;padding:6px 16px;border-radius:100px;cursor:pointer;}
        .subtitle-bar{background:#0d47a1;padding:10px 28px;font-family:'Arial',sans-serif;font-size:30px;font-weight:700;letter-spacing:1px;color:#ffffff;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);}
        .layout{display:flex;min-height:calc(100vh - 108px);}
        .sidebar{width:200px;flex-shrink:0;background:#fafafa;padding:16px 14px;display:flex;flex-direction:column;gap:10px;border-radius:16px;margin:12px;overflow-y:auto;height:fit-content;max-height:calc(100vh - 130px);align-self:flex-start;}
        .filter-label{font-family:'Arial',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#0f172a;text-transform:uppercase;margin-bottom:3px;}
        .apply-btn{background:#1976d2;border:none;color:#fff;font-family:'Arial',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;padding:9px;border-radius:8px;cursor:pointer;text-transform:uppercase;}
        .apply-btn:hover{background:#1e88e5;}
        .clear-btn{background:transparent;border:1px solid rgba(0,0,0,0.2);color:rgba(0,0,0,0.5);font-family:'Arial',sans-serif;font-size:12px;letter-spacing:1px;padding:7px;border-radius:8px;cursor:pointer;}
        .main{flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow:auto;}
        .content-row{display:grid;grid-template-columns:1.5fr 2fr;gap:16px;}
        .bottom-row{display:grid;grid-template-columns:1fr 2fr;gap:16px;}
        @media(max-width:900px){.content-row,.bottom-row{grid-template-columns:1fr;}}
        @media(max-width:768px){.layout{flex-direction:column;}.sidebar{width:calc(100% - 24px);max-height:none;height:auto;align-self:auto;}}
        .chart-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:20px;}
        .chart-title{font-family:'Arial',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;color:#0d47a1;margin-bottom:14px;text-align:center;}
        .table-wrap{overflow:auto;max-height:320px;border-radius:10px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        thead tr{background:#e3f2fd;position:sticky;top:0;z-index:2;}
        thead th{text-align:left;padding:10px 12px;font-family:'Arial',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#000000;white-space:nowrap;border-bottom:1px solid rgba(0,0,0,0.1);}
        tbody tr{border-bottom:1px solid rgba(0,0,0,0.05);transition:background 0.15s;}
        tbody tr:hover{background:rgba(25,118,210,0.05);}
        tbody td{padding:9px 12px;white-space:nowrap;color:#000000;}
        .tag-val{font-family:'Arial',sans-serif;font-weight:700;color:#1565c0;}
        .state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;opacity:0.6;}
        .state-icon{font-size:40px;}
        .state-txt{font-size:14px;color:#000;}
        .footer{background:#0d47a1;padding:10px 28px;font-family:'Arial',sans-serif;font-size:13px;font-weight:700;color:#90caf9;text-align:center;}
      `}</style>

      <div className="root">

        {/* BARRA SUPERIOR */}
        <div className="topbar">
          <div className="topbar-logo">SEDAPAL</div>
          <button className="topbar-btn">PRINCIPAL</button>
          <button className="back-link" onClick={()=>window.location.href="/"}>← Volver al Menú</button>
        </div>
        <div className="subtitle-bar">Catastro de Conexiones — Por Estados</div>

        <div className="layout">

          {/* SIDEBAR */}
          <aside className="sidebar">
            <DropdownCheck label="Año"      opciones={opciones.anios}     seleccionados={filtros.anio}     onChange={val=>setFiltro("anio",val)} />
            <DropdownCheck label="Mes"      opciones={MESES_ORDER}        seleccionados={filtros.mes}      onChange={val=>setFiltro("mes",val)} />
            <DropdownCheck label="Zona"     opciones={opciones.zonas}     seleccionados={filtros.zona}     onChange={val=>setFiltro("zona",val)} />
            <DropdownCheck label="Distrito" opciones={opciones.distritos} seleccionados={filtros.distrito} onChange={val=>setFiltro("distrito",val)} />
            <DropdownCheck label="Tipo"     opciones={opciones.tipos}     seleccionados={filtros.tipo}     onChange={val=>setFiltro("tipo",val)} />
            <DropdownCheck label="Estado"   opciones={opciones.estados}   seleccionados={filtros.estado}   onChange={val=>setFiltro("estado",val)} />
            <DropdownCheck label="Equipo"   opciones={opciones.equipos}   seleccionados={filtros.equipo}   onChange={val=>setFiltro("equipo",val)} />

            <button className="apply-btn" onClick={()=> setAplicados({...filtros})}>
              APLICAR FILTROS
            </button>
            <button className="clear-btn" onClick={()=>{
              const vacio = {anio:[], zona:[], distrito:[], tipo:[], estado:[], mes:[], equipo:[]};
              setFiltros(vacio);
              setAplicados(vacio);
            }}>
              Limpiar filtros
            </button>

            {/* KPI ÚLTIMO REGISTRO */}
            <div style={{background:"rgba(25,118,210,0.1)",border:"2px solid #1976d2",borderRadius:"50%",width:140,height:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",margin:"8px auto 0",padding:10}}>
              <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"1px",marginBottom:2}}>{ultimoAnio} — {ultimoMes}</div>
              <div style={{fontFamily:"'Arial',sans-serif",fontSize:16,fontWeight:800,color:"#0d47a1"}}>{totalKpi.toLocaleString()}</div>
              <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"1px",marginTop:2}}>Último registro</div>
            </div>
          </aside>

          {/* ÁREA PRINCIPAL */}
          <main className="main">
            {loading ? (
              <div className="state-box"><div className="state-icon">⏳</div><div className="state-txt">Cargando datos...</div></div>
            ) : error ? (
              <div className="state-box"><div className="state-icon">❌</div><div className="state-txt">{error}</div></div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:16}}>

                {/* ── FILA ARRIBA: tabla + gráfico por AÑO ── */}
                <div className="content-row">

                  {/* TABLA */}
                  <div className="chart-card">
                    <div className="chart-title">Resumen — Año / Estado / Equipo</div>
                    {tablaAgrupada.length === 0 ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th onClick={() => toggleOrden("anio")} style={{cursor:"pointer",userSelect:"none"}}>
                                AÑO {ordenCol==="anio" ? (ordenDir==="asc"?"▲":"▼") : "↕"}
                              </th>
                              <th>ESTADO</th>
                              <th>EQUIPO</th>
                              {tiposUnicos.map(t=>(
                                <th key={t} onClick={() => toggleOrden(t)} style={{cursor:"pointer",userSelect:"none"}}>
                                  {t} {ordenCol===t ? (ordenDir==="asc"?"▲":"▼") : "↕"}
                                </th>
                              ))}
                              <th onClick={() => toggleOrden("__total")} style={{background:"#e3f2fd",color:"#000",cursor:"pointer",userSelect:"none"}}>
                                TOTAL {ordenCol==="__total" ? (ordenDir==="asc"?"▲":"▼") : "↕"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {tablaAgrupada.map((row,i)=>(
                              <tr key={i}>
                                <td style={{fontWeight:700, color:"#333"}}>{row.anio}</td>
                                <td style={{fontSize:11, color:"#333"}}>{row.estado}</td>
                                <td style={{fontSize:11, color:"#555"}}>{row.equipo}</td>
                                {tiposUnicos.map(t=>(
                                  <td key={t}>
                                    {row[t]
                                      ? <span className="tag-val">{Number(row[t]).toLocaleString()}</span>
                                      : <span style={{opacity:0.3}}>—</span>
                                    }
                                  </td>
                                ))}
                                <td style={{background:"#1565c0",padding:"9px 12px"}}>
                                  <span style={{fontFamily:"'Arial'",fontWeight:800,color:"#fbfdff",fontSize:11}}>
                                    {Number(tiposUnicos.reduce((acc,t) => acc + (row[t]||0), 0)).toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* GRÁFICO POR AÑO */}
                  <div className="chart-card">
                    <div className="chart-title">
                      CValor por Año {mesSeleccionado ? `— ${mesSeleccionado}` : "— Todos los meses"}
                    </div>
                    {chartAnios.every(r => r.valor === 0) ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartAnios} margin={{top:30, right:50, left:50, bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="anio" tick={{fill:"#000000", fontSize:11}} axisLine={false} tickLine={false} />
                          <YAxis hide={true} />
                          <Tooltip content={<CustomTooltip/>} />
                          <Line type="monotone" dataKey="valor" name="CValor"
                            stroke="#1976d2" strokeWidth={2} dot={{r:4}} activeDot={{r:6}}
                            label={{position:"top", fontSize:10, fill:"#1976d2", formatter: v => v > 0 ? v.toLocaleString() : ""}}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                </div>{/* fin fila arriba */}

                {/* ── FILA ABAJO: barras por estado (izq) + líneas por mes (der) ── */}
                <div className="bottom-row">

                  {/* GRÁFICO BARRAS POR ESTADO */}
                  <div className="chart-card">
                    <div className="chart-title">
                      CValor por Estado — {ultimoAnioLabel}
                    </div>
                    {barData.length === 0 ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <div style={{display:"flex", flexDirection:"column", gap:10, maxHeight:300, overflowY:"auto", paddingRight:4}}>
                        {barData.map((item, i) => (
                          <div key={i} style={{display:"flex", alignItems:"center", gap:8}}>
                            <div style={{fontSize:10, color:"#333", width:140, flexShrink:0, textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} title={item.estado}>
                              {item.estado}
                            </div>
                            <div style={{flex:1, background:"#e3f2fd", borderRadius:4, height:22, position:"relative"}}>
                              <div style={{
                                width:`${(parseFloat(item.cvalor)/maxBarVal)*100}%`,
                                background: i === 0 ? "#1565c0" : "#1976d2",
                                height:"100%", borderRadius:4,
                                transition:"width 0.4s ease"
                              }} />
                            </div>
                            <div style={{fontSize:10, fontWeight:700, color:"#1565c0", width:80, flexShrink:0, textAlign:"right"}}>
                              {Number(item.cvalor).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GRÁFICO POR MES */}
                  <div className="chart-card">
                    <div className="chart-title">
                      CValor por Mes {aplicados.anio.length > 0 ? `— ${aplicados.anio.join(", ")}` : "— Todos los años"}
                    </div>
                    {chartData.length === 0 ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{top:20, right:30, left:30, bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                          <XAxis dataKey="mes" tick={{fill:"#000000", fontSize:11}} axisLine={false} tickLine={false} />
                          <YAxis domain={['dataMin - 20000', 'dataMax + 20000']} tick={{fill:"#000000", fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                          <Tooltip content={<CustomTooltip/>} />
                          <Legend />
                          {aniosEnDatos.map((anio, i) => (
                            <Line key={anio} type="monotone" dataKey={`${anio}`} name={`${anio}`}
                              stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{r:4}} activeDot={{r:6}}>
                              <LabelList dataKey={`${anio}`} position="top" offset={8}
                                style={{fontSize:'10px', fill:'#333', fontWeight:'bold'}}
                                formatter={(val) => (val ? Number(val).toLocaleString() : '')}
                              />
                            </Line>
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                </div>{/* fin fila abajo */}

              </div>
            )}
          </main>
        </div>

        <div className="footer">SEDAPAL — Catastro de Conexiones por Estados</div>
      </div>
    </>
  );
}