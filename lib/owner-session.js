import crypto from "node:crypto";
const COOKIE="ddb_owner_session";
function sign(value){return crypto.createHmac("sha256",process.env.APP_SESSION_SECRET||"").update(value).digest("base64url");}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
export function sessionValid(req){
 if(!process.env.APP_SESSION_SECRET)return false;
 const cookie=String(req.headers.cookie||"").split(";").map(v=>v.trim()).find(v=>v.startsWith(COOKIE+"="));
 if(!cookie)return false;
 const raw=decodeURIComponent(cookie.slice(COOKIE.length+1)),dot=raw.lastIndexOf(".");
 if(dot<1)return false;
 const payload=raw.slice(0,dot),signature=raw.slice(dot+1);
 if(!safeEqual(signature,sign(payload)))return false;
 try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return data.exp>Date.now()&&data.sub==="owner";}catch{return false;}
}
export function requireOwner(req,res){
 if(sessionValid(req))return true;
 res.status(401).json({error:"Owner login required. Sign in to DeepDimples Bank and try again."});
 return false;
}
export function issueSession(res){
 const payload=Buffer.from(JSON.stringify({sub:"owner",exp:Date.now()+8*60*60*1000})).toString("base64url");
 const value=payload+"."+sign(payload);
 res.setHeader("Set-Cookie",COOKIE+"="+encodeURIComponent(value)+"; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict");
}
export function clearSession(res){res.setHeader("Set-Cookie",COOKIE+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict");}
export function passwordMatches(input){
 const expected=process.env.APP_ACCESS_PASSWORD;
 if(!expected||typeof input!=="string")return false;
 return safeEqual(input,expected);
}
