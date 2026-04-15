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
  Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";



// ─── CONFIGURACIÓN SUPABASE ───────────────────────────────────────────────────
const SUPABASE_URL = "https://sjwnpbfqmyntpznpsnot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd25wYmZxbXludHB6bnBzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MDQsImV4cCI6MjA4ODA3NDYwNH0.KVVmZa9xreX3L8_F9Adt79VlLfuSE3Fa54_3vwGsKmQ";

// Orden correcto de meses — Supabase devuelve "Set" para Septiembre
const MESES_ORDER = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];

// Colores para las líneas del gráfico — un color por año
const COLORS = ["#0077c8","#00a3e0","#005b9f","#4db8ff","#003d7a","#66ccff","#002855","#80d4ff","#001f3f","#99ddff","#b3e8ff"];

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
    <div style={{background:"#ffffff",border:"1px solid #e0eaf4",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#003d7a",boxShadow:"0 4px 16px rgba(0,61,122,0.12)"}}>
      <p style={{margin:"0 0 6px",opacity:0.7,fontWeight:700,color:"#0077c8"}}>{label}</p>
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
    <div ref={ref} style={{position:"relative", minWidth:90}}>
      <div className="filter-sublabel">{label}</div>
      <div onClick={() => setAbierto(a => !a)}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#ffffff",border:"1.5px solid #c2d9ef",borderRadius:6,padding:"5px 9px",fontSize:12,cursor:"pointer",color:"#003d7a",userSelect:"none",transition:"border-color 0.2s",fontWeight:500,minWidth:90,gap:6}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{textoResumen}</span>
        <span style={{fontSize:9,transition:"transform 0.2s",display:"inline-block",transform:abierto?"rotate(180deg)":"rotate(0deg)",color:"#0077c8",flexShrink:0}}>▼</span>
      </div>
      {abierto && (
        <div style={{position:"absolute",top:"100%",left:0,zIndex:200,background:"#ffffff",border:"1.5px solid #c2d9ef",borderRadius:8,marginTop:4,padding:"8px 10px",maxHeight:180,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,61,122,0.14)",minWidth:140}}>
          {opciones.map(op => (
            <label key={op} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer",color:"#003d7a",padding:"3px 0",fontWeight:500}}>
              <input type="checkbox" checked={seleccionados.includes(String(op))} onChange={() => toggle(String(op))} style={{accentColor:"#0077c8"}} />
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

  const [grafico, setGrafico]   = useState([]);
  const [detalle, setDetalle]   = useState([]);
  const [opciones, setOpciones] = useState({anios:[], zonas:[], distritos:[], tipos:[], tarifas:[]});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [ordenTabla, setOrdenTabla] = useState("desc"); // desc = mayor a menor

  // Estado para colapsar/expandir el ribbon de filtros
  const [ribbonAbierto, setRibbonAbierto] = useState(true);

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

  // Cuenta filtros activos para mostrar badge en el botón de colapsar
  const cantFiltrosActivos = Object.entries(aplicados)
    .filter(([k]) => k !== "tipo")
    .reduce((acc, [, v]) => acc + v.length, 0)
    + (aplicados.tipo.length > 0 && !(aplicados.tipo.length === 1 && aplicados.tipo[0] === "CONEXION") ? aplicados.tipo.length : 0);

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        body{
          background:#f0f4f8;
          font-family:'Open Sans',sans-serif;
          color:#1a2b3c;
        }
        .root{
          min-height:100vh;
          background:#f0f4f8;
        }

        /* ── TOPBAR ── */
        .topbar{
          background:#ffffff;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 28px;
          height:56px;
          box-shadow:0 2px 10px rgba(0,61,122,0.10);
          border-bottom:3px solid #0077c8;
          position:sticky;
          top:0;
          z-index:300;
        }
        .topbar-logo{
          font-family:'Montserrat',sans-serif;
          font-weight:800;
          font-size:26px;
          letter-spacing:3px;
          color:#0077c8;
          text-transform:lowercase;
        }
        .topbar-btn{
          background:#0077c8;
          border:none;
          color:#fff;
          font-family:'Montserrat',sans-serif;
          font-weight:700;
          font-size:11px;
          letter-spacing:2px;
          padding:7px 22px;
          border-radius:100px;
          cursor:pointer;
          text-transform:uppercase;
          transition:background 0.2s;
        }
        .topbar-btn:hover{background:#005b9f;}
        .back-link{
          background:transparent;
          border:1.5px solid #0077c8;
          color:#0077c8;
          font-family:'Montserrat',sans-serif;
          font-size:11px;
          font-weight:700;
          letter-spacing:1px;
          padding:6px 16px;
          border-radius:100px;
          cursor:pointer;
          transition:background 0.2s,color 0.2s;
        }
        .back-link:hover{background:#0077c8;color:#fff;}

        /* ── SUBTITLE BAR ── */
        .subtitle-bar{
          background:linear-gradient(90deg,#005b9f 0%,#0077c8 60%,#00a3e0 100%);
          padding:10px 28px;
          font-family:'Montserrat',sans-serif;
          font-size:14px;
          font-weight:700;
          letter-spacing:2px;
          color:#ffffff;
          text-align:center;
          text-transform:uppercase;
        }

        /* ── RIBBON DE FILTROS ── */
        .ribbon-wrapper{
          background:#ffffff;
          border-bottom:1px solid #dce8f5;
          box-shadow:0 2px 8px rgba(0,61,122,0.06);
          position:sticky;
          top:56px;
          z-index:200;
        }
        .ribbon-toggle-bar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:7px 28px;
          cursor:pointer;
          user-select:none;
          border-bottom:1px solid transparent;
          transition:border-color 0.2s;
        }
        .ribbon-toggle-bar.open{
          border-bottom:1px solid #e8f0f8;
        }
        .ribbon-toggle-left{
          display:flex;
          align-items:center;
          gap:10px;
        }
        .ribbon-toggle-title{
          font-family:'Montserrat',sans-serif;
          font-size:11px;
          font-weight:700;
          letter-spacing:1.5px;
          color:#5a7a99;
          text-transform:uppercase;
        }
        .ribbon-badge{
          background:#0077c8;
          color:#fff;
          font-family:'Montserrat',sans-serif;
          font-size:10px;
          font-weight:700;
          padding:2px 8px;
          border-radius:20px;
          min-width:20px;
          text-align:center;
        }
        .ribbon-chevron{
          font-size:11px;
          color:#0077c8;
          transition:transform 0.25s;
        }
        .ribbon-chevron.open{transform:rotate(180deg);}

        /* Chips de filtros activos (cuando ribbon está cerrado) */
        .active-chips{
          display:flex;
          align-items:center;
          gap:5px;
          flex-wrap:wrap;
        }
        .active-chip{
          background:#e8f2fb;
          border:1px solid #b5d4f4;
          border-radius:20px;
          padding:2px 9px;
          font-size:10px;
          font-family:'Montserrat',sans-serif;
          font-weight:600;
          color:#0077c8;
          white-space:nowrap;
        }

        /* Panel de filtros expandible - CORREGIDO */
        .ribbon-panel{
          overflow:visible;
          transition:max-height 0.3s ease, opacity 0.25s ease;
          max-height:0;
          opacity:0;
        }
        .ribbon-panel.open{
          max-height:500px;
          opacity:1;
        }
        .ribbon-inner{
          padding:12px 28px 14px;
          display:flex;
          align-items:flex-end;
          gap:0;
          flex-wrap:wrap;
        }

        /* Grupos de filtros con separador */
        .filter-group{
          display:flex;
          flex-direction:column;
          gap:4px;
          padding:0 18px 0 0;
          border-right:1px solid #dce8f5;
          margin-right:18px;
        }
        .filter-group:last-of-type{
          border-right:none;
          margin-right:0;
          padding-right:0;
        }
        .filter-group-label{
          font-family:'Montserrat',sans-serif;
          font-size:9px;
          font-weight:700;
          letter-spacing:1.5px;
          color:#0077c8;
          text-transform:uppercase;
          margin-bottom:2px;
        }
        .filter-group-row{
          display:flex;
          gap:6px;
          align-items:flex-end;
        }

        /* Label individual dentro de cada dropdown */
        .filter-sublabel{
          font-family:'Montserrat',sans-serif;
          font-size:9px;
          font-weight:600;
          letter-spacing:1px;
          color:#8aa4bc;
          text-transform:uppercase;
          margin-bottom:3px;
        }

        /* Botones del ribbon */
        .ribbon-actions{
          display:flex;
          flex-direction:column;
          gap:6px;
          margin-left:20px;
          padding-left:20px;
          border-left:1px solid #dce8f5;
          align-self:flex-end;
          padding-bottom:1px;
        }
        .apply-btn{
          background:linear-gradient(135deg,#0077c8 0%,#005b9f 100%);
          border:none;
          color:#fff;
          font-family:'Montserrat',sans-serif;
          font-size:10px;
          font-weight:800;
          letter-spacing:2px;
          padding:8px 20px;
          border-radius:6px;
          cursor:pointer;
          text-transform:uppercase;
          box-shadow:0 3px 8px rgba(0,119,200,0.25);
          transition:box-shadow 0.2s,transform 0.1s;
          white-space:nowrap;
        }
        .apply-btn:hover{box-shadow:0 5px 14px rgba(0,119,200,0.35);transform:translateY(-1px);}
        .apply-btn:active{transform:translateY(0);}
        .clear-btn{
          background:transparent;
          border:1px solid #c2d9ef;
          color:#5a7a99;
          font-family:'Montserrat',sans-serif;
          font-size:10px;
          letter-spacing:1px;
          padding:6px 14px;
          border-radius:6px;
          cursor:pointer;
          transition:border-color 0.2s,color 0.2s;
          white-space:nowrap;
        }
        .clear-btn:hover{border-color:#0077c8;color:#0077c8;}

        /* ── KPI BAR — fila de métricas debajo del ribbon ── */
        .kpi-bar{
          background:#f7fafd;
          border-bottom:1px solid #dce8f5;
          padding:8px 28px;
          display:flex;
          align-items:center;
          gap:24px;
        }
        .kpi-item{
          display:flex;
          flex-direction:column;
          align-items:flex-start;
        }
        .kpi-val{
          font-family:'Montserrat',sans-serif;
          font-size:18px;
          font-weight:800;
          color:#0077c8;
          line-height:1;
        }
        .kpi-lbl{
          font-size:9px;
          color:#8aa4bc;
          text-transform:uppercase;
          letter-spacing:1px;
          margin-top:2px;
          font-family:'Montserrat',sans-serif;
        }
        .kpi-divider{
          width:1px;
          height:32px;
          background:#dce8f5;
        }

        /* ── MAIN ── */
        .main{
          padding:20px 24px;
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .content-row{
          display:grid;
          grid-template-columns:2fr 8fr;
          gap:16px;
        }
        @media(max-width:900px){.content-row{grid-template-columns:1fr;}}
        @media(max-width:768px){
          .ribbon-inner{flex-direction:column;align-items:flex-start;}
          .filter-group{border-right:none;border-bottom:1px solid #dce8f5;padding-bottom:10px;margin-bottom:6px;padding-right:0;}
          .ribbon-actions{border-left:none;padding-left:0;margin-left:0;flex-direction:row;}
        }

        /* ── CARDS ── */
        .chart-card{
          background:#ffffff;
          border:1px solid #dce8f5;
          border-radius:14px;
          padding:20px;
          box-shadow:0 2px 10px rgba(0,61,122,0.06);
        }
        .chart-title{
          font-family:'Montserrat',sans-serif;
          font-size:12px;
          font-weight:700;
          letter-spacing:1px;
          color:#003d7a;
          margin-bottom:16px;
          text-align:center;
          text-transform:uppercase;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }
        .chart-title::before,.chart-title::after{
          content:'';
          flex:1;
          height:1px;
          background:linear-gradient(90deg,transparent,#c2d9ef);
        }
        .chart-title::after{
          background:linear-gradient(90deg,#c2d9ef,transparent);
        }

        /* ── TABLA ── */
        .table-wrap{
          overflow:auto;
          max-height:320px;
          border-radius:10px;
          border:1px solid #dce8f5;
        }
        table{width:100%;border-collapse:collapse;font-size:12px;}
        thead tr{
          background:linear-gradient(135deg,#0077c8 0%,#005b9f 100%);
          position:sticky;
          top:0;
          z-index:2;
        }
        thead th{
          text-align:left;
          padding:11px 14px;
          font-family:'Montserrat',sans-serif;
          font-size:10px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:1.2px;
          color:#ffffff;
          white-space:nowrap;
        }
        tbody tr{border-bottom:1px solid #edf2f8;transition:background 0.15s;}
        tbody tr:nth-child(even){background:#f7fafd;}
        tbody tr:hover{background:#e8f2fb;}
        tbody td{padding:10px 14px;white-space:nowrap;color:#1a2b3c;font-size:12px;}
        .tag-val{font-family:'Montserrat',sans-serif;font-weight:700;color:#0077c8;}
        tfoot tr{position:sticky;bottom:0;z-index:2;}

        /* ── ESTADOS ── */
        .state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;opacity:0.6;}
        .state-icon{font-size:40px;}
        .state-txt{font-size:14px;color:#5a7a99;font-family:'Montserrat',sans-serif;}

        /* ── FOOTER ── */
        .footer{
          background:linear-gradient(90deg,#005b9f 0%,#0077c8 100%);
          padding:11px 28px;
          font-family:'Montserrat',sans-serif;
          font-size:11px;
          font-weight:600;
          color:rgba(255,255,255,0.9);
          text-align:center;
          letter-spacing:1px;
        }
      `}</style>

      <div className="root">

        {/* BARRA SUPERIOR */}
        <div className="topbar">
          <div className="topbar-logo">sedapal</div>
          <button className="topbar-btn">PRINCIPAL</button>
          <button className="back-link" onClick={()=>window.location.href="/"}>← Volver al Menú</button>
        </div>

        <div className="subtitle-bar">Catastro de Conexiones — TAGValor por Mes</div>

        {/* ── RIBBON DE FILTROS ─────────────────────────────────────────────── */}
        <div className="ribbon-wrapper">

          {/* Barra clicable para colapsar/expandir */}
          <div
            className={`ribbon-toggle-bar ${ribbonAbierto ? "open" : ""}`}
            onClick={() => setRibbonAbierto(a => !a)}
          >
            <div className="ribbon-toggle-left">
              <span className="ribbon-toggle-title">Filtros</span>

              {/* Badge con cantidad de filtros activos (cuando está cerrado) */}
              {!ribbonAbierto && cantFiltrosActivos > 0 && (
                <span className="ribbon-badge">{cantFiltrosActivos} activos</span>
              )}

              {/* Chips de resumen cuando el ribbon está cerrado */}
              {!ribbonAbierto && (
                <div className="active-chips">
                  {aplicados.anio.length > 0 && aplicados.anio.map(a => <span key={a} className="active-chip">{a}</span>)}
                  {aplicados.mes.length > 0  && aplicados.mes.map(m  => <span key={m} className="active-chip">{m}</span>)}
                  {aplicados.zona.length > 0 && <span className="active-chip">{aplicados.zona.length} zona(s)</span>}
                  {aplicados.tipo.length > 0 && aplicados.tipo.map(t => <span key={t} className="active-chip">{t}</span>)}
                  {aplicados.tarifa.length > 0 && <span className="active-chip">{aplicados.tarifa.length} tarifa(s)</span>}
                  {aplicados.equipo.length > 0 && <span className="active-chip">{aplicados.equipo.length} equipo(s)</span>}
                </div>
              )}
            </div>

            <span className={`ribbon-chevron ${ribbonAbierto ? "open" : ""}`}>▼</span>
          </div>

          {/* Panel de filtros (expandible) */}
          <div className={`ribbon-panel ${ribbonAbierto ? "open" : ""}`}>
            <div className="ribbon-inner">

              {/* GRUPO 1 — Período */}
              <div className="filter-group">
                <div className="filter-group-label">Período</div>
                <div className="filter-group-row">
                  <DropdownCheck label="Año"  opciones={opciones.anios}  seleccionados={filtros.anio} onChange={val=>setFiltro("anio",val)} />
                  <DropdownCheck label="Mes"  opciones={MESES_ORDER}     seleccionados={filtros.mes}  onChange={val=>setFiltro("mes",val)} />
                </div>
              </div>

              {/* GRUPO 2 — Ubicación */}
              <div className="filter-group">
                <div className="filter-group-label">Ubicación</div>
                <div className="filter-group-row">
                  <DropdownCheck label="Zona"     opciones={opciones.zonas}     seleccionados={filtros.zona}     onChange={val=>setFiltro("zona",val)} />
                  <DropdownCheck label="Distrito"  opciones={opciones.distritos} seleccionados={filtros.distrito} onChange={val=>setFiltro("distrito",val)} />
                </div>
              </div>

              {/* GRUPO 3 — Clasificación */}
              <div className="filter-group">
                <div className="filter-group-label">Clasificación</div>
                <div className="filter-group-row">
                  <DropdownCheck label="Tipo"   opciones={opciones.tipos}        seleccionados={filtros.tipo}   onChange={val=>setFiltro("tipo",val)} />
                  <DropdownCheck label="Tarifa" opciones={opciones.tarifas}       seleccionados={filtros.tarifa} onChange={val=>setFiltro("tarifa",val)} />
                  <DropdownCheck label="Equipo" opciones={opciones.equipos || []} seleccionados={filtros.equipo} onChange={val=>setFiltro("equipo",val)} />
                </div>
              </div>

              {/* ACCIONES */}
              <div className="ribbon-actions">
                <button className="apply-btn" onClick={()=> setAplicados({...filtros})}>
                  APLICAR
                </button>
                <button className="clear-btn" onClick={()=>{
                  const vacio = {anio:[], zona:[], distrito:[], tipo:[], tarifa:[], mes:[], equipo:[]};
                  setFiltros(vacio);
                  setAplicados(vacio);
                }}>
                  Limpiar
                </button>
              </div>

            </div>
          </div>
        </div>
        {/* ── FIN RIBBON ───────────────────────────────────────────────────── */}

        {/* ── KPI BAR ─────────────────────────────────────────────────────── */}
        <div className="kpi-bar">
          {/* KPI — Último registro */}
          {grafico.length > 0 && (() => {
            const ultimoAnio = Math.max(...grafico.map(r => r.anio));
            const ultimoMes = MESES_ORDER.slice().reverse().find(m =>
              grafico.some(r => r.anio === ultimoAnio && r.mes === m)
            );
            const fila = grafico.find(r => r.anio === ultimoAnio && r.mes === ultimoMes);
            const total = fila ? parseFloat(fila.tagvalor) : 0;
            return (
              <>
                <div className="kpi-item">
                  <div className="kpi-val">{total.toLocaleString()}</div>
                  <div className="kpi-lbl">Último registro — {ultimoAnio} {ultimoMes}</div>
                </div>
                <div className="kpi-divider" />
              </>
            );
          })()}

          {/* Años aplicados como chips informativos */}
          {aplicados.anio.length > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
              <span style={{fontSize:10,color:"#8aa4bc",fontFamily:"'Montserrat',sans-serif",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase"}}>Años:</span>
              {aplicados.anio.map(a => (
                <span key={a} style={{background:"#e8f2fb",border:"1px solid #b5d4f4",borderRadius:20,padding:"2px 10px",fontSize:11,fontFamily:"'Montserrat',sans-serif",fontWeight:700,color:"#0077c8"}}>{a}</span>
              ))}
            </div>
          )}
        </div>
        {/* ── FIN KPI BAR ──────────────────────────────────────────────────── */}

        {/* ── ÁREA PRINCIPAL ───────────────────────────────────────────────── */}
        <main className="main">

          {loading ? (
            <div className="state-box"><div className="state-icon">⏳</div><div className="state-txt">Cargando datos...</div></div>
          ) : error ? (
            <div className="state-box"><div className="state-icon">❌</div><div className="state-txt">{error}</div></div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* ── FILA ARRIBA: gráfico por AÑO + tabla ── */}
              <div className="content-row">

                {/* TABLA */}
                <div className="chart-card">
                  <div className="chart-title">Resumen — Año / Tarifa</div>

                  {tablaAgrupada.length === 0 ? (
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th
                              onClick={() => setOrdenTabla(o => o === "asc" ? "desc" : "asc")}
                              style={{cursor:"pointer",userSelect:"none"}}
                            >
                              AÑO {ordenTabla === "asc" ? "▲" : "▼"}
                            </th>
                            {tarifasUnicas.map(t=><th key={t}>{t}</th>)}
                            <th style={{background:"rgba(0,0,0,0.15)"}}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tablaAgrupada.map((row,i)=>(
                            <tr key={i}>
                              <td style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,color:"#003d7a"}}>{row.anio}</td>
                              {tarifasUnicas.map(t=>(
                                <td key={t}>
                                  {row[t]
                                    ? <span className="tag-val">{Number(row[t]).toLocaleString()}</span>
                                    : <span style={{opacity:0.3,color:"#5a7a99"}}>—</span>
                                  }
                                </td>
                              ))}

                              <td style={{background:"linear-gradient(135deg,#0077c8,#005b9f)",padding:"10px 14px"}}>
                                <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:800,color:"#ffffff",fontSize:12}}>
                                  {Number(tarifasUnicas.reduce((acc,t) => acc + (row[t]||0), 0)).toLocaleString()}
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
                    TAGValor por Año {mesSeleccionado ? `— ${mesSeleccionado}` : "— Todos los meses"}
                  </div>
                  {chartAnios.every(r => r.valor === 0) ? (
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartAnios} margin={{top:50,right:50,left:30,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,61,122,0.08)" />
                        <XAxis dataKey="anio" tick={{fill:"#5a7a99",fontSize:10,fontFamily:"'Montserrat',sans-serif"}} axisLine={false} tickLine={false} />
                        <YAxis hide={true} />
                        <Tooltip content={<CustomTooltip/>} />
                        <Line
                          type="monotone"
                          dataKey="valor"
                          name="TAGValor"
                          stroke="#0077c8"
                          strokeWidth={2.5}
                          dot={{r:5,fill:"#0077c8",strokeWidth:2,stroke:"#fff"}}
                          activeDot={{r:7}}
                          label={{position:"insideTop",fontSize:11,fill:"#003d7a",fontFamily:"'Montserrat',sans-serif",fontWeight:700,formatter: v => v > 0 ? v.toLocaleString() : ""}}
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
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,61,122,0.08)" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        scale="point"
                        padding={{left:50,right:50}}
                        tick={{fill:"#5a7a99",fontSize:11,fontFamily:"'Montserrat',sans-serif"}}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['dataMin - 20000','dataMax + 20000']}
                        tick={{fill:"#5a7a99",fontSize:10,fontFamily:"'Montserrat',sans-serif"}}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => v.toLocaleString()}
                      />
                      <Tooltip content={<CustomTooltip/>} />
                      <Legend wrapperStyle={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#003d7a"}} />
                      {aniosEnDatos.map((anio, i) => (
                        <Line
                          key={anio}
                          type="monotone"
                          dataKey={`${anio}`}
                          name={`${anio}`}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2.5}
                          dot={{r:4,strokeWidth:2,stroke:"#fff"}}
                          activeDot={{r:6}}
                        >
                          <LabelList
                            dataKey={`${anio}`}
                            position="top"
                            offset={8}
                            style={{
                              fontSize:"10px",
                              fill:"#003d7a",
                              fontWeight:"bold",
                              fontFamily:"'Montserrat',sans-serif",
                              textShadow:"0px 0px 3px white"
                            }}
                            formatter={(val) => (val ? Number(val).toLocaleString() : "")}
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
        {/* ── FIN ÁREA PRINCIPAL ───────────────────────────────────────────── */}

        <div className="footer">SEDAPAL — Catastro de Conexiones · Sistema de Gestión Comercial</div>
      </div>
    </>
  );
}