import { useState, useEffect, useRef } from "react";

var SUPERMARKETS = [
  { id: "amazon", name: "Amazon", emoji: "📦", color: "#FF9900", searchUrl: function(q){ return "https://www.amazon.co.jp/s?k=" + encodeURIComponent(q); } },
  { id: "rakuten", name: "楽天西友", emoji: "🦅", color: "#bf0000", searchUrl: function(q){ return "https://search.rakuten.co.jp/search/mall/" + encodeURIComponent(q) + "/"; } },
  { id: "ito", name: "イトーヨーカドー", emoji: "🏪", color: "#e53935", searchUrl: function(q){ return "https://www.ito-yokado.jp/search?keyword=" + encodeURIComponent(q); } },
  { id: "life", name: "ライフネットスーパー", emoji: "🌿", color: "#1565c0", searchUrl: function(){ return "https://www.life-netsuper.jp/"; } },
  { id: "aeon", name: "イオンネットスーパー", emoji: "🛒", color: "#c62828", searchUrl: function(q){ return "https://shop.aeon.com/search/?q=" + encodeURIComponent(q); } },
  { id: "seijo", name: "成城石井", emoji: "🍷", color: "#4a148c", searchUrl: function(q){ return "https://www.seijoishii.com/search?q=" + encodeURIComponent(q); } }
];

var FREE_LIMIT = 30;
var AD_BONUS = 3;

function todayKey() {
  var d = new Date();
  return "usage_" + d.getFullYear() + "_" + d.getMonth() + "_" + d.getDate();
}

function getUsage() {
  try {
    var key = todayKey();
    var keys = Object.keys(localStorage);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].startsWith("usage_") && keys[i] !== key) localStorage.removeItem(keys[i]);
    }
    var d = localStorage.getItem(key);
    return d ? JSON.parse(d) : { count: 0 };
  } catch(e) { return { count: 0 }; }
}

function saveUsage(u) {
  try { localStorage.setItem(todayKey(), JSON.stringify(u)); } catch(e) {}
}

function getPro() {
  try { return localStorage.getItem("pro") === "true"; } catch(e) { return false; }
}

function scaleIng(ing, s) {
  return ing.replace(/(\d+(?:\.\d+)?)(g|ml|枚|個|本|切れ|大さじ|小さじ|カップ|合)/g, function(_, n, u) {
    return (Math.round(parseFloat(n) * s * 10) / 10) + u;
  });
}

