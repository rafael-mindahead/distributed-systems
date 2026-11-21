<?php

namespace App\Controllers;

use App\Models\Produto;

class ProdutoController
{
    private Produto $produtoModel;

    public function __construct()
    {
        $this->produtoModel = new Produto();
    }
    public function index(): void
    {
        $produtos = $this->produtosModel->listarTodos();
        echo json_encode($produtos);
    }
    public function store(): void
    {
        $dados = json_decode(file_get_contents('php://input'), true);
        if (empty($dados['nome']) || !isset($dados['preco'], $dados['estoque'])){
            http_response_code(400);
            echo json_encode(['error' => 'Campo obrigatorios: nome, preco e estoque']);
            return;
        }
        $id = $this->produtoModel->criar(
            trim($dados['nome']),
            (float)$dados['preco'],
            (int)$dados['estoque']
        );
        http_response_code(201);
        echo json_encode(['id' => $id]);
    }
    public function destroy(int $id): void
    {
        $this->produtoModel->deletar($id);
        echo json_encode(['message' => 'Produto deletado com sucesso']);
    }
}