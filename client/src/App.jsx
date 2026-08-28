import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AlertaPopup from './components/AlertaPopup';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import { estaLogado } from './auth';
import Dashboard from './pages/Dashboard';
import Materiais from './pages/Materiais';
import Entradas from './pages/Entradas';
import Fornecedores from './pages/Fornecedores';
import Embalagens from './pages/Embalagens';
import RelatoriosEnvio from './pages/RelatoriosEnvio';
import Produtos from './pages/Produtos';
import ProdutoDetalhe from './pages/ProdutoDetalhe';
import HistoricoEnvios from './pages/HistoricoEnvios';
import Devolucoes from './pages/Devolucoes';
import EnvioDetalhe from './pages/EnvioDetalhe';
import Movimentacoes from './pages/Movimentacoes';
import Ajustes from './pages/Ajustes';
import ListaCompras from './pages/ListaCompras';
import ValorEstoque from './pages/ValorEstoque';
import Plataformas from './pages/Plataformas';
import Precificacao from './pages/Precificacao';
import PrecoSugerido from './pages/PrecoSugerido';
import Faturamento from './pages/Faturamento';
import Financeiro from './pages/Financeiro';
import ContasFinanceiras from './pages/ContasFinanceiras';
import Saques from './pages/Saques';
import ContasPagar from './pages/ContasPagar';
import IntegracaoPlataforma from './pages/IntegracaoPlataforma';

export default function App() {
  const [logado, setLogado] = useState(estaLogado());

  if (!logado) {
    return (
      <ToastProvider>
        <Login onEntrar={() => setLogado(true)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <AlertaPopup />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="materiais" element={<Materiais />} />
            <Route path="entradas" element={<Entradas />} />
            <Route path="fornecedores" element={<Fornecedores />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="produtos/:id" element={<ProdutoDetalhe />} />
            <Route path="envios/:id" element={<EnvioDetalhe />} />
            <Route path="historico-envios" element={<HistoricoEnvios />} />
            <Route path="devolucoes" element={<Devolucoes />} />
            <Route path="embalagens" element={<Embalagens />} />
            <Route path="relatorios-envio" element={<RelatoriosEnvio />} />
            <Route path="movimentacoes" element={<Movimentacoes />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="lista-compras" element={<ListaCompras />} />
            <Route path="valor-estoque" element={<ValorEstoque />} />
            <Route path="plataformas" element={<Plataformas />} />
            <Route path="preco-sugerido" element={<PrecoSugerido />} />
            <Route path="precificacao" element={<Precificacao />} />
            <Route path="faturamento" element={<Faturamento />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="contas-financeiras" element={<ContasFinanceiras />} />
            <Route path="saques" element={<Saques />} />
            <Route path="contas-pagar" element={<ContasPagar />} />
            <Route path="plataformas/:id/integracao" element={<IntegracaoPlataforma />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
