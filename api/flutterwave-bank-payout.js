import crypto from "node:crypto";
import { flwRequest, transactionPinValid } from "../lib/flutterwave-v4.js";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 if(!transactionPinValid(req))return res.status(401).json({error:"Transaction PIN missing or incorrect. Configure APP_TRANSACTION_PIN in Vercel."});
 const b=req.body||{}, account=String(b.accountNumber||"").trim(), bank=String(b.bankCode||"").trim(), amount=Number(b.amount), currency=String(b.currency||"NGN").toUpperCase();
 if(currency!=="NGN")return res.status(400).json({error:"This first bank payout flow supports NGN only. Other corridors require their own recipient schemas."});
 if(!/^\d{10}$/.test(account)||!/^\d{3}$/.test(bank))return res.status(400).json({error:"Enter a 10-digit Nigerian bank account number and 3-digit Flutterwave bank code."});
 if(!Number.isFinite(amount)||amount<1||amount>100000000||!/^\d+(\.\d{1,2})?$/.test(String(b.amount)))return res.status(400).json({error:"Enter a valid NGN amount with up to two decimals."});
 if(b.confirmAccountNumber!==account)return res.status(400).json({error:"Account number confirmation does not match."});
 try{
  const d=await flwRequest("/direct-transfers",{method:"POST",body:JSON.stringify({action:"instant",type:"bank",reference:"DDB-"+crypto.randomUUID(),narration:"DeepDimples Bank bank payout",payment_instruction:{source_currency:"NGN",destination_currency:"NGN",amount:{applies_to:"destination_currency",value:amount},recipient:{bank:{account_number:account,code:bank}}}})});
  return res.status(200).json({id:d.id,reference:d.reference||null,status:d.status,currency:"NGN",amount:d.amount?.value??amount,message:"Payout submitted to Flutterwave. Verify transfer status before treating it as complete."});
 }catch(e){return res.status(e.status&&e.status<500?e.status:502).json({error:e.message||"Flutterwave bank payout failed."});}
}