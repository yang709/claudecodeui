function CloudcliSidebarUsage() {
  const [data,setData]=f.useState(null);
  f.useEffect(()=>{
    let alive=true,busy=false,lastAttempt=0,controller=null;
    async function refresh(){
      if(!alive||busy||document.hidden)return;
      busy=true;lastAttempt=Date.now();controller=new AbortController();
      const timeout=setTimeout(()=>controller?.abort(),65000);
      try{
        const response=await gt('/api/codex-usage',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Usage unavailable');
        const next=await response.json();if(alive)setData(next);
      }catch{if(alive)setData(null)}
      finally{clearTimeout(timeout);busy=false;controller=null}
    }
    function onVisible(){if(!document.hidden&&Date.now()-lastAttempt>=60000)refresh()}
    refresh();const interval=setInterval(refresh,60000);
    document.addEventListener('visibilitychange',onVisible);
    return()=>{alive=false;clearInterval(interval);controller?.abort();document.removeEventListener('visibilitychange',onVisible)};
  },[]);
  const usage=sidebarUsageSummary(data);
  function row(label,value,percent,reset) {
    return s.jsxs('div',{style:{marginBottom:'7px'},children:[
      s.jsxs('div',{style:{display:'flex',alignItems:'center',gap:'8px'},children:[
        s.jsx('span',{style:{opacity:.65,width:'20px',flexShrink:0},children:label}),
        s.jsx('div',{role:'progressbar','aria-label':label+' remaining','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':value===null?undefined:value,'aria-valuetext':value===null?'Unavailable':percent,style:{height:'4px',flex:'1 1 0',minWidth:0,borderRadius:'99px',overflow:'hidden',backgroundColor:'rgba(128,128,128,.18)'},children:
          s.jsx('div',{style:{height:'100%',width:(value??0)+'%',borderRadius:'inherit',backgroundColor:'#818cf8',transition:'width .3s ease'}})
        }),
        s.jsx('span',{style:{width:'38px',flexShrink:0,textAlign:'right'},children:percent})
      ]}),
      s.jsx('div',{style:{fontSize:'10px',lineHeight:'1.5',opacity:.5,marginLeft:'28px'},children:'Reset '+reset})
    ]});
  }
  return s.jsxs('div',{'data-testid':'sidebar-codex-usage',style:{padding:'4px 18px 12px',fontSize:'12px',lineHeight:'1.8',fontVariantNumeric:'tabular-nums'},children:[
    row('5h',usage.fiveHourValue,usage.fiveHour,usage.fiveHourReset),
    row('1w',usage.weeklyValue,usage.weekly,usage.weeklyReset),
    s.jsx('div',{style:{fontSize:'10px',opacity:.45,marginTop:'3px'},children:'Updated '+usage.updated})
  ]});
}
