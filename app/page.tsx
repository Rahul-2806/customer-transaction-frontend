"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface PredResult { probability:number; prediction:number; prediction_label:string; confidence:number; threshold:number; elapsed_seconds:number; }
interface ModelInfo { auc:number; weights:{LightGBM:number;XGBoost:number;CatBoost:number}; n_folds:number; n_features:number; engineered_features:number; best_threshold:number; training_samples:number; }

// ─── AURORA BACKGROUND ────────────────────────────────────────────────────────
function Aurora() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",background:"#000"}}>
      <div style={{position:"absolute",top:"-40%",left:"-20%",width:"80vw",height:"80vw",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(99,102,241,0.15) 0%,transparent 70%)",animation:"drift1 18s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"-30%",right:"-20%",width:"70vw",height:"70vw",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(16,185,129,0.1) 0%,transparent 70%)",animation:"drift2 22s ease-in-out infinite"}}/>
      <div style={{position:"absolute",top:"30%",right:"10%",width:"50vw",height:"50vw",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(245,158,11,0.07) 0%,transparent 70%)",animation:"drift3 15s ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)"}}/>
    </div>
  );
}

// ─── RING GAUGE ───────────────────────────────────────────────────────────────
function RingGauge({ value, color, size=120 }: { value:number; color:string; size?:number }) {
  const r = (size-12)/2, circ = 2*Math.PI*r;
  const [v, setV] = useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setV(value),200); return()=>clearTimeout(t); },[value]);
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${circ}`} strokeDashoffset={circ-(v/100)*circ}
        strokeLinecap="round" style={{transition:"stroke-dashoffset 1.4s cubic-bezier(0.34,1.2,0.64,1)"}}/>
    </svg>
  );
}

// ─── NUMBER TICKER ────────────────────────────────────────────────────────────
function Ticker({ value, decimals=2, prefix="" }: { value:number; decimals?:number; prefix?:string }) {
  const [disp, setDisp] = useState(0);
  useEffect(()=>{
    let start=0; const end=value; const dur=1200;
    const t0=performance.now();
    const step=(now:number)=>{
      const p=Math.min((now-t0)/dur,1);
      const ease=1-Math.pow(1-p,4);
      setDisp(start+(end-start)*ease);
      if(p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },[value]);
  return <>{prefix}{disp.toFixed(decimals)}</>;
}

export default function CustomerPredictPage() {
  const [info, setInfo] = useState<ModelInfo|null>(null);
  const [feats, setFeats] = useState<number[]>(Array(200).fill(0));
  const [result, setResult] = useState<PredResult|null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(()=>{
    fetch(`${API}/model-info`).then(r=>r.json()).then(d=>{ setInfo(d); setReady(true); }).catch(()=>setError("Backend offline"));
    setTimeout(()=>setReady(true),300);
  },[]);

  const generate = useCallback(()=>{
    setFeats(Array.from({length:200},()=>parseFloat((Math.random()*20-10).toFixed(4))));
    setResult(null); setError("");
  },[]);

  const predict = useCallback(async()=>{
    if(feats.every(v=>v===0)){ generate(); return; }
    setLoading(true); setResult(null); setError("");
    const stages=["Initializing ensemble…","Running LightGBM folds…","Running XGBoost…","Running CatBoost…","Computing weighted average…","Applying threshold…"];
    for(const s of stages){ setStage(s); await new Promise(r=>setTimeout(r,200)); }
    try{
      const res=await fetch(`${API}/predict`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({features:feats})});
      const j=await res.json();
      if(j.detail) throw new Error(j.detail);
      setResult(j);
    }catch(e:any){ setError(e.message); }
    finally{ setLoading(false); setStage(""); }
  },[feats,generate]);

  const isTx = result?.prediction===1;
  const prob = result ? result.probability*100 : 0;
  const conf = result ? result.confidence : 0;

  const F = "'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif";
  const M = "'SF Pro Text',-apple-system,sans-serif";

  return (
    <div style={{minHeight:"100vh",fontFamily:F,color:"#fff",position:"relative",overflowX:"hidden"}}>
      <Aurora/>
      <style>{`
        @keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,8%) scale(1.1)}}
        @keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-8%,-5%) scale(1.15)}}
        @keyframes drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(-5%,10%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.3)}50%{box-shadow:0 0 40px rgba(99,102,241,0.6)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .fu{animation:fadeUp 0.6s cubic-bezier(0.34,1.2,0.64,1) both}
        .fu1{animation:fadeUp 0.6s 0.1s cubic-bezier(0.34,1.2,0.64,1) both}
        .fu2{animation:fadeUp 0.6s 0.2s cubic-bezier(0.34,1.2,0.64,1) both}
        .fu3{animation:fadeUp 0.6s 0.3s cubic-bezier(0.34,1.2,0.64,1) both}
        .fu4{animation:fadeUp 0.6s 0.4s cubic-bezier(0.34,1.2,0.64,1) both}
        .si{animation:scaleIn 0.5s cubic-bezier(0.34,1.2,0.64,1) both}
        .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid rgba(255,255,255,0.08);border-radius:20px}
        .glass-strong{background:rgba(255,255,255,0.07);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,0.12);border-radius:24px}
        .pill{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:100px;padding:5px 14px;font-size:12px;font-weight:500;letter-spacing:0.3px}
        .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;font-family:${F};font-size:14px;font-weight:600;letter-spacing:-0.2px;padding:14px 32px;border-radius:14px;cursor:pointer;transition:all 0.2s;animation:glow 3s ease infinite}
        .btn-primary:hover{transform:translateY(-1px);filter:brightness(1.1)}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed;animation:none}
        .btn-ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-family:${F};font-size:13px;font-weight:500;padding:12px 24px;border-radius:12px;cursor:pointer;transition:all 0.2s}
        .btn-ghost:hover{background:rgba(255,255,255,0.1);color:#fff}
        .feat-item{display:flex;justify-content:space-between;align-items:center;padding:5px 10px;border-radius:8px;background:rgba(255,255,255,0.03);font-size:11px;font-family:${M}}
        .bar-track{height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden}
        .bar-fill{height:100%;border-radius:2px;transition:width 1.4s cubic-bezier(0.34,1.2,0.64,1)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{position:"relative",zIndex:10,padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="fu" style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>◆</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.5}}>CustomerPredict</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:1,fontFamily:M}}>TRANSACTION INTELLIGENCE</div>
          </div>
        </div>
        <div className="fu" style={{display:"flex",gap:10,alignItems:"center"}}>
          {info && <span className="pill" style={{color:"rgba(134,239,172,0.9)"}}>● AUC {info.auc.toFixed(4)}</span>}
          <span className="pill" style={{color:"rgba(255,255,255,0.5)"}}>10-Fold CV</span>
          <span className="pill" style={{color:"rgba(255,255,255,0.5)"}}>200K samples</span>
        </div>
      </nav>

      <main style={{position:"relative",zIndex:10,maxWidth:1100,margin:"0 auto",padding:"40px 24px 60px"}}>

        {/* ── HERO ── */}
        <div className="fu" style={{textAlign:"center",marginBottom:56}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:100,padding:"6px 16px",marginBottom:20}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#818cf8",animation:"glow 2s infinite"}}/>
            <span style={{fontSize:12,color:"#a5b4fc",letterSpacing:0.5,fontFamily:M}}>Ensemble Model · LightGBM + XGBoost + CatBoost</span>
          </div>
          <h1 style={{fontSize:"clamp(36px,6vw,64px)",fontWeight:800,letterSpacing:-2,lineHeight:1.05,margin:"0 0 16px",background:"linear-gradient(135deg,#fff 30%,rgba(165,180,252,0.8))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            Will this customer<br/>make a transaction?
          </h1>
          <p style={{fontSize:17,color:"rgba(255,255,255,0.4)",fontWeight:400,letterSpacing:-0.2,fontFamily:M,maxWidth:500,margin:"0 auto"}}>
            200 anonymized features · 600 engineered · 10-fold stratified validation · ROC-AUC 0.9034
          </p>
        </div>

        {/* ── MODEL STATS ── */}
        {info && (
          <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:32}}>
            {[
              {label:"ROC-AUC",value:"0.9034",accent:"#818cf8"},
              {label:"LightGBM",value:`${(info.weights.LightGBM*100).toFixed(1)}%`,accent:"#34d399"},
              {label:"XGBoost",value:`${(info.weights.XGBoost*100).toFixed(1)}%`,accent:"#60a5fa"},
              {label:"CatBoost",value:`${(info.weights.CatBoost*100).toFixed(1)}%`,accent:"#f472b6"},
              {label:"Features",value:"200→600",accent:"#fbbf24"},
              {label:"Threshold",value:"0.450",accent:"#fb923c"},
            ].map(s=>(
              <div key={s.label} className="glass" style={{padding:"16px 18px"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:0.5,marginBottom:6,fontFamily:M}}>{s.label}</div>
                <div style={{fontSize:22,fontWeight:700,color:s.accent,letterSpacing:-0.5}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="fu2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

          {/* LEFT — Input */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Feature preview */}
            <div className="glass-strong" style={{padding:"22px 24px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.3,marginBottom:2}}>Feature Vectors</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",fontFamily:M}}>200 anonymized variables (var_0 … var_199)</div>
                </div>
                <div className="pill" style={{fontSize:11,color:feats.some(v=>v!==0)?"rgba(134,239,172,0.8)":"rgba(255,255,255,0.3)"}}>
                  {feats.some(v=>v!==0) ? "● Loaded" : "○ Empty"}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:16}}>
                {feats.slice(0,10).map((v,i)=>(
                  <div key={i} className="feat-item">
                    <span style={{color:"rgba(255,255,255,0.3)"}}>var_{i}</span>
                    <span style={{color:v>0?"#86efac":v<0?"#fca5a5":"rgba(255,255,255,0.3)",fontWeight:500}}>
                      {v===0 ? "—" : v.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.2)",fontFamily:M,marginBottom:16}}>
                + 190 more feature vectors
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn-ghost" onClick={generate} style={{flex:1}}>⟳ Randomize</button>
                <button className="btn-primary" onClick={predict} disabled={loading} style={{flex:2}}>
                  {loading ? "Analyzing…" : "Run Prediction →"}
                </button>
              </div>
            </div>

            {/* Ensemble breakdown */}
            {info && (
              <div className="glass" style={{padding:"18px 20px"}}>
                <div style={{fontSize:13,fontWeight:600,letterSpacing:-0.2,marginBottom:14}}>Ensemble Breakdown</div>
                {[
                  {name:"LightGBM",pct:info.weights.LightGBM*100,color:"#34d399"},
                  {name:"XGBoost",pct:info.weights.XGBoost*100,color:"#60a5fa"},
                  {name:"CatBoost",pct:info.weights.CatBoost*100,color:"#f472b6"},
                ].map(m=>(
                  <div key={m.name} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:M}}>{m.name}</span>
                      <span style={{fontSize:12,color:m.color,fontWeight:600,fontFamily:M}}>{m.pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{width:`${m.pct}%`,background:m.color}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Result */}
          <div>
            {/* Loading state */}
            {loading && (
              <div className="glass-strong si" style={{padding:"40px 24px",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,minHeight:400}}>
                <div style={{position:"relative",width:80,height:80}}>
                  <div style={{position:"absolute",inset:0,border:"2px solid rgba(255,255,255,0.08)",borderTopColor:"#818cf8",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
                  <div style={{position:"absolute",inset:10,border:"2px solid rgba(255,255,255,0.05)",borderBottomColor:"#34d399",borderRadius:"50%",animation:"spin 1.4s linear infinite reverse"}}/>
                  <div style={{position:"absolute",inset:20,border:"1px solid rgba(255,255,255,0.05)",borderTopColor:"#f472b6",borderRadius:"50%",animation:"spin 2s linear infinite"}}/>
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:600,textAlign:"center",marginBottom:6}}>{stage}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",textAlign:"center",fontFamily:M}}>Running 10-fold ensemble inference</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"rgba(129,140,248,0.6)",animation:`glow 1.2s ${i*0.2}s ease infinite`}}/>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !result && (
              <div className="glass" style={{padding:"40px 24px",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,minHeight:400,opacity:0.6}}>
                <div style={{width:64,height:64,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>◆</div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>Ready to predict</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.3)",fontFamily:M}}>Randomize features and run the ensemble model</div>
                </div>
              </div>
            )}

            {/* Result state */}
            {!loading && result && (
              <div className="glass-strong si" style={{padding:"28px 28px",height:"100%",display:"flex",flexDirection:"column",gap:22}}>
                {/* Verdict hero */}
                <div style={{display:"flex",alignItems:"center",gap:20}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <RingGauge value={conf} color={isTx?"#34d399":"#f87171"} size={100}/>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:15,fontWeight:800,color:isTx?"#34d399":"#f87171"}}>{conf.toFixed(0)}%</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontFamily:M}}>CONF</div>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:1,marginBottom:4,fontFamily:M}}>PREDICTION</div>
                    <div style={{fontSize:48,fontWeight:900,letterSpacing:-2,lineHeight:1,color:isTx?"#34d399":"#f87171"}}>
                      {isTx?"YES":"NO"}
                    </div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4,fontFamily:M}}>{result.prediction_label}</div>
                  </div>
                </div>

                {/* Probability bar */}
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.3)",fontFamily:M}}>No Transaction</span>
                    <span style={{fontSize:12,fontWeight:600,color:isTx?"#34d399":"#f87171",fontFamily:M}}>
                      P = <Ticker value={prob} decimals={2}/>%
                    </span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.3)",fontFamily:M}}>Transaction</span>
                  </div>
                  <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,position:"relative",overflow:"visible"}}>
                    <div style={{height:"100%",width:`${prob}%`,background:`linear-gradient(90deg,#6366f1,${isTx?"#34d399":"#f87171"})`,borderRadius:4,transition:"width 1.4s cubic-bezier(0.34,1.2,0.64,1)"}}/>
                    <div style={{position:"absolute",top:-4,left:`${result.threshold*100}%`,transform:"translateX(-50%)",width:2,height:16,background:"rgba(255,255,255,0.4)",borderRadius:1}}/>
                    <div style={{position:"absolute",top:14,left:`${result.threshold*100}%`,transform:"translateX(-50%)",fontSize:9,color:"rgba(255,255,255,0.3)",fontFamily:M,whiteSpace:"nowrap"}}>threshold {result.threshold}</div>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    {label:"Probability",value:`${prob.toFixed(3)}%`,color:isTx?"#34d399":"#f87171"},
                    {label:"Confidence",value:`${conf.toFixed(1)}%`,color:"rgba(255,255,255,0.7)"},
                    {label:"Inference",value:`${result.elapsed_seconds}s`,color:"rgba(255,255,255,0.7)"},
                  ].map(s=>(
                    <div key={s.label} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 14px"}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4,fontFamily:M}}>{s.label}</div>
                      <div style={{fontSize:16,fontWeight:700,color:s.color,letterSpacing:-0.3}}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Model attribution */}
                <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"rgba(165,180,252,0.6)",fontFamily:M,lineHeight:1.6}}>
                    Weighted ensemble: LightGBM (72.3%) + XGBoost (17.6%) + CatBoost (10.1%) · 10-fold stratified CV · Threshold optimized for F1
                  </div>
                </div>

                <button className="btn-ghost" onClick={()=>{generate();}} style={{width:"100%"}}>
                  Try another sample →
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:16,padding:"16px 18px",marginTop:12}}>
                <div style={{fontSize:13,color:"#fca5a5",fontFamily:M}}>❌ {error}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="fu4" style={{textAlign:"center",marginTop:48}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.15)",fontFamily:M,letterSpacing:0.5}}>
            Santander Customer Transaction · 200K samples · LightGBM + XGBoost + CatBoost · ROC-AUC 0.9034
          </div>
        </div>
      </main>
    </div>
  );
}