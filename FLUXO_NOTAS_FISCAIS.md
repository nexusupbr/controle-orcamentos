# 📄 Fluxo de Notas Fiscais - Documentação Técnica

> **Versão:** 1.0  
> **Data:** 05/02/2026  
> **Sistema:** ERP Andressa

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Fluxo de NF-e de Saída (Emissão)](#fluxo-de-nf-e-de-saída-emissão)
4. [Fluxo de NF-e de Entrada (Importação)](#fluxo-de-nf-e-de-entrada-importação)
5. [Configuração Fiscal](#configuração-fiscal)
6. [Integração Focus NFe](#integração-focus-nfe)
7. [Estrutura de Dados](#estrutura-de-dados)
8. [Mapeamentos e Constantes](#mapeamentos-e-constantes)
9. [Tratamento de Erros](#tratamento-de-erros)
10. [Limitações Conhecidas](#limitações-conhecidas)

---

## Visão Geral

O sistema possui dois fluxos principais para gestão de notas fiscais:

| Tipo | Descrição | Módulo |
|------|-----------|--------|
| **NF-e de Saída** | Emissão de notas fiscais a partir de vendas | `/vendas` |
| **NF-e de Entrada** | Importação de XMLs de notas de compra | `/notas-fiscais` |

### Tecnologias Utilizadas

- **Frontend:** Next.js 14 (App Router) + React
- **Backend:** Supabase (PostgreSQL + Auth)
- **API Fiscal:** Focus NFe
- **Ambiente:** Homologação / Produção

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  /vendas        │  /notas-fiscais │  /configuracoes/fiscal      │
│  (Emissão NF-e) │  (Importação)   │  (Configurações)            │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE SERVIÇOS                          │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/focusnfe.ts    │  src/lib/database.ts                  │
│  (API Focus NFe)        │  (Operações Supabase)                 │
└────────┬────────────────┴───────────────────────┬───────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────────┐              ┌────────────────────────────┐
│   FOCUS NFE API     │              │      SUPABASE DATABASE     │
│   (homologacao/     │              │  ┌──────────────────────┐  │
│    producao)        │              │  │ config_fiscal        │  │
│                     │              │  │ notas_fiscais        │  │
│   ┌───────────┐     │              │  │ notas_fiscais_entrada│  │
│   │   SEFAZ   │     │              │  │ vendas               │  │
│   └───────────┘     │              │  │ itens_venda          │  │
└─────────────────────┘              │  └──────────────────────┘  │
                                     └────────────────────────────┘
```

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/focusnfe.ts` | Integração com API Focus NFe |
| `src/lib/database.ts` | Operações de banco de dados |
| `src/app/vendas/page.tsx` | Tela de vendas e emissão de NF-e |
| `src/app/notas-fiscais/page.tsx` | Importação de XMLs de entrada |
| `src/app/configuracoes/fiscal/page.tsx` | Configurações fiscais |

---

## Fluxo de NF-e de Saída (Emissão)

### Diagrama do Fluxo

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   VENDA      │────▶│   EMISSÃO    │────▶│  AUTORIZAÇÃO │
│  CONCLUÍDA   │     │   NF-e       │     │    SEFAZ     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                     ┌───────────────────────────┼───────────────────────────┐
                     │                           │                           │
                     ▼                           ▼                           ▼
              ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
              │  AUTORIZADA  │           │  REJEITADA   │           │   DENEGADA   │
              │              │           │              │           │              │
              │ • Salva DB   │           │ • Log erro   │           │ • Log erro   │
              │ • Gera DANFE │           │ • Notifica   │           │ • Notifica   │
              │ • Atualiza   │           │              │           │              │
              │   venda      │           │              │           │              │
              └──────────────┘           └──────────────┘           └──────────────┘
```

### Etapas Detalhadas

#### 1. Iniciar Emissão
**Arquivo:** `src/app/vendas/page.tsx`  
**Função:** `handleGerarNota(venda: Venda)`

```typescript
// Validações iniciais
if (venda.nota_fiscal_emitida) {
  alert('Esta venda já possui nota fiscal emitida!')
  return
}

const configCheck = verificarConfiguracao()
if (!configCheck.ok) {
  alert(`Erro de configuração: ${configCheck.mensagem}`)
  return
}
```

#### 2. Buscar Configuração Fiscal
**Tabela:** `config_fiscal`

```typescript
const { data: configFiscal } = await supabase
  .from('config_fiscal')
  .select('*')
  .eq('ativo', true)
  .single()
```

#### 3. Montar Dados da NFe
**Estrutura:** `NFeDados`

Os dados são montados a partir de:
- **Emitente:** Dados da `config_fiscal`
- **Destinatário:** Dados do `cliente` da venda
- **Itens:** Produtos da venda (`itens_venda`)
- **Pagamento:** Forma de pagamento (atualmente fixo como dinheiro)

```typescript
const dadosNFe: NFeDados = {
  natureza_operacao: configFiscal.natureza_operacao_padrao,
  data_emissao: new Date().toISOString(),
  tipo_documento: 1, // Saída
  local_destino: 1,  // Operação interna
  finalidade_emissao: 1, // Normal
  consumidor_final: 1,
  presenca_comprador: 1,
  
  // Emitente (da config_fiscal)
  cnpj_emitente: configFiscal.cnpj,
  inscricao_estadual_emitente: configFiscal.inscricao_estadual,
  // ... demais campos
  
  // Destinatário (do cliente)
  nome_destinatario: cliente?.nome,
  cpf_destinatario: cliente?.cpf,
  // ... demais campos
  
  // Itens
  items: itensNFe,
  
  // Pagamento
  formas_pagamento: [{
    forma_pagamento: '01', // Dinheiro
    valor_pagamento: venda.valor_total
  }]
}
```

#### 4. Enviar para Focus NFe
**Arquivo:** `src/lib/focusnfe.ts`  
**Função:** `emitirNFe(referencia, dados)`

```typescript
const response = await fetch(
  `${FOCUS_NFE_CONFIG.baseUrl}/v2/nfe?ref=${referencia}`,
  {
    method: 'POST',
    headers: {
      'Authorization': FOCUS_NFE_CONFIG.authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dados)
  }
)
```

#### 5. Aguardar Autorização
**Função:** `aguardarAutorizacaoNFe(referencia)`

```typescript
// Polling com limite de tentativas
for (let i = 0; i < maxTentativas; i++) {
  const resultado = await consultarNFe(referencia)
  
  if (resultado.status !== 'processando_autorizacao') {
    return resultado
  }
  
  await new Promise(resolve => setTimeout(resolve, intervaloMs))
}
```

#### 6. Processar Resultado

**Se Autorizada:**
```typescript
// Atualizar venda
await updateVenda(venda.id, {
  nota_fiscal_emitida: true,
  numero_nf: resultado.numero,
  chave_nf: resultado.chave_nfe
})

// Salvar na tabela notas_fiscais
await supabase.from('notas_fiscais').insert([{
  referencia: referencia,
  venda_id: venda.id,
  tipo: 'nfe',
  numero: resultado.numero,
  serie: resultado.serie,
  chave_acesso: resultado.chave_nfe,
  status: 'autorizada',
  // ... demais campos
}])
```

**Se Rejeitada:**
```typescript
const erros = resultado.erros?.map(e => 
  `${e.codigo}: ${e.mensagem}`
).join('\n')
throw new Error(`Erro na autorização:\n${erros}`)
```

---

## Fluxo de NF-e de Entrada (Importação)

### Diagrama do Fluxo

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   UPLOAD     │────▶│   PARSE      │────▶│   REVISÃO    │
│   XML        │     │   XML        │     │   ITENS      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                      IMPORTAÇÃO                               │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ Fornecedor   │   Produtos   │   Estoque    │  Conta a Pagar  │
│ (auto-cad)   │   (cad/atu)  │   (entrada)  │   (geração)     │
└──────────────┴──────────────┴──────────────┴─────────────────┘
```

### Etapas Detalhadas

#### 1. Upload do XML
**Arquivo:** `src/app/notas-fiscais/page.tsx`

```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  const reader = new FileReader()
  reader.onload = (event) => {
    const xmlString = event.target?.result as string
    const parsed = parseNFeXML(xmlString)
    // ...
  }
  reader.readAsText(file)
}
```

#### 2. Parse do XML
**Função:** `parseNFeXML(xmlString)`

Extrai as seguintes informações:
- **Identificação:** Número, série, chave de acesso
- **Emitente:** CNPJ, razão social (mapeado como fornecedor)
- **Itens:** Produtos, quantidades, valores
- **Totais:** Valores de impostos e total da nota

```typescript
const parseNFeXML = (xmlString: string): NFData | null => {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlString, 'text/xml')
  
  // Localiza estrutura da NFe
  const nfe = xml.getElementsByTagName('NFe')[0] || 
              xml.getElementsByTagName('nfeProc')[0]
  
  // Extrai dados
  const ide = infNFe.getElementsByTagName('ide')[0]
  const emit = infNFe.getElementsByTagName('emit')[0]
  const total = infNFe.getElementsByTagName('total')[0]
  // ...
}
```

#### 3. Verificação de Produtos
Para cada item do XML, o sistema verifica:

```typescript
const produtoExistente = produtos.find(p => 
  p.nome.toLowerCase() === item.descricao.toLowerCase() ||
  p.codigo === item.codigo_produto_nf ||
  p.codigo_barras === getTagValue(prod, 'cEAN')
)

if (produtoExistente) {
  item.acao = 'existente'
  item.produto_id = produtoExistente.id
} else {
  item.acao = 'cadastrado' // Será criado
}
```

#### 4. Opções por Item

| Opção | Descrição |
|-------|-----------|
| `cadastrar` | Cria novo produto e entrada no estoque |
| `substituir` | Usa produto existente, atualiza estoque |
| `ignorar` | Não processa o item |

#### 5. Processamento da Importação

```typescript
const handleImportNF = async () => {
  // 1. Verificar/Criar fornecedor
  let fornecedor = fornecedores.find(f => f.cnpj === xmlData.fornecedor.cnpj)
  if (!fornecedor) {
    fornecedor = await createFornecedor({...})
  }

  // 2. Processar itens
  for (const item of xmlData.itens) {
    if (acao === 'cadastrar') {
      const novoProduto = await createProduto({...})
      await createMovimentacaoEstoque({
        produto_id: novoProduto.id,
        tipo: 'entrada',
        quantidade: item.quantidade,
        // ...
      })
    } else if (acao === 'substituir') {
      await createMovimentacaoEstoque({
        produto_id: item.produto_id,
        tipo: 'entrada',
        // ...
      })
    }
  }

  // 3. Criar nota fiscal de entrada
  await createNotaFiscalEntrada({...}, itensProcessados)

  // 4. Criar conta a pagar (vencimento: 30 dias)
  await createContaPagar({
    fornecedor_id: fornecedor.id,
    valor: xmlData.valor_total,
    data_vencimento: dataVencimento,
    // ...
  })
}
```

---

## Configuração Fiscal

### Tela de Configuração
**Arquivo:** `src/app/configuracoes/fiscal/page.tsx`

### Campos Necessários

#### Dados do Emitente
| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| CNPJ | ✅ | CNPJ da empresa |
| Razão Social | ✅ | Nome empresarial |
| Nome Fantasia | ❌ | Nome comercial |
| Inscrição Estadual | ✅ | IE junto à SEFAZ |
| Inscrição Municipal | ❌ | Para NFSe |

#### Endereço
| Campo | Obrigatório |
|-------|-------------|
| Logradouro | ✅ |
| Número | ✅ |
| Complemento | ❌ |
| Bairro | ✅ |
| Município | ✅ |
| Código Município | ✅ |
| UF | ✅ |
| CEP | ✅ |

#### Configurações Fiscais
| Campo | Padrão | Descrição |
|-------|--------|-----------|
| Regime Tributário | 1 | 1=Simples, 2=Excesso, 3=Normal |
| Série NFe | 1 | Série das notas |
| CFOP Padrão | 5102 | Código Fiscal da Operação |
| Natureza Operação | Venda | Descrição da operação |

#### API Focus NFe
| Campo | Descrição |
|-------|-----------|
| Token | Chave de autenticação |
| Ambiente | homologacao / producao |
| CSC NFCe | Código de Segurança do Contribuinte |
| ID Token NFCe | Identificador do token |

---

## Integração Focus NFe

### Configuração da API
**Arquivo:** `src/lib/focusnfe.ts`

```typescript
const FOCUS_NFE_CONFIG = {
  token: '2ULj65rWvkjqHXwopIPyDZx7jxvZqCsk',
  ambiente: 'homologacao' as 'homologacao' | 'producao',
  
  get baseUrl(): string {
    return this.ambiente === 'producao' 
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br'
  },
  
  get authHeader(): string {
    return 'Basic ' + Buffer.from(this.token + ':').toString('base64')
  }
}
```

### Endpoints Utilizados

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/v2/nfe?ref={ref}` | Emitir NFe |
| GET | `/v2/nfe/{ref}` | Consultar NFe |
| DELETE | `/v2/nfe/{ref}` | Cancelar NFe |
| POST | `/v2/nfe/{ref}/carta_correcao` | Carta de Correção |
| POST | `/v2/nfe/{ref}/email` | Reenviar Email |

### Funções Disponíveis

| Função | Descrição |
|--------|-----------|
| `emitirNFe(ref, dados)` | Emite nova NF-e |
| `consultarNFe(ref, completa?)` | Consulta status |
| `aguardarAutorizacaoNFe(ref)` | Polling até autorização |
| `cancelarNFe(ref, justificativa)` | Cancela NF-e |
| `emitirCartaCorrecao(ref, correcao)` | Carta de correção |
| `reenviarEmailNFe(ref, emails)` | Reenvia por email |
| `baixarXmlNFe(caminho)` | Download do XML |
| `getUrlDanfe(caminho)` | URL do DANFE |
| `getUrlXml(caminho)` | URL do XML |

### Status Possíveis

| Status | Descrição |
|--------|-----------|
| `processando_autorizacao` | Em processamento |
| `autorizado` | Autorizada com sucesso |
| `cancelado` | Cancelada |
| `erro_autorizacao` | Erro na autorização |
| `denegado` | Denegada pela SEFAZ |

---

## Estrutura de Dados

### Tabela: config_fiscal

```sql
CREATE TABLE config_fiscal (
  id SERIAL PRIMARY KEY,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT NOT NULL,
  codigo_municipio TEXT NOT NULL,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  cep TEXT NOT NULL,
  telefone TEXT,
  regime_tributario INT DEFAULT 1,
  focusnfe_token TEXT,
  focusnfe_ambiente TEXT DEFAULT 'homologacao',
  serie_nfe INT DEFAULT 1,
  serie_nfce INT DEFAULT 1,
  natureza_operacao_padrao TEXT DEFAULT 'Venda',
  cfop_padrao TEXT DEFAULT '5102',
  informacoes_complementares TEXT,
  ativo BOOLEAN DEFAULT true
);
```

### Tabela: notas_fiscais

```sql
CREATE TABLE notas_fiscais (
  id SERIAL PRIMARY KEY,
  referencia TEXT UNIQUE NOT NULL,
  venda_id INT REFERENCES vendas(id),
  tipo TEXT NOT NULL DEFAULT 'nfe',
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  status TEXT DEFAULT 'pendente',
  status_sefaz TEXT,
  mensagem_sefaz TEXT,
  destinatario_nome TEXT,
  destinatario_documento TEXT,
  valor_total DECIMAL(15,2),
  valor_produtos DECIMAL(15,2),
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  url_xml TEXT,
  url_danfe TEXT,
  dados_envio JSONB,
  dados_retorno JSONB,
  emitida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: notas_fiscais_entrada

```sql
CREATE TABLE notas_fiscais_entrada (
  id SERIAL PRIMARY KEY,
  numero TEXT NOT NULL,
  serie TEXT,
  chave_acesso TEXT UNIQUE,
  data_emissao DATE,
  data_entrada DATE DEFAULT CURRENT_DATE,
  fornecedor_id INT REFERENCES fornecedores(id),
  fornecedor_cnpj TEXT,
  fornecedor_razao_social TEXT,
  valor_produtos DECIMAL(15,2),
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2),
  forma_pagamento TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Mapeamentos e Constantes

### Formas de Pagamento

| Código | Descrição |
|--------|-----------|
| 01 | Dinheiro |
| 02 | Cheque |
| 03 | Cartão de Crédito |
| 04 | Cartão de Débito |
| 05 | Crédito Loja |
| 15 | Boleto Bancário |
| 17 | PIX |
| 18 | Transferência Bancária |
| 90 | Sem Pagamento |
| 99 | Outros |

### ICMS - CSOSN (Simples Nacional)

| Código | Descrição |
|--------|-----------|
| 101 | Tributada com permissão de crédito |
| 102 | Tributada sem permissão de crédito |
| 103 | Isenção para faixa de receita bruta |
| 300 | Imune |
| 400 | Não tributada |
| 500 | ICMS cobrado anteriormente por ST |
| 900 | Outros |

### ICMS - CST (Regime Normal)

| Código | Descrição |
|--------|-----------|
| 00 | Tributada integralmente |
| 10 | Tributada com ICMS por ST |
| 20 | Com redução de base de cálculo |
| 40 | Isenta |
| 41 | Não tributada |
| 60 | ICMS cobrado anteriormente por ST |

### Origem do Produto

| Código | Descrição |
|--------|-----------|
| 0 | Nacional |
| 1 | Estrangeira - Importação direta |
| 2 | Estrangeira - Adquirida no mercado interno |

---

## Tratamento de Erros

### Erros Comuns da SEFAZ

| Código | Mensagem | Solução |
|--------|----------|---------|
| 225 | Rejeição: Falha no Schema XML | Verificar estrutura do XML |
| 301 | Uso de IE de não contribuinte | Verificar IE do destinatário |
| 539 | Duplicidade de NF-e | Verificar se já foi emitida |
| 593 | NCM inexistente | Corrigir código NCM |
| 778 | Informar CPF/CNPJ do destinatário | Incluir documento |

### Tratamento no Sistema

```typescript
try {
  const resultado = await emitirNFe(referencia, dadosNFe)
  // ... processamento
} catch (error: any) {
  console.error('Erro ao gerar nota fiscal:', error)
  alert(`❌ Erro ao gerar nota fiscal:\n\n${error.message || error}`)
}
```

---

## Limitações Conhecidas

### ⚠️ Atenção

| Item | Limitação | Impacto |
|------|-----------|---------|
| **Token** | Hardcoded no código | Risco de segurança |
| **NCM** | Usa '00000000' se não informado | Rejeição em produção |
| **CFOP** | Fixo em 5102 | Não diferencia operações |
| **Pagamento** | Sempre '01' (Dinheiro) | Dados incorretos |
| **Retry** | Não há retry automático | Falhas não são reprocessadas |
| **Fila** | Processamento síncrono | Timeout em volume alto |

### 🔄 Melhorias Planejadas

1. [ ] Mover token para variáveis de ambiente
2. [ ] NCM obrigatório por produto
3. [ ] CFOP dinâmico por operação/destino
4. [ ] Mapear forma de pagamento da venda
5. [ ] Implementar fila de processamento
6. [ ] Criar dashboard de monitoramento

---

## 📞 Suporte

Para dúvidas sobre a integração Focus NFe:
- **Documentação:** https://focusnfe.com.br/doc/
- **Suporte:** suporte@focusnfe.com.br

---

*Documentação gerada em 05/02/2026*
