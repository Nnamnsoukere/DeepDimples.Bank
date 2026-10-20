import crypto from "node:crypto";
import { requireOwner } from "../lib/owner-session.js";
import { flwRequest, transactionPinValid } from "../lib/flutterwave-v4.js";
import { beginOperation, hashRequest, updateOperation } from "../lib/transaction-db.js";
const supported = { SOLANA:["USDT","USDC"], ETHEREUM:["USDT","USDC","RLUSD"], BASE:["USDC"], POLYGON:["USDT","USDC"] };
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
  if(!requireOwner(req,res))return;
  if(!transactionPinValid(req))return res.status(401).json({error:"Transaction PIN missing or incorrect. Configure APP_TRANSACTION_PIN in Vercel."});
  const b=req.body||{}, requestId=String(b.requestId||""), network=String(b.network||"").toUpperCase(), currency=String(b.currency||"").toUpperCase(), address=String(b.address||"").trim(), amount=Number(b.amount);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))return res.status(400).json({error:"Missing or invalid request ID. Refresh the form and try again."});
  if(!supported[network]?.includes(currency))return res.status(400).json({error:"Unsupported token/network combination."});
  if(!address||address.length>160||/\s/.test(address)||b.confirmAddress!==address)return res.status(400).json({error:"Enter the destination address twice and ensure both entries match."});
  if(!Number.isFinite(amount)||amount<=0||amount>1000000||!/^\d+(\.\d{1,6})?$/.test(String(b.amount)))return res.status(400).json({error:"Invalid amount. Use up to 6 decimal places."});
  const request={kind:"stablecoin_send",network,currency,address,amount};
  let op;
  try{
    const result=await beginOperation({request_id:requestId,request_hash:hashRequest(request),kind:"stablecoin_send",provider:"flutterwave",provider_reference:"DDB-"+requestId, status:"NEW",amount,currency,network,recipient_address:address,metadata:{}});
    op=result.row;
    if(!result.created){
      if(op.provider_id)return res.status(200).json({id:op.provider_id,reference:op.provider_reference,status:op.status,network,currency,amount:Number(op.amount),duplicate:true,message:"This request was already recorded; no second transfer was initiated."});
      return res.status(409).json({error:"This request is already recorded but its provider result is not confirmed. Check transaction history and Flutterwave before attempting another transfer."});
    }
    const d=await flwRequest("/direct-transfers",{method:"POST",idempotencyKey:op.idempotency_key,body:JSON.stringify({action:"instant",type:"crypto",reference:op.provider_reference,narration:"DeepDimples Bank stablecoin transfer",payment_instruction:{source_currency:currency,amount:{applies_to:"destination_currency",value:amount},recipient:{crypto:{network,address},name:{first:"DeepDimples",last:"User"}},destination_currency:currency}})});
    const saved=await updateOperation(op.id,{provider_id:d.id?String(d.id):null,status:String(d.status||"PENDING").toUpperCase(),provider_payload:{id:d.id,status:d.status,reference:d.reference||op.provider_reference}});
    return res.status(200).json({id:d.id,reference:d.reference||op.provider_reference,status:d.status,network,currency,amount:d.amount?.value??amount,message:"Transfer submitted. Check its status before treating it as complete."});
  }catch(e){return res.status(e.status&&e.status<500?e.status:502).json({error:e.message||"Flutterwave transfer failed. Check transaction history before retrying."});}
}
