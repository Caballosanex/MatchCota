// Importem la llibreria core de React
import React from 'react';
// Importem la llibreria per parlar amb el DOM (el document HTML pròpiament dit del navegador)
import ReactDOM from 'react-dom/client';
// Importem la nostra aplicació ("La capsa grossa que conté tota la resta")
import App from './App.jsx';
// Importem els estils globals, on TailwindCSS està configurat
import './index.css';

/**
 * PUNT D'ENTRADA DE L'APLICACIÓ (Entry Point)
 * ----------------------------------------------------------------------
 * Això és el primer que s'executa quan obres la web.
 * Aquí busquem l'element HTML buit `<div id="root"></div>` (que està al teu index.html principal)
 * i li injectem tota la nostra aplicació React (<App />) a dins.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode és una eina de desenvolupament que fa que React processi les coses
  // dues vegades en fons intel·ligent per avisar-te de possibles errors i males pràctiques.
  // NO afecta a la versió final (producció).
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
