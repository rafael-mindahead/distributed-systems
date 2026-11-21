<?php

namespace App\Models;

use App\Core\Database;
use PDO;

class Venda
{
    private PDO $db;
    public function __construct()
    {
        $this->db = Database::getConnection();
    }
    public function obterMetricasPorProduto(): array
    {
        $sql = "
        SELECT
            p.nome,
            COALESCE(SUM(v.quantidades), 0) AS total_qtd,
            COALESCE(SUM(v.valor_total), 0 ) AS faturamento
        FROM produtos p
        LEFT JOIN vendas v ON p.id = v.produto_id
        GROUP BY p.id
        ORDER BY total_qtd DESC
        ";
        return $this->db->query($sql)->fetchAll();
    }
    public function obterResumoGeral(): array
    {
        $sql = "
        SELECT 
            COUNT(*) AS total_vendas,
            COALESCE(SUM(valor_total), 0) AS receita_total,
        FROM vendas
        ";
        return $this->db->query($sql)->fetch();
    }
}
