(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function s(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(n){if(n.ep)return;n.ep=!0;const o=s(n);fetch(n.href,o)}})();let g=null,B="",f=[],I=[],m="all";const y=document.getElementById("search-input"),U=document.getElementById("search-btn"),M=document.getElementById("search-suggestions"),D=document.getElementById("loading-section"),W=document.getElementById("loading-text"),G=document.getElementById("loading-sub"),H=document.getElementById("movie-select-section"),C=document.getElementById("movie-list"),N=document.getElementById("results-section"),K=document.getElementById("results-movie-title"),L=document.getElementById("date-tabs"),O=document.getElementById("future-toggle"),V=document.getElementById("results-stats"),w=document.getElementById("theater-cards"),Y=document.getElementById("back-btn"),j=document.getElementById("empty-section"),_=document.getElementById("empty-back-btn");U.addEventListener("click",P);y.addEventListener("keydown",e=>{e.key==="Enter"&&P()});Y.addEventListener("click",q);_.addEventListener("click",q);O.addEventListener("change",()=>{v()});document.addEventListener("click",e=>{e.target.closest(".search-container")||M.classList.add("hidden")});async function J(){return g||(g=await(await fetch("/movie-screen-finder/data.json")).json(),g)}async function P(){const e=y.value.trim().toLowerCase();k(),Z("データを読み込み中...","最新の上映スケジュールを取得しています");try{const t=await J();T();const i=t.filter(n=>!e||n.movie.title.toLowerCase().includes(e)).map(n=>n.movie);if(i.length===0){S("映画が見つかりません",`"${e}" に一致する公開中の映画が見つかりませんでした。（※データは自動取得された人気上位作品のみ対象です）`);return}i.length===1?z(i[0]):Q(i)}catch(t){T(),console.error("Data load error:",t),S("エラー","データの読み込みに失敗しました。")}}function Q(e){C.innerHTML="",e.forEach((t,s)=>{const i=document.createElement("div");i.className="movie-item fade-in",i.style.animationDelay=`${s*.05}s`,i.innerHTML=`
      <div class="movie-item-icon">🎬</div>
      <div class="movie-item-title">${h(t.title)}</div>
      <div class="movie-item-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    `,i.addEventListener("click",()=>z(t)),C.appendChild(i)}),H.classList.remove("hidden")}function z(e){B=e.title,k();const s=(g||[]).find(i=>i.movie.id===e.id);if(!s||!s.schedules||s.schedules.length===0){S("上映情報が見つかりません",`"${e.title}" のスケジュールデータがありません。`);return}f=s.schedules,X()}function X(){K.textContent=B;const e=new Set;f.forEach(t=>{t.schedule.forEach(s=>{e.add(s.date)})}),I=[...e].sort(),m="all",$(),v(),N.classList.remove("hidden")}function $(){L.innerHTML="";const e=document.createElement("button");e.className=`date-tab ${m==="all"?"active":""}`,e.textContent="すべて",e.addEventListener("click",()=>{m="all",$(),v()}),L.appendChild(e),I.forEach(t=>{const s=document.createElement("button");s.className=`date-tab ${m===t?"active":""}`,s.textContent=ee(t),s.addEventListener("click",()=>{m=t,$(),v()}),L.appendChild(s)})}function v(){const e=O.checked,t=new Date,s=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,i=Math.max(...f.map(a=>a.theater.maxSeats)),n=f.map(a=>{const c=a.schedule.filter(l=>m==="all"||l.date===m).map(l=>{let u=l.times;return e&&l.date===s&&(u=u.filter(x=>{const[b,E]=x.start.split(":").map(Number),p=new Date(t);return p.setHours(b,E,0,0),p>t})),{...l,times:u}}).filter(l=>l.times.length>0);return c.length===0?null:{...a,schedule:c}}).filter(Boolean),o=n.reduce((a,c)=>a+c.schedule.reduce((l,u)=>l+u.times.length,0),0);if(V.innerHTML=`
    <span class="stat-item"><span class="stat-dot gold"></span>${n.length} 映画館</span>
    <span class="stat-item"><span class="stat-dot blue"></span>${o} 上映回</span>
  `,w.innerHTML="",n.length===0){w.innerHTML=`
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 12px;">🎬</div>
        <p>選択した条件に一致する上映がありません</p>
        <p style="font-size: 0.82rem; margin-top: 4px;">日付フィルターや時間フィルターを変更してみてください</p>
      </div>
    `;return}n.forEach((a,c)=>{const l=document.createElement("div");l.className="theater-card",l.style.animationDelay=`${c*.08}s`;const x=a.theater.screens.filter(r=>r.type!=="通常").slice(0,3).map(r=>{let d="premium";return r.type.toLowerCase().includes("imax")?d="imax":r.type.toLowerCase().includes("dolby")&&(d="dolby"),`<span class="screen-badge ${d}">${h(r.type)}</span>`}).join(""),b=(a.theater.maxSeats/i*100).toFixed(1),E=a.theater.screens.map(r=>`
      <div style="background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${h(r.name)}</span>
        <span style="color: var(--gold); font-weight: bold; flex-shrink: 0;">${r.seats}席</span>
      </div>
    `).join("");let p="";a.schedule.forEach(r=>{m==="all"&&I.length>1&&(p+=`<div class="schedule-date-label">${h(r.displayDate)}</div>`),r.times.forEach(d=>{const A=te(r.date,d.start,t,s),R=d.end?`<span class="time-end">〜${d.end}</span>`:"";p+=`<div class="time-chip ${A?"past":""}">${d.start}${R}</div>`})});const F=`https://www.google.com/search?q=${encodeURIComponent(a.theater.name+" 上映スケジュール")}`;l.innerHTML=`
      <div class="theater-card-header">
        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
          <div class="rank-badge ${c<3?"top3":""}">${c+1}</div>
          <div class="theater-info">
            <div class="theater-name">${h(a.theater.name)}</div>
            <div class="theater-area">${h(a.theater.area)}</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <div class="theater-badge-group">${x}</div>
          <a href="${F}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: #aaa; text-decoration: none; border: 1px solid rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
            <span>公式サイトでスクリーンを確認</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
      </div>
      <div class="seat-bar-container" style="margin-bottom: 8px;">
        <div class="seat-bar">
          <span class="seat-bar-label">最大スクリーン</span>
          <div class="seat-bar-track">
            <div class="seat-bar-fill" style="width: ${b}%"></div>
          </div>
          <span class="seat-bar-value">${a.theater.maxSeats}席</span>
        </div>
      </div>
      <details style="margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted);">
        <summary style="cursor: pointer; opacity: 0.8; user-select: none;">この映画館の全スクリーン一覧を開く (${a.theater.screens.length}スクリーン)</summary>
        <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px;">
          ${E}
        </div>
      </details>
      <div class="schedule-grid">${p}</div>
    `,w.appendChild(l)})}function k(){D.classList.add("hidden"),H.classList.add("hidden"),N.classList.add("hidden"),j.classList.add("hidden"),M.classList.add("hidden")}function Z(e,t){W.textContent=e,G.textContent=t,D.classList.remove("hidden")}function T(){D.classList.add("hidden")}function S(e,t){document.getElementById("empty-title").textContent=e,document.getElementById("empty-desc").textContent=t,j.classList.remove("hidden")}function q(){k(),f=[],B="",y.focus()}function h(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function ee(e){const[t,s,i]=e.split("-").map(Number),n=new Date(t,s-1,i),a=["日","月","火","水","木","金","土"][n.getDay()];return`${s}/${i}（${a}）`}function te(e,t,s,i){if(e!==i)return e<i;const[n,o]=t.split(":").map(Number),a=new Date(s);return a.setHours(n,o,0,0),a<=s}y.focus();
