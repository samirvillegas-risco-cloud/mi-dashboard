// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — Catastro de Conexiones / TAGValor por Mes
// Dashboard conectado a Supabase con gráfico de líneas y tabla de detalle
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── CONFIGURACIÓN SUPABASE ───────────────────────────────────────────────────
// URL y clave pública (anon key) del proyecto en Supabase
const SUPABASE_URL = "https://sjwnpbfqmyntpznpsnot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd25wYmZxbXludHB6bnBzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MDQsImV4cCI6MjA4ODA3NDYwNH0.KVVmZa9xreX3L8_F9Adt79VlLfuSE3Fa54_3vwGsKmQ";

// Orden correcto de meses tal como vienen de Supabase
// IMPORTANTE: Supabase devuelve "Set" (no "Sep") para Septiembre
const MESES_ORDER = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];

// Paleta de colores para las líneas del gráfico — un color por cada año
const COLORS = ["#00C9FF","#FF6B6B","#FFE66D","#4ECDC4","#A78BFA","#FFA07A","#00E676","#FF6E40","#F06292","#AED581","#FFD54F"];

// Headers que se envían en cada petición a Supabase para autenticación
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

// ─── FUNCIÓN PARA LLAMAR FUNCIONES SQL DE SUPABASE (RPC) ─────────────────────
// fn = nombre de la función SQL, params = parámetros que recibe la función
// Ejemplo: rpc("get_tagvalor_por_mes", { p_anio: 2022, p_zona: "Norte" })
async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params)
  });
  return res.json();
}

