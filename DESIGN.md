# Design System — Distributed Lab Console

## Direção
Uma sala de controle técnica, calma e precisa. A interface é uma ferramenta de operação (*Operate*), não uma página promocional. O objetivo é permitir diagnóstico rápido da integração Go + PHP + SQLite.

## Tokens
- Fundo: `#0b0e12`
- Barra lateral: `#0e1217`
- Superfície: `#11161c`
- Superfície secundária: `#151b22`
- Divisória: `#242c35`
- Texto principal: `#eef3f1`
- Texto secundário: `#929fa8`
- Texto discreto: `#697782`
- Sinal positivo e ação principal: `#b4f1cd`
- Aviso: `#f1be81`
- Erro: `#f39797`
- Raio principal: `14px`
- Família de leitura: DM Sans com fallback de sistema
- Família para títulos e dados: Space Grotesk com fallback de sistema

Esses valores são definidos como custom properties em `frontend/styles.css`.

## Hierarquia
1. Estado das duas APIs, com transparência sobre indisponibilidade.
2. Indicadores de vendas persistidas e contadores de processo Go.
3. Histórico local de atividade, a partir de deltas dos contadores.
4. Ranking real de produtos vendidos.
5. Papel de cada serviço e endpoints.
6. Catálogo com busca, criação e exclusão confirmada.

## Comportamento
- Atualização a cada 2s enquanto a página está visível.
- Preservar os últimos números conhecidos quando a conexão falhar, mas indicar o estado de conexão em separado.
- Contador Go reiniciado limpa o histórico local para evitar rajadas falsas.
- Exibir feedback de falha/sucesso para operações mutáveis.
- Nunca substituir métricas indisponíveis por valores falsos.

## Componentes
- Navegação lateral colapsa para navegação horizontal em telas pequenas.
- Cards numéricos têm rótulos que distinguem a fonte de dados.
- Barras verticais representam atividade capturada nesta aba.
- Barras horizontais representam volume persistido por produto.
- O catálogo apresenta estados vazio, filtro, erro e diálogo de confirmação.
- Ícones SVG de traço uniforme; foco de teclado visível.

## Critérios de qualidade
- Em telas desktop e móveis, sem rolagem horizontal da página.
- Texto legível e contraste adequado.
- Responsivo nos breakpoints 1250, 1050, 760 e 520 pixels.
- Respeitar `prefers-reduced-motion`.
- Manter HTML semântico, rótulos de formulário e conteúdo de servidor inserido apenas via `textContent`.
