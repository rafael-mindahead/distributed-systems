<?php
namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;
    public static function getConnection(): PDO
    {
        if(self::$instance === null){
            try {
                $dbPath = __DIR__ . '/../../data/sistema.db';
                self::$instance = new PDO('sqlite:' . $dbPath);
                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

                // Configurações críticas para evitar lock com o Go
                self::$instance->exec('PRAGMA journal_mode = WAL;');
                self::$instance->exec('PRAGMA busy_timeout = 5000;');
            } catch (PDOException $e){
                http_response_code(500);
                die(json_encode(['error'=> 'erro na conexao com o banco de dados:' .$e->getMessage()]));
            }
        }
        return self::$instance;
    }
}