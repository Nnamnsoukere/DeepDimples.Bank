import { clearSession, issueSession, passwordMatches, sessionValid } from "../lib/owner-session.js";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method==="GET")return res.status(200).json({authenticated:sessionValid(req)});
 if(req.method==="DELETE"){clearSession(res);return res.status(200).json({authenticated:false});}
 if(req.method!=="POST"){res.setHeader("Allow","GET, POST, DELETE");return res.status(405).json({error:"Method not allowed"});}
 if(!process.env.APP_ACCESS_PASSWORD||!process.env.APP_SESSION_SECRET)return res.status(503).json({error:"Owner login is not configured. Add APP_ACCESS_PASSWORD and APP_SESSION_SECRET in Vercel."});
 if(!passwordMatches(req.body?.password))return res.status(401).json({error:"Incorrect password."});
 issueSession(res);return res.status(200).json({authenticated:true});
}