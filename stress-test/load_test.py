import asyncio
import aiohttp
import random
import time

PHP_PRODUTOS_URL = "http://localhost:8000/api.php?acao=produtos"
GO_VENDA_URL = "http://localhost:8080/api/v1/venda"
BATCH_SIZE = 100
INTERVALO_SEGUNDOS = 5

async def buscar_produtos(session):
    async with session.get(PHP_PRODUTOS_URL) as resp:
        produtos = await resp.json()
        return [p["id"] for p in produtos if int(p["estoque"]) > 0]

async def enviar_venda(session, produto_id):
    payload = {
        "produto_id": produto_id,
        "quantidade": random.randint(1, 3)
    }
    try:
        async with session.post(GO_VENDA_URL, json=payload) as resp:
            return resp.status
    except Exception:
        return 500

async def executar_rajada():
    async with aiohttp.ClientSession() as session:
        while True:
            inicio = time.perf_counter()
            ids_produtos = await buscar_produtos(session)

            if not ids_produtos:
                print("[AVISO] Nenhum produto com estoque disponível. Aguardando...")
                await asyncio.sleep(INTERVALO_SEGUNDOS)
                continue

            # Cria 100 tarefas simultâneas escolhendo produtos aleatórios
            tarefas = [
                enviar_venda(session, random.choice(ids_produtos))
                for _ in range(BATCH_SIZE)
            ]

            resultados = await asyncio.gather(*tarefas)
            duracao = (time.perf_counter() - inicio) * 1000

            sucessos = resultados.count(200)
            falhas = len(resultados) - sucessos

            print(f"[RAJADA {BATCH_SIZE} REQS] Concluída em {duracao:.1f}ms | HTTP 200: {sucessos} | Falhas: {falhas}")
            await asyncio.sleep(INTERVALO_SEGUNDOS)

if __name__ == "__main__":
    print(f"Iniciando teste distribuído: {BATCH_SIZE} vendas a cada {INTERVALO_SEGUNDOS}s...")
    asyncio.run(executar_rajada())