const endpoint = "https://clerk.cyberscan.co.za/.well-known/jwks.json";
export default {
 async fetch(request) {
  if (request.method !== "POST" || new URL(request.url).pathname !== "/test") return new Response("Not found",{status:404});
  const results = [];
  async function check(name, fn) {
   const start = Date.now();
   try { results.push({name, ok:true, ...await fn(), durationMs:Date.now()-start}); }
   catch(e) { results.push({name, ok:false, errorType:e.name, message:String(e.message).slice(0,300), durationMs:Date.now()-start}); }
  }
  await check("timeout construction",async()=>({supported:!!AbortSignal.timeout(5000)}));
  let jwks;
  for(const [name, options] of [
   ["native fetch",()=>({})],
   ["redirect policy",()=>({redirect: "manual"})],
   ["timeout signal",()=>({signal:AbortSignal.timeout(5000)})],
   ["corrected production options",()=>({redirect: "manual",signal:AbortSignal.timeout(5000)})]
  ]) await check(name,async()=>{
   const response=await globalThis.fetch(endpoint,options());
   const status=response.status;
   if(!response.ok) return {ok:false,status};
   const body=await response.json();
   if(!Array.isArray(body.keys)) throw new Error("Invalid JWKS");
   jwks=body; return {status,keyCount:body.keys.length};
  });
  await check("RSA public key import",async()=>{
   const key=jwks?.keys.find(k=>k.kty==="RSA"&&k.alg==="RS256");
   if(!key) throw new Error("No RSA key obtained");
   await crypto.subtle.importKey("jwk",key,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
   return {imported:true};
  });
  return Response.json({results},{headers:{"Cache-Control":"no-store"}});
 }
};
