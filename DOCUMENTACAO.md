# 📘 Documentação Completa - Sistema Irriga Centro Oeste

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tecnologias Utilizadas](#tecnologias-utilizadas)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Módulos do Sistema](#módulos-do-sistema)
5. [Banco de Dados](#banco-de-dados)
6. [Componentes Reutilizáveis](#componentes-reutilizáveis)
7. [Integrações](#integrações)
8. [Fluxos de Negócio](#fluxos-de-negócio)
9. [Configuração e Deploy](#configuração-e-deploy)
10. [API e Funções](#api-e-funções)

---

## 🎯 Visão Geral

O **Irriga Centro Oeste** é um sistema ERP completo desenvolvido para gerenciamento de empresas de irrigação. O sistema oferece controle total sobre:

- **Vendas e Orçamentos**
- **Estoque e Produtos**
- **Clientes e Fornecedores**
- **Financeiro (Contas a Pagar/Receber)**
- **Caixa e Lançamentos**
- **Notas Fiscais (NF-e)**
- **Obras e Projetos**
- **Relatórios Gerenciais**

### Características Principais

- ✅ Interface moderna e responsiva (Dark Theme)
- ✅ Sistema de autenticação multi-nível
- ✅ Integração com NFe (Focus NFe)
- ✅ Importação de XML de notas fiscais
- ✅ Importação de extratos OFX
- ✅ Relatórios dinâmicos com gráficos
- ✅ Controle de estoque automatizado
- ✅ Gestão financeira completa

---

## 🛠️ Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Next.js** | 14.0.4 | Framework React com SSR |
| **React** | 18.2.0 | Biblioteca UI |
| **TypeScript** | 5.3.0 | Tipagem estática |
| **Tailwind CSS** | 3.4.0 | Framework CSS utilitário |
| **Framer Motion** | 10.18.0 | Animações |
| **Recharts** | 2.10.3 | Gráficos e visualizações |
| **Lucide React** | 0.303.0 | Ícones |

### Backend
| Tecnologia | Descrição |
|------------|-----------|
| **Supabase** | BaaS (PostgreSQL + Auth + Storage) |
| **Focus NFe API** | Emissão de notas fiscais |

### Utilitários
| Biblioteca | Descrição |
|------------|-----------|
| **clsx** | Concatenação condicional de classes |
| **tailwind-merge** | Merge inteligente de classes Tailwind |

---

## 📁 Estrutura do Projeto

```
src/
├── app/                          # Rotas e páginas (App Router)
│   ├── page.tsx                  # Página inicial (Obras - Funcionário)
│   ├── layout.tsx                # Layout raiz
│   ├── globals.css               # Estilos globais
│   │
│   ├── admin/                    # Área administrativa
│   │   ├── page.tsx              # Dashboard admin
│   │   └── login/page.tsx        # Login administrativo
│   │
│   ├── caixa/page.tsx            # Controle de caixa
│   ├── clientes/page.tsx         # Gestão de clientes
│   ├── compras/page.tsx          # Importação de notas (XML)
│   ├── configuracoes/            # Configurações do sistema
│   │   ├── page.tsx              # Config. gerais
│   │   └── fiscal/page.tsx       # Config. fiscais (NFe)
│   ├── estoque/page.tsx          # Gestão de estoque
│   ├── financeiro/page.tsx       # Contas a pagar/receber
│   ├── funcionario/page.tsx      # Área do funcionário
│   ├── login/page.tsx            # Login funcionário
│   ├── materiais/page.tsx        # Gestão de materiais
│   ├── notas-fiscais/page.tsx    # Notas fiscais emitidas
│   ├── obras/page.tsx            # Gestão de obras
│   ├── orcamentos/page.tsx       # Orçamentos (simplificado)
│   ├── os/page.tsx               # Ordens de Serviço (detalhado)
│   ├── relatorios/page.tsx       # Relatórios gerenciais
│   ├── resumo/page.tsx           # Resumo geral
│   └── vendas/page.tsx           # Gestão de vendas
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # Cabeçalho
│   │   ├── Sidebar.tsx           # Menu lateral
│   │   └── LayoutWrapper.tsx     # Wrapper de layout
│   │
│   ├── ui/
│   │   ├── Button.tsx            # Botões personalizados
│   │   ├── Charts.tsx            # Componentes de gráficos
│   │   ├── Common.tsx            # Badge, Loading, Empty State
│   │   ├── DetailModals.tsx      # Modais de detalhes
│   │   ├── Form.tsx              # Inputs e formulários
│   │   ├── KPICard.tsx           # Cards de indicadores
│   │   └── Modal.tsx             # Modal base
│   │
│   └── Providers.tsx             # Context Providers
│
├── contexts/
│   ├── AuthContext.tsx           # Autenticação funcionário
│   └── AdminAuthContext.tsx      # Autenticação admin
│
└── lib/
    ├── database.ts               # Funções do banco de dados
    ├── focusnfe.ts               # Integração NFe
    ├── supabase.ts               # Cliente Supabase (obras)
    └── utils.ts                  # Funções utilitárias
```

---

## 📦 Módulos do Sistema

### 1. 🏠 Dashboard (Admin)
**Rota:** `/admin`

Painel principal com visão geral do negócio:
- KPIs principais (Vendas, Lucro, Estoque)
- Gráficos de receitas x despesas
- Vendas recentes
- Alertas de estoque baixo
- Contas a vencer

---

### 2. 📋 Orçamentos / OS
**Rotas:** `/orcamentos` | `/os`

Gestão completa de orçamentos e ordens de serviço:

| Funcionalidade | Descrição |
|----------------|-----------|
| Criação de OS | Adicionar serviços e produtos |
| Status | Orçamento → Aprovado → Em Execução → Concluído → Faturado |
| Aprovação | Converte automaticamente em venda |
| Impressão | Gera PDF para cliente |
| Desconto | Percentual ou valor fixo |

**Fluxo de Status:**
```
Orçamento → Aprovado → Em Execução → Concluído → Cancelado
                ↓
         [Cria Venda + Lançamento Financeiro]
```

---

### 3. 🛒 Vendas
**Rota:** `/vendas`

Gestão de vendas realizadas:

- Criação manual de vendas
- Vinculação com cliente
- Cálculo automático de custos e lucro
- Emissão de NF-e integrada
- Parcelamento e formas de pagamento

**Campos calculados:**
- `valor_total` = produtos + serviços - desconto + frete
- `lucro_bruto` = valor_total - custo_total
- `margem_lucro` = (lucro_bruto / valor_total) * 100

---

### 4. 📦 Estoque
**Rota:** `/estoque`

Controle completo de produtos:

| Funcionalidade | Descrição |
|----------------|-----------|
| Cadastro | Nome, código, NCM, preços |
| Formador de Preço | Margem sobre custo |
| Estoque mínimo/máximo | Alertas automáticos |
| Importação CSV | Importação em massa |
| Movimentações | Histórico de entrada/saída |

**Classificações Fiscais:**
- Mercadoria para Revenda (00)
- Matéria-Prima (01)
- Material de Uso e Consumo (07)
- Ativo Imobilizado (08)

---

### 5. 🚚 Compras (Importação XML)
**Rota:** `/compras`

Importação de notas fiscais de entrada:

1. **Upload do XML** - Leitura automática da NF-e
2. **Análise de produtos** - Comparação com estoque
3. **Ações por produto:**
   - Cadastrar novo
   - Substituir existente (atualiza preço)
   - Não vincular
4. **Atualização automática:**
   - Custo do produto
   - Preço de venda (formador de preço)
   - Quantidade em estoque

---

### 6. 👥 Clientes/Fornecedores
**Rota:** `/clientes`

Cadastro unificado com tipos:
- **Cliente** - Compradores
- **Fornecedor** - Vendedores
- **Ambos** - Cliente e fornecedor

**Campos principais:**
- Pessoa Física (CPF) ou Jurídica (CNPJ)
- Endereços múltiplos (entrega, cobrança)
- Produtor Rural (com inscrição)
- Limite de crédito
- Contribuinte ICMS

---

### 7. 💰 Financeiro
**Rota:** `/financeiro`

Gestão de contas a pagar e receber:

| Aba | Funcionalidade |
|-----|----------------|
| **Contas a Pagar** | Fornecedores, vencimentos, pagamentos |
| **Contas a Receber** | Clientes, parcelas, recebimentos |
| **Extrato** | Lançamentos por conta bancária |
| **Contas Bancárias** | Cadastro de contas |
| **DRE** | Demonstrativo de resultados |

**Importação OFX:**
- Upload de extrato bancário
- Detecção de duplicatas
- Conciliação automática

---

### 8. 💵 Caixa
**Rota:** `/caixa`

Controle diário de caixa:

- Lançamentos de entrada/saída
- Saldo por período
- Filtros por tipo, categoria, conta
- Vínculos com vendas, fornecedores, NFs
- Importação OFX

**Modais de Detalhes:**
Ao clicar em um lançamento, é possível visualizar:
- Detalhes do cliente
- Detalhes da venda
- Detalhes do fornecedor
- Detalhes da NF de entrada

---

### 9. 🧾 Notas Fiscais
**Rota:** `/notas-fiscais`

Gerenciamento de NF-e emitidas:

- Lista de notas emitidas
- Status (autorizada, cancelada, pendente)
- Download de DANFE e XML
- Reenvio de email

---

### 10. 📊 Relatórios
**Rota:** `/relatorios`

Relatórios gerenciais com gráficos:

| Relatório | Métricas |
|-----------|----------|
| **Caixa** | Entradas, saídas, saldo por período |
| **Vendas** | Total, quantidade, ticket médio |
| **Estoque** | Valor, quantidade, abaixo do mínimo |
| **Clientes** | Cadastrados, vendas por cliente |
| **Fornecedores** | Cadastrados, compras |
| **DRE** | Receitas, despesas, lucro |
| **Contas** | A pagar, a receber, vencidas |

**Filtros de período:**
- Hoje
- Última semana
- Mês atual
- Trimestre
- Ano
- Personalizado

---

### 11. ⚙️ Configurações
**Rota:** `/configuracoes`

**Configurações Gerais:**
- Dados da empresa
- Logotipo
- Preferências

**Configurações Fiscais** (`/configuracoes/fiscal`):
- Dados do emitente (NFe)
- CNPJ, Inscrição Estadual
- Endereço
- Regime tributário
- Token Focus NFe
- Ambiente (Homologação/Produção)
- Série da NF
- CST/CSOSN padrão

---

### 12. 🏗️ Obras
**Rota:** `/obras`

Gestão de projetos/obras:

- Cadastro de obras
- Vinculação de materiais
- Controle de quantidades utilizadas
- Status (em andamento, pausada, concluída)

---

## 🗄️ Banco de Dados

### Entidades Principais

```sql
-- Produtos
produtos (
  id, codigo, codigo_barras, gtin_ean, nome, descricao,
  unidade, ncm, cfop, origem, categoria_id, classificacao_fiscal,
  valor_custo, valor_venda, custo_medio, margem_lucro,
  quantidade_estoque, estoque_minimo, estoque_maximo,
  marca, peso_kg, fornecedor_id, localizacao, ativo
)

-- Clientes/Fornecedores
clientes (
  id, tipo_pessoa, tipo_cadastro, nome, cpf, rg,
  razao_social, cnpj, inscricao_estadual,
  endereco, cidade, estado, telefone, email,
  produtor_rural, inscricao_produtor_rural,
  contribuinte_icms, regime_tributario,
  limite_credito, saldo_devedor, ativo
)

-- Vendas
vendas (
  id, numero, cliente_id, data_venda,
  valor_produtos, valor_servicos, valor_desconto, valor_frete,
  valor_total, custo_total, lucro_bruto, margem_lucro,
  nota_fiscal_emitida, numero_nf, chave_nf, status
)

-- Itens da Venda
itens_venda (
  id, venda_id, produto_id, tipo, descricao,
  quantidade, valor_unitario, valor_desconto, valor_total,
  custo_unitario
)

-- Ordens de Serviço
ordens_servico (
  id, numero, cliente_id, cliente_nome, data_os, data_entrega,
  tipo_atendimento, total_servicos, total_produtos,
  desconto_percentual, desconto_valor, valor_total,
  status, venda_id, observacoes, garantia_dias
)

-- Lançamentos Financeiros
lancamentos_financeiros (
  id, tipo, categoria_id, valor, data_lancamento,
  forma_pagamento, cliente_id, fornecedor_id,
  venda_id, nota_fiscal_entrada_id, descricao,
  conciliado, ofx_fitid
)

-- Contas a Pagar
contas_pagar (
  id, fornecedor_id, descricao, valor, valor_pago,
  data_vencimento, data_pagamento, status,
  forma_pagamento, categoria_id, parcela_atual, total_parcelas
)

-- Contas a Receber
contas_receber (
  id, cliente_id, descricao, valor, valor_recebido,
  data_vencimento, data_recebimento, status,
  forma_pagamento, venda_id
)

-- Notas Fiscais de Entrada
notas_fiscais_entrada (
  id, numero, serie, chave_acesso, data_emissao, data_entrada,
  fornecedor_id, fornecedor_cnpj, fornecedor_razao_social,
  valor_produtos, valor_frete, valor_total,
  forma_pagamento, xml_original
)

-- Movimentações de Estoque
movimentacoes_estoque (
  id, produto_id, tipo, quantidade, valor_unitario,
  nota_fiscal_id, venda_id, motivo, data_movimentacao
)
```

---

## 🧩 Componentes Reutilizáveis

### UI Components

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Button` | `Button.tsx` | Botões com variantes |
| `Modal` | `Modal.tsx` | Modal base animado |
| `Badge` | `Common.tsx` | Tags coloridas |
| `LoadingSpinner` | `Common.tsx` | Indicador de loading |
| `EmptyState` | `Common.tsx` | Estado vazio |
| `Input` | `Form.tsx` | Campo de texto |
| `Select` | `Form.tsx` | Campo de seleção |
| `KPICard` | `KPICard.tsx` | Card de indicador |

### Detail Modals

| Modal | Descrição |
|-------|-----------|
| `ClienteDetailModal` | Exibe detalhes do cliente |
| `VendaDetailModal` | Exibe detalhes da venda |
| `ProdutoDetailModal` | Exibe detalhes do produto |
| `FornecedorDetailModal` | Exibe detalhes do fornecedor |
| `NFEntradaDetailModal` | Exibe detalhes da NF entrada |

---

## 🔌 Integrações

### Focus NFe

Integração para emissão de NF-e:

```typescript
// Configuração
const FOCUS_NFE_CONFIG = {
  token: 'seu-token',
  ambiente: 'homologacao' | 'producao',
  baseUrl: 'https://api.focusnfe.com.br'
}

// Funções disponíveis
emitirNFe(dados: NFeDados)           // Emite nova NF-e
consultarNFe(referencia: string)      // Consulta status
aguardarAutorizacaoNFe(ref: string)   // Aguarda autorização
cancelarNFe(ref: string, just: string) // Cancela NF-e
getUrlDanfe(chave: string)            // URL do DANFE
getUrlXml(chave: string)              // URL do XML
```

### Supabase

Backend as a Service com:
- **PostgreSQL** - Banco de dados
- **Auth** - Autenticação (não utilizado atualmente)
- **Storage** - Armazenamento de arquivos

---

## 🔄 Fluxos de Negócio

### Fluxo de Venda (via OS)

```
1. Criar Orçamento (OS)
   ↓
2. Adicionar produtos e serviços
   ↓
3. Aprovar orçamento
   ↓ [Automático]
   ├─ Cria Venda
   ├─ Cria Lançamento Financeiro (receita)
   └─ Baixa estoque (se configurado)
   ↓
4. Emitir NF-e (opcional)
   ↓
5. Concluir/Faturar
```

### Fluxo de Compra (Importação XML)

```
1. Upload do XML da NF-e
   ↓
2. Sistema analisa produtos
   ↓
3. Para cada produto:
   ├─ Novo → Cadastrar com dados da NF
   ├─ Existente → Atualizar custo/preço
   └─ Ignorar → Não vincular
   ↓
4. Confirmar importação
   ↓ [Automático]
   ├─ Cadastra/Atualiza produtos
   ├─ Cria movimentação de entrada
   ├─ Cria NF de entrada
   ├─ Cria conta a pagar
   └─ Cria lançamento financeiro
```

### Fluxo Financeiro

```
Receitas:
  Venda → Lançamento (receita) → Conta a Receber
  
Despesas:
  Compra → Lançamento (despesa) → Conta a Pagar
  
Conciliação:
  Extrato OFX → Comparar com lançamentos → Marcar conciliado
```

---

## 🚀 Configuração e Deploy

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima

# Focus NFe (configurado no sistema)
# Token armazenado no banco de dados
```

### Comandos

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm run start

# Linting
npm run lint
```

### Deploy

O sistema pode ser deployado em:
- **Vercel** (recomendado para Next.js)
- **Netlify**
- **Docker** (criar Dockerfile)
- **VPS** (Node.js + PM2)

---

## 📚 API e Funções

### Funções de Banco de Dados

```typescript
// Produtos
fetchProdutos()
fetchProdutoById(id)
createProduto(data)
updateProduto(id, data)
deleteProduto(id)
checkProdutoDuplicado(nome, codigo, id?)

// Clientes
fetchClientes()
createCliente(data)
updateCliente(id, data)
deleteCliente(id)
consultarCNPJ(cnpj)

// Vendas
fetchVendas()
createVenda(data, itens)
updateVenda(id, data)
deleteVenda(id)

// Financeiro
fetchLancamentosFinanceiros()
createLancamentoFinanceiro(data)
fetchContasPagar()
fetchContasReceber()
createContaPagar(data)
createContaReceber(data)

// OS
fetchOrdensServico()
createOrdemServico(data, servicos, produtos)
updateStatusOS(id, status)
```

### Utilitários

```typescript
// Formatação
formatCurrency(value)     // R$ 1.234,56
formatDate(date)          // 01/01/2026
cn(...classes)            // Merge de classes CSS

// Máscaras
maskCPF(value)            // 123.456.789-00
maskCNPJ(value)           // 12.345.678/0001-00
maskCEP(value)            // 12345-678
maskPhone(value)          // (11) 99999-9999
```

---

## 🔐 Autenticação

### Níveis de Acesso

| Nível | Acesso | Rota de Login |
|-------|--------|---------------|
| **Funcionário** | Obras (visualização) | `/login` |
| **Administrador** | Sistema completo | `/admin/login` |

### Contextos

```typescript
// Funcionário
const { usuario, login, logout, authEnabled } = useAuth()

// Admin
const { isAuthenticated, login, logout, email } = useAdminAuth()
```

---

## 📝 Observações Técnicas

### Exclusão de Registros
- Todas as exclusões são **permanentes** (hard delete)
- Não há soft delete (campo `ativo` removido dos filtros)

### Precisão Numérica
- Valores monetários formatados com `toLocaleString('pt-BR')`
- Cálculos financeiros usam 2 casas decimais

### Tipos de Lançamento
O sistema aceita dois padrões de tipos:
- `receita` / `despesa` (novo)
- `entrada` / `saida` (legado)

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do console (F12)
2. Verificar conexão com Supabase
3. Verificar configurações fiscais

---

**Versão:** 2.0.0  
**Última atualização:** Janeiro de 2026
