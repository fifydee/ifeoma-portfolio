const categories=["All","Building & Making","AI Video & Storytelling","Tools & Experiments","Ideas & Discoveries","Places & Experiences","Life & Other Interests","Lessons & Reflections"];
let notes=[],active="All";
const grid=document.getElementById("notes-grid"),filters=document.getElementById("note-filters");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function inlineMarkdown(s){return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/_(.+?)_/g,"<em>$1</em>");}
function renderMarkdown(source){
 const lines=String(source||"").replace(/\r/g,"").split("\n"),out=[];let paragraph=[],list=[];
 const flushP=()=>{if(paragraph.length){out.push("<p>"+inlineMarkdown(paragraph.join(" "))+"</p>");paragraph=[];}};
 const flushL=()=>{if(list.length){out.push("<ul>"+list.map(x=>"<li>"+inlineMarkdown(x)+"</li>").join("")+"</ul>");list=[];}};
 for(const raw of lines){const line=raw.trim();if(!line){flushP();flushL();continue;}
 if(line.startsWith("## ")){flushP();flushL();out.push("<h2>"+inlineMarkdown(line.slice(3))+"</h2>");continue;}
 if(line.startsWith("> ")){flushP();flushL();out.push("<blockquote>"+inlineMarkdown(line.slice(2))+"</blockquote>");continue;}
 if(/^[-*] /.test(line)){flushP();list.push(line.slice(2));continue;}flushL();paragraph.push(line);}
 flushP();flushL();return out.join("\n");
}
function render(){const visible=notes.filter(n=>n.status==="Published"&&(active==="All"||n.category===active));
 filters.innerHTML=categories.map(c=>'<button class="note-filter '+(active===c?'active':'')+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join("");
 filters.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{active=b.dataset.category;render()}));
 grid.innerHTML=visible.length?visible.map(n=>'<article class="note-card">'+(n.cover?'<img class="note-card-image" src="'+esc(n.cover)+'" alt="">':'<div class="note-card-image"></div>')+'<div class="note-card-copy"><div class="note-card-meta">'+esc(n.category)+' · '+esc(n.readTime||"")+'</div><h2>'+esc(n.title)+'</h2><p>'+esc(n.excerpt||"")+'</p><a class="note-read-link" href="field-notes.html?note='+encodeURIComponent(n.slug)+'">Read the note ↗</a></div></article>').join(""):'<p class="empty">No notes in this category just yet.</p>';}
function renderArticle(n){
 document.querySelector(".field-notes-intro").style.display="none";
 const body=renderMarkdown(n.body);
 const introEnd=body.indexOf('<h2>');
 const intro=introEnd>=0?body.slice(0,introEnd):body;
 let sections=introEnd>=0?body.slice(introEnd):"";
 sections=sections.replace(/<h2>Starting with an idea, not a template<\/h2>/,'<div class="note-feature-grid"><div class="note-feature-copy"><h2>Starting with an idea, not a template</h2>');
 sections=sections.replace(/<h2>I had a lot of opinions\. And I wasn.t afraid to use them\.<\/h2>/,'</div><aside class="note-pullquote">“ I wanted something clean, warm and editorial. Something professional but not overly corporate.”</aside></div><h2>I had a lot of opinions. And I wasn’t afraid to use them.</h2>');
 sections=sections.replace(/<h2>From ChatGPT to a live website<\/h2>/,'<div class="note-tools-grid"><div class="note-tools-copy"><h2>From ChatGPT to a live website</h2>');
 sections=sections.replace(/<h2>A few things I took away from the experience<\/h2>/,'</div><aside class="note-takeaways"><p class="takeaways-label">✧ &nbsp; KEY TAKEAWAYS</p><ul><li><strong>Be clear about what you want.</strong> Specific feedback gets better results.</li><li><strong>Use AI as a partner, not a replacement.</strong> Your judgement still matters.</li><li><strong>Details make a difference.</strong> Spacing, alignment, images and words all add up.</li><li><strong>You can start without a big budget.</strong> Free tools can take you surprisingly far.</li></ul></aside></div><h2>A few things I took away from the experience</h2>');
 const authorImage="Warm%20Studio%20Portrait%20in%20White-2.png";
 document.getElementById("notes-view").innerHTML='<article class="note-article"><div class="note-breadcrumb"><a href="index.html">⌂</a><span>›</span><a href="field-notes.html">Field Notes</a><span>›</span><span>'+esc(n.title)+'</span></div><header class="note-hero"><div class="note-hero-copy"><p class="eyebrow"><span class="dot"></span>'+esc(n.category)+' &nbsp;·&nbsp; '+esc(n.readTime||"")+'</p><h1>'+esc(n.title)+'</h1><p class="note-deck">'+esc(n.excerpt||"")+'</p><div class="note-author"><img src="'+authorImage+'" alt="Ifeoma Degge"><div><strong>Ifeoma Degge</strong><span>AI Creative Technologist</span></div><i></i><time datetime="'+esc(n.date||"")+'">Nov 23, 2026</time></div></div><img class="note-hero-image" src="'+esc(n.cover||"")+'" alt="A laptop displaying Ifeoma Degge’s portfolio homepage, with her portrait on screen"></header><div class="note-article-body"><div class="note-introduction">'+intro+'</div>'+sections+'</div><a class="note-back" href="field-notes.html">← Back to Field Notes</a></article>';
 document.title=n.title+" | Field Notes";
}
fetch("content/field-notes.json").then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{notes=Array.isArray(data)?data:[];const slug=new URLSearchParams(location.search).get("note"),selected=notes.find(n=>n.slug===slug&&n.status==="Published");if(selected)renderArticle(selected);else render()}).catch(()=>{grid.innerHTML='<p class="empty">Field Notes will be here shortly.</p>';});
