<?php

namespace App\Controllers;

use App\Models\Venda;

class DashboardController
{
    private Venda $vendaModel;

    public function __construct()
    {
        $this->vendaModel = new Venda();
    }

    public function metricas(): void
    {
        echo json_encode([
            'por_produto' => $this->vendaModel->obterMetricasPorProduto(),
            'resumo' => $this->vendaModel->obterResumoGeral()
        ]);
    }
}