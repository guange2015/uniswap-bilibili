import { ChainId, Token, Fetcher, Pair, WETH, Route, Trade,TokenAmount, TradeType, Percent } from '@uniswap/sdk'
import { ethers } from "ethers";
import * as dotenv from "dotenv";

import {IERC20_ABI} from "./abis/IERC20";
import {Route02_ABI} from "./abis/Route02";

dotenv.config();
const mnemonic = process.env.MNEMONIC;


const chainId = ChainId.KOVAN;
// const chainId = ChainId.MAINNET;

console.log(`The chainId of mainnet is ${chainId}., WETH address is ${WETH[chainId].address}`)

// const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F' // dai mainnet
const tokenAddress = '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD' // dai kovan


// const DAI = new Token(chainId, tokenAddress, decimals)

const jsonUrl = 'https://eth-kovan.alchemyapi.io/v2/_-ujxbv-FqFBsTabUAIF6HKRuD3nqvwu';
// const jsonUrl = 'https://eth-mainnet.alchemyapi.io/v2/I678O2KRahewf2tTgBV7oyHn6eAT5PfU';


//const provider = ethers.getDefaultProvider('kovan', {infuar: '0513b51a04a54bb7a68b4d330777d74a'});
const provider = new ethers.providers.JsonRpcProvider(jsonUrl);

async function getDia(): Promise<Token> {
    const DAI: Promise<Token> = Fetcher.fetchTokenData(chainId, tokenAddress, provider);
    return DAI;
};

async function getPair(dai:Token): Promise<Pair> {
   const pairAddress = Pair.getAddress(dai, WETH[chainId]) ;

    console.log(`pairAddress: ${pairAddress}`)

    const pairToken = await Fetcher.fetchPairData(dai, WETH[chainId], provider);

    console.log(`pairToken ${pairToken.reserve0.toFixed()}`)

    return pairToken;
    
}


async function getPrice(pair:Pair) : Promise<Route> {
    
    const route = new Route([pair], WETH[chainId]);
    console.log(`price: ${route.midPrice.toSignificant(6)}`)

    return route;
}

async function trade(route:Route):Promise<Trade> {
    const amountIn = '100000000000000000' // 0.1 WETH
    const _trade = new Trade(route, new TokenAmount(WETH[chainId], amountIn), TradeType.EXACT_INPUT);
    return _trade;
}

async function main(){
    const DAI: Token = await getDia();
    console.log(`dai decimals: ${DAI.decimals}`);


    const pair = await getPair(DAI);

    const route = await getPrice(pair);

    const _trade = await trade(route);

    
    console.log(`trade: ${_trade.outputAmount.toSignificant(6)}`);

    const signer = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);


    console.log(`signer address is ${signer.address}, balance is ${ethers.utils.formatEther( await signer.getBalance()) }`)


    const DaiToken = ethers.ContractFactory.getContract(DAI.address, IERC20_ABI, signer);
    const balance = await DaiToken.balanceOf(signer.address);

    console.log(`dia balance is ${ethers.utils.formatEther(balance)}`);


    const slippageTolerance = new Percent('50', '10000') // 50 bips, or 0.50%

    const amountOutMin = _trade.minimumAmountOut(slippageTolerance).raw // needs to be converted to e.g. hex
    const path = [WETH[chainId].address, DAI.address]
    const to = signer.address // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
    const value = _trade.inputAmount.raw // // needs to be converted to e.g. hex




    console.log(`amountOutMin is ${typeof amountOutMin}, to is ${to}, deadline is ${deadline}, values is ${value}`);


    //uniswap在不同网络上，合约地址一样
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

}


main()

