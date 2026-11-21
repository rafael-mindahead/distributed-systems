# Distributed Systems Lab

## Produto
Laboratório didático de sistemas distribuídos com ingestão concorrente em Go, API REST em PHP, SQLite compartilhado e gerador de carga em Python. O frontend é um console local para observar o resultado desses serviços e gerenciar produtos.

## Usuários
Desenvolvedores e estudantes que estão examinando concorrência, transações e as interações entre serviços.

## Plataforma
Interface web responsiva, em português do Brasil, servida localmente. Não requer bundler.

## Objetivos principais
- Visualizar vendas persistidas, receita e volumes por produto via PHP.
- Acompanhar sucessos e erros do Go desde o início do processo.
- Observar atividade por amostras calculadas da diferença dos contadores Go entre duas leituras (não são dados históricos persistidos).
- Consultar, cadastrar e excluir produtos via API PHP.
- Compreender os papéis de Go, PHP e SQLite WAL.

## Fontes de verdade
- PHP `GET /dashboard`: `resumo.total_vendas`, `resumo.receita_total` e `por_produto`.
- PHP `GET /produtos`, `POST /produtos`, `DELETE /produtos/:id`.
- Go `GET /api/v1/stats`: contadores `sucesso` e `erros`.
- SQLite `data/sistema.db`: persistência compartilhada.

## Restrições
- Os contadores Go pertencem à sessão do processo; podem zerar após reinício.
- Receita e vendas são acumulados no SQLite, não comparáveis diretamente aos contadores Go.
- A taxa em req/s exibida no frontend é derivada da diferença observada entre duas leituras, não representa métricas como p95/p99 nem medições no servidor.
- Não há endpoint dedicado para medir a saúde do SQLite; a UI não afirma medi-la.
- Não exibir dados fictícios como se fossem reais.
- Atualização automática a cada 2 segundos enquanto a aba está visível.
- Manter interface funcional sem conexão com servidores externos; fontes web opcionais têm fallback local.
