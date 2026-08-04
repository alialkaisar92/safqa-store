
(function(){
 function hideL(){var L=document.getElementById('loadScreen');if(L)L.classList.add('hide');}
 if(document.readyState==='complete')hideL();
 else{document.addEventListener('DOMContentLoaded',hideL);window.addEventListener('load',hideL);}
 setTimeout(hideL,1500);
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}})},{threshold:.15});
 document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
 var co=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){anim(e.target);co.unobserve(e.target);}})},{threshold:.5});
 document.querySelectorAll('[data-count]').forEach(function(el){co.observe(el)});
 function anim(el){var t=+el.getAttribute('data-count'),s=null;function step(ts){if(!s)s=ts;var p=Math.min((ts-s)/1200,1);el.textContent=Math.floor(p*t).toLocaleString('ar-EG');if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);}
 window.toggleTheme=function(){var h=document.documentElement;var d=h.getAttribute('data-theme')==='dark'?'':'dark';h.setAttribute('data-theme',d);localStorage.setItem('theme',d);};
 if(localStorage.getItem('theme')==='dark')document.documentElement.setAttribute('data-theme','dark');
 var T=document.getElementById('toTop');
 window.addEventListener('scroll',function(){if(T)T.classList.toggle('show',scrollY>400);});
 if(T)T.onclick=function(){scrollTo({top:0,behavior:'smooth'})};
 window.toast=function(m){var d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2500);};
 document.addEventListener('click',function(e){var q=e.target.closest('.faq-q');if(q){var i=q.parentElement;i.classList.toggle('open');var a=i.querySelector('.faq-a');if(a)a.style.maxHeight=i.classList.contains('open')?a.scrollHeight+'px':'0';}});
})();
