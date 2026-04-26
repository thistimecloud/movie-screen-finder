(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const c of n)if(c.type==="childList")for(const i of c.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function s(n){const c={};return n.integrity&&(c.integrity=n.integrity),n.referrerPolicy&&(c.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?c.credentials="include":n.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function a(n){if(n.ep)return;n.ep=!0;const c=s(n);fetch(n.href,c)}})();let p=null,w="",v=[],B=[],m="all";const y=document.getElementById("search-input"),A=document.getElementById("search-btn"),k=document.getElementById("search-suggestions"),I=document.getElementById("loading-section"),W=document.getElementById("loading-text"),G=document.getElementById("loading-sub"),M=document.getElementById("movie-select-section"),T=document.getElementById("movie-list"),H=document.getElementById("results-section"),K=document.getElementById("results-movie-title"),L=document.getElementById("date-tabs"),N=document.getElementById("future-toggle"),R=document.getElementById("results-stats"),S=document.getElementById("theater-cards"),Y=document.getElementById("back-btn"),O=document.getElementById("empty-section"),J=document.getElementById("empty-back-btn");A.addEventListener("click",P);y.addEventListener("keydown",e=>{e.key==="Enter"&&P()});Y.addEventListener("click",F);J.addEventListener("click",F);N.addEventListener("change",()=>{g()});document.addEventListener("click",e=>{e.target.closest(".search-container")||k.classList.add("hidden")});async function Q(){return p||(p=await(await fetch("/movie-screen-finder/data.json")).json(),p)}async function P(){const e=y.value.trim().toLowerCase();D(),X("データを読み込み中...","最新の上映スケジュールを取得しています");try{const t=await Q();C();const a=t.filter(n=>!e||n.movie.title.toLowerCase().includes(e)).map(n=>n.movie);if(a.length===0){x("映画が見つかりません",`"${e}" に一致する公開中の映画が見つかりませんでした。（※データは自動取得された人気上位作品のみ対象です）`);return}a.length===1?j(a[0]):U(a)}catch(t){C(),console.error("Data load error:",t),x("エラー","データの読み込みに失敗しました。")}}function U(e){T.innerHTML="",e.forEach((t,s)=>{const a=document.createElement("div");a.className="movie-item fade-in",a.style.animationDelay=`${s*.05}s`,a.innerHTML=`
      <div class="movie-item-icon">🎬</div>
      <div class="movie-item-title">${f(t.title)}</div>
      <div class="movie-item-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    `,a.addEventListener("click",()=>j(t)),T.appendChild(a)}),M.classList.remove("hidden")}function j(e){w=e.title,D();const s=(p||[]).find(a=>a.movie.id===e.id);if(!s||!s.schedules||s.schedules.length===0){x("上映情報が見つかりません",`"${e.title}" のスケジュールデータがありません。`);return}v=s.schedules,V()}function V(){K.textContent=w;const e=new Set;v.forEach(t=>{t.schedule.forEach(s=>{e.add(s.date)})}),B=[...e].sort(),m="all",$(),g(),H.classList.remove("hidden")}function $(){L.innerHTML="";const e=document.createElement("button");e.className=`date-tab ${m==="all"?"active":""}`,e.textContent="すべて",e.addEventListener("click",()=>{m="all",$(),g()}),L.appendChild(e),B.forEach(t=>{const s=document.createElement("button");s.className=`date-tab ${m===t?"active":""}`,s.textContent=Z(t),s.addEventListener("click",()=>{m=t,$(),g()}),L.appendChild(s)})}function g(){const e=N.checked,t=new Date,s=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,a=Math.max(...v.map(i=>i.theater.maxSeats)),n=v.map(i=>{const l=i.schedule.filter(o=>m==="all"||o.date===m).map(o=>{let u=o.times;return e&&o.date===s&&(u=u.filter(E=>{const[b,h]=E.start.split(":").map(Number),d=new Date(t);return d.setHours(b,h,0,0),d>t})),{...o,times:u}}).filter(o=>o.times.length>0);return l.length===0?null:{...i,schedule:l}}).filter(Boolean),c=n.reduce((i,l)=>i+l.schedule.reduce((o,u)=>o+u.times.length,0),0);if(R.innerHTML=`
    <span class="stat-item"><span class="stat-dot gold"></span>${n.length} 映画館</span>
    <span class="stat-item"><span class="stat-dot blue"></span>${c} 上映回</span>
  `,S.innerHTML="",n.length===0){S.innerHTML=`
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 12px;">🎬</div>
        <p>選択した条件に一致する上映がありません</p>
        <p style="font-size: 0.82rem; margin-top: 4px;">日付フィルターや時間フィルターを変更してみてください</p>
      </div>
    `;return}n.forEach((i,l)=>{const o=document.createElement("div");o.className="theater-card",o.style.animationDelay=`${l*.08}s`;const E=i.theater.screens.filter(d=>d.type!=="通常").slice(0,3).map(d=>{let r="premium";return d.type.toLowerCase().includes("imax")?r="imax":d.type.toLowerCase().includes("dolby")&&(r="dolby"),`<span class="screen-badge ${r}">${f(d.type)}</span>`}).join(""),b=(i.theater.maxSeats/a*100).toFixed(1);let h="";i.schedule.forEach(d=>{m==="all"&&B.length>1&&(h+=`<div class="schedule-date-label">${f(d.displayDate)}</div>`),d.times.forEach(r=>{const q=_(d.date,r.start,t,s),z=r.end?`<span class="time-end">〜${r.end}</span>`:"";h+=`<div class="time-chip ${q?"past":""}">${r.start}${z}</div>`})}),o.innerHTML=`
      <div class="theater-card-header">
        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
          <div class="rank-badge ${l<3?"top3":""}">${l+1}</div>
          <div class="theater-info">
            <div class="theater-name">${f(i.theater.name)}</div>
            <div class="theater-area">${f(i.theater.area)}</div>
          </div>
        </div>
        <div class="theater-badge-group">${E}</div>
      </div>
      <div class="seat-bar-container">
        <div class="seat-bar">
          <span class="seat-bar-label">最大スクリーン</span>
          <div class="seat-bar-track">
            <div class="seat-bar-fill" style="width: ${b}%"></div>
          </div>
          <span class="seat-bar-value">${i.theater.maxSeats}席</span>
        </div>
      </div>
      <div class="schedule-grid">${h}</div>
    `,S.appendChild(o)})}function D(){I.classList.add("hidden"),M.classList.add("hidden"),H.classList.add("hidden"),O.classList.add("hidden"),k.classList.add("hidden")}function X(e,t){W.textContent=e,G.textContent=t,I.classList.remove("hidden")}function C(){I.classList.add("hidden")}function x(e,t){document.getElementById("empty-title").textContent=e,document.getElementById("empty-desc").textContent=t,O.classList.remove("hidden")}function F(){D(),v=[],w="",y.focus()}function f(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Z(e){const[t,s,a]=e.split("-").map(Number),n=new Date(t,s-1,a),i=["日","月","火","水","木","金","土"][n.getDay()];return`${s}/${a}（${i}）`}function _(e,t,s,a){if(e!==a)return e<a;const[n,c]=t.split(":").map(Number),i=new Date(s);return i.setHours(n,c,0,0),i<=s}y.focus();
