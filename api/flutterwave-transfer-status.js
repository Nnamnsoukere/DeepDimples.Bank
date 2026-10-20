import { requireOwner } from "../lib/owner-session.js";
import { flwRequest } from "../lib/flutterwave-v4.js";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 if(!requireOwner(req,res))return;
 const id=String(req.query.id||"");
 if(!/^trf_[A-Za-z0-9_-]{4,100}$/.test(id))return res.status(400).json({error:"Invalid transfer ID."});
 try{const d=await flwRequest("/transfers/"+encodeURIComponent(id),{method:"GET"});return res.status(200).json({id:d.id,status:d.status,reference:d.reference,sourceCurrency:d.source_currency,destinationCurrency:d.destination_currency,amount:d.amount,fee:d.fee,createdAt:d.created_datetime});}
 catch(e){return res.status(e.status&&e.status<500?e.status:502).json({error:e.message||"Could not retrieve transfer status."});}
}