const menuItems = [
  { id: 1,  icon: "👤", label: "Consulta de clientes", ruta: "Modulo1"},
  { id: 2,  icon: "🧾", label: "Consulta de comprobantes" },
  { id: 3,  icon: "📍", label: "Puntos de abastecimiento" },
  { id: 4,  icon: "💰", label: "Financiamiento Web" },
  { id: 5,  icon: "🔍", label: "Consulta de clientes" },
  { id: 6,  icon: "📄", label: "Consulta de comprobantes" },
  { id: 7,  icon: "🚛", label: "Zona de distribución gratuita de agua" },
  { id: 8,  icon: "📢", label: "Reclamo comercial virtual" },
  { id: 9,  icon: "📚", label: "Acceso a la información publica" },
  { id: 10, icon: "🗂️", label: "Mesa de partes virtual "},
  { id: 11, icon: "🚰", label: "Zona de distribucuón de agua gratuita" },
  { id: 12, icon: "📊", label: "Reclamo comercial virtual" },
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
          padding: 14px 32px;
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
          padding: 40px 32px;
        }

        /* GRID */
        .grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          max-width: 1100px;
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
          filter: brightness(10);
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
                <div className="card-icon">{item.icon}</div>
                <div className="card-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer">
          <button className="footer-btn">VER MÁS</button>
        </div>
      </div>
    </>
  );
}