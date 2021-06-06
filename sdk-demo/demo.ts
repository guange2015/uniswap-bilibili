import { ChainId, Fetcher, Pair, Route, Token, WETH, Trade,TokenAmount,TradeType, Percent } from '@uniswap/sdk'
import { ethers } from 'ethers';
import {IERC20_ABI} from "./abis/IERC20";
import {Route02_ABI} from "./abis/Route02";
import * as dotenv from "dotenv";

dotenv.config();
const mnemonic = process.env.MNEMONIC;


(async ()=> {
    
    const network = ChainId.KOVAN;
    console.log(`The chainId of kovan is ${network}.`)

// //todo
// //1. 获取token信息
    //
    const jsonUrl = "https://eth-kovan.alchemyapi.io/v2/_-ujxbv-FqFBsTabUAIF6HKRuD3nqvwu";
    const provider = new ethers.providers.JsonRpcProvider(jsonUrl);

    const tokenAddress = "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD";

    const DAI:Token = await Fetcher.fetchTokenData(network, tokenAddress, provider);

    console.log(`dai token decimals is ${DAI.decimals}`);

// //2. 获取配对合约
    const pairAddress = Pair.getAddress(DAI, WETH[network]) ;
    console.log(`pairAddress: ${pairAddress}`)

    console.log(`weth address is ${WETH[network].address}`);

    const pairToken = await Fetcher.fetchPairData(DAI, WETH[network], provider);
    console.log(`pairToken ${pairToken.reserve0.toFixed()}, ${pairToken.reserve1.toFixed()}`)


// //3. 获取对应token价格
    const route = new Route([pairToken], WETH[network]);
    console.log(`price: ${route.midPrice.toSignificant(6)}`)
    console.log(`price: ${route.midPrice.invert().toSignificant(6)}`)

// //4. 生成交易
    const amountIn = '100000000000000000' // 0.1 WETH
    const _trade = new Trade(route, new TokenAmount(WETH[network], amountIn), TradeType.EXACT_INPUT);

    console.log(`trade: ${_trade.outputAmount.toSignificant(6)}`);

// //5. 发送交易
    const signer = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);

    const DaiToken = ethers.ContractFactory.getContract(DAI.address, IERC20_ABI, signer);
    const balance = await DaiToken.balanceOf(signer.address);

    console.log(`dia balance is ${ethers.utils.formatEther(balance)}`);


    const slippageTolerance = new Percent('50', '10000') // 50 bips, or 0.50%

    const amountOutMin = _trade.minimumAmountOut(slippageTolerance).raw // needs to be converted to e.g. hex
    const path = [WETH[network].address, DAI.address]
    const to = signer.address // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
    const value = _trade.inputAmount.raw // // needs to be converted to e.g. hex


    console.log(`amountOutMin is ${amountOutMin.toString()}, to is ${to}, deadline is ${deadline}, values is ${value}`);


    // //uniswap在不同网络上，合约地址一样
    const uniswap = ethers.ContractFactory.getContract('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', Route02_ABI, signer);
    
    const tx = await uniswap.swapExactETHForTokens(
        amountOutMin.toString(),
        path,
        to,
        deadline,
        { value: value.toString(), gasPrice: 20e9 }
      );
      console.log(`Transaction hash: ${tx.hash}`);
    
      const receipt = await tx.wait();
      console.log(`Transaction was mined in block ${receipt.blockNumber}`);

})();