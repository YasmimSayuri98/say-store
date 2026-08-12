import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { dataHora } from '../format';
import { useToast } from '../components/Toast';

const vazio = { tipo: '', appId: '', appSecret: '', lojaId: '', accessToken: '', refreshToken: '', ativo: false };

const ROTULOS = {
  SHOPEE: { appId: 'Partner ID', appSecret: 'Partner Key', lojaId: 'Shop ID' },
  TIKTOK: { appId: 'App Key', appSecret: 'App Secret', lojaId: 'Shop Cipher' },
};

export default function IntegracaoPlataforma() {
  const { id } = useParams();
  const [plataforma, setPlataforma] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState(vazio);
  const [sincronizando, setSincronizando] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [linkGerado, setLinkGerado] = useState('');
  const [urlRetorno, setUrlRetorno] = useState('');
  const [conectando, setConectando] = useState(false);
  const toast = useToast();

  async function carregar() {
    const [plats, c] = await Promise.all([api.get('/plataformas'), api.get(`/plataformas/${id}/integracao`)]);
    setPlataforma(plats.find((p) => String(p.id) === String(id)) || null);
    setCfg(c);
    setForm((f) => ({
      ...f,
      tipo: c.tipo || '',
      appId: c.appId || '',
      lojaId: c.lojaId || '',
      ativo: !!c.ativo,
    }));
  }
  useEffect(() => { carregar(); }, [id]);

  async function salvar() {
    if (!form.tipo) return toast.erro('Selecione o tipo de integração.');
    try {
      await api.put(`/plataformas/${id}/integracao`, {
        tipo: form.tipo,
        appId: form.appId,
        lojaId: form.lojaId,
        ativo: form.ativo,
        appSecret: form.appSecret,
        accessToken: form.accessToken,
        refreshToken: form.refreshToken,
      });
      toast.sucesso('Configuração salva.');
      setForm((f) => ({ ...f, appSecret: '', accessToken: '', refreshToken: '' }));
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function gerarLink() {
    if (!redirectUri.trim()) return toast.erro('Informe a URL de redirecionamento (a mesma cadastrada no app da plataforma).');
    try {
      const r = await api.get(`/plataformas/${id}/integracao/link-autorizacao?redirect=${encodeURIComponent(redirectUri.trim())}`);
      setLinkGerado(r.url);
      window.open(r.url, '_blank');
    } catch (e) { toast.erro(e.message); }
  }

  async function conectar() {
    if (!urlRetorno.trim()) return toast.erro('Cole a URL completa para onde você foi redirecionado depois de aprovar.');
    let code, shopId;
    try {
      const url = new URL(urlRetorno.trim());
      code = url.searchParams.get('code');
      shopId = url.searchParams.get('shop_id');
    } catch {
      return toast.erro('Essa URL não parece válida. Cole o endereço completo da barra do navegador.');
    }
    if (!code) return toast.erro('Não encontrei o parâmetro "code" nessa URL.');
    setConectando(true);
    try {
      await api.post(`/plataformas/${id}/integracao/trocar-codigo`, { code, shopId });
      toast.sucesso('Loja conectada com sucesso!');
      setUrlRetorno(''); setLinkGerado(''); setRedirectUri('');
      carregar();
    } catch (e) { toast.erro(e.message); }
    setConectando(false);
  }

  async function sincronizar() {
    setSincronizando(true);
    try {
      const r = await api.post(`/plataformas/${id}/integracao/sync`, {});
      const semCorrespondencia = r.semCorrespondencia && r.semCorrespondencia.length
        ? ` SKUs sem produto cadastrado: ${r.semCorrespondencia.join(', ')}.`
        : '';
      toast.sucesso(`Sincronizado: ${r.pedidosNovos} pedido(s) novo(s), ${r.itensNovos} item(ns) novo(s).${semCorrespondencia}`);
      carregar();
    } catch (e) { toast.erro(e.message); }
    setSincronizando(false);
  }

  if (!cfg || !plataforma) return <p className="text-grafite-800/60">Carregando...</p>;

  const rotulos = ROTULOS[form.tipo] || { appId: 'App ID', appSecret: 'App Secret', lojaId: 'ID da loja' };

  return (
    <div>
      <Link to="/plataformas" className="text-marca-600 text-sm">← Voltar</Link>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1 mt-2">Integração de pedidos — {plataforma.nome}</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-2xl">
        Conecta a API da plataforma para trazer os pedidos automaticamente para a lista de produção do
        Dashboard. O vínculo entre o item do pedido e o produto cadastrado é feito pelo SKU. Por
        segurança, os campos de credencial abaixo aparecem em branco — deixe-os vazios para manter o
        valor já salvo.
      </p>

      <div className="card max-w-xl space-y-3">
        <div>
          <label className="label">Tipo de integração *</label>
          <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="">Nenhuma</option>
            <option value="SHOPEE">Shopee</option>
            <option value="TIKTOK">TikTok Shop</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{rotulos.appId}</label>
            <input className="input" value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} />
          </div>
          <div>
            <label className="label">{rotulos.lojaId}</label>
            <input className="input" value={form.lojaId} onChange={(e) => setForm({ ...form, lojaId: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">
            {rotulos.appSecret} {cfg.appSecretMascarado && <span className="text-grafite-800/40 font-normal">(atual: {cfg.appSecretMascarado})</span>}
          </label>
          <input type="password" className="input" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value })} placeholder="Deixe em branco para manter" />
        </div>
        <label className="flex items-center gap-2 text-sm text-grafite-800/70">
          <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          Sincronização automática ativa (a cada 5 minutos)
        </label>

        <div className="flex justify-end pt-1">
          <button className="btn btn-primary" onClick={salvar}>Salvar</button>
        </div>
      </div>

      {form.tipo && (
        <div className="card max-w-xl space-y-3 mt-5">
          <h2 className="font-display font-bold text-grafite-900">Conectar loja</h2>
          <p className="text-xs text-grafite-800/50">
            Gera o link de autorização da plataforma. Aprove o acesso logado como dono da loja e você
            será redirecionado (a página pode não carregar — tudo bem, o que importa é o endereço).
            Copie a URL completa da barra de endereço e cole abaixo pra concluir a conexão automaticamente.
          </p>
          <div>
            <label className="label">URL de redirecionamento (a mesma cadastrada no app)</label>
            <input className="input" value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} placeholder="Ex.: https://saystore.com.br" />
          </div>
          <button className="btn btn-secondary" onClick={gerarLink}>Gerar link de autorização</button>
          {linkGerado && (
            <p className="text-xs text-grafite-800/60 break-all">
              Se a janela não abriu sozinha: <a className="text-marca-600 underline" href={linkGerado} target="_blank" rel="noreferrer">{linkGerado}</a>
            </p>
          )}
          <div className="pt-2 border-t border-grafite-900/5">
            <label className="label">URL de retorno (colada depois de aprovar)</label>
            <input className="input" value={urlRetorno} onChange={(e) => setUrlRetorno(e.target.value)} placeholder="Cole aqui a URL completa" />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={conectar} disabled={conectando}>
              {conectando ? 'Conectando...' : 'Conectar'}
            </button>
          </div>
        </div>
      )}

      <div className="card max-w-xl space-y-3 mt-5">
        <h2 className="font-display font-bold text-grafite-900 text-sm">Avançado: colar tokens manualmente</h2>
        <div>
          <label className="label">
            Access Token {cfg.accessTokenMascarado && <span className="text-grafite-800/40 font-normal">(atual: {cfg.accessTokenMascarado})</span>}
          </label>
          <input type="password" className="input" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder="Deixe em branco para manter" />
        </div>
        <div>
          <label className="label">
            Refresh Token {cfg.refreshTokenMascarado && <span className="text-grafite-800/40 font-normal">(atual: {cfg.refreshTokenMascarado})</span>}
          </label>
          <input type="password" className="input" value={form.refreshToken} onChange={(e) => setForm({ ...form, refreshToken: e.target.value })} placeholder="Deixe em branco para manter" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-grafite-900/5 gap-3">
          <span className="text-xs text-grafite-800/50">Última sincronização: {dataHora(cfg.ultimaSincronizacao)}</span>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={sincronizar} disabled={!cfg.configurado || sincronizando}>
              {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
            <button className="btn btn-primary" onClick={salvar}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
