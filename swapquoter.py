import requests

BASE_URL = "http://localhost:3005"

# DYN pool
def get_pool_info(node_url: str, pool_address: str):
    params = {
        "nodeUrl": node_url,
        "poolAddress": pool_address
    }
    response = requests.get(f"{BASE_URL}/getPoolInfo", params=params)
    if response.status_code == 200:
        print("池子信息：")
        print(response.json())
    else:
        print("获取池子信息失败：", response.text)

# DYN pool
def get_swap_quote(node_url: str, pool_address: str, swap_amount: str, swap_atob: bool):
    params = {
        "nodeUrl": node_url,
        "poolAddress": pool_address,
        "swapAmount": swap_amount,  # 注意传入的是字符串，后端会转为 BN
        "swapAtoB": str(swap_atob).lower()  # 转换为 "true" 或 "false"
    }
    response = requests.get(f"{BASE_URL}/swapQuote", params=params)
    if response.status_code == 200:
        print("Swap Quote：")
        print(response.json())
    else:
        print("获取询价失败：", response.text)

# DLMM pool
def get_dlmm_swap_quote(node_url: str, pool_address: str, swap_amount: str, token: str, limit: int = 10):
    params = {
        "nodeUrl": node_url,
        "poolAddress": pool_address,
        "swapAmount": swap_amount,  # 传入字符串形式的金额（单位：最小单位）
        "token": token,  # 传入 token 地址（池子中的 tokenX 或 tokenY）
        "limit": str(limit)
    }
    response = requests.get(f"{BASE_URL}/dlmmSwapQuote", params=params)
    if response.status_code == 200:
        print("DLMM Swap Quote:")
        print(response.json())
    else:
        print("获取 DLMM 询价失败：", response.status_code, response.text)
      
if __name__ == "__main__":
  
    pool_address = "Gc9yHrCpcUMXCw1YhAVTcrUb6ZGbCv7ns363FZpDTbHW"
    get_pool_info(RPC, pool_address)

    swap_amount = f"{1 * 10 ** 9}"  # 例如 10_000_000_000
    get_swap_quote(RPC, pool_address, swap_amount, False)

    pool_address = "9d9mb8kooFfaD3SctgZtkxQypkshx6ezhbKio89ixyy2"
    swap_amount = f"{100 * 10 **6}"  # 例如 100,000,000（注意单位为最小单位）
    token_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # 请替换为实际值
    get_dlmm_swap_quote(RPC, pool_address, swap_amount, token_address, limit=10)

    # 还有一种方式询价，适合dlmm池子，需要安装dlmm库(https://github.com/MeteoraAg/dlmm-sdk/tree/main/python-client/dlmm)

    from dlmm import DLMM_CLIENT
    from solders.pubkey import Pubkey

    # 配置 RPC 节点（例如使用 devnet）
    RPC = "https://tiniest-delicate-mound.solana-mainnet.quiknode.pro/b6ca20fa07dc7ad522eee465f7285301c2025697/"

    # 指定你想操作的流动性池地址（可从 https://dlmm-api.meteora.ag/pair/all 获取）
    pool_address = Pubkey.from_string("Gc9yHrCpcUMXCw1YhAVTcrUb6ZGbCv7ns363FZpDTbHW")

    # 创建 DLMM 客户端实例
    dlmm = DLMM_CLIENT.create(pool_address, RPC)

    # 设置询价参数
    input_amount = 1000  # 单位通常是 lamport
    swap_y_to_x = False  # True 表示以代币 Y 作为输入，代币 X 作为输出
    tolerance = 10 # 0 表示 0.10%

    # 先调用 get_bin_array_for_swap 方法获取 binArrays
    bin_arrays = dlmm.get_bin_array_for_swap(swap_y_to_x)

    # 然后调用 swap_quote 方法，传入所有四个参数
    quote = dlmm.swap_quote(input_amount, swap_y_to_x, tolerance, bin_arrays)

    print("Swap Quote:", quote.out_amount)
    import requests
    url = 'https://amm-v2.meteora.ag/pools?address=Gc9yHrCpcUMXCw1YhAVTcrUb6ZGbCv7ns363FZpDTbHW'
    while True:
        data = requests.get(url).json()
        print(data)
