<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Autoloader PSR-4 manual para o namespace App\
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../App/';

    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use App\Controllers\ProdutoController;
use App\Controllers\DashboardController;

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Roteamento limpo
if ($uri === '/produtos' && $method === 'GET') {
    (new ProdutoController())->index();
} elseif ($uri === '/produtos' && $method === 'POST') {
    (new ProdutoController())->store();
} elseif (preg_match('#^/produtos/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
    (new ProdutoController())->destroy((int) $matches[1]);
} elseif ($uri === '/dashboard' && $method === 'GET') {
    (new DashboardController())->metricas();
} else {
    http_response_code(404);
    echo json_encode(['erro' => 'Rota não encontrada: ' . $uri]);
}