'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings, Database, Palette, Bell, Shield, Save, Check, ChevronRight, ExternalLink, Moon, Sun, Zap, FileText, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Checkbox } from '@/components/ui/Form'

export default function ConfiguracoesPage() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    // Dados
    supabaseUrl: 'https://yhiiupamxdjmnrktkjku.supabase.co',
    supabaseKey: '***************',
    // Visual
    theme: 'dark',
    primaryColor: 'green',
    // Notificações
    emailNotifications: true,
    pushNotifications: false,
    weeklyReport: true,
    // Geral
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
  })

  const handleSave = () => {
    // Simula salvamento
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Configurações
          </h1>
          <p className="text-dark-400 mt-1">
            Personalize o sistema do seu jeito
          </p>
        </div>
        <Button
          onClick={handleSave}
          leftIcon={saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          variant={saved ? 'secondary' : 'primary'}
        >
          {saved ? 'Salvo!' : 'Salvar'}
        </Button>
      </div>

      {/* Database Settings */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-dark-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Banco de Dados</h2>
            <p className="text-sm text-dark-400">Configurações do Supabase</p>
          </div>
        </div>
        <div className="p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input
              label="Supabase URL"
              value={settings.supabaseUrl}
              onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
              placeholder="https://sua-url.supabase.co"
            />
            <Input
              label="Supabase Anon Key"
              type="password"
              value={settings.supabaseKey}
              onChange={(e) => setSettings({ ...settings, supabaseKey: e.target.value })}
              placeholder="sua-chave-anon"
            />
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Check className="w-4 h-4" />
              <span className="font-medium">Conectado</span>
            </div>
            <p className="text-sm text-dark-400">O banco de dados está funcionando corretamente.</p>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-dark-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Aparência</h2>
            <p className="text-sm text-dark-400">Personalize a interface</p>
          </div>
        </div>
        <div className="p-4 lg:p-6 space-y-6">
          {/* Theme Selector */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">Tema</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'dark', icon: Moon, label: 'Escuro', active: true },
                { id: 'light', icon: Sun, label: 'Claro', active: false },
                { id: 'auto', icon: Zap, label: 'Auto', active: false },
              ].map((theme) => (
                <button
                  key={theme.id}
                  disabled={!theme.active}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.theme === theme.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                  } ${!theme.active ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => theme.active && setSettings({ ...settings, theme: theme.id })}
                >
                  <theme.icon className={`w-6 h-6 mx-auto mb-2 ${
                    settings.theme === theme.id ? 'text-primary-400' : 'text-dark-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    settings.theme === theme.id ? 'text-white' : 'text-dark-400'
                  }`}>{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">Cor Principal</label>
            <div className="flex gap-3 flex-wrap">
              {[
                { id: 'green', color: 'bg-emerald-500' },
                { id: 'blue', color: 'bg-blue-500' },
                { id: 'purple', color: 'bg-purple-500' },
                { id: 'pink', color: 'bg-pink-500' },
                { id: 'orange', color: 'bg-orange-500' },
                { id: 'cyan', color: 'bg-cyan-500' },
              ].map((c) => (
                <button
                  key={c.id}
                  className={`w-12 h-12 rounded-xl ${c.color} transition-all ${
                    settings.primaryColor === c.id
                      ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-white scale-110'
                      : 'hover:scale-105'
                  } ${c.id !== 'green' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => c.id === 'green' && setSettings({ ...settings, primaryColor: c.id })}
                  disabled={c.id !== 'green'}
                />
              ))}
            </div>
            <p className="text-xs text-dark-500 mt-2">* Apenas tema verde disponível nesta versão</p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-dark-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Notificações</h2>
            <p className="text-sm text-dark-400">Gerencie suas preferências</p>
          </div>
        </div>
        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <div>
              <p className="text-white font-medium">Notificações por Email</p>
              <p className="text-sm text-dark-400">Receba atualizações por email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-dark-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-checked:after:bg-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <div>
              <p className="text-white font-medium">Push Notifications</p>
              <p className="text-sm text-dark-400">Alertas no navegador</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-dark-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-checked:after:bg-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <div>
              <p className="text-white font-medium">Relatório Semanal</p>
              <p className="text-sm text-dark-400">Resumo semanal dos orçamentos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.weeklyReport}
                onChange={(e) => setSettings({ ...settings, weeklyReport: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-dark-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-checked:after:bg-white"></div>
            </label>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-dark-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Geral</h2>
            <p className="text-sm text-dark-400">Preferências do sistema</p>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Select
              label="Moeda"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              options={[
                { value: 'BRL', label: 'Real (R$)' },
                { value: 'USD', label: 'Dollar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
              ]}
            />
            <Select
              label="Formato de Data"
              value={settings.dateFormat}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA' },
                { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Configuração Fiscal - Link */}
      <Link href="/configuracoes/fiscal" className="block">
        <div className="glass-card overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer group">
          <div className="p-4 lg:p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Receipt className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                Configuração Fiscal (NFe/NFCe)
              </h2>
              <p className="text-sm text-dark-400">
                Configure os dados do emitente e integração com Focus NFe para emissão de notas fiscais
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="px-6 pb-4 flex gap-2">
            <span className="px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              NFe
            </span>
            <span className="px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
              NFCe
            </span>
            <span className="px-2 py-1 text-xs rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Focus NFe API
            </span>
          </div>
        </div>
      </Link>

      {/* About */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-white">CO</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Controle de Orçamentos</h3>
            <p className="text-dark-400">Versão 2.0 • Next.js Edition</p>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            GitHub
          </a>
        </div>
        <div className="mt-4 pt-4 border-t border-dark-700">
          <p className="text-sm text-dark-500">
            Desenvolvido com ❤️ usando Next.js 14, Tailwind CSS e Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
