// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — Catastro de Conexiones / TAGValor por Mes
// Layout:
//   ARRIBA izquierda: gráfico TAGValor por AÑO
//   ARRIBA derecha:   tabla dinámica con totales fijos abajo
//   ABAJO completo:   gráfico TAGValor por MES (grande)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
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
    headers,
    body: JSON.stringify(params)
  });
  return res.json();
}

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
// Se ve como un combo normal pero al hacer clic muestra checkboxes adentro
function DropdownCheck({ label, opciones, seleccionados, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Marca o desmarca un valor
  const toggle = (val) => {
    if (seleccionados.includes(val)) {
      onChange(seleccionados.filter(x => x !== val));
    } else {
      onChange([...seleccionados, val]);
    }
  };

  // Texto resumen cuando está cerrado
  const textoResumen = seleccionados.length === 0
    ? "Todos"
    : seleccionados.length === 1
      ? String(seleccionados[0])
      : `${seleccionados.length} selec.`;

  return (
    <div ref={ref} style={{position:"relative"}}>
      <div className="filter-label">{label}</div>
      {/* Botón que parece un combo */}
      <div onClick={() => setAbierto(a => !a)}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.07)",border:"1px solid rgba(0,0,0,0.15)",borderRadius:8,padding:"7px 10px",fontSize:12,cursor:"pointer",color:"#000",userSelect:"none"}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{textoResumen}</span>
        {/* Flecha que rota cuando está abierto */}
        <span style={{fontSize:10,transition:"transform 0.2s",display:"inline-block",transform:abierto?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
      </div>
      {/* Panel de checkboxes — solo visible cuando abierto=true */}
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

  // Datos de Supabase
  const [grafico, setGrafico] = useState([]);
  const [detalle, setDetalle] = useState([]);

  // Opciones de cada filtro — se cargan una sola vez al iniciar
  const [opciones, setOpciones] = useState({anios:[], zonas:[], distritos:[], tipos:[], tarifas:[]});

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // filtros   = lo que el usuario selecciona (aún no enviado a Supabase)
  // aplicados = lo que se envía a Supabase al presionar APLICAR FILTROS
  const [filtros, setFiltros]     = useState({anio:[], zona:[], distrito:[], tipo:[], tarifa:[], mes:[]});
  const [aplicados, setAplicados] = useState({anio:[], zona:[], distrito:[], tipo:[], tarifa:[], mes:[]});

  // ── CARGAR OPCIONES AL INICIAR ───────────────────────────────────────────────
  // Se ejecuta una sola vez al cargar la página
  useEffect(() => {
    // Años disponibles
    rpc("get_anios").then(rows => {
      if (Array.isArray(rows))
        setOpciones(prev => ({...prev, anios: rows.map(r=>r.anio)}));
    });
    // Zonas, distritos, tipos y tarifas disponibles
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

  // ── CARGAR DATOS AL PRESIONAR APLICAR FILTROS ───────────────────────────────
  // Se ejecuta cada vez que cambia "aplicados"
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Las funciones SQL aceptan un solo valor → enviamos el primero, o null = todos
    const primerONull = (arr) => arr.length > 0 ? arr[0] : null;

    // Gráficos de arriba: p_anio=null → siempre todos los años
    // El filtro de año solo afecta el gráfico de líneas de abajo via aniosEnDatos
    const paramsGrafico = {
      p_anio:     null,
      p_zona:     primerONull(aplicados.zona),
      p_distrito: primerONull(aplicados.distrito),
      p_tipo:     primerONull(aplicados.tipo),
      p_tarifa:   primerONull(aplicados.tarifa),
    };

    // Tabla: también todos los años siempre
    const paramsTabla = {
      p_anio:     null,
      p_zona:     primerONull(aplicados.zona),
      p_distrito: primerONull(aplicados.distrito),
      p_tipo:     primerONull(aplicados.tipo),
      p_tarifa:   primerONull(aplicados.tarifa),
    };

    // Llamadas en paralelo para mayor velocidad
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

  // ── PROCESAR GRÁFICO DE LÍNEAS POR MES ──────────────────────────────────────
  // El filtro de año SOLO afecta este gráfico de abajo
  const aniosEnDatos = [...new Set(grafico.map(r => r.anio))]
    .filter(a => aplicados.anio.length === 0 || aplicados.anio.includes(String(a)))
    .sort();

  // Formato: [{ mes:"Ene", 2022:4500000, 2023:4600000 }, ...]
  const chartData = MESES_ORDER.map(mes => {
    const obj = { mes };
    aniosEnDatos.forEach(anio => {
      const fila = grafico.find(r => r.mes === mes && r.anio === anio);
      obj[`${anio}`] = fila ? parseFloat(fila.tagvalor) : 0;
    });
    return obj;
  });

  // ── PROCESAR GRÁFICO POR AÑO ─────────────────────────────────────────────────
  // Si hay un mes seleccionado → filtra por ese mes, si no → suma todos
  const mesSeleccionado = aplicados.mes.length === 1 ? aplicados.mes[0] : null;

  const chartAnios = opciones.anios.map(anio => {
    const filas = grafico.filter(r =>
      r.anio === anio && (mesSeleccionado ? r.mes === mesSeleccionado : true)
    );
    const total = filas.reduce((acc, r) => acc + parseFloat(r.tagvalor || 0), 0);
    return { anio: String(anio), valor: total };
  });

  // ── PROCESAR TABLA ───────────────────────────────────────────────────────────
  // Tarifas únicas → columnas de la tabla
  const tarifasUnicas = [...new Set(detalle.map(r=>r.tarifa))].filter(Boolean).sort();

  // Agrupa solo por año (sin equipo) y suma todas las tarifas
  const tablaAgrupada = Object.values(
    detalle.reduce((acc, r) => {
      const key = `${r.anio}`;
      if (!acc[key]) acc[key] = { anio: r.anio };
      acc[key][r.tarifa] = (acc[key][r.tarifa] || 0) + parseFloat(r.tagvalor || 0);
      return acc;
    }, {})
  ).sort((a,b) => a.anio - b.anio);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalTagValor  = detalle.reduce((acc,r) => acc + parseFloat(r.tagvalor||0), 0);
  const totalRegistros = tablaAgrupada.length;
  const zonasUnicas    = new Set(detalle.map(r=>r.equipo)).size;

  // Actualiza un filtro individual
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
        .topbar-logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;letter-spacing:2px;color:#fff;}
        .topbar-btn{background:transparent;border:2px solid rgba(255,255,255,0.8);color:#fff;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:2px;padding:6px 28px;border-radius:100px;cursor:pointer;}
        .back-link{background:rgba(255,255,255,0.15);border:none;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;padding:6px 16px;border-radius:100px;cursor:pointer;}
        .subtitle-bar{background:#0d47a1;padding:10px 28px;font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;letter-spacing:1px;color:#90caf9;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);}
        .layout{display:flex;min-height:calc(100vh - 108px);}
        .sidebar{width:200px;flex-shrink:0;background:#fafafa;padding:16px 14px;display:flex;flex-direction:column;gap:10px;border-radius:16px;margin:12px;overflow-y:auto;max-height:calc(100vh - 130px);}
        .filter-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#0f172a;text-transform:uppercase;margin-bottom:3px;}
        .apply-btn{background:#1976d2;border:none;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;padding:9px;border-radius:8px;cursor:pointer;text-transform:uppercase;}
        .apply-btn:hover{background:#1e88e5;}
        .clear-btn{background:transparent;border:1px solid rgba(0,0,0,0.2);color:rgba(0,0,0,0.5);font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:1px;padding:7px;border-radius:8px;cursor:pointer;}
        .kpi-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;}
        .kpi-card{background:rgba(25,118,210,0.1);border:1px solid rgba(25,118,210,0.2);border-radius:10px;padding:10px 12px;text-align:center;}
        .kpi-val{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#0d47a1;}
        .kpi-lbl{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
        .main{flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow:auto;}
        .page-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:1px;}
        .page-title span{color:#90caf9;}
        .content-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        @media(max-width:900px){.content-row{grid-template-columns:1fr;}}
        .chart-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:20px;}
        .chart-title{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;color:#0d47a1;margin-bottom:14px;text-align:center;}
        .table-wrap{overflow:auto;max-height:320px;border-radius:10px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        thead tr{background:#e3f2fd;position:sticky;top:0;z-index:2;}
        thead th{text-align:left;padding:10px 12px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#000000;white-space:nowrap;border-bottom:1px solid rgba(0,0,0,0.1);}
        tbody tr{border-bottom:1px solid rgba(0,0,0,0.05);transition:background 0.15s;}
        tbody tr:hover{background:rgba(25,118,210,0.05);}
        tbody td{padding:9px 12px;white-space:nowrap;color:#000000;}
        .tag-val{font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#1565c0;}
        tfoot tr{position:sticky;bottom:0;z-index:2;}
        .state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;opacity:0.6;}
        .state-icon{font-size:40px;}
        .state-txt{font-size:14px;color:#000;}
        .footer{background:#0d47a1;padding:10px 28px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#90caf9;text-align:center;}
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

          {/* SIDEBAR — filtros estáticos, se cargan una sola vez */}
          <aside className="sidebar">

            {/* Año — opciones fijas de get_anios */}
            <DropdownCheck label="Año"      opciones={opciones.anios}     seleccionados={filtros.anio}     onChange={val=>setFiltro("anio",val)} />
            {/* Mes — opciones fijas del array MESES_ORDER */}
            <DropdownCheck label="Mes"      opciones={MESES_ORDER}        seleccionados={filtros.mes}      onChange={val=>setFiltro("mes",val)} />
            {/* Zona — opciones de get_filtros */}
            <DropdownCheck label="Zona"     opciones={opciones.zonas}     seleccionados={filtros.zona}     onChange={val=>setFiltro("zona",val)} />
            {/* Distrito — opciones de get_filtros */}
            <DropdownCheck label="Distrito" opciones={opciones.distritos} seleccionados={filtros.distrito} onChange={val=>setFiltro("distrito",val)} />
            {/* Tipo — opciones de get_filtros */}
            <DropdownCheck label="Tipo"     opciones={opciones.tipos}     seleccionados={filtros.tipo}     onChange={val=>setFiltro("tipo",val)} />
            {/* Tarifa — opciones de get_filtros */}
            <DropdownCheck label="Tarifa"   opciones={opciones.tarifas}   seleccionados={filtros.tarifa}   onChange={val=>setFiltro("tarifa",val)} />

            {/* BOTÓN APLICAR: copia filtros → aplicados, dispara el useEffect */}
            <button className="apply-btn" onClick={()=> setAplicados({...filtros})}>
              APLICAR FILTROS
            </button>

            {/* BOTÓN LIMPIAR: resetea todos los filtros */}
            <button className="clear-btn" onClick={()=>{
              const vacio = {anio:[], zona:[], distrito:[], tipo:[], tarifa:[], mes:[]};
              setFiltros(vacio);
              setAplicados(vacio);
            }}>
              Limpiar filtros
            </button>

            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-val">{totalRegistros.toLocaleString()}</div>
                <div className="kpi-lbl">Años</div>
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

          {/* ÁREA PRINCIPAL */}
          <main className="main">
            <div className="page-title">
              Conexiones — <span>TAGValor por Mes</span>
              {aplicados.anio.length > 0 &&
                <span style={{fontSize:14, marginLeft:12, opacity:0.7}}>
                  Año {aplicados.anio.join(", ")}
                </span>
              }
            </div>

            {loading ? (
              <div className="state-box"><div className="state-icon">⏳</div><div className="state-txt">Cargando datos...</div></div>
            ) : error ? (
              <div className="state-box"><div className="state-icon">❌</div><div className="state-txt">{error}</div></div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:16}}>

                {/* ── FILA ARRIBA: gráfico por AÑO (izq) + tabla (der) ── */}
                <div className="content-row">

                  {/* GRÁFICO POR AÑO — no afectado por filtro de año */}
                  <div className="chart-card">
                    <div className="chart-title">
                      TAGValor por Año {mesSeleccionado ? `— ${mesSeleccionado}` : "— Todos los meses"}
                    </div>
                    {chartAnios.every(r => r.valor === 0) ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartAnios}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="anio" tick={{fill:"#000000", fontSize:11}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill:"#000000", fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                          <Tooltip content={<CustomTooltip/>} />
                          <Line type="monotone" dataKey="valor" name="TAGValor"
                            stroke="#1976d2" strokeWidth={2} dot={{r:4}} activeDot={{r:6}}
                            label={{position:"top", fontSize:10, fill:"#1976d2", formatter: v => v > 0 ? v.toLocaleString() : ""}}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* TABLA — filas=años, columnas=tarifas, totales fijos abajo */}
                  <div className="chart-card">
                    <div className="chart-title">Resumen — Año / Tarifa</div>
                    {tablaAgrupada.length === 0 ? (
                      <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          {/* Encabezado fijo arriba */}
                          <thead>
                            <tr>
                              <th>Año</th>
                              {tarifasUnicas.map(t=><th key={t}>{t}</th>)}
                            </tr>
                          </thead>
                          {/* Filas de datos por año */}
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
                              </tr>
                            ))}
                          </tbody>
                          {/* Totales fijos abajo — siempre visibles sin hacer scroll */}
                          <tfoot>
                            <tr style={{background:"#1565c0"}}>
                              <td style={{color:"#FFE66D",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:800,padding:"10px 12px"}}>
                                TOTAL
                              </td>
                              {tarifasUnicas.map(t=>(
                                <td key={t} style={{color:"#FFE66D",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:800,padding:"10px 12px"}}>
                                  {Number(
                                    tablaAgrupada.reduce((acc, row) => acc + (row[t] || 0), 0)
                                  ).toLocaleString()}
                                </td>
                              ))}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                </div>{/* ── fin fila arriba ── */}

                {/* ── FILA ABAJO: gráfico por MES — ancho completo ── */}
                {/* El filtro de año SÍ afecta este gráfico */}
                <div className="chart-card">
                  <div className="chart-title">
                    TAGValor por Mes {aplicados.anio.length > 0 ? `— ${aplicados.anio.join(", ")}` : "— Todos los años"}
                  </div>
                  {chartData.length === 0 ? (
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                        <XAxis dataKey="mes" tick={{fill:"#000000", fontSize:11}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill:"#000000", fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                        <Tooltip content={<CustomTooltip/>} />
                        <Legend wrapperStyle={{fontSize:11, color:"#000000"}} />
                        {/* Una línea por cada año seleccionado */}
                        {aniosEnDatos.map((anio, i) => (
                          <Line key={anio} type="monotone" dataKey={`${anio}`} name={`${anio}`}
                            stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{r:3}} activeDot={{r:5}} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

              </div>
            )}
          </main>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="footer">SEDAPAL — Catastro de Conexiones</div>
      </div>
    </>
  );
}