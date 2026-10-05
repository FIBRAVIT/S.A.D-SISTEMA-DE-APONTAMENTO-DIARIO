# 📋 S.P.A.D.O – Sistema de Planejamento e Apontamento Diário Operacional

Sistema web para registro diário de colaboradores e veículos por Centro de Custo/Site, com dashboard de indicadores, relatórios e gestão de cadastros.

---

## 🚀 PASSO A PASSO DE CONFIGURAÇÃO

### ETAPA 1 – Criar a Planilha no Google Sheets

1. Acesse [https://sheets.google.com](https://sheets.google.com)
2. Clique em **"+ Em branco"** para criar uma nova planilha
3. Dê o nome: **S.P.A.D.O – Banco de Dados**
4. Copie o **ID da planilha** da URL:
   ```
   https://docs.google.com/spreadsheets/d/[COPIE_ESTE_TRECHO]/edit
   ```

---

### ETAPA 2 – Configurar o Google Apps Script (Backend)

1. Acesse [https://script.google.com](https://script.google.com)
2. Clique em **"Novo projeto"**
3. Apague o código existente
4. Cole **todo o conteúdo** do arquivo `google-apps-script.js`
5. No topo do código, substitua:
   ```javascript
   const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI';
   ```
   pelo ID copiado na Etapa 1.

6. Salve o projeto (Ctrl+S) e dê o nome: **S.P.A.D.O Backend**

7. **Inicialize a planilha:**
   - No menu superior, selecione a função `testarSistema`
   - Clique em ▶️ **Executar**
   - Autorize as permissões quando solicitado
   - Verifique no Log que apareceu: `"Planilha inicializada com sucesso!"`

8. **Implante como Web App:**
   - Clique em **"Implantar"** > **"Nova implantação"**
   - Tipo: **Aplicativo da Web**
   - Descrição: `v1`
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - Clique em **"Implantar"**
   - **Copie a URL gerada** (começa com `https://script.google.com/macros/s/...`)

---

### ETAPA 3 – Configurar o Sistema Web

1. Abra o arquivo `app.js`
2. No topo, substitua:
   ```javascript
   SCRIPT_URL: 'https://script.google.com/macros/s/SEU_SCRIPT_ID_AQUI/exec',
   ```
   pela URL copiada na Etapa 2.

---

### ETAPA 4 – Publicar no GitHub Pages

1. Crie uma conta em [https://github.com](https://github.com) (se não tiver)
2. Clique em **"New repository"**
3. Nome: `apontafacil` (ou outro de sua preferência)
4. Marque como **Public**
5. Clique em **"Create repository"**
6. Faça upload de **todos os arquivos**:
   - `index.html`
   - `dashboard.html`
   - `style.css`
   - `app.js`
   > ⚠️ **NÃO** suba o `google-apps-script.js` nem o `README.md` (são apenas para configuração)

7. Ative o GitHub Pages:
   - Vá em **Settings** > **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / pasta: **/ (root)**
   - Clique em **Save**

8. Aguarde ~2 minutos e acesse o link:
   ```
   https://SEU_USUARIO.github.io/apontafacil/
   ```

---

## 🔐 Acessos Padrão

| Perfil | Usuário | Senha | Permissões |
|--------|---------|-------|------------|
| 👑 Admin | `admin` | `admin123` | Tudo |
| 👔 Coordenador | *(cadastrar)* | *(definir)* | Apontamentos + Relatórios + Dashboard |
| 👷 Supervisor | *(cadastrar)* | *(definir)* | Apenas Apontamentos |

> ⚠️ **Altere a senha do admin imediatamente após o primeiro acesso!**

---

## 📁 Estrutura de Arquivos

```
apontafacil/
├── index.html          → Página de login
├── dashboard.html      → Sistema completo (dashboard, apontamentos, relatórios, cadastros)
├── style.css           → Design e estilos
├── app.js              → Lógica do sistema + integração Google Sheets
├── google-apps-script.js → Backend (configurar no Google Apps Script)
└── README.md           → Este arquivo
```

---

## 📊 Abas da Planilha (criadas automaticamente)

| Aba | Descrição |
|-----|-----------|
| `usuarios` | Usuários do sistema com perfis e senhas (hash SHA-256) |
| `colaboradores` | Cadastro de colaboradores |
| `veiculos` | Cadastro de veículos |
| `sites` | Centros de custo / sites |
| `servicos` | Tipos de serviços/atividades |
| `apontamentos` | Todos os registros diários |

---

## 🔄 Fluxo de Uso Diário

```
🌅 MANHÃ
  └─ Apontamentos → Novo Apontamento
       ├─ Seleciona: Colaborador
       ├─ Seleciona: Veículo (opcional)
       ├─ Seleciona: Site / Centro de Custo
       ├─ Seleciona: Serviço / Atividade
       └─ Informa: Hora Inicial → SALVAR

🌇 FINAL DO DIA
  └─ Apontamentos → Localiza o registro → Clica "Concluir"
       └─ Informa: Hora Final → CONFIRMAR ✅
```

---

## 📈 Indicadores do Dashboard

| Indicador | Descrição |
|-----------|-----------|
| 📋 Apontamentos Hoje | Total de registros do dia |
| 🟡 Em Andamento | Registros sem hora final |
| ✅ Concluídos | Registros finalizados |
| 👷 Colaboradores em Campo | Colaboradores únicos hoje |
| 🚗 Veículos em Uso | Veículos alocados hoje |
| ⏱️ Horas Totais | Soma de horas dos concluídos |
| 📐 Média por Serviço | Média de horas por serviço |
| ⚠️ Registros em Aberto | Pendentes de conclusão |

---

## 🛠️ Solução de Problemas

**Login não funciona após configurar o Script:**
- Verifique se a URL do Script está correta em `app.js`
- Confirme que a implantação está como "Qualquer pessoa"
- Execute `testarSistema()` no Apps Script e verifique os logs

**Dados não aparecem:**
- Abra o Console do navegador (F12) e verifique erros
- Confirme que a planilha foi inicializada (execute `testarSistema`)
- Verifique se o ID da planilha está correto no Apps Script

**Erro de CORS:**
- Isso é normal durante desenvolvimento local
- O sistema funciona corretamente quando publicado no GitHub Pages

**Reimplantar após alterações no Apps Script:**
- Clique em "Implantar" > "Gerenciar implantações"
- Clique no ✏️ (editar) > selecione "Nova versão"
- Clique em "Implantar"

---

## 📞 Suporte

Para dúvidas sobre configuração, verifique:
1. Os logs do Google Apps Script (Execuções > Ver logs)
2. O Console do navegador (F12 > Console)
3. As permissões da planilha (deve estar acessível pela conta do Script)