// ─── TOOLTIP PERSONALIZADO DEL GRÁFICO ───────────────────────────────────────
// Aparece cuando el usuario pasa el mouse sobre una línea del gráfico
// Muestra el mes y el valor de cada año en ese punto
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"rgba(2,20,50,0.97)",border:"1px solid rgba(0,201,255,0.3)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#e0f4ff"}}>
      {/* Nombre del mes */}
      <p style={{margin:"0 0 6px",opacity:0.6}}>{label}</p>
      {/* Valor de cada año con su color */}
      {payload.map((p,i)=>(
        <p key={i} style={{margin:"2px 0",color:p.color}}>
          {p.name}: <strong>{Number(p.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Modulo1() {

  // ── ESTADOS DE DATOS ────────────────────────────────────────────────────────
  const [grafico, setGrafico] = useState([]); // datos que alimentan el gráfico de líneas
  const [detalle, setDetalle] = useState([]); // datos que alimentan la tabla de detalle

  // Opciones disponibles en cada combo/filtro del sidebar
  const [opciones, setOpciones] = useState({
    anios:[],      // lista de años: [2015, 2016, ..., 2025]
    zonas:[],      // lista de zonas disponibles
    distritos:[],  // lista de distritos disponibles
    tipos:[],      // lista de tipos disponibles
    tarifas:[]     // lista de tarifas disponibles
  });

  // Estados de control de la interfaz
  const [loading, setLoading] = useState(true);  // true = muestra spinner de carga
  const [error, setError]     = useState(null);  // si hay error, guarda el mensaje

  // ── ESTADOS DE FILTROS ───────────────────────────────────────────────────────
  // filtros   = lo que el usuario está seleccionando en el sidebar (aún NO aplicado)
  // aplicados = lo que se envía a Supabase (se actualiza al presionar APLICAR FILTROS)
  // Separamos los dos para que la consulta no se dispare con cada clic
  const [filtros, setFiltros]     = useState({anio:[], zona:"", distrito:"", tipo:"", tarifa:""});
  const [aplicados, setAplicados] = useState({anio:[], zona:"", distrito:"", tipo:"", tarifa:""});

  // ── CARGAR OPCIONES DE FILTROS AL INICIAR LA PÁGINA ─────────────────────────
  // [] al final significa que solo se ejecuta UNA VEZ cuando carga la página
  useEffect(() => {
    // Trae los años disponibles → llena los checkboxes de año
    rpc("get_anios").then(rows => {
      if (Array.isArray(rows))
        setOpciones(prev => ({...prev, anios: rows.map(r=>r.anio)}));
    });

    // Trae zonas, distritos, tipos y tarifas → llena los combos del sidebar
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

  // ── CARGAR DATOS CUANDO EL USUARIO PRESIONA "APLICAR FILTROS" ───────────────
  // [aplicados] al final significa que se ejecuta cada vez que "aplicados" cambia
  useEffect(() => {
    setLoading(true); // muestra spinner
    setError(null);   // limpia error anterior

    // PARÁMETROS PARA EL GRÁFICO DE LÍNEAS
    // Si el usuario marcó exactamente 1 año en los checkboxes → filtra por ese año
    // Si marcó 0 o varios años → p_anio = null (null en Supabase = sin filtro = todos)
    const paramsGrafico = {
      p_anio:     aplicados.anio.length === 1 ? parseInt(aplicados.anio[0]) : null,
      p_zona:     aplicados.zona     || null, // si está vacío ("") → null = todos
      p_distrito: aplicados.distrito || null,
      p_tipo:     aplicados.tipo     || null,
      p_tarifa:   aplicados.tarifa   || null,
    };

    // PARÁMETROS PARA LA TABLA DE DETALLE
    // p_anio siempre es null → la tabla SIEMPRE muestra todos los años (2015-2025)
    // Los demás filtros sí aplican igual que el gráfico
    const paramsTabla = {
      p_anio:     null, // ← siempre todos los años, ignoramos los checkboxes
      p_zona:     aplicados.zona     || null,
      p_distrito: aplicados.distrito || null,
      p_tipo:     aplicados.tipo     || null,
      p_tarifa:   aplicados.tarifa   || null,
    };

    // Llamamos a Supabase en paralelo con Promise.all
    // Esto es más rápido que llamar una por una (las 2 se ejecutan al mismo tiempo)
    Promise.all([
      rpc("get_tagvalor_por_mes", paramsGrafico), // → datos para el gráfico
      rpc("get_detalle", paramsTabla)             // → datos para la tabla
    ]).then(([graf, det]) => {
      setGrafico(Array.isArray(graf) ? graf : []); // guarda datos del gráfico
      setDetalle(Array.isArray(det)  ? det  : []); // guarda datos de la tabla
      setLoading(false); // oculta el spinner
    }).catch(e => {
      setError(e.message); // si algo falla, guarda el mensaje de error
      setLoading(false);
    });

  }, [aplicados]); // ← se dispara cada vez que el usuario aplica filtros

  // ── PROCESAR DATOS PARA EL GRÁFICO ──────────────────────────────────────────

  // Obtiene los años únicos de los datos del gráfico
  // Filtra por los checkboxes marcados (si no hay ninguno marcado, muestra todos)
  const aniosEnDatos = [...new Set(grafico.map(r => r.anio))]
    .filter(a => aplicados.anio.length === 0 || aplicados.anio.includes(String(a)))
    .sort();

  // Construye el array de datos con el formato que necesita Recharts:
  // [{ mes:"Ene", 2022:4500000, 2023:4600000 }, { mes:"Feb", ... }, ...]
  const chartData = MESES_ORDER.map(mes => {
    const obj = { mes }; // empieza con el nombre del mes
    aniosEnDatos.forEach(anio => {
      // busca el valor de ese mes y año en los datos de Supabase
      const fila = grafico.find(r => r.mes === mes && r.anio === anio);
      obj[`${anio}`] = fila ? parseFloat(fila.tagvalor) : 0; // si no hay dato → 0
    });
    return obj;
  });

  // ── PROCESAR DATOS PARA LA TABLA ────────────────────────────────────────────

  // Obtiene las tarifas únicas para usarlas como columnas de la tabla
  // Ejemplo: ["COM", "DOM", "EST", "IND", "INDIV", "NO IND", "SOC"]
  const tarifasUnicas = [...new Set(detalle.map(r=>r.tarifa))].filter(Boolean).sort();

  // Agrupa los datos por año+equipo y pivotea las tarifas como columnas
  // Resultado: [{ anio:2015, equipo:"E.C. BREÑA", COM:797762, DOM:4429866, ... }]
  const tablaAgrupada = Object.values(
    detalle.reduce((acc, r) => {
      const key = `${r.anio}__${r.equipo}`; // clave única por año+equipo
      if (!acc[key]) acc[key] = { anio: r.anio, equipo: r.equipo };
      // suma los valores de cada tarifa (por si hay duplicados)
      acc[key][r.tarifa] = (acc[key][r.tarifa] || 0) + parseFloat(r.tagvalor || 0);
      return acc;
    }, {})
  ).sort((a,b) => a.anio - b.anio); // ordena por año ascendente

  // ── KPIs DEL SIDEBAR ────────────────────────────────────────────────────────
  // Resumen rápido que aparece al fondo del sidebar
  const totalTagValor  = detalle.reduce((acc,r) => acc + parseFloat(r.tagvalor||0), 0); // suma total
  const totalRegistros = tablaAgrupada.length;                                           // cantidad de filas
  const zonasUnicas    = new Set(detalle.map(r=>r.equipo)).size;                         // equipos únicos

  // Función auxiliar para actualizar un filtro individual en el sidebar
  // key = nombre del filtro ("zona", "distrito", etc), val = valor seleccionado
  const setFiltro = (key, val) => setFiltros(f => ({...f, [key]: val === "" ? "" : val}));

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── ESTILOS CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#1565c0;font-family:'Barlow',sans-serif;color:#fff;}
        .root{min-height:100vh;background:#1565c0;}

        /* BARRA SUPERIOR */
        .topbar{background:#0d47a1;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:54px;box-shadow:0 2px 20px rgba(0,0,0,0.3);}
        .topbar-logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;letter-spacing:2px;color:#fff;}
        .topbar-btn{background:transparent;border:2px solid rgba(255,255,255,0.8);color:#fff;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:2px;padding:6px 28px;border-radius:100px;cursor:pointer;}
        .back-link{background:rgba(255,255,255,0.15);border:none;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;padding:6px 16px;border-radius:100px;cursor:pointer;}
        .subtitle-bar{background:#0d47a1;padding:10px 28px;font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;letter-spacing:1px;color:#90caf9;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);}

        /* LAYOUT PRINCIPAL: sidebar izquierda + contenido derecha */
        .layout{display:flex;min-height:calc(100vh - 108px);}

        /* SIDEBAR: fondo blanco, bordes redondeados, separado del borde */
        .sidebar{width:190px;flex-shrink:0;background:#fafafa;padding:16px 14px;display:flex;flex-direction:column;gap:12px;border-radius:16px;margin:12px;}

        /* ETIQUETAS de los filtros (AÑO, ZONA, DISTRITO...) */
        .filter-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#0f172a;text-transform:uppercase;margin-bottom:3px;}

        /* COMBOS (select) del sidebar */
        .filter-select{width:100%;background:rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.15);border-radius:8px;color:#000000;padding:7px 10px;font-size:12px;font-family:'Barlow',sans-serif;outline:none;cursor:pointer;}
        .filter-select option{background:#ffffff;color:#000000;}

        /* BOTÓN APLICAR FILTROS */
        .apply-btn{background:#1976d2;border:none;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;padding:9px;border-radius:8px;cursor:pointer;text-transform:uppercase;}
        .apply-btn:hover{background:#1e88e5;}

        /* BOTÓN LIMPIAR FILTROS */
        .clear-btn{background:transparent;border:1px solid rgba(0,0,0,0.2);color:rgba(0,0,0,0.5);font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:1px;padding:7px;border-radius:8px;cursor:pointer;}

        /* TARJETAS KPI al fondo del sidebar */
        .kpi-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;}
        .kpi-card{background:rgba(25,118,210,0.1);border:1px solid rgba(25,118,210,0.2);border-radius:10px;padding:10px 12px;text-align:center;}
        .kpi-val{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#0d47a1;}
        .kpi-lbl{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}

        /* ÁREA PRINCIPAL (derecha del sidebar) */
        .main{flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow:hidden;}
        .page-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:1px;}
        .page-title span{color:#90caf9;}

        /* GRID DE 2 COLUMNAS: gráfico izquierda, tabla derecha */
        .content-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;}
        @media(max-width:900px){.content-row{grid-template-columns:1fr;}} /* en móvil: 1 columna */

        /* CARDS: contenedor del gráfico y de la tabla — fondo blanco, bordes redondeados */
        .chart-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:20px;}
        .chart-title{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;color:#0d47a1;margin-bottom:14px;text-align:center;}

        /* TABLA DE DETALLE */
        .table-wrap{overflow:auto;max-height:420px;border-radius:10px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        thead tr{background:#e3f2fd;position:sticky;top:0;z-index:1;} /* encabezado fijo al hacer scroll */
        thead th{text-align:left;padding:10px 12px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#000000;white-space:nowrap;border-bottom:1px solid rgba(0,0,0,0.1);}
        tbody tr{border-bottom:1px solid rgba(0,0,0,0.05);transition:background 0.15s;}
        tbody tr:hover{background:rgba(25,118,210,0.05);} /* fila se ilumina al pasar el mouse */
        tbody td{padding:9px 12px;white-space:nowrap;color:#000000;} /* texto negro */
        .tag-val{font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#1565c0;} /* valores numéricos en azul */

        /* ESTADOS: cargando, error, sin datos */
        .state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;opacity:0.6;}
        .state-icon{font-size:40px;}
        .state-txt{font-size:14px;color:#000;}

        /* PIE DE PÁGINA */
        .footer{background:#0d47a1;padding:10px 28px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#90caf9;text-align:center;}
      `}</style>

      <div className="root">

        {/* ── BARRA SUPERIOR ── */}
        <div className="topbar">
          <div className="topbar-logo">SEDAPAL</div>
          <button className="topbar-btn">PRINCIPAL</button>
          {/* Botón volver: redirige al menú principal */}
          <button className="back-link" onClick={()=>window.location.href="/"}>← Volver al Menú</button>
        </div>

        {/* Subtítulo debajo de la barra superior */}
        <div className="subtitle-bar">Catastro de Conexiones — TAGValor por Mes</div>

        <div className="layout">

          {/* ── SIDEBAR DE FILTROS ── */}
          <aside className="sidebar">

            {/* FILTRO AÑO: checkboxes para comparar múltiples años a la vez */}
            <div>
              <div className="filter-label">Año</div>
              <div style={{display:"flex", flexDirection:"column", gap:4, maxHeight:160, overflowY:"auto"}}>
                {opciones.anios.map(a => (
                  <label key={a} style={{display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer", color:"#000000"}}>
                    <input
                      type="checkbox"
                      value={a}
                      checked={filtros.anio.includes(String(a))} // marcado si está en el array
                      onChange={e => {
                        const val = String(a);
                        setFiltros(f => ({
                          ...f,
                          // si se marca → agrega al array; si se desmarca → quita del array
                          anio: e.target.checked
                            ? [...f.anio, val]
                            : f.anio.filter(x => x !== val)
                        }));
                      }}
                      style={{accentColor:"#1976d2"}} // color del checkbox
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* FILTRO ZONA */}
            <div>
              <div className="filter-label">Zona</div>
              <select className="filter-select" value={filtros.zona} onChange={e=>setFiltro("zona",e.target.value)}>
                <option value="">Todas</option>
                {opciones.zonas.map(z=><option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            {/* FILTRO DISTRITO */}
            <div>
              <div className="filter-label">Distrito</div>
              <select className="filter-select" value={filtros.distrito} onChange={e=>setFiltro("distrito",e.target.value)}>
                <option value="">Todos</option>
                {opciones.distritos.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* FILTRO TIPO */}
            <div>
              <div className="filter-label">Tipo</div>
              <select className="filter-select" value={filtros.tipo} onChange={e=>setFiltro("tipo",e.target.value)}>
                <option value="">Todos</option>
                {opciones.tipos.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* FILTRO TARIFA */}
            <div>
              <div className="filter-label">Tarifa</div>
              <select className="filter-select" value={filtros.tarifa} onChange={e=>setFiltro("tarifa",e.target.value)}>
                <option value="">Todas</option>
                {opciones.tarifas.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* BOTÓN APLICAR: copia filtros → aplicados, esto dispara el useEffect de carga */}
            <button className="apply-btn" onClick={()=> setAplicados({...filtros})}>
              APLICAR FILTROS
            </button>

            {/* BOTÓN LIMPIAR: resetea todos los filtros a valores vacíos */}
            <button className="clear-btn" onClick={()=>{
              setFiltros({anio:[], zona:"", distrito:"", tipo:"", tarifa:""});
              setAplicados({anio:[], zona:"", distrito:"", tipo:"", tarifa:""});
            }}>
              Limpiar filtros
            </button>

            {/* KPIs: resumen numérico rápido */}
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

          {/* ── ÁREA PRINCIPAL ── */}
          <main className="main">

            {/* Título de la página con los años seleccionados */}
            <div className="page-title">
              Conexiones — <span>TAGValor por Mes</span>
              {/* Muestra los años seleccionados si hay alguno marcado */}
              {aplicados.anio.length > 0 &&
                <span style={{fontSize:14, marginLeft:12, opacity:0.7}}>
                  Año {aplicados.anio.join(", ")}
                </span>
              }
            </div>

            {/* ESTADOS: muestra spinner, error o el contenido según corresponda */}
            {loading ? (
              // Estado cargando
              <div className="state-box">
                <div className="state-icon">⏳</div>
                <div className="state-txt">Cargando datos...</div>
              </div>
            ) : error ? (
              // Estado error
              <div className="state-box">
                <div className="state-icon">❌</div>
                <div className="state-txt">{error}</div>
              </div>
            ) : (
              // Contenido normal: gráfico + tabla en 2 columnas
              <div className="content-row">

                {/* ── GRÁFICO DE LÍNEAS ── */}
                {/* Filtra por años seleccionados en los checkboxes */}
                <div className="chart-card">
                  <div className="chart-title">
                    TAGValor por Mes {aplicados.anio.length > 0 ? `— ${aplicados.anio.join(", ")}` : "— Todos los años"}
                  </div>
                  {chartData.length === 0 ? (
                    // Sin datos
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={chartData}>
                        {/* Líneas de cuadrícula del fondo */}
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                        {/* Eje X: meses — texto negro */}
                        <XAxis dataKey="mes" tick={{fill:"#000000", fontSize:11}} axisLine={false} tickLine={false} />
                        {/* Eje Y: valores — texto negro, formateado con separadores de miles */}
                        <YAxis tick={{fill:"#000000", fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                        {/* Tooltip al pasar el mouse */}
                        <Tooltip content={<CustomTooltip/>} />
                        {/* Leyenda de colores debajo del gráfico */}
                        <Legend wrapperStyle={{fontSize:11, color:"#000000"}} />
                        {/* Una línea por cada año, con color distinto de la paleta COLORS */}
                        {aniosEnDatos.map((anio, i) => (
                          <Line
                            key={anio}
                            type="monotone"          // línea suavizada
                            dataKey={`${anio}`}      // qué columna del chartData usar
                            name={`${anio}`}         // nombre que aparece en la leyenda
                            stroke={COLORS[i % COLORS.length]} // color de la línea
                            strokeWidth={2}          // grosor de la línea
                            dot={{ r: 3 }}           // punto en cada mes
                            activeDot={{ r: 5 }}     // punto más grande al hacer hover
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* ── TABLA DE DETALLE ── */}
                {/* Siempre muestra TODOS los años (ignora los checkboxes de año) */}
                {/* Solo filtra por zona, distrito, tipo y tarifa */}
                <div className="chart-card">
                  <div className="chart-title">Detalle — Año / Equipo / Tarifa</div>
                  {tablaAgrupada.length === 0 ? (
                    // Sin datos
                    <div className="state-box"><div className="state-icon">📭</div><div className="state-txt">Sin datos</div></div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Año</th>
                            <th>Equipo</th>
                            {/* Columnas dinámicas: una por cada tarifa */}
                            {tarifasUnicas.map(t=><th key={t}>{t}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {tablaAgrupada.map((row,i)=>(
                            <tr key={i}>
                              <td style={{opacity:0.7}}>{row.anio}</td>
                              <td style={{fontSize:11}}>{row.equipo}</td>
                              {/* Valor de cada tarifa para esta fila */}
                              {tarifasUnicas.map(t=>(
                                <td key={t}>
                                  {row[t]
                                    ? <span className="tag-val">{Number(row[t]).toLocaleString()}</span>
                                    : <span style={{opacity:0.3}}>—</span> // sin datos → guión
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </main>
        </div>

        {/* ── PIE DE PÁGINA ── */}
        <div className="footer">SEDAPAL — Catastro de Conexiones</div>

      </div>
    </>
  );
}