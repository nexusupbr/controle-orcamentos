'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Save, 
  Building2, 
  FileText, 
  Shield, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { getConfig, verificarConfiguracao, setAmbiente } from '@/lib/focusnfe'

interface ConfigFiscal {
  id?: number
  cnpj: string
  inscricao_estadual: string
  inscricao_municipal: string
  razao_social: string
  nome_fantasia: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  codigo_municipio: string
  municipio: string
  uf: string
  cep: string
  telefone: string
  regime_tributario: number
  focusnfe_token: string
  focusnfe_ambiente: 'homologacao' | 'producao'
  csc_nfce: string
  id_token_nfce: string
  serie_nfe: number
  serie_nfce: number
  serie_nfse: number
  natureza_operacao_padrao: string
  cfop_padrao: string
  informacoes_complementares: string
  ativo: boolean
}

const configInicial: ConfigFiscal = {
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  razao_social: '',
  nome_fantasia: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  codigo_municipio: '',
  municipio: '',
  uf: '',
  cep: '',
  telefone: '',
  regime_tributario: 1,
  focusnfe_token: '2ULj65rWvkjqHXwopIPyDZx7jxvZqCsk',
  focusnfe_ambiente: 'homologacao',
  csc_nfce: '',
  id_token_nfce: '',
  serie_nfe: 1,
  serie_nfce: 1,
  serie_nfse: 1,
  natureza_operacao_padrao: 'Venda',
  cfop_padrao: '5102',
  informacoes_complementares: '',
  ativo: true
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
]

export default function ConfiguracaoFiscalPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigFiscal>(configInicial)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'emitente' | 'fiscal' | 'api'>('emitente')
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; mensagem: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    carregarConfig()
  }, [])

  const carregarConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config_fiscal')
        .select('*')
        .eq('ativo', true)
        .single()

      if (data) {
        setConfig(data)
      }
    } catch (err) {
      // Configuração não existe ainda, usar valores iniciais
      console.log('Configuração fiscal não encontrada, usando valores iniciais')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5')
  }

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/^(\d{5})(\d{3}).*/, '$1-$2')
  }

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3')
    }
    return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Validações básicas
      if (!config.cnpj || !config.razao_social) {
        throw new Error('CNPJ e Razão Social são obrigatórios')
      }

      const dataToSave = {
        ...config,
        cnpj: config.cnpj.replace(/\D/g, ''),
        cep: config.cep.replace(/\D/g, ''),
        telefone: config.telefone.replace(/\D/g, ''),
        updated_at: new Date().toISOString()
      }

      if (config.id) {
        // Atualizar
        const { error } = await supabase
          .from('config_fiscal')
          .update(dataToSave)
          .eq('id', config.id)

        if (error) throw error
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('config_fiscal')
          .insert([dataToSave])
          .select()
          .single()

        if (error) throw error
        setConfig(data)
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  const testarConexao = () => {
    const result = verificarConfiguracao()
    setTestResult(result)
    
    if (result.ok) {
      setAmbiente(config.focusnfe_ambiente)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-400" />
              Configuração Fiscal
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Configure os dados do emitente e integração com Focus NFe
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Configurações
          </button>
        </div>

        {/* Mensagem */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('emitente')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 transition-colors ${
              activeTab === 'emitente'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Dados do Emitente
          </button>
          <button
            onClick={() => setActiveTab('fiscal')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 transition-colors ${
              activeTab === 'fiscal'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            Configurações Fiscais
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 transition-colors ${
              activeTab === 'api'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            API Focus NFe
          </button>
        </div>

        {/* Tab Content */}
        <div className="glass-card p-6 rounded-xl">
          {/* Dados do Emitente */}
          {activeTab === 'emitente' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white mb-4">Dados da Empresa Emitente</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    value={formatCNPJ(config.cnpj)}
                    onChange={(e) => setConfig(prev => ({ ...prev, cnpj: e.target.value }))}
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Inscrição Estadual</label>
                  <input
                    type="text"
                    name="inscricao_estadual"
                    value={config.inscricao_estadual}
                    onChange={handleChange}
                    placeholder="Inscrição Estadual"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Inscrição Municipal</label>
                  <input
                    type="text"
                    name="inscricao_municipal"
                    value={config.inscricao_municipal}
                    onChange={handleChange}
                    placeholder="Inscrição Municipal"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Razão Social *</label>
                  <input
                    type="text"
                    name="razao_social"
                    value={config.razao_social}
                    onChange={handleChange}
                    placeholder="Razão Social da Empresa"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    name="nome_fantasia"
                    value={config.nome_fantasia}
                    onChange={handleChange}
                    placeholder="Nome Fantasia"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <hr className="border-white/10" />

              <h3 className="text-md font-semibold text-white">Endereço</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CEP *</label>
                  <input
                    type="text"
                    name="cep"
                    value={formatCEP(config.cep)}
                    onChange={(e) => setConfig(prev => ({ ...prev, cep: e.target.value }))}
                    maxLength={9}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Logradouro *</label>
                  <input
                    type="text"
                    name="logradouro"
                    value={config.logradouro}
                    onChange={handleChange}
                    placeholder="Rua, Avenida, etc."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Número *</label>
                  <input
                    type="text"
                    name="numero"
                    value={config.numero}
                    onChange={handleChange}
                    placeholder="Nº"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Complemento</label>
                  <input
                    type="text"
                    name="complemento"
                    value={config.complemento}
                    onChange={handleChange}
                    placeholder="Sala, Andar, etc."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bairro *</label>
                  <input
                    type="text"
                    name="bairro"
                    value={config.bairro}
                    onChange={handleChange}
                    placeholder="Bairro"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Município *</label>
                  <input
                    type="text"
                    name="municipio"
                    value={config.municipio}
                    onChange={handleChange}
                    placeholder="Cidade"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Código IBGE *</label>
                  <input
                    type="text"
                    name="codigo_municipio"
                    value={config.codigo_municipio}
                    onChange={handleChange}
                    placeholder="0000000"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">UF *</label>
                  <select
                    name="uf"
                    value={config.uf}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    {UFS.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    name="telefone"
                    value={formatTelefone(config.telefone)}
                    onChange={(e) => setConfig(prev => ({ ...prev, telefone: e.target.value }))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Configurações Fiscais */}
          {activeTab === 'fiscal' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white mb-4">Configurações Fiscais</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Regime Tributário *</label>
                  <select
                    name="regime_tributario"
                    value={config.regime_tributario}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - Simples Nacional</option>
                    <option value={2}>2 - Simples Nacional (Excesso)</option>
                    <option value={3}>3 - Regime Normal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Natureza da Operação Padrão</label>
                  <input
                    type="text"
                    name="natureza_operacao_padrao"
                    value={config.natureza_operacao_padrao}
                    onChange={handleChange}
                    placeholder="Venda"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CFOP Padrão</label>
                  <input
                    type="text"
                    name="cfop_padrao"
                    value={config.cfop_padrao}
                    onChange={handleChange}
                    placeholder="5102"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <hr className="border-white/10" />

              <h3 className="text-md font-semibold text-white">Séries das Notas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Série NFe</label>
                  <input
                    type="number"
                    name="serie_nfe"
                    value={config.serie_nfe}
                    onChange={handleChange}
                    min={1}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Série NFCe</label>
                  <input
                    type="number"
                    name="serie_nfce"
                    value={config.serie_nfce}
                    onChange={handleChange}
                    min={1}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Série NFSe</label>
                  <input
                    type="number"
                    name="serie_nfse"
                    value={config.serie_nfse}
                    onChange={handleChange}
                    min={1}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <hr className="border-white/10" />

              <h3 className="text-md font-semibold text-white">NFCe (Nota ao Consumidor)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CSC (Código de Segurança do Contribuinte)</label>
                  <input
                    type="text"
                    name="csc_nfce"
                    value={config.csc_nfce}
                    onChange={handleChange}
                    placeholder="Obtido na SEFAZ do seu estado"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ID Token NFCe</label>
                  <input
                    type="text"
                    name="id_token_nfce"
                    value={config.id_token_nfce}
                    onChange={handleChange}
                    placeholder="ID do token"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <hr className="border-white/10" />

              <h3 className="text-md font-semibold text-white">Informações Complementares</h3>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Informações adicionais padrão nas notas</label>
                <textarea
                  name="informacoes_complementares"
                  value={config.informacoes_complementares}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Informações que aparecerão em todas as notas emitidas..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* API Focus NFe */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Integração Focus NFe</h2>
                <a
                  href="https://app.focusnfe.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                >
                  Painel Focus NFe <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Importante:</strong> Para emitir notas fiscais reais, você precisa cadastrar sua empresa 
                  no painel da Focus NFe e enviar o certificado digital A1. O token abaixo é usado para autenticação 
                  com a API.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token de Autenticação *</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      name="focusnfe_token"
                      value={config.focusnfe_token}
                      onChange={handleChange}
                      placeholder="Token obtido no painel Focus NFe"
                      className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ambiente *</label>
                  <select
                    name="focusnfe_ambiente"
                    value={config.focusnfe_ambiente}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="homologacao">Homologação (Testes)</option>
                    <option value="producao">Produção (Notas Reais)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={testarConexao}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Testar Conexão
                </button>
                
                {testResult && (
                  <div className={`flex items-center gap-2 ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.ok ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    {testResult.mensagem}
                  </div>
                )}
              </div>

              <hr className="border-white/10" />

              <h3 className="text-md font-semibold text-white">Status da Configuração</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-gray-400 text-sm">Ambiente Atual</div>
                  <div className={`font-semibold ${
                    config.focusnfe_ambiente === 'producao' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {config.focusnfe_ambiente === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-gray-400 text-sm">Token Configurado</div>
                  <div className={`font-semibold ${config.focusnfe_token ? 'text-green-400' : 'text-red-400'}`}>
                    {config.focusnfe_token ? 'SIM' : 'NÃO'}
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-gray-400 text-sm">URL da API</div>
                  <div className="text-white text-sm truncate">
                    {config.focusnfe_ambiente === 'producao' 
                      ? 'api.focusnfe.com.br'
                      : 'homologacao.focusnfe.com.br'
                    }
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Atenção ao Ambiente de Produção</h4>
                <ul className="text-yellow-300 text-sm space-y-1">
                  <li>• Notas emitidas em produção têm validade fiscal</li>
                  <li>• Certifique-se de que sua empresa está cadastrada no painel Focus NFe</li>
                  <li>• O certificado digital A1 deve estar válido e enviado ao Focus NFe</li>
                  <li>• Teste primeiro em homologação antes de ir para produção</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
