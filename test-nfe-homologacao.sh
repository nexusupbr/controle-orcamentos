#!/bin/bash
# =====================================================
# Script de Teste - Emissão NFe Focus NFe
# IRRIGA CENTRO OESTE LTDA - CNPJ: 41.852.934/0001-39
# =====================================================

# Configurações
FOCUS_TOKEN="U1s9w91tDgYRCX8LRBgG38Xtij2KJDtR"
FOCUS_URL="https://homologacao.focusnfe.com.br"
REF="ANDRESSA-$(date +%Y%m%d%H%M%S)"

# Dados da empresa (IRRIGA CENTRO OESTE)
CNPJ_EMITENTE="41852934000139"
INSCRICAO_ESTADUAL="138722250"
RAZAO_SOCIAL="IRRIGA CENTRO OESTE LTDA"
LOGRADOURO="R ALCIDES FAGANELO"
NUMERO="5051"
BAIRRO="JARDIM CARIBE"
CODIGO_MUNICIPIO="5107909"
MUNICIPIO="SINOP"
UF="MT"
CEP="78554264"

echo "====================================="
echo "🧪 Teste de Emissão NFe - Homologação"
echo "====================================="
echo "Referência: $REF"
echo ""

# 1. Emitir NFe
echo "📤 Enviando NFe para Focus NFe..."
RESPONSE=$(curl -s -u "$FOCUS_TOKEN:" \
  -H "Content-Type: application/json" \
  -X POST "$FOCUS_URL/v2/nfe?ref=$REF" \
  -d "{
    \"natureza_operacao\": \"VENDA\",
    \"forma_pagamento\": \"0\",
    \"tipo_documento\": \"1\",
    \"finalidade_emissao\": \"1\",
    \"consumidor_final\": \"1\",
    \"presenca_comprador\": \"1\",
    
    \"cnpj_emitente\": \"$CNPJ_EMITENTE\",
    \"inscricao_estadual_emitente\": \"$INSCRICAO_ESTADUAL\",
    \"nome_emitente\": \"$RAZAO_SOCIAL\",
    \"logradouro_emitente\": \"$LOGRADOURO\",
    \"numero_emitente\": \"$NUMERO\",
    \"bairro_emitente\": \"$BAIRRO\",
    \"municipio_emitente\": \"$MUNICIPIO\",
    \"uf_emitente\": \"$UF\",
    \"cep_emitente\": \"$CEP\",
    \"codigo_municipio_emitente\": \"$CODIGO_MUNICIPIO\",
    \"regime_tributario_emitente\": \"1\",
    
    \"nome_destinatario\": \"NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL\",
    \"cpf_destinatario\": \"12345678909\",
    \"indicador_inscricao_estadual_destinatario\": \"9\",
    \"logradouro_destinatario\": \"Rua Teste\",
    \"numero_destinatario\": \"100\",
    \"bairro_destinatario\": \"Centro\",
    \"municipio_destinatario\": \"Sao Paulo\",
    \"uf_destinatario\": \"SP\",
    \"cep_destinatario\": \"01310100\",
    \"codigo_municipio_destinatario\": \"3550308\",
    \"pais_destinatario\": \"Brasil\",
    \"codigo_pais_destinatario\": \"1058\",
    
    \"items\": [{
      \"numero_item\": \"1\",
      \"codigo_produto\": \"001\",
      \"descricao\": \"PRODUTO TESTE HOMOLOGACAO\",
      \"cfop\": \"5102\",
      \"unidade_comercial\": \"UN\",
      \"quantidade_comercial\": \"1.0000\",
      \"valor_unitario_comercial\": \"100.00\",
      \"valor_bruto\": \"100.00\",
      \"unidade_tributavel\": \"UN\",
      \"quantidade_tributavel\": \"1.0000\",
      \"valor_unitario_tributavel\": \"100.00\",
      \"origem\": \"0\",
      \"ncm\": \"00000000\",
      \"inclui_no_total\": \"1\",
      \"icms_situacao_tributaria\": \"102\",
      \"icms_origem\": \"0\",
      \"pis_situacao_tributaria\": \"07\",
      \"cofins_situacao_tributaria\": \"07\"
    }],
    
    \"formas_pagamento\": [{
      \"forma_pagamento\": \"01\",
      \"valor_pagamento\": \"100.00\"
    }]
  }")

echo "Resposta: $RESPONSE"
echo ""

# 2. Aguardar processamento
echo "⏳ Aguardando 5 segundos para processamento..."
sleep 5

# 3. Consultar status
echo "🔍 Consultando status da NFe..."
STATUS=$(curl -s -u "$FOCUS_TOKEN:" "$FOCUS_URL/v2/nfe/$REF")
echo "Status: $STATUS"
echo ""

# Extrair status
STATUS_SEFAZ=$(echo $STATUS | grep -o '"status":"[^"]*"' | head -1)
echo "====================================="
echo "📋 Resultado: $STATUS_SEFAZ"
echo "====================================="
