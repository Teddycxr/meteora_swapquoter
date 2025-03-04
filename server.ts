import express from 'express';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Wallet, AnchorProvider } from '@coral-xyz/anchor';
import AmmImpl from '@meteora-ag/dynamic-amm-sdk';
import DLMM from '@meteora-ag/dlmm';

const app = express();
app.use(express.json());

function createProvider(nodeUrl: string): AnchorProvider {
  const connection = new Connection(nodeUrl);
  const wallet = new Wallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
}

/**
 * 获取 AMM 池子信息接口
 * GET /getPoolInfo?nodeUrl=xxx&poolAddress=xxx
 */
app.get('/getPoolInfo', (req, res) => {
  (async () => {
    const { nodeUrl, poolAddress } = req.query;
    if (!nodeUrl || !poolAddress) {
      res.status(400).json({ error: '缺少 nodeUrl 或 poolAddress 参数' });
      return;
    }

    const provider = createProvider(nodeUrl as string);
    const poolPubkey = new PublicKey(poolAddress as string);
    const pool = await AmmImpl.create(provider.connection, poolPubkey);
    const poolInfo = pool.poolInfo;

    const poolTokenAddress = await pool.getPoolTokenMint();
    const lockedLpAmount = await pool.getLockedLpAmount();
    const lpSupply = await pool.getLpSupply();

    const response = {
      poolAddress: poolAddress,
      poolTokenMint: poolTokenAddress.toString(),
      lockedLpAmount: lockedLpAmount.toString(),
      lpSupply: lpSupply.toString(),
      tokenA: {
        address: pool.tokenAMint.address.toString(),
        amount: poolInfo.tokenAAmount.toString(),
        decimals: pool.tokenAMint.decimals,
      },
      tokenB: {
        address: pool.tokenBMint.address.toString(),
        amount: poolInfo.tokenBAmount.toString(),
        decimals: pool.tokenBMint.decimals,
      },
      virtualPrice: poolInfo.virtualPrice,
      virtualPriceRaw: poolInfo.virtualPriceRaw.toString(),
    };

    res.json(response);
  })().catch((error: any) => {
    console.error('获取池子信息失败：', error);
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  });
});

/**
 * 获取 AMM swap 询价接口
 * GET /swapQuote?nodeUrl=xxx&poolAddress=xxx&swapAmount=xxx&swapAtoB=true
 */
app.get('/swapQuote', (req, res) => {
  (async () => {
    const { nodeUrl, poolAddress, swapAmount, swapAtoB } = req.query;
    if (!nodeUrl || !poolAddress || !swapAmount || swapAtoB === undefined) {
      res.status(400).json({ error: '缺少必要参数：nodeUrl, poolAddress, swapAmount, swapAtoB' });
      return;
    }

    const amountBN = new BN(swapAmount as string);
    const swapAtoBBool = (req.query.swapAtoB as string) === 'true';
    const provider = createProvider(nodeUrl as string);
    const poolPubkey = new PublicKey(poolAddress as string);
    const pool = await AmmImpl.create(provider.connection, poolPubkey);
    let tokenMint = swapAtoBBool ? pool.tokenAMint : pool.tokenBMint;
    const inTokenMint = new PublicKey(tokenMint.address);
    const swapQuote = pool.getSwapQuote(inTokenMint, amountBN, 100);

    const response = {
      swapInAmount: swapQuote.swapInAmount.toString(),
      swapOutAmount: swapQuote.swapOutAmount.toString(),
    };

    res.json(response);
  })().catch((error: any) => {
    console.error('获取询价失败：', error);
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  });
});

/**
 * 获取 DLMM swap 询价接口
 * GET /dlmmSwapQuote?nodeUrl=xxx&poolAddress=xxx&swapAmount=xxx&swapYtoX=true&limit=10
 */
app.get('/dlmmSwapQuote', (req, res) => {
  (async () => {
    const { nodeUrl, poolAddress, swapAmount, token, limit } = req.query;
    if (!nodeUrl || !poolAddress || !swapAmount || !token) {
      res.status(400).json({ error: '缺少必要参数：nodeUrl, poolAddress, swapAmount, token' });
      return;
    }

    const provider = createProvider(nodeUrl as string);
    const poolPubkey = new PublicKey(poolAddress as string);
    const dlmmPool = await DLMM.create(provider.connection, poolPubkey);

    // 根据传入的 token 地址判断交换方向：
    // 如果传入的是 tokenX，则认为输入 token 为 tokenX（即 X -> Y，swapYtoX = false）
    // 如果传入的是 tokenY，则认为输入 token 为 tokenY（即 Y -> X，swapYtoX = true）
    const tokenAddress = token as string;
    let swapYtoXBool: boolean;
    if (tokenAddress === dlmmPool.tokenX.publicKey.toString()) {
      swapYtoXBool = true;
    } else if (tokenAddress === dlmmPool.tokenY.publicKey.toString()) {
      swapYtoXBool = false;
    } else {
      res.status(400).json({ error: '传入的 token 地址与池子不匹配' });
      return;
    }

    const swapAmountBN = new BN(swapAmount as string);
    const limitBN = limit ? new BN(limit as string) : new BN(10);
    const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoXBool);
    const swapQuote = await dlmmPool.swapQuote(swapAmountBN, swapYtoXBool, limitBN, binArrays);

    function serialize(obj: any): any {
      if (BN.isBN(obj)) return obj.toString();
      if (obj instanceof PublicKey) return obj.toString();
      if (Array.isArray(obj)) return obj.map(serialize);
      if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key in obj) {
          result[key] = serialize(obj[key]);
        }
        return result;
      }
      return obj;
    }

    res.json(serialize(swapQuote));
  })().catch((error: any) => {
    console.error('DLMM swap 询价失败：', error);
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  });
});


const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`服务已启动，监听端口 ${PORT}`);
});
