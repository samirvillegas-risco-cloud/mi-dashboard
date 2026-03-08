// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — Catastro de Conexiones / TAGValor por Mes
// Layout:
//   ARRIBA izquierda: gráfico TAGValor por AÑO
//   ARRIBA derecha:   tabla dinámica con totales fijos abajo
//   ABAJO completo:   gráfico TAGValor por MES (grande)
// Filtros: todos aceptan múltiples valores (arrays)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,LabelList
} from "recharts";



// ─── CONFIGURACIÓN SUPABASE ───────────────────────────────────────────────────
const SUPABASE_URL = "https://sjwnpbfqmyntpznpsnot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd25wYmZxbXludHB6bnBzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MDQsImV4cCI6MjA4ODA3NDYwNH0.KVVmZa9xreX3L8_F9Adt79VlLfuSE3Fa54_3vwGsKmQ";

// Orden correcto de meses — Supabase devuelve "Set" para Septiembre
const MESES_ORDER = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];

// Colores para las líneas del gráfico — un color por año
const COLORS = ["#00C9FF","#FF6B6B","#FFE66D","#4ECDC4","#A78BFA","#FFA07A","#00E676","#FF6E40","#F06292","#AED581","#FFD54F"];

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

// Función genérica para llamar funciones SQL de Supabase
async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      ...headers,
      "Prefer": "count=exact"
    },
    body: JSON.stringify(params)
  });
  console.log(`${fn} status:`, res.status, "content-range:", res.headers.get("content-range"));
  return res.json();
}

// Convierte array a null si está vacío — las funciones SQL reciben arrays o null
const arrONull    = (arr) => arr.length > 0 ? arr : null;
const arrIntONull = (arr) => arr.length > 0 ? arr.map(a => parseInt(a)) : null;

