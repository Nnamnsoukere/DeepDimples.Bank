export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 const configured={SOLANA:{USDC:process.env.FLW_RECEIVE_SOLANA_USDC,USDT:process.env.FLW_RECEIVE_SOLANA_USDT},ETHEREUM:{USDC:process.env.FLW_RECEIVE_ETHEREUM_USDC,USDT:process.env.FLW_RECEIVE_ETHEREUM_USDT,RLUSD:process.env.FLW_RECEIVE_ETHEREUM_RLUSD},BASE:{USDC:process.env.FLW_RECEIVE_BASE_USDC},POLYGON:{USDC:process.env.FLW_RECEIVE_POLYGON_USDC,USDT:process.env.FLW_RECEIVE_POLYGON_USDT}};
 const receiveAddresses=Object.fromEntries(Object.entries(configured).map(([network,tokens])=>[network,Object.fromEntries(Object.entries(tokens).filter(([,address])=>Boolean(address)))]));
 return res.status(200).json({provider:"Flutterwave",receiveAddresses,note:"Only configured addresses are shown. Confirm the exact address, token and network in your Flutterwave dashboard before depositing."});
}