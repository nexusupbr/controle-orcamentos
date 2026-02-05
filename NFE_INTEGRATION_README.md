# 🧾 Integração NFe - ERP Andressa

## Documentação Técnica da Integração com Focus NFe

Esta documentação descreve a implementação robusta da emissão de NF-e (Nota Fiscal Eletrônica) integrada ao sistema ERP Andressa.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Configuração](#configuração)
4. [API Reference](#api-reference)
5. [Fluxo de Emissão](#fluxo-de-emissão)
6. [Worker de Processamento](#worker-de-processamento)
7. [Testes](#testes)
8. [Checklist de Validação](#checklist-de-validação)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### Tecnologias Utilizadas
- **Framework**: Next.js 14 (App Router)
- **Banco de Dados**: Supabase (PostgreSQL)
- **API Fiscal**: Focus NFe
- **Linguagem**: TypeScript

### Funcionalidades Principais
- ✅ Emissão de NF-e de saída (venda)
- ✅ Consulta de status em tempo real
- ✅ Cancelamento de notas (até 24h)
- ✅ Emissão de Carta de Correção (CC-e)
- ✅ Reenvio de e-mail para destinatário
- ✅ Dashboard de métricas
- ✅ Worker assíncrono para processamento em fila

---

## 🏗️ Arquitetura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ VendasPage   │  │ NotasPage    │  │ Métricas     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────▼─────────────────▼─────────────────▼───────┐          │
│  │              nfe-client.ts (API Client)          │          │
│  └──────────────────────────┬───────────────────────┘          │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP
┌─────────────────────────────▼───────────────────────────────────┐
│                     API ROUTES (Next.js)                        │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐  │
│  │ emitir  │ │ status │ │ cancelar │ │ cc-e      │ │ email  │  │
│  └────┬────┘ └────┬───┘ └────┬─────┘ └─────┬─────┘ └───┬────┘  │
│       │           │          │             │           │        │
│  ┌────▼───────────▼──────────▼─────────────▼───────────▼────┐  │
│  │                focusnfe-server.ts (Server Client)        │  │
│  └────────────────────────────┬─────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTPS (Token Auth)
┌───────────────────────────────▼─────────────────────────────────┐
│                        FOCUS NFE API                            │
│  • Ambiente: Homologação / Produção                             │
│  • Endpoints: /v2/nfe, /v2/nfe_consulta, /v2/nfe_cancelamento  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        SEFAZ (Governo)                          │
│  • Validação de dados                                           │
│  • Autorização de NF-e                                          │
│  • Geração de protocolo                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos

```
src/
├── app/
│   └── api/
│       └── nfe/
│           ├── emitir/route.ts        # POST - Emissão de NF-e
│           ├── status/route.ts        # GET  - Consulta status
│           ├── cancelar/route.ts      # POST - Cancelamento
│           ├── carta-correcao/route.ts# POST - CC-e
│           ├── email/route.ts         # POST - Reenvio email
│           ├── worker/route.ts        # POST - Worker processamento
│           └── metricas/route.ts      # GET  - Dashboard
├── lib/
│   ├── focusnfe-server.ts             # Cliente server-side
│   ├── nfe-payload-builder.ts         # Montagem de payload
│   └── nfe-client.ts                  # Cliente frontend
└── __tests__/
    ├── setup.ts                       # Setup vitest
    ├── nfe-payload-builder.test.ts    # Testes unitários
    └── api/
        └── nfe-emitir.test.ts         # Testes integração
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Crie ou atualize o arquivo `.env.local`:

```env
# =====================================
# FOCUS NFE - CONFIGURAÇÃO
# =====================================

# Token de homologação (testes)
FOCUS_NFE_TOKEN_HOMOLOG=seu_token_homologacao_aqui

# Token de produção (notas reais)
FOCUS_NFE_TOKEN_PROD=seu_token_producao_aqui

# Ambiente atual: 'homologacao' | 'producao'
FOCUS_NFE_AMBIENTE=homologacao

# Secret para autenticar o worker (cron job)
NFE_WORKER_SECRET=gere_uma_string_segura_aqui

# =====================================
# SUPABASE - CONFIGURAÇÃO
# =====================================

# Configurações públicas
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key

# Service Role (NUNCA expor no frontend)
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 2. Migração do Banco de Dados

Execute o SQL de migração no Supabase:

```bash
# Via Supabase CLI
supabase db push

# Ou execute manualmente no SQL Editor do Supabase
# o conteúdo de SQL_NFE_INTEGRATION.sql
```

### 3. Instalação de Dependências

```bash
# Instalar dependências de produção e dev
npm install

# Instalar dependências de teste
npm install -D vitest @vitest/coverage-v8 @vitest/ui vite-tsconfig-paths @vitejs/plugin-react
```

### 4. Configuração do Worker (Cron)

#### Opção A: Vercel Cron (Recomendado para Vercel)

Crie `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/nfe/worker",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Opção B: Supabase Edge Functions

```sql
-- Agendar função via pg_cron
SELECT cron.schedule(
  'processar-notas-pendentes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://seu-app.vercel.app/api/nfe/worker',
    headers := '{"Authorization": "Bearer SEU_NFE_WORKER_SECRET"}'::jsonb
  )
  $$
);
```

#### Opção C: Cron externo (EasyCron, UptimeRobot, etc.)

```bash
# Chamada a cada 5 minutos
curl -X POST https://seu-app.com/api/nfe/worker \
  -H "Authorization: Bearer SEU_NFE_WORKER_SECRET"
```

---

## 📚 API Reference

### POST `/api/nfe/emitir`

Emite uma nova NF-e.

**Request:**
```typescript
{
  venda_id: number;
  venda?: Venda;          // Se não informado, busca no banco
  config_fiscal: ConfigFiscal;
  aguardar_autorizacao?: boolean; // Default: false
}
```

**Response (sucesso):**
```typescript
{
  sucesso: true;
  nota: {
    id: number;
    referencia: string;
    status: string;
    numero?: string;
    chave_nfe?: string;
  };
  existente?: boolean;   // true se já existia NFe para esta venda
}
```

**Response (erro):**
```typescript
{
  sucesso: false;
  error: string;
  codigo?: number;
  detalhes?: any;
}
```

---

### GET `/api/nfe/status`

Consulta status de uma NF-e.

**Query Params:**
```
?ref=ANDRESSA-123-abc    # Por referência
?nota_id=456             # Por ID da nota
```

**Response:**
```typescript
{
  sucesso: true;
  status: 'autorizado' | 'processando_autorizacao' | 'erro_autorizacao' | ...;
  numero?: string;
  serie?: string;
  chave_nfe?: string;
  protocolo?: string;
  xml_url?: string;
  danfe_url?: string;
}
```

---

### POST `/api/nfe/cancelar`

Cancela uma NF-e autorizada (prazo: 24h).

**Request:**
```typescript
{
  nota_id: number;
  justificativa: string; // Mínimo 15 caracteres
}
```

**Response:**
```typescript
{
  sucesso: true;
  status: 'cancelado';
  protocolo_cancelamento: string;
}
```

---

### POST `/api/nfe/carta-correcao`

Emite Carta de Correção (CC-e).

**Request:**
```typescript
{
  nota_id: number;
  correcao: string; // 15-1000 caracteres
}
```

**Response:**
```typescript
{
  sucesso: true;
  status: 'carta_correcao_registrada';
  protocolo: string;
  sequencia_evento: number;
}
```

---

### POST `/api/nfe/email`

Reenvia NF-e por e-mail.

**Request:**
```typescript
{
  nota_id: number;
  emails: string[]; // Máximo 10 destinatários
}
```

---

### GET `/api/nfe/metricas`

Retorna métricas para dashboard.

**Query Params:**
```
?periodo=7   # Dias (default: 30)
```

**Response:**
```typescript
{
  totais: {
    emitidas: number;
    autorizadas: number;
    canceladas: number;
    erros: number;
    pendentes: number;
  };
  taxa_sucesso: number;
  performance: {
    tempo_medio_autorizacao_ms: number;
    maior_tempo_ms: number;
    menor_tempo_ms: number;
  };
  historico: Array<{
    data: string;
    autorizadas: number;
    erros: number;
    valor_total: number;
  }>;
}
```

---

## 🔄 Fluxo de Emissão

### Diagrama de Estados

```
┌──────────┐     POST /emitir     ┌─────────────────────────┐
│  VENDA   │ ──────────────────▶  │  PENDENTE               │
└──────────┘                      │  (nota criada no banco) │
                                  └───────────┬─────────────┘
                                              │
                                              ▼ Focus NFe POST
                                  ┌─────────────────────────┐
                                  │  PROCESSANDO_AUTORIZACAO│
                                  │  (enviado para SEFAZ)   │
                                  └───────────┬─────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
              ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
              │   AUTORIZADO     │ │ ERRO_AUTORIZACAO │ │    REJEITADO     │
              │   ✅ Sucesso     │ │ ⚠️ Retry possível│ │   ❌ Permanente  │
              └────────┬─────────┘ └────────┬─────────┘ └──────────────────┘
                       │                    │
                       ▼                    │ Worker retry
              ┌──────────────────┐          │ (backoff exponencial)
              │   CANCELADO      │ ◄────────┘
              │   (opcional)     │
              └──────────────────┘
```

### Fluxo Detalhado

1. **Criação da Venda** → Usuário finaliza venda no PDV
2. **Emissão NFe** → Sistema chama `POST /api/nfe/emitir`
3. **Validação** → `validarDadosNfe()` verifica dados obrigatórios
4. **Idempotência** → Verifica se já existe NFe para esta venda
5. **Montagem Payload** → `buildNfePayload()` gera JSON da NFe
6. **Envio Focus NFe** → `FocusNFeClient.emitir()` com retry automático
7. **Polling (opcional)** → Aguarda autorização se `aguardar_autorizacao: true`
8. **Atualização BD** → Salva status, número, chave_nfe

---

## ⚡ Worker de Processamento

### Funcionamento

O worker processa notas em estado `processando_autorizacao` ou `erro_autorizacao` que tenham passado o tempo de backoff.

```typescript
// Fluxo do Worker
1. Busca notas pendentes com proxima_consulta_em <= NOW()
2. Para cada nota (limite: 50):
   a. Consulta status na Focus NFe
   b. Se autorizado: atualiza nota + venda
   c. Se erro temporário: incrementa retry, calcula próximo backoff
   d. Se erro permanente ou max retries: marca como falha final
3. Retorna relatório de processamento
```

### Backoff Exponencial

```
Tentativa 1: +30s    (mínimo)
Tentativa 2: +60s
Tentativa 3: +120s
Tentativa 4: +240s
Tentativa 5: +480s
...
Tentativa 10: máximo atingido (falha permanente)
```

### Executar Manualmente

```bash
# Via curl
curl -X POST http://localhost:3000/api/nfe/worker \
  -H "Authorization: Bearer SEU_NFE_WORKER_SECRET"

# Ou GET para status
curl http://localhost:3000/api/nfe/worker \
  -H "Authorization: Bearer SEU_NFE_WORKER_SECRET"
```

---

## 🧪 Testes

### Executar Testes

```bash
# Rodar todos os testes
npm run test

# Rodar com watch mode (desenvolvimento)
npm run test:watch

# Rodar com coverage report
npm run test:coverage

# Rodar com UI interativa
npm run test:ui
```

### Estrutura de Testes

```
src/__tests__/
├── setup.ts                        # Configuração global
├── nfe-payload-builder.test.ts     # Testes unitários
│   ├── validarDadosNfe
│   ├── determinarCfop
│   ├── mapearFormaPagamento
│   └── buildNfePayload
└── api/
    └── nfe-emitir.test.ts          # Testes de integração
        ├── Validação de entrada
        ├── Idempotência
        ├── Fluxo de emissão
        ├── Tratamento de erros
        └── E2E simulado
```

### Coverage Esperado

| Arquivo              | Statements | Branches | Functions | Lines |
|----------------------|------------|----------|-----------|-------|
| nfe-payload-builder  | > 80%      | > 70%    | > 80%     | > 80% |
| focusnfe-server      | > 70%      | > 60%    | > 70%     | > 70% |
| API routes           | > 70%      | > 60%    | > 70%     | > 70% |

---

## ✅ Checklist de Validação

### Pré-produção (Homologação)

#### Configuração
- [ ] Token de homologação configurado (`FOCUS_NFE_TOKEN_HOMOLOG`)
- [ ] Ambiente setado como `homologacao` (`FOCUS_NFE_AMBIENTE`)
- [ ] Supabase configurado com tabelas migradas
- [ ] Worker secret configurado (`NFE_WORKER_SECRET`)

#### Testes Funcionais
- [ ] Emissão de NFe básica (venda simples)
- [ ] Emissão com múltiplos itens
- [ ] Emissão interestadual (CFOP 6xxx)
- [ ] Consulta de status
- [ ] Cancelamento de NFe
- [ ] Carta de correção (CC-e)
- [ ] Reenvio de e-mail
- [ ] Worker processando notas pendentes

#### Validação de Dados
- [ ] CNPJ do emitente válido
- [ ] Inscrição Estadual válida
- [ ] NCM dos produtos preenchidos
- [ ] Unidades de medida corretas
- [ ] CFOP correto por UF destino

#### Observabilidade
- [ ] Eventos registrados em `notas_fiscais_eventos`
- [ ] Métricas atualizadas em `notas_fiscais_metricas`
- [ ] Dashboard exibindo dados corretos

### Produção

#### Checklist Final
- [ ] **Token de produção** configurado (`FOCUS_NFE_TOKEN_PROD`)
- [ ] **Ambiente** alterado para `producao`
- [ ] **Certificado A1** vinculado na Focus NFe
- [ ] **Todos os NCMs** preenchidos corretamente
- [ ] **Testes de carga** realizados (opcional)
- [ ] **Backup** do banco de dados realizado
- [ ] **Monitoramento** configurado (Sentry, LogRocket, etc.)

#### Pós Go-Live
- [ ] Primeira NFe real emitida e autorizada
- [ ] Verificar XML no portal da SEFAZ
- [ ] Verificar DANFE gerado
- [ ] Validar recebimento de e-mail
- [ ] Monitorar taxa de erros nas primeiras 24h

---

## 🔧 Troubleshooting

### Erros Comuns

#### `Token não configurado`
```
Erro: FOCUS_NFE_TOKEN_HOMOLOG ou FOCUS_NFE_TOKEN_PROD não definido
```
**Solução:** Configure as variáveis de ambiente no `.env.local`

---

#### `NCM inválido em produção`
```
Erro: Item "PRODUTO X": NCM inválido ou genérico. Corrija antes de emitir em produção.
```
**Solução:** Atualize o cadastro do produto com NCM válido (8 dígitos)

---

#### `Nota já existe para esta venda`
```
{
  "sucesso": true,
  "existente": true,
  "nota": { ... }
}
```
**Comportamento esperado:** Sistema retorna nota existente (idempotência)

---

#### `SEFAZ indisponível`
```
Erro: Timeout ou 503 da SEFAZ
```
**Solução:** 
- Aguarde alguns minutos
- Verifique status da SEFAZ no site oficial
- Worker irá reprocessar automaticamente

---

#### `Cancelamento após 24h`
```
Erro: Prazo de cancelamento expirado
```
**Solução:** Não é possível cancelar. Use Carta de Correção ou emita nota de estorno.

---

### Logs e Debug

#### Verificar eventos de uma nota:
```sql
SELECT * FROM notas_fiscais_eventos 
WHERE nota_fiscal_id = 123 
ORDER BY created_at DESC;
```

#### Verificar notas pendentes:
```sql
SELECT * FROM notas_fiscais 
WHERE status IN ('processando_autorizacao', 'erro_autorizacao')
  AND proxima_consulta_em <= NOW();
```

#### Verificar métricas do dia:
```sql
SELECT * FROM notas_fiscais_metricas 
WHERE data = CURRENT_DATE;
```

---

## 📞 Suporte

### Focus NFe
- Documentação: https://focusnfe.com.br/doc
- Suporte: suporte@focusnfe.com.br

### Supabase
- Documentação: https://supabase.com/docs
- Discord: https://discord.supabase.com

---

## 📝 Changelog

### v2.0.0 (2025-01-27)
- ✨ Refatoração completa da integração NFe
- 🔒 Segurança: Token removido do frontend
- ⚡ Confiabilidade: Retry com backoff exponencial
- 📊 Observabilidade: Sistema de eventos e métricas
- 🧪 Testes: Cobertura unitária e integração
- 📚 Documentação completa

### v1.0.0 (versão anterior)
- Integração básica com Focus NFe
- Emissão e consulta de notas