// ─── TOOLTIP PERSONALIZADO ────────────────────────────────────────────────────
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
export default function Modulo1() {

  const [grafico, setGrafico] = useState([]);
  const [detalle, setDetalle] = useState([]);
  const [opciones, setOpciones] = useState({anios:[], zonas:[], distritos:[], tipos:[], tarifas:[]});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [ordenTabla, setOrdenTabla] = useState("desc"); // desc = mayor a menor


  const [filtros, setFiltros]     = useState({anio:[], zona:[], distrito:[], tipo:["CONEXION"], tarifa:[], mes:[], equipo:[]});
  const [aplicados, setAplicados] = useState({anio:[], zona:[], distrito:[], tipo:["CONEXION"], tarifa:[], mes:[], equipo:[]});

  // ── CARGAR OPCIONES AL INICIAR ───────────────────────────────────────────────
  useEffect(() => {
    rpc("get_anios").then(rows => {
      if (!Array.isArray(rows)) return;
      const anios = rows.map(r=>r.anio).sort((a,b) => a - b);
      setOpciones(prev => ({...prev, anios}));

      // Selecciona automáticamente los 3 últimos años al iniciar
      const ultimos3 = anios.slice(-3).map(String);
      setFiltros(prev => ({...prev, anio: ultimos3}));
      setAplicados(prev => ({...prev, anio: ultimos3}));
    });
    rpc("get_filtros").then(rows => {
      if (!Array.isArray(rows)) return;
        setOpciones(prev => ({
        ...prev,
        zonas:     [...new Set(rows.map(r=>r.zona))].filter(Boolean).sort(),
        distritos: [...new Set(rows.map(r=>r.distrito))].filter(Boolean).sort(),
        tipos:     [...new Set(rows.map(r=>r.tipo))].filter(Boolean).sort(),
        tarifas:   [...new Set(rows.map(r=>r.tarifa))].filter(Boolean).sort(),
        equipos:   [...new Set(rows.map(r=>r.equipo))].filter(Boolean).sort(),
      }));
    });
  }, []);

  // ── CARGAR DATOS AL APLICAR FILTROS ─────────────────────────────────────────
  // Envía ARRAYS completos → Supabase filtra por TODOS los valores marcados
  useEffect(() => {
    setLoading(true);
    setError(null);

    const paramsGrafico = {
  p_anio:     null,
  p_zona:     arrONull(aplicados.zona),
  p_distrito: arrONull(aplicados.distrito),
  p_tipo:     arrONull(aplicados.tipo),
  p_tarifa:   arrONull(aplicados.tarifa),
  p_equipo:   arrONull(aplicados.equipo),
};

const paramsTabla = {
  p_anio:     null,
  p_zona:     arrONull(aplicados.zona),
  p_distrito: arrONull(aplicados.distrito),
  p_tipo:     arrONull(aplicados.tipo),
  p_tarifa:   arrONull(aplicados.tarifa),
  p_equipo:   arrONull(aplicados.equipo),
};

    Promise.all([
      rpc("get_tagvalor_por_mes", paramsGrafico),
      rpc("get_detalle", paramsTabla)
    ]).then(([graf, det]) => {
      setGrafico(Array.isArray(graf) ? graf : []);
      setDetalle(Array.isArray(det)  ? det  : []);
      setLoading(false);
    }).catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [aplicados]);

  // ── PROCESAR GRÁFICO POR MES ─────────────────────────────────────────────────
  // Filtro de año SOLO afecta este gráfico
  const aniosEnDatos = [...new Set(grafico.map(r => r.anio))]
    .filter(a => aplicados.anio.length === 0 || aplicados.anio.includes(String(a)))
    .sort();

  const chartData = MESES_ORDER.map(mes => {
    const obj = { mes };
    aniosEnDatos.forEach(anio => {
      const fila = grafico.find(r => r.mes === mes && r.anio === anio);
      obj[`${anio}`] = fila ? parseFloat(fila.tagvalor) : 0;
    });
    return obj;
  });

  // ── PROCESAR GRÁFICO POR AÑO ─────────────────────────────────────────────────
  const mesSeleccionado = aplicados.mes.length === 1 ? aplicados.mes[0] : null;

  const chartAnios = opciones.anios.map(anio => {
    const filas = grafico.filter(r =>
      r.anio === anio && (mesSeleccionado ? r.mes === mesSeleccionado : true)
    );
    const total = filas.reduce((acc, r) => acc + parseFloat(r.tagvalor || 0), 0);
    return { anio: String(anio), valor: total };
  });

  // ── PROCESAR TABLA ───────────────────────────────────────────────────────────
  const tarifasUnicas = [...new Set(detalle.map(r=>r.tarifa))].filter(Boolean).sort();

  // Filtra el detalle por mes si hay uno seleccionado
const detalleFiltrado = aplicados.mes.length > 0
  ? detalle.filter(r => aplicados.mes.includes(r.mes))
  : detalle;

console.log("mes aplicados:", aplicados.mes);
console.log("total detalle filas:", detalle.length);
console.log("años en detalle:", [...new Set(detalle.map(r=>r.anio))].sort());

const tablaAgrupada = Object.values(
  detalleFiltrado.reduce((acc, r) => {
    const key = `${r.anio}`;
    if (!acc[key]) acc[key] = { anio: r.anio };
    acc[key][r.tarifa] = (acc[key][r.tarifa] || 0) + parseFloat(r.tagvalor || 0);
    return acc;
  }, {})
).sort((a,b) => ordenTabla === "asc" ? a.anio - b.anio : b.anio - a.anio);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalTagValor  = detalle.reduce((acc,r) => acc + parseFloat(r.tagvalor||0), 0);
  const totalRegistros = tablaAgrupada.length;
  
  const zonasUnicas    = new Set(detalle.map(r=>r.equipo)).size;

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
        .kpi-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;}
        .kpi-card{background:rgba(25,118,210,0.1);border:1px solid rgba(25,118,210,0.2);border-radius:10px;padding:10px 12px;text-align:center;}
        .kpi-val{font-family:'Arial',sans-serif;font-size:20px;font-weight:800;color:#0d47a1;}
        .kpi-lbl{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
        .main{flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow:auto;}
        .page-title{font-family:'Arial',sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:1px;text-align:center;width:100%;}
        .content-row{display:grid;grid-template-columns:2fr 8fr;gap:16px;}
        @media(max-width:900px){.content-row{grid-template-columns:1fr;}}
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
        tfoot tr{position:sticky;bottom:0;z-index:2;}
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
        <div className="subtitle-bar">Catastro de Conexiones — TAGValor por Mes</div>

        <div className="layout">

          {/* SIDEBAR */}
          <aside className="sidebar">
            <DropdownCheck label="Año"      opciones={opciones.anios}     seleccionados={filtros.anio}     onChange={val=>setFiltro("anio",val)} />
            <DropdownCheck label="Mes"      opciones={MESES_ORDER}        seleccionados={filtros.mes}      onChange={val=>setFiltro("mes",val)} />
            <DropdownCheck label="Zona"     opciones={opciones.zonas}     seleccionados={filtros.zona}     onChange={val=>setFiltro("zona",val)} />
            <DropdownCheck label="Distrito" opciones={opciones.distritos} seleccionados={filtros.distrito} onChange={val=>setFiltro("distrito",val)} />
            <DropdownCheck label="Tipo"     opciones={opciones.tipos}     seleccionados={filtros.tipo}     onChange={val=>setFiltro("tipo",val)} />
            <DropdownCheck label="Tarifa"   opciones={opciones.tarifas}   seleccionados={filtros.tarifa}   onChange={val=>setFiltro("tarifa",val)} />
            <DropdownCheck label="Equipo"   opciones={opciones.equipos || []}   seleccionados={filtros.equipo}   onChange={val=>setFiltro("equipo",val)} />





            <button className="apply-btn" onClick={()=> setAplicados({...filtros})}>
              APLICAR FILTROS
            </button>
            <button className="clear-btn" onClick={()=>{
              const vacio = {anio:[], zona:[], distrito:[], tipo:[], tarifa:[], mes:[], equipo:[]};
              setFiltros(vacio);
              setAplicados(vacio);
            }}>
              Limpiar filtros
            </button>

            <div className="kpi-grid">
              <div style={{background:"rgba(25,118,210,0.1)",border:"2px solid #1976d2",borderRadius:"50%",width:140,height:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",margin:"0 auto",padding:10}}>
                {(() => {
                  const ultimoAnio = Math.max(...grafico.map(r => r.anio));
                  const ultimoMes = MESES_ORDER.slice().reverse().find(m =>
                    grafico.some(r => r.anio === ultimoAnio && r.mes === m)
                  );
                  const fila = grafico.find(r => r.anio === ultimoAnio && r.mes === ultimoMes);
                  const total = fila ? parseFloat(fila.tagvalor) : 0;
                  return (
                    <>
                      <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"1px",marginBottom:2}}>{ultimoAnio} — {ultimoMes}</div>
                      <div style={{fontFamily:"'Arial',sans-serif",fontSize:16,fontWeight:800,color:"#0d47a1"}}>{total.toLocaleString()}</div>
                      <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"1px",marginTop:2}}>Último registro</div>
                    </>
                  );
                })()}
              </div>
              {/*<div className="kpi-card">
                <div className="kpi-val">{totalTagValor.toLocaleString()}</div>
                <div className="kpi-lbl">TAGValor Total</div>
              </div>
              <div className="kpi-card">
  <div className="kpi-val">{zonasUnicas}</div>
  <div className="kpi-lbl">Equipos únicos</div>
</div>*/}
{/*----------------segundo cuadro 
<div className="kpi-card">
  {(() => {
    const ultimoAnio = Math.max(...grafico.map(r => r.anio));
    const ultimoMes = MESES_ORDER.slice().reverse().find(m =>
      grafico.some(r => r.anio === ultimoAnio && r.mes === m)
    );
    const total = grafico
      .filter(r => r.anio === ultimoAnio && r.mes === ultimoMes)
      .reduce((acc, r) => acc + parseFloat(r.tagvalor || 0), 0);
    return (
      <>
        <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"1px",marginBottom:2}}>
          {ultimoAnio} — {ultimoMes}
        </div>
        <div className="kpi-val" style={{fontSize:14}}>{total.toLocaleString()}</div>
        <div className="kpi-lbl">Total último mes</div>
      </>
    );
  })()}
</div>*/}
            </div>
          </aside>

          {/* ÁREA PRINCIPAL */}
          <main className="main">
            {/* EMCABEZADO DE DIV DE GRAFICOS
            <div className="page-title">
              Conexiones — <span>TAGValor por Mes</span>

              AÑOS FILTRADOS
              {aplicados.anio.length > 0 &&
              
                <span style={{fontSize:14, marginLeft:12, opacity:0.7}}>
                  Año {aplicados.anio.join(", ")}
                </span>
              }
            </div>*/}

            {loading ? (
              <div className="state-box"><div className="state-icon">⏳</div><div className="state-txt">Cargando datos...</div></div>
            ) : error ? (
              <div className="state-box"><div className="state-icon">❌</div><div className="state-txt">{error}</div></div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:16}}>

                {/* ── FILA ARRIBA: gráfico por AÑO + tabla ── */}
                <div className="content-row">

                  

                  {/* TABLA */}
                  <div className="chart-card">
                    <div className="chart-title">Resumen — Año / Tarifa</div>

                    {/* DESCARGAR ARCHIVOS DE LA TABLA
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                      <div className="chart-title" style={{margin:0}}>Resumen — Año / Tarifa</div>
                      <button onClick={() => {
                        const headers = ["Año", ...tarifasUnicas, "TOTAL"];
                        const filas = tablaAgrupada.map(row => [
                          row.anio,
                          ...tarifasUnicas.map(t => row[t] || 0),
                          tarifasUnicas.reduce((acc,t) => acc + (row[t]||0), 0)
                        ]);
                        const csv = [headers, ...filas].map(r => r.join(",")).join("\n");
                        const blob = new Blob([csv], {type:"text/csv"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "resumen_anio_tarifa.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }} style={{background:"#1976d2",border:"none",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1,padding:"6px 14px",borderRadius:8,cursor:"pointer"}}>
                        ⬇ CSV
                      </button>
                    </div>*/}

                    {tablaAgrupada.length === 0 ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th onClick={() => setOrdenTabla(o => o === "asc" ? "desc" : "asc")}
                              style={{cursor:"pointer", userSelect:"none"}}>
                              AÑO{ordenTabla === "asc" ? "▲" : "▼"}</th>


                              {tarifasUnicas.map(t=><th key={t}>{t}</th>)}
                              <th style={{background:"#e3f2fd",color:"#000000"}}>TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tablaAgrupada.map((row,i)=>(
                              <tr key={i}>
                                <td style={{opacity:0.7, fontWeight:700}}>{row.anio}</td>
                               {tarifasUnicas.map(t=>(
                                  <td key={t}>
                                    {row[t]
                                      ? <span className="tag-val">{Number(row[t]).toLocaleString()}</span>
                                      : <span style={{opacity:0.3}}>—</span>
                                    }
                                  </td>
                                ))}

                                 {/*total de las filas diseño*/}   
                                <td style={{background:"#1565c0",padding:"9px 12px"}}>
                                  <span style={{fontFamily:"'Arial",fontWeight:800,color:"#fbfdff",fontSize:11}}>
                                    {Number(tarifasUnicas.reduce((acc,t) => acc + (row[t]||0), 0)).toLocaleString()}
                                  </span>
                                </td>
                                </tr>
                           
                            ))}
                          </tbody>
                          {/* Totales fijos abajo 
                          <tfoot>
                            <tr style={{background:"#1565c0"}}>
                              <td style={{color:"#ffffff",fontFamily:"'Arial',sans-serif",fontSize:11,fontWeight:800,padding:"10px 12px"}}>TOTAL</td>
                              {tarifasUnicas.map(t=>(
                                <td key={t} style={{color:"#ffffff",fontFamily:"'Arial',sans-serif",fontSize:11,fontWeight:800,padding:"10px 12px"}}>
                                  {Number(tablaAgrupada.reduce((acc, row) => acc + (row[t] || 0), 0)).toLocaleString()}
                                </td>
                              ))}

                              {/*Total de dils*/}
                              {/*
                              <td style={{color:"#ffffff",fontFamily:"Arial',sans-serif",fontSize:13,fontWeight:800,padding:"10px 12px"}}>
                              {Number(tablaAgrupada.reduce((acc, row) => 
                                acc + tarifasUnicas.reduce((a,t) => a + (row[t]||0), 0), 0x 
                              )).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>*/}
                        </table>
                      </div>
                    )}
                  </div>
                  {/* GRÁFICO POR AÑO */}
                  <div className="chart-card">
                    <div className="chart-title">
                      TAGValor por Año {mesSeleccionado ? `— ${mesSeleccionado}` : "— Todos los meses"}
                    </div>
                    {chartAnios.every(r => r.valor === 0) ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                       <LineChart data={chartAnios} margin={{top:50, right:50, left:30, bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="anio" tick={{fill:"#000000", fontSize:10}} axisLine={false} tickLine={false} />
                          <YAxis hide={true} />
                          <Tooltip content={<CustomTooltip/>} />
                          <Line type="monotone" dataKey="valor" name="TAGValor"
                            stroke="#1976d2" strokeWidth={2} dot={{r:4}} activeDot={{r:6}}
                            label={{position:"insideTop", fontSize:11, fill:"#000000", formatter: v => v > 0 ? v.toLocaleString() : ""}}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                </div>{/* fin fila arriba */}

                {/* ── FILA ABAJO: gráfico por MES — ancho completo ── */}
                <div className="chart-card">
                  <div className="chart-title">
                    TAGValor por Mes {aplicados.anio.length > 0 ? `— ${aplicados.anio.join(", ")}` : "— Todos los años"}
                  </div>
                  {chartData.length === 0 ? (
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                      <XAxis 
                        dataKey="mes" 
                        scale="point" 
                        padding={{ left: 50, right: 50 }} 
                        tick={{fill:"#000000", fontSize:11}} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        // Ajuste para separar líneas verticalmente
                        domain={['dataMin - 20000', 'dataMax + 20000']} 
                        tick={{fill:"#000000", fontSize:10}} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={v => v.toLocaleString()} 
                      />
                      <Tooltip content={<CustomTooltip/>} />
                      <Legend />
                      {aniosEnDatos.map((anio, i) => (
                    <Line 
                      key={anio} 
                      type="monotone" 
                      dataKey={`${anio}`} 
                      name={`${anio}`}
                      stroke={COLORS[i % COLORS.length]} 
                      strokeWidth={3} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }}
                    >
                    <LabelList 
                          dataKey={`${anio}`} 
                          position="top"   // "top" es lo mejor para que no tape la línea
                          offset={8}       // Baja de 15 a 8 para que esté más cerca del punto
                          style={{ 
                            fontSize: '10px', 
                            fill: '#333', 
                            fontWeight: 'bold',
                            textShadow: '0px 0px 2px white' // Tip: añade un pequeño borde blanco para que se lea mejor sobre las líneas
                          }}
                          formatter={(val) => (val ? Number(val).toLocaleString() : '')} 
                        />
                    </Line>
                  ))}
                    </LineChart>
                  </ResponsiveContainer>
                                    )}
                                  </div>

                                </div>
                              )}
                            </main>
                          </div>

                          <div className="footer">SEDAPAL — Catastro de Conexiones</div>
                        </div>
                      </>
                    );
}