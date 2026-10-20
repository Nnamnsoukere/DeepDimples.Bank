// Reports whether configuration values exist. Never returns credentials or initiates transactions.
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 const present={
  hostedCheckout:{secretKey:Boolean(process.env.FLW_SECRET_KEY),appBaseUrl:Boolean(process.env.APP_BASE_URL),referenceSigningSecret:Boolean(process.env.APP_SIGNING_SECRET)},
  v4Transfers:{clientId:Boolean(process.env.FLW_CLIENT_ID),clientSecret:Boolean(process.env.FLW_CLIENT_SECRET),transactionPin:Boolean(process.env.APP_TRANSACTION_PIN),environment:process.env.FLW_V4_ENV==="live"?"live":"sandbox"},
  receiveAddresses:{
   SOLANA:{USDC:Boolean(process.env.FLW_RECEIVE_SOLANA_USDC),USDT:Boolean(process.env.FLW_RECEIVE_SOLANA_USDT)},
   ETHEREUM:{USDC:Boolean(process.env.FLW_RECEIVE_ETHEREUM_USDC),USDT:Boolean(process.env.FLW_RECEIVE_ETHEREUM_USDT),RLUSD:Boolean(process.env.FLW_RECEIVE_ETHEREUM_RLUSD)},
   BASE:{USDC:Boolean(process.env.FLW_RECEIVE_BASE_USDC)},
   POLYGON:{USDC:Boolean(process.env.FLW_RECEIVE_POLYGON_USDC),USDT:Boolean(process.env.FLW_RECEIVE_POLYGON_USDT)}
  }
 };
 return res.status(200).json({provider:"Flutterwave",checkedAt:new Date().toISOString(),configuration:present,note:"Presence checks only. This endpoint does not validate keys, confirm account approval, prove IP whitelisting, or guarantee a payment method is enabled."});
}