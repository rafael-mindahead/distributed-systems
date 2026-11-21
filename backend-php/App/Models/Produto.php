<?php

namespace App\Models;

use App\Core\Database;
use PDO;

class Produto
{
    private PDO $db;
    public function __construct()
    {
        $this->db = Database::getConnection();
    }
    
    public function listarTodos(): array
    {
        $stmt = $this->db->query("
        SELECT 
        id,
        nome,
        preco,
        estoque
        FROM produtos
        ORDER BY id DESC
        "
        );
        return $stmt->fetchAll();
    }
    public function criar (string $nome, float $preco, int $estoque): int
    {
        $sql = "
        INSERT INTO produtos
        (nome, preco, estoque)
        VALUES
        (:nome, :preco, :estoque)
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nome' => $nome,
            ':preco' => $preco,
            ':estoque' => $estoque
        ]);
        return (int)$this->db->lastInsertId();
        }
        public function deletar(int $id): bool
        {
            $stmt = $this->db->prepare("
            DELETE FROM produtos
            WHERE id = :id
            ");
            return $stmt->execute(["id" => $id]);
    }
}