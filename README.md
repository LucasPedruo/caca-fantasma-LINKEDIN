# Caça-Fantasma LinkedIn

![alt](img/img.jpg)

Extensão para Chrome que automatiza a remoção de conexões no LinkedIn, ideal para limpar contatos inativos ou irrelevantes de forma rápida e prática.

## 📌 Funcionalidades
Abrir a página de conexões do LinkedIn automaticamente.

Iniciar e parar o processo de remoção de conexões.

Interface simples com botões para controle.

Exibição de status em tempo real durante o processo.

Sistema de HUD (notificação fixa na tela) mostrando progresso da limpeza.

## 🚀 Como funciona
A extensão injeta um script na página de conexões do LinkedIn e:

Localiza o botão de ações da primeira conexão visível.

Clica em "Remover conexão" e confirma a exclusão.

Passa para a próxima conexão, repetindo o processo.

Mostra o total de conexões removidas no HUD.

## 📂 Estrutura do projeto

├── background.js       # Gerencia abertura de abas e comunicação
├── content.js          # Lógica de remoção de conexões dentro do LinkedIn
├── manifest.json       # Configuração da extensão
├── popup.html          # Interface popup da extensão
├── popup.js            # Lógica do popup (controle da limpeza)
├── popup.patched.js    # Versão alternativa do popup.js
├── style.css           # Estilos para popup
├── img/                # Ícones e imagens

## 🛠 Instalação (modo desenvolvedor)
Baixe ou clone este repositório.

No Chrome, abra chrome://extensions/.

Ative o Modo do desenvolvedor.

Clique em Carregar sem compactação e selecione a pasta do projeto.

A extensão aparecerá na barra de ferramentas.

## 📖 Uso
Clique no ícone da extensão no Chrome.

Clique em "Ir para Conexões" para abrir a página de conexões do LinkedIn.

Clique em "Iniciar limpeza" para começar o processo.

Para interromper, clique em "Parar".

# ⚠ Atenção:

Este script realiza ações automatizadas no LinkedIn. Use com moderação para evitar restrições na conta.

Não recomendado remover um grande número de conexões de uma só vez para evitar bloqueios temporários.

##📜 Permissões usadas
tabs: Abrir e gerenciar abas do Chrome.

scripting: Injetar scripts nas páginas do LinkedIn.

storage: Salvar informações temporárias, como a última aba usada.

host_permissions: Acessar páginas linkedin.com.
