um teste afim de aprendar sistemas distribuidos, php atua como API REST ficando responsavel pelo CRUD e Comunicacao, Ja GO atua com processador de requisiçoes afim de que os dados sejam tratados e distribuidos, Python fica com o Script que manda 100 req de uma vez a cada 5 segundos afim de testar o GO + PHP, no Banco temos Sqlite, no front Html/Css/jS...


GO:
WAL= WRITE AHEADLOGGIN = permite que o php leia os dados para o grafico ao mesmo tempo que que Go escreve novas vendas
_busy_timeout = quando 100 goroutines tentam escrever ao mesmo tempo, o sqlite so aceita uma de cada vez
databse is locekd= faz a goroutines esperar ate 5 segundos na fila

SetMaxOpenConns = limita o numero de conexoes simultaneas abertas pelo Go no banco, evitando disputa excessiva

transacao atomica, db.Begin, defer tx.rollback, tx.commit: Eles garantem a integridade dos dados sobre alta concorrencia.
atomic.LoadUint64: para ler de forma segura sem (race condition)

COMANDOS PARA RODAR O PROJETO
cd backend-go
go run .
php -S localhost:8000 -t backend-php/public
python3 -m http.server 5500 --directory frontend
python3 stress-test/load_test.py
todos em terminais diferentes
