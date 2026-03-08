import { FaUsers, FaFileInvoiceDollar, FaMapMarkerAlt, FaCalculator, FaSearch, FaFileAlt, FaTruck, FaExclamationTriangle, FaHandshake, FaCalendarAlt, FaWater, FaChartBar } from "react-icons/fa";
import { IoBookSharp } from "react-icons/io5";
import { TbReportSearch } from "react-icons/tb";
import { HiOutlineDocumentCurrencyDollar } from "react-icons/hi2";
import { MdCalculate } from "react-icons/md";
import { SiQuicklook } from "react-icons/si";
import { TbReport } from "react-icons/tb";
import { FaCommentsDollar } from "react-icons/fa6";
import { BsTransparency } from "react-icons/bs";
import { CgCircleci } from "react-icons/cg";



/*SEGMENTADORES EN CUADROS*/
const menuItems = [
  { id: 1,  icon: <FaFileAlt/>,                  label: "01 CATASTRO DE CONEXIONES Y UNIDADES DE USO - (CON CONEXION) - TARIFAS", ruta: "Modulo1"},
  { id: 2,  icon: <IoBookSharp/>,                label: "02 CATASTRO DE CONEXIONES Y UNIDADES DE USO - (CON CONEXIÓN) POR ESTADOS" },
  { id: 3,  icon: <TbReportSearch/>,           label: "03 CONEXIONES CON MEDIDOR CATASTRO DE CONEXIONES POR ESTADOS" },
  { id: 4,  icon: <HiOutlineDocumentCurrencyDollar/>,      label: "04 FACTURACIÓN POR SOLO AGUA - POR TIPOS DE TARIFA" },
  { id: 5,  icon: <MdCalculate/>,                 label: "05 FACTURACION POR SOLO AGUA - POR MODALIDAD" },
  { id: 6,  icon: <FaUsers/>,                label: "06 FACTURACION TOTAL IMPORTES - POR TIPOS DE TARIFA" },
  { id: 7,  icon: <SiQuicklook/>,                  label: "07 COBRANZA TOTAL IMPORTES - POR TIPOS TARIFA" },
  { id: 8,  icon: <TbReport/>,    label: "08 DEUDAS POR COBRAR IMPORTES - CONEXIONES POR TIPOS DE TARIFA" },
  { id: 9,  icon: <FaCommentsDollar/>,            label: "09 DEUDAS POR COBRAR - CONEXIONES POR ANTIGÜEDAD DE MESES DEUDORES" },
  { id: 10, icon: <FaHandshake/>,              label: "10 ACUERDOS A PLAZOS - CUOTAS DE CREDITOS POR EMITIR - POR TARIFAS"},
  { id: 11, icon: <BsTransparency/>,                  label: "11 CATASTRO DE CONEXIONES DE ALCANTARILLADO - POR TARIFAS" },
  { id: 12, icon: <CgCircleci/>,               label: "12 FACTURACIÓN POR SOLO ALCANTARILLADO POR TIPOS DE TARIFA" },
];

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Barlow',sans-serif; }

        .home {
          min-height: 100vh;
          background: #1565c0;
          display: flex;
          flex-direction: column;
        }

        /* HEADER */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 50px;
          background: #1565c0;
        }
        .header-logo {
          width: 42px; height: 42px;
          background: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; cursor: pointer;
        }
        .header-nav {
          display: flex; gap: 40px;
        }
        .header-nav a {
          color: white;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700; font-size: 16px;
          letter-spacing: 2px; text-decoration: none;
          opacity: 0.9;
          transition: opacity 0.2s;
        }
        .header-nav a:hover { opacity: 1; text-decoration: underline; }

        /* CONTENT */
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 16px;
        }

        /* GRID */
        .grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          max-width: 1400px;
          width: 100%;
        }
        @media(max-width:900px){ .grid{ grid-template-columns: repeat(3,1fr); } }
        @media(max-width:500px){ .grid{ grid-template-columns: repeat(2,1fr); } }

        .card {
          background: #1976d2;
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 12px;
          padding: 28px 12px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          min-height: 140px;
        }
        .card:hover {
          background: #1e88e5;
          border-color: white;
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        .card-icon {
          font-size: 36px;
          color: #ffffff;
          
        }
        .card-label {
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: white;
          line-height: 1.3;
        }

        /* FOOTER BTN */
        .footer {
          display: flex;
          justify-content: center;
          padding: 24px;
        }
        .footer-btn {
          background: transparent;
          border: 2px solid white;
          color: white;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700; font-size: 15px;
          letter-spacing: 2px;
          padding: 10px 40px;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .footer-btn:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      <div className="home">
        {/* HEADER */}
        <header className="header">
          <div className="header-logo">◀</div>

          <nav className="header-nav">
            <a href="#">INFORMACIÓN</a>
            <a href="#">VISIÓN COMPARTIDA</a>
          </nav>
        </header>

        {/* GRID */}
        <div className="content">
          <div className="grid">
            {menuItems.map(item => (
              <div key={item.id} className="card" onClick={() => window.location.href = item.ruta || "#"}>
                <div  className="card-icon">{item.icon}</div>
                <div className="card-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer">
          <button className="footer-btn">VISIÓN COMPARTIDA</button>
        </div>
      </div>
    </>
  );
}