import { requireOwner } from "../lib/owner-session.js";
import crypto from "node:crypto";
import { flwRequest, transactionPinValid } from "../lib/flutterwave-v4.js";
const supported = { SOLANA:["USDT","USDC"], ETHEREUM:["USDT","USDC","RLUSD"], BASE:["USDC"], POLYGON:["USDT","USDC"] };
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 if(!requireOwner(req,res))return;
  if(!transactionPinValid(req)) return res.status(401).json({error:"Transaction PIN missing or incorrect. Configure APP_TRANSACTION_PIN in Vercel."});
  const b=req.body||{}, network=String(b.network||"").toUpperCase(), currency=String(b.currency||"").toUpperCase(), address=String(b.address||"").trim(), amount=Number(b.amount);
  if(!supported[network]?.includes(currency)) return res.status(400).json({error:"Unsupported token/network combination."});
  if(!address||address.length>160||/\s/.test(address)||b.confirmAddress!==address) return res.status(400).json({error:"Enter the destination address twice and ensure both entries match."});
  if(!Number.isFinite(amount)||amount<=0||amount>1000000||!/^\d+(\.\d{1,6})?$/.test(String(b.amount))) return res.status(400).json({error:"Invalid amount. Use up to 6 decimal places."});
  try {
    const d=await flwRequest("/direct-transfers",{method:"POST",body:JSON.stringify({action:"instant",type:"crypto",reference:"DDB-"+crypto.randomUUID(),narration:"DeepDimples Bank stablecoin transfer",payment_instruction:{source_currency:currency,amount:{applies_to:"destination_currency",value:amount},recipient:{crypto:{network,address},name:{first:"DeepDimples",last:"User"}},destination_currency:currency}})});
    return res.status(200).json({id:d.id,reference:d.reference||null,status:d.status,network,currency,amount:d.amount?.value??amount,message:"Transfer submitted. Check its status before treating it as complete."});
  } catch(e) { return res.status(e.status&&e.status<500?e.status:502).json({error:e.message||"Flutterwave transfer failed."}); }
}