async function callAI(prompt) {
  var res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  var data = await res.json();
  if (data.error) throw new Error(data.error);
  var tb = data.content && data.content.find(function(b) { return b.type === "text"; });
  var text = tb ? tb.text : "";
  var m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSONが見つかりません");
  return JSON.parse(m[0]);
}
function InstallBanner() {
  var [show, setShow] = useState(false);
  var [deferredPrompt, setDeferredPrompt] = useState(null);
  // windowはuseEffect内でのみアクセス（SSR対策）
  var [isIOS, setIsIOS] = useState(false);

  useEffect(function() {
    var isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    if (!isMobile) return; // PCでは表示しない
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Android Chrome
    var handler = function(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(function(){ setShow(true); }, 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', function(){ setShow(false); });

    // iPhone Safari（stateではなくローカル変数iosを直接使う）
    if (ios) {
      setTimeout(function(){ setShow(true); }, 2000);
    }

    return function() { window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(){ setDeferredPrompt(null); setShow(false); });
    } else if (isIOS) {
      alert('① SafariでこのページのURLを開く\n② 下部の共有ボタン（四角に矢印）をタップ\n③「ホーム画面に追加」を選ぶ\n\n※ Chrome・Firefoxでは追加できません');
    } else {
      alert('Chromeのメニュー（右上の ⋮）をタップして\n「アプリをインストール」または\n「ホーム画面に追加」を選んでください');
    }
  }

  function handleClose() {
    setShow(false);
  }

  if (!show) return null;
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"2px solid #e07b3a", padding:"12px 16px 28px", display:"flex", alignItems:"center", gap:12, zIndex:200, boxShadow:"0 -4px 20px rgba(200,120,60,0.15)" }}>
      <span style={{ fontSize:"1.8rem", flexShrink:0 }}>📲</span>
      <div style={{ flex:1 }}>
        <p style={{ margin:"0 0 2px", fontWeight:800, fontSize:14, color:"#7c3a1e" }}>ホーム画面に追加する</p>
        <p style={{ margin:0, fontSize:11, color:"#b56a2a" }}>
          {isIOS ? "Safariで開く → 共有 → ホーム画面に追加" : "アプリとしてインストール"}
        </p>
      </div>
      <button onClick={handleInstall} style={{ background:"linear-gradient(90deg,#e07b3a,#d05a20)", color:"#fff", border:"none", borderRadius:10, padding:"8px 14px", fontWeight:800, fontSize:13, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
        {isIOS ? "方法を見る" : "追加"}
      </button>
      <button onClick={handleClose} style={{ background:"none", border:"none", color:"#bbb", fontSize:"1rem", cursor:"pointer", padding:4, flexShrink:0 }}>✕</button>
    </div>
  );
}

function AdBanner() {
  return (
    <div style={{ position:"sticky", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #f3d5b0", padding:"8px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, zIndex:100 }}>
      <style>{`#vercel-live-feedback, vercel-live-feedback { display: none !important; }`}</style>
      <p style={{ margin:0, fontSize:9, color:"#bbb", letterSpacing:1 }}>スポンサー広告</p>
      <div style={{ width:"100%", maxWidth:520, height:60, background:"#f9f9f9", border:"1px dashed #e0c9b0", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#c49a70", fontSize:12, fontWeight:700 }}>
        広告スペース（320x60）
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:40 }}>
      <div style={{ width:56, height:56, border:"5px solid #f3e8d0", borderTop:"5px solid #e07b3a", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <p style={{ color:"#b56a2a", fontWeight:600, fontSize:16 }}>AIが分析中です…</p>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function Tag(props) {
  return (
    <span style={{ background:props.color||"#fef3e2", color:props.tc||"#b56a2a", borderRadius:20, padding:"4px 12px", fontSize:13, fontWeight:600, display:"inline-block", margin:"2px 4px 2px 0" }}>
      {props.label}
    </span>
  );
}

function UsageBanner(props) {
  var remaining = Math.max(0, FREE_LIMIT - (props.usage.count || 0));
  var isLow = remaining <= 5;
  if (props.isPro) {
    return (
      <div style={{ background:"linear-gradient(90deg,#1a237e,#283593)", borderRadius:12, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span>👑</span>
          <span style={{ color:"#fff", fontWeight:800, fontSize:13 }}>プレミアム</span>
          <span style={{ color:"#90caf9", fontSize:11 }}>使い放題・広告なし</span>
        </div>
        <span style={{ color:"#ffd54f", fontSize:11, fontWeight:700 }}>SNS発信OK</span>
      </div>
    );
  }
  return (
    <div style={{ background:"#f9f9f9", borderRadius:12, padding:"12px 14px", marginBottom:16, border:"1.5px solid #e5e7eb" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
        <div>
          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:800, color:"#9ca3af" }}>無料プラン</p>
          <p style={{ margin:"0 0 4px", fontSize:14, fontWeight:700, color:"#374151" }}>
            本日あと <strong style={{ fontSize:20, color:remaining===0?"#e65100":"#e07b3a" }}>{remaining}</strong> 回
          </p>
          {isLow && remaining > 0 && (
            <p style={{ margin:"3px 0 0", fontSize:11, color:"#e65100" }}>広告視聴で +{AD_BONUS}回もらえます</p>
          )}
        </div>
        <button onClick={props.onUpgrade} style={{ padding:"6px 10px", borderRadius:10, border:"none", background:"linear-gradient(90deg,#e07b3a,#d05a20)", color:"#fff", fontWeight:800, fontSize:11, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap", display:"none" }}>
          👑 アップグレード
        </button>
      </div>
      {remaining === 0 && (
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          <button onClick={props.onAd} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"none", background:"#4caf50", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer" }}>
            広告視聴 +{AD_BONUS}回
          </button>
          <button onClick={props.onUpgrade} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"none", background:"linear-gradient(90deg,#e07b3a,#d05a20)", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer" }}>
            👑 150円で無制限
          </button>
        </div>
      )}
      {isLow && (
        <div style={{ marginTop:12, padding:"10px 12px", background:"linear-gradient(135deg,#fff4e6,#ffe8cc)", border:"2px solid #e07b3a", borderRadius:12, boxShadow:"0 2px 8px rgba(224,123,58,0.2)" }}>
          <p style={{ margin:"0 0 6px", fontSize:9, color:"#b56a2a", fontWeight:800, letterSpacing:1, textAlign:"center" }}>━ 広告 ━</p>
          <div style={{ width:"100%", height:80, background:"#fff", border:"1.5px dashed #e07b3a", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#e07b3a", fontSize:13, fontWeight:800 }}>
            広告スペース（300x80）
          </div>
        </div>
      )}
    </div>
  );
}

function UpgradeModal(props) {
  if (!props.open) return null;
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>👑</div>
          <h2 style={{ margin:"0 0 8px", color:"#7c3a1e", fontSize:20, fontWeight:800 }}>プレミアムプラン</h2>
          <p style={{ margin:0, color:"#a0613a", fontSize:14 }}>料理はこころのサプリ</p>
        </div>
        <div style={{ background:"#fff8f0", borderRadius:14, padding:16, marginBottom:20 }}>
          {["AI分析・レシピ提案 使い放題", "アレンジ機能 使い放題", "お気に入り・履歴 無制限", "SNS発信・シェア 自由（アプリリンク付き）", "広告なし"].map(function(item, i) {
            return <p key={i} style={{ margin:"0 0 8px", fontSize:14, color:"#5a3010" }}>{"✅ " + item}</p>;
          })}
          <p style={{ margin:0, fontSize:14, color:"#9e9e9e" }}>❌ API制限時のみ一時利用不可</p>
        </div>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <p style={{ margin:"0 0 4px", fontSize:24, fontWeight:800, color:"#e07b3a" }}>現在 無料公開中！</p>
          <p style={{ margin:0, fontSize:12, color:"#a0613a" }}>今すぐ全機能をお試しください</p>
        </div>
        <button onClick={props.onClose} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(90deg,#e07b3a,#d05a20)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", marginBottom:10 }}>
          🎉 無料で始める
        </button>
        <button onClick={props.onClose} style={{ width:"100%", padding:"10px 0", borderRadius:14, border:"1.5px solid #f3d5b0", background:"#fff", color:"#b56a2a", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          閉じる
        </button>
        <p style={{ textAlign:"center", fontSize:11, color:"#b0b0b0", marginTop:12 }}>SNS発信はアプリリンク添付の上、自由にどうぞ！</p>
      </div>
    </div>
  );
}

function AdModal(props) {
  var [count, setCount] = useState(5);
  var [done, setDone] = useState(false);
  var timer = useRef(null);

  useEffect(function() {
    if (!props.open) {
      setCount(5); setDone(false);
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(function() {
      setCount(function(c) {
        if (c <= 1) { clearInterval(timer.current); setDone(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return function() { if (timer.current) clearInterval(timer.current); };
  }, [props.open]);

  if (!props.open) return null;
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:380, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📺</div>
        <h3 style={{ margin:"0 0 8px", color:"#374151", fontSize:18, fontWeight:800 }}>広告を視聴中…</h3>
        <p style={{ margin:"0 0 20px", color:"#6b7280", fontSize:14 }}>視聴後に +{AD_BONUS}回 プレゼント！</p>
        <div style={{ background:"#f3f4f6", borderRadius:12, padding:40, marginBottom:20, color:"#9ca3af", fontSize:13 }}>
          ここに広告が表示されます
        </div>
        {done ? (
          <button onClick={props.onComplete} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"#4caf50", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>
            +{AD_BONUS}回ゲット！
          </button>
        ) : (
          <div style={{ padding:"12px 0", borderRadius:12, background:"#f3f4f6", color:"#6b7280", fontWeight:800, fontSize:16 }}>
            {count}秒後にスキップ可能
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingChecklist(props) {
  var [open, setOpen] = useState(false);
  var [checked, setChecked] = useState({});
  var ings = props.ingredients;
  var s = props.servings;
  var cnt = Object.values(checked).filter(Boolean).length;

  function toggle(i) {
    setChecked(function(p) { var n = Object.assign({}, p); n[i] = !p[i]; return n; });
  }

  return (
    <div style={{ marginBottom:16 }}>
      <button onClick={function(){ setOpen(!open); }} style={{ width:"100%", padding:"12px 16px", borderRadius:14, border:"1.5px solid #b0bec5", background:open?"#eceff1":"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>🛒</span>
          <span style={{ fontWeight:800, color:"#37474f", fontSize:15 }}>お買い物チェックリスト</span>
          {cnt > 0 && <span style={{ background:"#e07b3a", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:800 }}>{cnt}/{ings.length}</span>}
        </div>
        <span style={{ color:"#90a4ae" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ border:"1.5px solid #b0bec5", borderTop:"none", borderRadius:"0 0 14px 14px", padding:16, background:"#fafafa" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <p style={{ margin:0, fontSize:12, color:"#78909c" }}>近所のスーパーでのお買い物に</p>
            <button onClick={function(){ setChecked({}); }} style={{ fontSize:11, color:"#90a4ae", background:"none", border:"1px solid #cfd8dc", borderRadius:8, padding:"2px 8px", cursor:"pointer" }}>リセット</button>
          </div>
          {ings.map(function(ing, i) {
            var scaled = scaleIng(ing, s);
            var pi = scaled.indexOf("（");
            var name = pi >= 0 ? scaled.slice(0, pi).trim() : scaled.split("(")[0].trim();
            var dm = scaled.match(/[（(]([^）)]+)[）)]/);
            var detail = dm ? dm[1] : "";
            return (
              <div key={i} onClick={function(){ toggle(i); }} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderRadius:10, cursor:"pointer", background:checked[i]?"#f1f8e9":"#fff", marginBottom:6, border:checked[i]?"1.5px solid #a5d6a7":"1.5px solid #eceff1" }}>
                <div style={{ width:22, height:22, borderRadius:6, border:"2px solid "+(checked[i]?"#43a047":"#b0bec5"), background:checked[i]?"#43a047":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {checked[i] && <span style={{ color:"#fff", fontSize:14, fontWeight:800 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:checked[i]?"#90a4ae":"#37474f", textDecoration:checked[i]?"line-through":"none" }}>{name}</span>
                  {detail ? <span style={{ fontSize:12, color:"#90a4ae", marginLeft:6 }}>{detail}</span> : null}
                </div>
              </div>
            );
          })}
          {ings.length > 0 && cnt === ings.length && (
            <div style={{ textAlign:"center", padding:"12px 0 4px", color:"#43a047", fontWeight:800, fontSize:14 }}>
              全部そろいました！さあ料理しましょう！
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShareButtons({ recipe, nutrients }) {
  var [copied, setCopied] = useState(false);
  var [igTip, setIgTip] = useState(false);
  if (!recipe || !recipe.name) return null;

  var APP_URL = "https://ryouri-supplement.vercel.app";
  var nutrientText = nutrients && nutrients.length > 0
    ? "\n✨ 補給できる栄養: " + nutrients.slice(0, 3).map(function(n){ return n.name; }).join("・")
    : "";
  var shareText =
    "🍳 今日のレシピ「" + recipe.name + "」\n" +
    (recipe.description ? recipe.description.slice(0, 50) + "…" : "") +
    nutrientText +
    "\n\n料理はこころのサプリ で生成 👇\n" + APP_URL;

  var enc = encodeURIComponent(shareText);
  var encUrl = encodeURIComponent(APP_URL);

  function copyText() {
    try { navigator.clipboard.writeText(shareText); } catch(e) {
      var el = document.createElement("textarea");
      el.value = shareText; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(function(){ setCopied(false); }, 2500);
  }

  var sns = [
    { label: "X でシェア", emoji: "𝕏", bg: "#000", onClick: function(){ window.open("https://twitter.com/intent/tweet?text=" + enc, "_blank", "width=600,height=400"); } },
    { label: "LINEで送る", emoji: "💬", bg: "#06c755", onClick: function(){ window.open("https://social-plugins.line.me/lineit/share?url=" + encUrl + "&text=" + enc, "_blank", "width=600,height=600"); } },
    { label: "Facebookへ", emoji: "f", bg: "#1877f2", onClick: function(){ window.open("https://www.facebook.com/sharer/sharer.php?u=" + encUrl, "_blank", "width=600,height=400"); } },
    { label: "Instagramへ", emoji: "📸", bg: "linear-gradient(135deg,#f09433,#dc2743,#bc1888)", onClick: function(){ copyText(); setIgTip(true); setTimeout(function(){ setIgTip(false); }, 5000); } },
  ];

  return (
    <div style={{ margin:"16px 0", borderRadius:18, overflow:"hidden", border:"2px solid #ffb74d", boxShadow:"0 4px 16px rgba(224,123,58,0.15)" }}>
      {/* ヘッダー */}
      <div style={{ background:"linear-gradient(90deg,#e07b3a,#d05a20)", padding:"12px 16px", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:20 }}>🎉</span>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#fff" }}>このレシピをSNSでシェア！</p>
          <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.8)" }}>みんなに教えてあげましょう</p>
        </div>
      </div>
      {/* ボタングリッド */}
      <div style={{ background:"#fff8f0", padding:"14px 12px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {sns.map(function(btn, i) {
          return (
            <button key={i} onClick={btn.onClick}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderRadius:12, border:"none", background:btn.bg, color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", transition:"opacity 0.15s" }}
              onMouseOver={function(e){ e.currentTarget.style.opacity="0.85"; }}
              onMouseOut={function(e){ e.currentTarget.style.opacity="1"; }}>
              <span style={{ fontSize:18, minWidth:22, textAlign:"center" }}>{btn.emoji}</span>
              <span>{btn.label}</span>
            </button>
          );
        })}
        {/* コピーボタン（全幅） */}
        <button onClick={copyText}
          style={{ gridColumn:"1 / -1", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 14px", borderRadius:12, border:"2px solid "+(copied?"#43a047":"#ddd"), background:copied?"#e8f5e9":"#fff", color:copied?"#2e7d32":"#666", fontWeight:800, fontSize:13, cursor:"pointer" }}>
          <span style={{ fontSize:16 }}>{copied ? "✅" : "📋"}</span>
          <span>{copied ? "コピーしました！" : "テキストをコピーする（Instagram等に使えます）"}</span>
        </button>
      </div>
      {igTip && (
        <div style={{ background:"#fce4ec", padding:"10px 16px", fontSize:12, color:"#880e4f", lineHeight:1.7, borderTop:"1px solid #f48fb1" }}>
          📋 コピー完了！Instagramアプリを開いて、ストーリーズや投稿画面にそのまま貼り付けてシェアできます✨
        </div>
      )}
    </div>
  );
}

function RecipeArrange(props) {
  var [open, setOpen] = useState(false);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [log, setLog] = useState([]);
  var [applyCount, setApplyCount] = useState(0);

  async function send() {
    var txt = input.trim();
    if (!txt || loading) return;
    setInput("");
    props.setPending(null);
    setLog(function(p) { return p.concat([{ role:"user", text:txt }]); });
    setLoading(true);
    try {
      var currentCal = props.recipe.calories || "";
      var calInfo = currentCal ? "\n現在のカロリー: " + currentCal : "";
      var calInst = currentCal ? "元のカロリーは" + currentCal + "。アレンジ後のカロリーも計算し、増減があればcommentに例えば「カロリーが約100kcal増えますがよろしいですか？」のように明記すること。" : "";
      var prompt = "レシピアレンジリクエストです。\n現在のレシピ: " + props.recipe.name + "\n材料: " + props.recipe.ingredients.join(", ") + calInfo + "\n体調: " + (props.condition||"特になし") + "\n気分: " + (props.mood||"特になし") + "\nリクエスト: " + txt + "\n\n" + calInst + "commentにアドバイスを書き、末尾は必ず「このレシピに更新しますか？」で終わること。caloriesフィールドに1人分の概算kcalを約〇〇kcal形式で必ず記載。JSONのみ返答:\n{\"comment\":\"...\",\"recipe\":{\"name\":\"...\",\"description\":\"...\",\"time\":\"...\",\"difficulty\":\"簡単\",\"ingredients\":[\"...\"],\"steps\":[\"...\"],\"nutritionNote\":\"...\",\"calories\":\"約〇〇kcal\"}}";
      var parsed = await callAI(prompt);
      if (!parsed.recipe) throw new Error("recipeが見つかりません");
      props.setPending(parsed.recipe);
      setLog(function(p) { return p.concat([{ role:"ai", text:parsed.comment }]); });
    } catch(e) {
      setLog(function(p) { return p.concat([{ role:"ai", text:"エラー: " + e.message }]); });
    }
    setLoading(false);
  }

  function apply() {
    if (!props.pending) return;
    props.onApply();
    setApplyCount(function(c) { return c + 1; });
    props.setPending(null);
    setLog(function(p) { return p.concat([{ role:"ai", text:"レシピを更新しました！" }]); });
  }

  function reject() {
    props.setPending(null);
    setLog(function(p) { return p.concat([{ role:"ai", text:"わかりました！他にご希望があればどうぞ" }]); });
  }

  return (
    <div style={{ marginBottom:16 }}>
      <button onClick={function(){ setOpen(!open); }} style={{ width:"100%", padding:"12px 16px", borderRadius:14, border:"1.5px solid #ce93d8", background:open?"#f3e5f5":"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>✏️</span>
          <span style={{ fontWeight:800, color:"#6a1b9a", fontSize:15 }}>アレンジしたい</span>
          {applyCount > 0 && <span style={{ background:"#8e24aa", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:800 }}>{applyCount}回反映済み</span>}
        </div>
        <span style={{ color:"#ce93d8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ border:"1.5px solid #ce93d8", borderTop:"none", borderRadius:"0 0 14px 14px", padding:16, background:"#fdf6ff" }}>
          <p style={{ margin:"0 0 12px", fontSize:12, color:"#9c27b0" }}>食材を抜いたり、調味料を変えたり、自由にリクエストしてみてください</p>
          {log.length > 0 && (
            <div style={{ marginBottom:12, display:"flex", flexDirection:"column", gap:8 }}>
              {log.map(function(msg, i) {
                var isU = msg.role === "user";
                var isLast = i === log.length - 1;
                return (
                  <div key={i}>
                    <div style={{ display:"flex", justifyContent:isU?"flex-end":"flex-start" }}>
                      <div style={{ maxWidth:"85%", padding:"8px 12px", borderRadius:isU?"14px 14px 4px 14px":"14px 14px 14px 4px", background:isU?"#e07b3a":"#fff", color:isU?"#fff":"#5a3010", fontSize:13, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
                        {!isU && <span style={{ fontSize:11, color:"#9c27b0", fontWeight:800, display:"block", marginBottom:2 }}>AI</span>}
                        {msg.text}
                      </div>
                    </div>
                    {isLast && !isU && props.pending && (
                      <div style={{ display:"flex", gap:8, marginTop:8 }}>
                        <button onClick={apply} style={{ padding:"8px 18px", borderRadius:10, border:"none", background:"#8e24aa", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>更新する</button>
                        <button onClick={reject} style={{ padding:"8px 18px", borderRadius:10, border:"1.5px solid #ce93d8", background:"#fff", color:"#6a1b9a", fontWeight:800, fontSize:13, cursor:"pointer" }}>このままでいい</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div style={{ display:"flex", justifyContent:"flex-start" }}>
                  <div style={{ padding:"8px 14px", borderRadius:"14px 14px 14px 4px", background:"#fff", fontSize:13, color:"#9c27b0" }}>考え中…</div>
                </div>
              )}
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <input value={input} onChange={function(e){ setInput(e.target.value); }} onKeyDown={function(e){ if (e.key==="Enter") send(); }} placeholder="例：味噌はいらない、もっと辛くして…" disabled={loading}
              style={{ flex:1, borderRadius:10, border:"1.5px solid #ce93d8", padding:"10px 12px", fontSize:14, outline:"none", fontFamily:"inherit", color:"#4a2c0a", background:loading?"#f5f5f5":"#fff" }} />
            <button onClick={send} disabled={loading||!input.trim()} style={{ padding:"10px 16px", borderRadius:10, border:"none", background:(loading||!input.trim())?"#e1bee7":"#8e24aa", color:"#fff", fontWeight:800, fontSize:14, cursor:(loading||!input.trim())?"not-allowed":"pointer" }}>
              {loading ? "…" : "送信"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeView(props) {
  var r = props.recipe;
  var s = props.servings;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"#fff", borderRadius:20, padding:24, boxShadow:"0 4px 20px rgba(200,120,60,0.1)" }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:36 }}>🍽️</div>
          <h2 style={{ color:"#7c3a1e", fontSize:22, fontWeight:800, margin:"8px 0 4px" }}>{r.name}</h2>
          <p style={{ color:"#a0613a", fontSize:14, margin:"0 0 10px" }}>{r.description}</p>
          <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
            <Tag label={"⏱ "+r.time} color="#e8f5e9" tc="#2e7d32" />
            <Tag label={"難易度: "+r.difficulty} color="#e3f2fd" tc="#1565c0" />
            {r.calories && <Tag label={"🔥 "+r.calories+"/人"} color="#fff3e0" tc="#e65100" />}
          </div>
          {r.calories && <p style={{ margin:"8px 0 0", fontSize:11, color:"#bbb" }}>※カロリーはAIによる目安です。実際の値は食材・分量により異なります</p>}
        </div>

        <button onClick={props.onToggleFav} style={{ width:"100%", padding:"10px 0", borderRadius:12, border:props.isFav?"2px solid #e91e63":"2px solid #f3d5b0", background:props.isFav?"#fce4ec":"#fff8f0", color:props.isFav?"#c2185b":"#b56a2a", fontWeight:800, fontSize:15, cursor:"pointer", marginBottom:16 }}>
          {props.isFav ? "❤️ お気に入り済み" : "お気に入りに追加"}
        </button>

        <ShareButtons recipe={r} nutrients={props.nutrients} />

        <div style={{ background:"#fff8f0", borderRadius:12, padding:14, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontWeight:800, color:"#7c3a1e", fontSize:15 }}>人数調整</span>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={function(){ props.setServings(Math.max(1,s-1)); }} style={{ width:32, height:32, borderRadius:"50%", border:"2px solid #f3d5b0", background:"#fff", fontWeight:800, fontSize:18, cursor:"pointer", color:"#e07b3a" }}>-</button>
              <span style={{ fontWeight:800, fontSize:18, color:"#7c3a1e", minWidth:40, textAlign:"center" }}>{s}人分</span>
              <button onClick={function(){ props.setServings(Math.min(10,s+1)); }} style={{ width:32, height:32, borderRadius:"50%", border:"2px solid #f3d5b0", background:"#fff", fontWeight:800, fontSize:18, cursor:"pointer", color:"#e07b3a" }}>+</button>
            </div>
          </div>
          {s !== 1 && <p style={{ margin:0, fontSize:12, color:"#a0613a" }}>※分量は{s}人分に調整しています</p>}
        </div>

        <div style={{ marginBottom:18 }}>
          <h3 style={{ color:"#7c3a1e", fontSize:15, fontWeight:800, marginBottom:10 }}>材料（{s}人分）</h3>
          <div style={{ background:"#fff8f0", borderRadius:12, padding:14 }}>
            {r.ingredients.map(function(ing, i) {
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, fontSize:14, color:"#5a3010" }}>
                  <span style={{ color:"#e07b3a" }}>•</span>
                  <span>{scaleIng(ing, s)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <h3 style={{ color:"#7c3a1e", fontSize:15, fontWeight:800, marginBottom:10 }}>作り方</h3>
          {r.steps.map(function(st, i) {
            return (
              <div key={i} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
                <div style={{ minWidth:28, height:28, background:"#e07b3a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:13 }}>{i+1}</div>
                <p style={{ margin:0, fontSize:14, color:"#5a3010", lineHeight:1.6, paddingTop:4 }}>{st}</p>
              </div>
            );
          })}
        </div>

        <div style={{ background:"linear-gradient(135deg,#fff3e0,#fbe9d0)", borderRadius:14, padding:16, marginBottom:16 }}>
          <h3 style={{ color:"#7c3a1e", fontSize:14, fontWeight:800, margin:"0 0 8px" }}>栄養ポイント</h3>
          <p style={{ margin:0, fontSize:14, color:"#5a3010", lineHeight:1.7 }}>{r.nutritionNote}</p>
        </div>

        <RecipeArrange recipe={r} condition={props.condition} mood={props.mood} pending={props.pending} setPending={props.setPending} onApply={props.onApply} />

        <ShoppingChecklist ingredients={r.ingredients} servings={s} />

        <div style={{ background:"linear-gradient(135deg,#e8f5e9,#f1f8e9)", borderRadius:14, padding:16, border:"1.5px solid #a5d6a7" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <h3 style={{ color:"#2e7d32", fontSize:14, fontWeight:800, margin:0 }}>食材をネットで購入</h3>
            <button onClick={props.onOpenSuper} style={{ fontSize:11, color:"#4a7c4e", background:"none", border:"1px solid #a5d6a7", borderRadius:10, padding:"2px 8px", cursor:"pointer", fontWeight:700 }}>変更</button>
          </div>
          <p style={{ color:"#4a7c4e", fontSize:12, margin:"0 0 12px" }}>設定したスーパーで食材を検索できます</p>
          <p style={{ color:"#4a7c4e", fontSize:11, margin:"0 0 12px", background:"#f1f8e9", borderRadius:8, padding:"8px 12px", lineHeight:1.6 }}>🛒 お買い物に行く時間がない方や、重い荷物を運ぶのが大変な方は、ネットスーパーのご利用もおすすめです。<br /><span style={{ color:"#7a9b7e", fontSize:10 }}>※当サイトはアフィリエイトリンクを使用しておらず、紹介による報酬は発生しません。</span></p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
            {props.supers.map(function(id) {
              var sm = SUPERMARKETS.find(function(x) { return x.id === id; });
              if (!sm) return null;
              var q = r.ingredients.map(function(i) { return i.split("（")[0].split("(")[0].trim(); }).join(" ");
              return (
                <a key={id} href={sm.searchUrl(q)} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:sm.color, color:"#fff", borderRadius:10, padding:"10px 0", fontWeight:800, fontSize:14, textDecoration:"none" }}>
                  {sm.emoji} {sm.name}で検索
                </a>
              );
            })}
          </div>
          <p style={{ color:"#4a7c4e", fontSize:12, margin:"0 0 8px", fontWeight:700 }}>食材ごとに検索（Amazon）：</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {r.ingredients.map(function(ing, i) {
              var name = ing.split("（")[0].split("(")[0].trim();
              return (
                <a key={i} href={"https://www.amazon.co.jp/s?k="+encodeURIComponent(name)} target="_blank" rel="noopener noreferrer" style={{ background:"#fff", border:"1.5px solid #a5d6a7", borderRadius:20, padding:"4px 12px", fontSize:12, color:"#2e7d32", fontWeight:700, textDecoration:"none" }}>
                  {name}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <button onClick={props.onReset} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"2px solid #e07b3a", background:"#fff", color:"#e07b3a", fontWeight:800, fontSize:16, cursor:"pointer" }}>トップページに戻る</button>
      <button onClick={props.onSimple} disabled={props.gLoading} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:props.gLoading?"#ccc":"linear-gradient(90deg,#00897b,#00695c)", color:"#fff", fontWeight:800, fontSize:16, cursor:props.gLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {props.gLoading ? "考え中…" : "シンプル調理で提案しなおす"}
      </button>
      <button onClick={props.onGacha} disabled={props.gLoading} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:props.gLoading?"#ccc":"linear-gradient(90deg,#8e24aa,#6a1b9a)", color:"#fff", fontWeight:800, fontSize:17, cursor:props.gLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span>{props.gLoading ? "別のレシピを探し中…" : "ガチャ！別のレシピを提案 " + (props.excluded.length > 0 ? "("+props.excluded.length+"回目)" : "")}</span>
      </button>
    </div>
  );
}

export default function App() {
  var [screen, setScreen] = useState("main");
  var [step, setStep] = useState(0);
  var [condition, setCondition] = useState("");
  var [mood, setMood] = useState("");
  var [ingredients, setIngredients] = useState("");
  var [dishType, setDishType] = useState("");
  var [budget, setBudget] = useState("");
  var [servings, setServings] = useState(1);
  var [simpleMode, setSimpleMode] = useState(false);
  var [loading, setLoading] = useState(false);
  var [analysis, setAnalysis] = useState(null);
  var [recipe, setRecipe] = useState(null);
  var [pending, setPending] = useState(null);
  var [error, setError] = useState(null);
  var [excluded, setExcluded] = useState([]);
  var [gLoading, setGLoading] = useState(false);
  var [favs, setFavs] = useState([]);
  var [hist, setHist] = useState([]);
  var [supers, setSupers] = useState(["amazon"]);
  var [viewFav, setViewFav] = useState(null);
  var [viewHist, setViewHist] = useState(null);
  var [isPro, setIsPro] = useState(getPro());
  var [usage, setUsage] = useState(getUsage());
  var [showUpgrade, setShowUpgrade] = useState(false);
  var [showAd, setShowAd] = useState(false);

  useEffect(function() {
    try { var f = localStorage.getItem("favs"); if (f) setFavs(JSON.parse(f)); } catch(e) {}
    try { var h = localStorage.getItem("hist"); if (h) setHist(JSON.parse(h)); } catch(e) {}
    try { var s = localStorage.getItem("supers"); if (s) setSupers(JSON.parse(s)); } catch(e) {}
  }, []);

  useEffect(function() { try { localStorage.setItem("favs", JSON.stringify(favs)); } catch(e) {} }, [favs]);
  useEffect(function() { try { localStorage.setItem("hist", JSON.stringify(hist)); } catch(e) {} }, [hist]);
  useEffect(function() { try { localStorage.setItem("supers", JSON.stringify(supers)); } catch(e) {} }, [supers]);

  function canUse() { return true; }
  function useOne() { var u = getUsage(); u.count = (u.count||0) + 1; saveUsage(u); setUsage(Object.assign({}, u)); }
  function toggleSuper(id) { setSupers(function(p) { return p.includes(id) ? p.filter(function(x){ return x!==id; }) : p.concat([id]); }); }
  function isFav(r) { return r ? favs.some(function(f){ return f.name===r.name; }) : false; }
  function toggleFav(r) {
    if (!r) return;
    if (isFav(r)) { setFavs(function(p){ return p.filter(function(f){ return f.name!==r.name; }); }); }
    else { setFavs(function(p){ return [Object.assign({},r,{savedAt:new Date().toLocaleDateString("ja-JP")})].concat(p).slice(0,30); }); }
  }
  function addHist(r) { setHist(function(p){ var f=p.filter(function(h){return h.name!==r.name;}); return [Object.assign({},r,{viewedAt:new Date().toLocaleDateString("ja-JP")})].concat(f).slice(0,20); }); }

  function buildPrompt(excl, simple) {
    var ex = excl&&excl.length>0 ? "\n除外: "+excl.join("、") : "";
    var si = simple ? "\nシンプル調理：手順少なく短時間で。" : "";
    return "栄養士として一人で頑張る方を応援してレシピ提案してください。\n体調:"+(condition||"特になし")+"\n気分:"+(mood||"特になし")+"\n食材:"+(ingredients||"特になし")+"\n料理種類:"+(dishType||"なし")+"\n予算:"+(budget||"なし")+"\n人数:"+servings+"人分"+ex+si+"\n\n毎回異なるレシピを。予算超過食材はbudgetOk:falseで代替。体調に合わない料理種類はapproved:falseで代替。食材欄にkcal指定があればそれを守ること。必ずcaloriesフィールドに1人分の概算kcalを約〇〇kcal形式で記載。\nJSONのみ:\n{\"hiddenSigns\":[\"サイン\"],\"nutrients\":[{\"name\":\"栄養素\",\"reason\":\"理由\"}],\"budgetCheck\":{\"budgetOk\":true,\"originalIngredient\":\"\",\"alternativeIngredient\":\"\",\"reason\":\"\"},\"dishTypeCheck\":{\"approved\":true,\"requestedType\":\"\",\"suggestedType\":\"\",\"reason\":\"\"},\"recipe\":{\"name\":\"料理名\",\"description\":\"説明\",\"time\":\"時間\",\"difficulty\":\"簡単\",\"ingredients\":[\"食材（分量）\"],\"steps\":[\"手順\"],\"nutritionNote\":\"栄養\",\"calories\":\"約〇〇kcal\"}}";
  }

  async function analyze() {
    if (!condition.trim() && !mood.trim()) return;
    if (!canUse()) { setShowUpgrade(true); return; }
    useOne();
    setLoading(true); setStep(1); setError(null); setExcluded([]); setSimpleMode(false); setPending(null);
    try {
      var p = await callAI(buildPrompt([], false));
      setAnalysis({ hiddenSigns:p.hiddenSigns, nutrients:p.nutrients, dishTypeCheck:p.dishTypeCheck, budgetCheck:p.budgetCheck });
      setRecipe(p.recipe); addHist(p.recipe); setStep(2);
    } catch(e) { setError("エラー: "+e.message); setStep(0); }
    setLoading(false);
  }

  async function gacha() {
    if (!recipe) return;
    setGLoading(true);
    var ex = excluded.concat([recipe.name]); setExcluded(ex);
    try { var p = await callAI(buildPrompt(ex, simpleMode)); setRecipe(p.recipe); addHist(p.recipe); } catch(e) { setError(e.message); }
    setGLoading(false);
  }

  async function simple() {
    if (!recipe) return;
    setSimpleMode(true); setGLoading(true);
    var ex = excluded.concat([recipe.name]); setExcluded(ex);
    try { var p = await callAI(buildPrompt(ex, true)); setRecipe(p.recipe); addHist(p.recipe); } catch(e) { setError(e.message); }
    setGLoading(false);
  }

  function reset() { setStep(0); setCondition(""); setMood(""); setIngredients(""); setDishType(""); setBudget(""); setSimpleMode(false); setExcluded([]); setAnalysis(null); setRecipe(null); setPending(null); setError(null); }
  function applyArrange() { if (pending) { setRecipe(pending); addHist(pending); setPending(null); } }

  var card = { background:"#fff", borderRadius:20, padding:24, boxShadow:"0 4px 20px rgba(200,120,60,0.1)" };
  var btnP = { width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(90deg,#e07b3a,#d05a20)", color:"#fff", fontWeight:800, fontSize:17, cursor:"pointer" };

  var rvProps = {
    servings:servings, setServings:setServings,
    supers:supers, onOpenSuper:function(){ setScreen("supermarket"); },
    condition:condition, mood:mood,
    pending:pending, setPending:setPending, onApply:applyArrange,
    onReset:reset, onGacha:gacha, onSimple:simple,
    gLoading:gLoading, excluded:excluded,
    nutrients: analysis ? analysis.nutrients : []
  };

  function wrap(ch) {
    // ローディング中・AI分析中は広告を非表示（AdSenseポリシー対応）
    var showAdBanner = !loading && step !== 1;
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#fff8f0 0%,#fef3e2 100%)", fontFamily:"'Hiragino Sans','Meiryo',sans-serif", paddingBottom:80 }}>
        <div style={{ maxWidth:520, margin:"0 auto", padding:"24px 16px" }}>{ch}</div>
        {showAdBanner && <AdBanner />}
      </div>
    );
  }

  if (viewFav) return wrap(
    <div>
      <button onClick={function(){ setViewFav(null); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", marginBottom:16 }}>← 戻る</button>
      <RecipeView {...rvProps} recipe={viewFav} isFav={isFav(viewFav)} onToggleFav={function(){ toggleFav(viewFav); }} onReset={function(){ setViewFav(null); }} onApply={function(){ if(pending){ setViewFav(pending); setPending(null); } }} />
    </div>
  );

  if (viewHist) return wrap(
    <div>
      <button onClick={function(){ setViewHist(null); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", marginBottom:16 }}>← 戻る</button>
      <RecipeView {...rvProps} recipe={viewHist} isFav={isFav(viewHist)} onToggleFav={function(){ toggleFav(viewHist); }} onReset={function(){ setViewHist(null); }} onApply={function(){ if(pending){ setViewHist(pending); setPending(null); } }} />
    </div>
  );

  if (screen === "supermarket") return wrap(
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={function(){ setScreen("main"); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button>
        <h2 style={{ margin:0, color:"#7c3a1e", fontSize:20, fontWeight:800 }}>よく使うスーパーを選択</h2>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
        {SUPERMARKETS.map(function(sm) {
          var sel = supers.includes(sm.id);
          return (
            <div key={sm.id} onClick={function(){ toggleSuper(sm.id); }} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, cursor:"pointer", border:"2px solid "+(sel?sm.color:"#f3d5b0"), background:sel?sm.color+"12":"#fff" }}>
              <span style={{ fontSize:26 }}>{sm.emoji}</span>
              <span style={{ fontWeight:700, fontSize:16, color:sel?sm.color:"#5a3010", flex:1 }}>{sm.name}</span>
              <div style={{ width:24, height:24, borderRadius:"50%", border:"2px solid "+(sel?sm.color:"#ccc"), background:sel?sm.color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {sel && <span style={{ color:"#fff", fontSize:14, fontWeight:800 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={function(){ setScreen("main"); }} style={btnP}>保存して戻る</button>
    </div>
  );

  if (screen === "favorites") return wrap(
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={function(){ setScreen("main"); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button>
        <h2 style={{ margin:0, color:"#7c3a1e", fontSize:20, fontWeight:800 }}>お気に入りレシピ</h2>
      </div>
      {favs.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#a0613a" }}><div style={{ fontSize:48, marginBottom:12 }}>🤍</div><p>まだお気に入りがありません</p></div>
      ) : favs.map(function(f, i) {
        return (
          <div key={i} onClick={function(){ setViewFav(f); }} style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:10, boxShadow:"0 2px 10px rgba(200,120,60,0.08)", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><p style={{ margin:"0 0 4px", fontWeight:800, color:"#7c3a1e", fontSize:15 }}>{f.name}</p><p style={{ margin:0, fontSize:12, color:"#a0613a" }}>⏱ {f.time} ｜ {f.savedAt}</p></div>
            <span style={{ fontSize:20 }}>❤️</span>
          </div>
        );
      })}
    </div>
  );

  if (screen === "history") return wrap(
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={function(){ setScreen("main"); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button>
        <h2 style={{ margin:0, color:"#7c3a1e", fontSize:20, fontWeight:800 }}>過去の提案履歴</h2>
      </div>
      {hist.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#a0613a" }}><div style={{ fontSize:48, marginBottom:12 }}>📭</div><p>まだ履歴がありません</p></div>
      ) : hist.map(function(h, i) {
        return (
          <div key={i} onClick={function(){ setViewHist(h); }} style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:10, boxShadow:"0 2px 10px rgba(200,120,60,0.08)", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><p style={{ margin:"0 0 4px", fontWeight:800, color:"#7c3a1e", fontSize:15 }}>{h.name}</p><p style={{ margin:0, fontSize:12, color:"#a0613a" }}>⏱ {h.time} ｜ {h.viewedAt}</p></div>
            <span style={{ fontSize:18, color:"#ccc" }}>›</span>
          </div>
        );
      })}
    </div>
  );

  return wrap(
    <div>
      <UpgradeModal open={showUpgrade} onClose={function(){ setShowUpgrade(false); }} />
      <InstallBanner />
      <AdModal open={showAd} onComplete={function(){ var u=getUsage(); u.count=Math.max(0,(u.count||0)-AD_BONUS); saveUsage(u); setUsage(Object.assign({},u)); setShowAd(false); }} />

      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ fontSize:44, marginBottom:4 }}>🍲</div>
        <h1 style={{ fontSize:22, fontWeight:800, color:"#7c3a1e", margin:0 }}>AI健康料理提案</h1>
        <p style={{ color:"#c49a70", fontSize:11, margin:"6px 0 0", letterSpacing:1 }}>料理はこころのサプリ</p>
      </div>

      <UsageBanner isPro={isPro} usage={usage} onUpgrade={function(){ setShowUpgrade(true); }} onAd={function(){ setShowAd(true); }} />

      <div style={{ display:"flex", gap:8, marginBottom:16, justifyContent:"center", flexWrap:"wrap" }}>
        {[{id:"favorites",icon:"❤️",label:"お気に入り("+favs.length+")"},{id:"history",icon:"📋",label:"履歴("+hist.length+")"},{id:"supermarket",icon:"🛒",label:"スーパー("+supers.length+")"}].map(function(nav) {
          return <button key={nav.id} onClick={function(){ setScreen(nav.id); }} style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 14px", borderRadius:20, border:"1.5px solid #f3d5b0", background:"#fff8f0", color:"#b56a2a", fontWeight:700, fontSize:12, cursor:"pointer" }}>{nav.icon} {nav.label}</button>;
        })}
      </div>

      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:20 }}>
        {["①入力","②分析","③栄養提案","④レシピ"].map(function(s, i) {
          return <div key={i} style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, background:step>=i?"#e07b3a":"#f3e0c8", color:step>=i?"#fff":"#c49a70" }}>{s}</div>;
        })}
      </div>

      {error && <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:12, padding:12, marginBottom:16, color:"#b91c1c", fontSize:14 }}>{error}</div>}

      {step === 0 && (
        <div style={card}>
          {[{label:"体調・症状",val:condition,set:setCondition,ph:"例：なんとなくだるい、眠れない…"},{label:"気分・こころの状態",val:mood,set:setMood,ph:"例：元気が出ない、リラックスしたい…"}].map(function(item) {
            return (
              <div key={item.label} style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontWeight:700, color:"#7c3a1e", marginBottom:8, fontSize:15 }}>{item.label}</label>
                <textarea value={item.val} onChange={function(e){ item.set(e.target.value); }} placeholder={item.ph} rows={3}
                  style={{ width:"100%", borderRadius:12, border:"1.5px solid #f3d5b0", padding:"10px 12px", fontSize:14, resize:"vertical", outline:"none", boxSizing:"border-box", fontFamily:"inherit", color:"#4a2c0a" }} />
              </div>
            );
          })}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontWeight:700, color:"#7c3a1e", marginBottom:8, fontSize:15 }}>食べたい食材・カロリー要望（任意）</label>
            <input value={ingredients} onChange={function(e){ setIngredients(e.target.value); }} placeholder="例：鶏肉、豆腐 /500kcal以内で…"
              style={{ width:"100%", borderRadius:12, border:"1.5px solid #f3d5b0", padding:"10px 12px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", color:"#4a2c0a" }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontWeight:700, color:"#7c3a1e", marginBottom:10, fontSize:15 }}>予算（任意）</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["〜300円","〜500円","〜800円","〜1,200円","〜2,000円"].map(function(b) {
                return <button key={b} onClick={function(){ setBudget(budget===b?"":b); }} style={{ padding:"8px 14px", borderRadius:20, fontSize:13, fontWeight:700, cursor:"pointer", border:budget===b?"2px solid #e07b3a":"2px solid #f3d5b0", background:budget===b?"#e07b3a":"#fff8f0", color:budget===b?"#fff":"#b56a2a" }}>{b}</button>;
              })}
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontWeight:700, color:"#7c3a1e", marginBottom:10, fontSize:15 }}>人数（任意）</label>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={function(){ setServings(Math.max(1,servings-1)); }} style={{ width:36, height:36, borderRadius:"50%", border:"2px solid #f3d5b0", background:"#fff8f0", fontWeight:800, fontSize:20, cursor:"pointer", color:"#e07b3a" }}>-</button>
              <span style={{ fontWeight:800, fontSize:18, color:"#7c3a1e", minWidth:50, textAlign:"center" }}>{servings}人分</span>
              <button onClick={function(){ setServings(Math.min(10,servings+1)); }} style={{ width:36, height:36, borderRadius:"50%", border:"2px solid #f3d5b0", background:"#fff8f0", fontWeight:800, fontSize:20, cursor:"pointer", color:"#e07b3a" }}>+</button>
            </div>
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontWeight:700, color:"#7c3a1e", marginBottom:10, fontSize:15 }}>料理の種類（任意）</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["お任せ","汁物","炒め物","揚げ物","副菜"].map(function(t) {
                return <button key={t} onClick={function(){ setDishType(dishType===t?"":t); }} style={{ padding:"8px 18px", borderRadius:20, fontSize:14, fontWeight:700, cursor:"pointer", border:dishType===t?"2px solid #e07b3a":"2px solid #f3d5b0", background:dishType===t?"#e07b3a":"#fff8f0", color:dishType===t?"#fff":"#b56a2a" }}>{t}</button>;
              })}
            </div>
          </div>
          <button onClick={analyze} disabled={!condition.trim()&&!mood.trim()} style={Object.assign({},btnP,{background:(!condition.trim()&&!mood.trim())?"#f3d5b0":"linear-gradient(90deg,#e07b3a,#d05a20)",cursor:(!condition.trim()&&!mood.trim())?"not-allowed":"pointer"})}>
            AIに分析してもらう
          </button>
        </div>
      )}

      {step === 1 && <div style={card}><Spinner /></div>}

      {step === 2 && analysis && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={card}>
            <h2 style={{ color:"#7c3a1e", fontSize:17, fontWeight:800, marginTop:0, marginBottom:12 }}>体のサインを分析しました</h2>
            <div style={{ background:"#fff8f0", borderRadius:12, padding:14, marginBottom:16 }}>
              <p style={{ margin:"0 0 8px", fontSize:13, color:"#a0613a", fontWeight:700 }}>気づいていないかもしれないサイン：</p>
              {analysis.hiddenSigns.map(function(s, i) {
                return <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}><span style={{ color:"#e07b3a", fontWeight:800 }}>⚡</span><span style={{ fontSize:14, color:"#5a3010" }}>{s}</span></div>;
              })}
            </div>
            {analysis.budgetCheck && !analysis.budgetCheck.budgetOk && (
              <div style={{ borderRadius:12, padding:14, marginBottom:16, background:"#fce4ec", border:"1.5px solid #f48fb1" }}>
                <p style={{ margin:"0 0 6px", fontWeight:800, fontSize:14, color:"#c62828" }}>予算オーバーの可能性があります</p>
                <p style={{ margin:"0 0 6px", fontSize:13, color:"#5a3010" }}><span style={{ textDecoration:"line-through", color:"#aaa" }}>{analysis.budgetCheck.originalIngredient}</span>{" → "}<strong style={{ color:"#e07b3a" }}>{analysis.budgetCheck.alternativeIngredient}</strong> で代替提案します</p>
                <p style={{ margin:0, fontSize:13, color:"#5a3010" }}>{analysis.budgetCheck.reason}</p>
              </div>
            )}
            {analysis.dishTypeCheck && analysis.dishTypeCheck.requestedType && (
              <div style={{ borderRadius:12, padding:14, marginBottom:16, background:analysis.dishTypeCheck.approved?"#e8f5e9":"#fff3e0", border:"1.5px solid "+(analysis.dishTypeCheck.approved?"#a5d6a7":"#ffcc80") }}>
                <p style={{ margin:"0 0 6px", fontWeight:800, fontSize:14, color:analysis.dishTypeCheck.approved?"#2e7d32":"#e65100" }}>{analysis.dishTypeCheck.approved?"リクエストOK！":"別の料理をおすすめします"}</p>
                {!analysis.dishTypeCheck.approved && <p style={{ margin:"0 0 6px", fontSize:13, color:"#5a3010" }}><span style={{ textDecoration:"line-through", color:"#aaa" }}>{analysis.dishTypeCheck.requestedType}</span>{" → "}<strong style={{ color:"#e07b3a" }}>{analysis.dishTypeCheck.suggestedType}</strong></p>}
                <p style={{ margin:0, fontSize:13, color:"#5a3010" }}>{analysis.dishTypeCheck.reason}</p>
              </div>
            )}
            <h3 style={{ color:"#7c3a1e", fontSize:15, fontWeight:800, marginBottom:10 }}>今の体に必要な栄養素</h3>
            {analysis.nutrients.map(function(n, i) {
              return <div key={i} style={{ borderLeft:"4px solid #e07b3a", paddingLeft:12, marginBottom:12 }}><Tag label={n.name} /><p style={{ margin:"4px 0 0", fontSize:13, color:"#5a3010" }}>{n.reason}</p></div>;
            })}
          </div>
          <button onClick={function(){ setStep(3); }} style={btnP}>レシピを見る</button>
        </div>
      )}

      {step === 3 && recipe && (
        <RecipeView {...rvProps} recipe={recipe} isFav={isFav(recipe)} onToggleFav={function(){ toggleFav(recipe); }} onApply={applyArrange} />
      )}
    </div>
  );
}