package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync/atomic"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type VendaRequest struct {
	ProdutoID  int `json:"produto_id"`
	Quantidade int `json:"quantidade"`
}

var (
	db            *sql.DB
	totalVendasOK uint64
	totalErros    uint64
)

func initDB() {
	os.MKdirAll("../data", os.ModePerm)
	var err error
	db, err = sql.Open("sqlite3", "../data/sistema.db?_journal_mode=WAL&_busy_timeout=5000&_synchronous=NORMAL")
	if err != nil {
		log.Fatal(err)
	}
	db.SetMaxConns(10)
	db.SetMaxIdleConns(5)
	schema := `
	CREATE TABLE IF NOT EXISTS produtos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		nome TEXT NOT NULL,
		preco REAL NOT NULL,
		estoque INTEGER NOT NULL
	);
	CREATE TABLE IF NOT EXISTS vendas (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		produto_id INTEGER NOT NULL,
		quantidade INTEGER NOT NULL,
		valor_total REAL NOT NULL,
		criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(produto_id) REFERENCES produtos(id)
	);`

	if _, err := db.Exec(schema); err != nil {
		log.Fatal("Erro ao criar tabelas:", err)
	}

	// Seed inicial caso não existam produtos
	var count int
	db.QueryRow("SELECT COUNT(*) FROM produtos").Scan(&count)
	if count == 0 {
		seed := `
		INSERT INTO produtos (nome, preco, estoque) VALUES
		('Teclado Mecânico RGB', 350.00, 50000),
		('Mouse Gamer Wireless', 220.50, 50000),
		('Monitor 27" 165Hz', 1450.00, 50000),
		('Headset 7.1 Surround', 290.00, 50000),
		('SSD NVMe 1TB', 480.00, 50000),
		('Placa de Vídeo RTX 5060', 2800.00, 50000),
		('Memória RAM 32GB DDR5', 750.00, 50000),
		('Microfone Condensador', 310.00, 50000),
		('Webcam Full HD 60fps', 195.00, 50000),
		('Cadeira Ergonômica', 1200.00, 50000);`
		db.Exec(seed)
		fmt.Println("[DB] Banco populado com 10 produtos iniciais.")
	}
}
func registrarVendaHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método não permitido", http.StatusMethodNotAllowed)
		return
	}

	var req VendaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		atomic.AddUint64(&totalErros, 1)
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		atomic.AddUint64(&totalErros, 1)
		http.Error(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var preco float64
	var estoque int
	err = tx.QueryRow("SELECT preco, estoque FROM produtos WHERE id = ?", req.ProdutoID).Scan(&preco, &estoque)
	if err != nil || estoque < req.Quantidade {
		atomic.AddUint64(&totalErros, 1)
		http.Error(w, "Produto indisponível ou sem estoque", http.StatusConflict)
		return
	}

	valorTotal := preco * float64(req.Quantidade)
	_, err = tx.Exec("UPDATE produtos SET estoque = estoque - ? WHERE id = ?", req.Quantidade, req.ProdutoID)
	if err != nil {
		atomic.AddUint64(&totalErros, 1)
		http.Error(w, "Erro ao atualizar estoque", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("INSERT INTO vendas (produto_id, quantidade, valor_total) VALUES (?, ?, ?)", req.ProdutoID, req.Quantidade, valorTotal)
	if err != nil {
		atomic.AddUint64(&totalErros, 1)
		http.Error(w, "Erro ao registrar venda", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		atomic.AddUint64(&totalErros, 1)
		http.Error(w, "Erro no commit", http.StatusInternalServerError)
		return
	}

	atomic.AddUint64(&totalVendasOK, 1)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"status": "ok", "total": valorTotal})
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]uint64{
		"sucesso": atomic.LoadUint64(&totalVendasOK),
		"erros":   atomic.LoadUint64(&totalErros),
	})
}

func main() {
	initDB()
	defer db.Close()

	// Monitor no terminal a cada 5s
	go func() {
		for range time.Tick(5 * time.Second) {
			fmt.Printf("[GO ENGINE] Vendas OK: %d | Erros/Lock: %d\n",
				atomic.LoadUint64(&totalVendasOK), atomic.LoadUint64(&totalErros))
		}
	}()

	http.HandleFunc("/api/v1/venda", registrarVendaHandler)
	http.HandleFunc("/api/v1/stats", statsHandler)

	fmt.Println("Serviço Go rodando na porta :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
