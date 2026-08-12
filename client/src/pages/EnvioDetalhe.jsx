import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero, data } from '../format';

export default function EnvioDetalhe() {
  const { id } = useParams();
  const [envio, setEnvio] = useState(null);
  useEffect(() => { api.get('/envios/' + id).then(setEnvio); }, [id]);
  if (!envio) return <p>Carregando...</p>;

  const temFinanceiro = envio.plataforma || envio.faturamentoBruto > 0;

  return (
    <div>
      <Link to="/historico-envios" className="text-marca-600 text-sm">← Voltar</Link>
      <div className="flex items-center gap-3 mb-1 mt-2">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Envio de {data(envio.dataEnvio)}</h1>
        {envio.plataforma && <span className="badge badge-normal">{envio.plataforma.nome}</span>}
      </div>
      {envio.observacao && <p className="text-grafite-800/60 mb-4">{envio.observacao}</p>}

      {temFinanceiro && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 mb-2">
          <Cartao titulo="Faturamento bruto" valor={moeda(envio.faturamentoBruto)} />
          <Cartao titulo="Taxas da plataforma" valor={moeda(envio.totalTaxas)} cor="text-amber-600" />
          <Cartao titulo="Custo dos produtos" valor={moeda(envio.custoTotalProdutos)} cor="text-grafite-800" />
          <Cartao titulo="Lucro líquido" valor={moeda(envio.lucro)} cor={envio.lucro >= 0 ? 'text-green-700' : 'text-red-600'} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <div className="card">
          <h2 className="font-display font-bold text-grafite-900 mb-3">Produtos enviados</h2>
          <table className="w-full">
            <thead><tr><th className="th">Produto</th><th className="th text-right">Qtd</th><th className="th text-right">Preço un</th><th className="th text-right">Subtotal</th></tr></thead>
            <tbody>{envio.itens.map((i) => (
              <tr key={i.id}>
                <td className="td">{i.produto.nome}</td>
                <td className="td text-right">{numero(i.quantidade)} un</td>
                <td className="td text-right">{moeda(i.precoVendaUnitario)}</td>
                <td className="td text-right">{moeda(i.precoVendaUnitario * i.quantidade)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="font-display font-bold text-grafite-900 mb-3">Materiais consumidos</h2>
          <table className="w-full">
            <thead><tr><th className="th">Material</th><th className="th">Qtd</th><th className="th">Restante</th></tr></thead>
            <tbody>{envio.movimentacoes.map((m) => (
              <tr key={m.id}>
                <td className="td">{m.material.nome}</td>
                <td className="td">{numero(m.quantidadeMovimentada)} {m.material.unidade.sigla}</td>
                <td className="td">{numero(m.quantidadeResultante)} {m.material.unidade.sigla}</td>
              </tr>
            ))}</tbody>
          </table>
          <div className="border-t mt-3 pt-3 flex justify-between">
            <span className="font-semibold">Custo dos materiais</span>
            <span className="font-bold text-marca-600">{moeda(envio.custoTotalMateriais)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cartao({ titulo, valor, cor }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-grafite-800/50 mb-1">{titulo}</div>
      <div className={'text-xl font-display font-bold ' + (cor || 'text-grafite-900')}>{valor}</div>
    </div>
  );
}
