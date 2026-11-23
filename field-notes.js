const categories=["All","Building & Making","AI Video & Storytelling","Tools & Experiments","Ideas & Discoveries","Places & Experiences","Life & Other Interests","Lessons & Reflections"];
let notes=[],active="All";
const grid=document.getElementById("notes-grid"),filters=document.getElementById("note-filters");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function inlineMarkdown(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/_(.+?)_/g,"<em>$1</em>");
}
function renderMarkdown(source){
  const lines=String(source||"").replace(/\r/g,"").split("\n");
  const out=[];let paragraph=[],list=[];
  const flushP=()=>{if(paragraph.length){out.push("<p>"+inlineMarkdown(paragraph.join(" "))+"</p>");paragraph=[];}};
  const flushL=()=>{if(list.length){out.push("<ul>"+list.map(x=>"<li>"+inlineMarkdown(x)+"</li>").join("")+"</ul>");list=[];}};
  for(const raw of lines){
    const line=raw.trim();
    if(!line){flushP();flushL();continue;}
    if(line.startsWith("## ")){flushP();flushL();out.push("<h2>"+inlineMarkdown(line.slice(3))+"</h2>");continue;}
    if(line.startsWith("> ")){flushP();flushL();out.push("<blockquote>"+inlineMarkdown(line.slice(2))+"</blockquote>");continue;}
    if(/^[-*] /.test(line)){flushP();list.push(line.slice(2));continue;}
    flushL();paragraph.push(line);
  }
  flushP();flushL();return out.join("\n");
}
function render(){
 const visible=notes.filter(n=>n.status==="Published"&&(active==="All"||n.category===active));
 filters.innerHTML=categories.map(c=>'<button class="note-filter '+(active===c?'active':'')+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join("");
 filters.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{active=b.dataset.category;render()}));
 grid.innerHTML=visible.length?visible.map(n=>'<article class="note-card">'+(n.cover?'<img class="note-card-image" src="'+esc(n.cover)+'" alt="">':'<div class="note-card-image" aria-hidden="true"></div>')+'<div class="note-card-copy"><div class="note-card-meta">'+esc(n.category)+' · '+esc(n.readTime||"")+'</div><h2>'+esc(n.title)+'</h2><p>'+esc(n.excerpt||"")+'</p><a class="note-read-link" href="field-notes.html?note='+encodeURIComponent(n.slug)+'">Read the note ↗</a></div></article>').join(""):'<p class="empty">No notes in this category just yet.</p>';
}
function renderArticle(n){
 document.querySelector(".field-notes-intro").style.display="none";
 document.getElementById("notes-view").innerHTML='<article class="note-article"><a class="note-back" href="field-notes.html">← All Field Notes</a><div class="note-article-header"><p class="eyebrow">'+esc(n.category)+' · '+esc(n.readTime||"")+'</p><h1>'+esc(n.title)+'</h1><p class="note-deck">'+esc(n.excerpt||"")+'</p></div>'+(n.cover?'<img class="note-hero-image" src="'+esc(n.cover)+'" alt="A warm home workspace with a laptop, representing the process of building a personal portfolio website">':'')+'<div class="note-article-body">'+renderMarkdown(n.body)+'</div><a class="note-back" href="field-notes.html">← Back to Field Notes</a></article>';
 document.title=n.title+" | Field Notes";
}
fetch("content/field-notes.json").then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{notes=Array.isArray(data)?data:[];const slug=new URLSearchParams(location.search).get("note"),selected=notes.find(n=>n.slug===slug&&n.status==="Published");if(selected)renderArticle(selected);else render()}).catch(()=>{grid.innerHTML='<p class="empty">Field Notes will be here shortly.</p>'});
