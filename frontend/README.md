# Console de Observabilidade

Interface em HTML, CSS e JavaScript puro para monitorar o laboratório distribuído. Não exige npm, build ou Chart.js.

## Iniciar localmente

Abra três terminais **na raiz do repositório**.

**Terminal 1 — Go (motor de ingestão)**
```bash
cd backend-go
go run .
```

**Terminal 2 — PHP (API e dashboard)**
```bash
php -S localhost:8000 -t backend-php/public
```

**Terminal 3 — frontend**
```bash
python3 -m http.server 5500 --directory frontend
```

Acesse http://localhost:5500.

Para simular carga, em um quarto terminal na raiz do repositório:
```bash
python3 stress-test/load_test.py
```
O script envia rajadas de 100 requisições a cada 5 segundos. Encerre com Ctrl+C.

## Como os dados funcionam
- `GET http://localhost:8000/dashboard`: total de vendas, receita e ranking.
- `GET http://localhost:8000/produtos`: catálogo.
- `POST /produtos` e `DELETE /produtos/{id}`: ações na interface.
- `GET http://localhost:8080/api/v1/stats`: sucessos e erros Go.

O frontend atualiza a cada 2 segundos, mede o intervalo entre suas próprias amostras e mostra uma estimativa de requisições/s observada. Essa estimativa **não** é throughput medido pelo servidor nem substitui uma ferramenta de observabilidade. Os contadores Go se reiniciam quando o processo reinicia; as vendas no SQLite permanecem.

Se a tela mostrar APIs indisponíveis, confirme que Go e PHP estão rodando e que as portas 8080 e 8000 não estão ocupadas. Se os indicadores não se atualizam, consulte o console do navegador.

Fontes do Google Fonts são opcionais; o layout utiliza fontes do sistema quando offline.
