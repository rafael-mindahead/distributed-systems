import json
import random
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

PHP_PRODUTOS_URL = "http://localhost:8000/produtos"
GO_VENDA_URL = "http://localhost:8080/api/v1/venda"
BATCH_SIZE = 100
INTERVALO_SEGUNDOS = 5

def buscar_produtos():
    try:
        with urllib.request.urlopen(PHP_PRODUTOS_URL, timeout=5) as resp:
            produtos = json.loads(resp.read().decode())
            return [p["id"] for p in produtos if int(p["estoque"]) > 0]
    except Exception as e:
        print(f"[ERRO PHP] Falha ao buscar produtos: {e}")
        return []

def enviar_venda(produto_id):
    payload = json.dumps({
        "produto_id": produto_id,
        "quantidade": random.randint(1, 3)
    }).encode("utf-8")

    req = urllib.request.Request(
        GO_VENDA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except Exception:
        return 500

def executar_rajada():
    print(f"Iniciando teste distribuído (Nativo): {BATCH_SIZE} vendas a cada {INTERVALO_SEGUNDOS}s...")
    with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
        while True:
            inicio = time.perf_counter()
            ids_produtos = buscar_produtos()

            if not ids_produtos:
                print("[AVISO] Nenhum produto com estoque disponível. Aguardando...")
                time.sleep(INTERVALO_SEGUNDOS)
                continue

            # Dispara 100 threads simultâneas
            escolhas = [random.choice(ids_produtos) for _ in range(BATCH_SIZE)]
            resultados = list(executor.map(enviar_venda, escolhas))

            duracao = (time.perf_counter() - inicio) * 1000
            sucessos = resultados.count(200)
            falhas = len(resultados) - sucessos

            print(f"[RAJADA {BATCH_SIZE} REQS] Concluída em {duracao:.1f}ms | HTTP 200: {sucessos} | Falhas: {falhas}")
            time.sleep(INTERVALO_SEGUNDOS)

if __name__ == "__main__":
    executar_rajada()