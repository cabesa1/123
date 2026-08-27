'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { strToU8, zipSync } from 'fflate';

type Trend = { rank:number; platform:string; title:string; pattern:string; views:string; likes:string; score:number; growth:string; difficulty:string; hook:string; fit:string; steps:string[]; source?:string; creator?:string; publishedAt?:string; evidence?:string; verification?:'Conteúdo confirmado'; observedContent?:string };
type BrandSession={query:string;category:string;platform:string;period:string;trendData:Trend[];searched:boolean;live:boolean;error:string;limit:number;open:number|null};
type VideoAnalysisResult={summary:string;visualHook:string;spokenHook:string;onScreenText:string[];editing:string;structure:Array<{moment:string;action:string}>;whyItWorks:string;brandFit:string;originalConcept:string;difficulty:'Fácil'|'Médio'|'Difícil';evidence:string[]};
type VideoAnalysisState={status:'queued'|'running'|'complete'|'error';phase:string;progress:number;result?:VideoAnalysisResult;error?:string};
type GeneratedScript={objective:string;format:string;duration:string;difficulty:'Fácil'|'Médio'|'Difícil';resources:string[];chosenHook:string;alternativeHooks:string[];scenes:Array<{time:string;shot:string;action:string;spokenLine:string;onScreenText:string;edit:string;purpose:string}>;caption:string;cta:string;coverText:string;titles:string[];filmingChecklist:string[];editingChecklist:string[];approvals:string[];simplerVersion:string};
type GeneratedReport={title:string;summary:string;reportingWindow:string;specialists:string[];funnel:{researched:number;selected:number;easy:number;medium:number;hard:number};opportunities:Array<{title:string;source:string;status:string;evidence:string;nextAction:string}>;limitations:string[];nextActions:string[]};

function savedTrendKey(brand:string,trend:Trend){return `${brand}:${trend.source||`${trend.platform}:${trend.title}`}`}

function wordSafe(value:unknown){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char))}
function downloadWord(filename:string,content:string){
  const source=document.createElement('div');source.innerHTML=content;
  const xmlSafe=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const elements=Array.from(source.querySelectorAll('h1,h2,h3,p,blockquote,li,tr'));
  const paragraphs=elements.map(element=>{
    const tag=element.tagName.toLowerCase();
    const text=tag==='tr'?Array.from(element.querySelectorAll('th,td')).map(cell=>(cell.textContent||'').trim()).join('    '):(element.textContent||'').trim();
    if(!text)return '';
    const heading=tag==='h1'?36:tag==='h2'?28:tag==='h3'?24:22;
    const bold=['h1','h2','h3'].includes(tag);
    const prefix=tag==='li'?'• ':'';
    return `<w:p><w:pPr><w:spacing w:after="${bold?180:100}"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${heading}"/><w:szCs w:val="${heading}"/></w:rPr><w:t xml:space="preserve">${xmlSafe(prefix+text)}</w:t></w:r></w:p>`;
  }).join('');
  const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const relationships=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const zipped=zipSync({'[Content_Types].xml':strToU8(contentTypes),'_rels/.rels':strToU8(relationships),'word/document.xml':strToU8(documentXml)});
  const buffer=zipped.buffer.slice(zipped.byteOffset,zipped.byteOffset+zipped.byteLength) as ArrayBuffer;
  const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${filename.replace(/[\\/:*?"<>|]+/g,'-')}.docx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const trends: Trend[] = [
];

const safeKTrends: Trend[] = [
];

export default function Home(){
  const [brand,setBrand]=useState('Economize.vc');
  const activeBrandRef=useRef('Economize.vc');
  const requestVersionRef=useRef<Record<string,number>>({'Economize.vc':0,'SAFE-K':0});
  const analysisStartedRef=useRef(new Set<string>());
  const [category,setCategory]=useState('Humorístico');
  const [query,setQuery]=useState('O cliente desconfia quando encontra um produto desejado por um preço muito abaixo do esperado.');
  const [autoInsight,setAutoInsight]=useState(true);
  const [platform,setPlatform]=useState('Todas');
  const [period,setPeriod]=useState('Últimos 7 dias');
  const [loadingByBrand,setLoadingByBrand]=useState<Record<string,boolean>>({'Economize.vc':false,'SAFE-K':false});
  const [searched,setSearched]=useState(false);
  const [open,setOpen]=useState<number|null>(1);
  const [limit,setLimit]=useState(5);
  const [saved,setSaved]=useState<string[]>([]);
  const [savedTrends,setSavedTrends]=useState<Record<string,Trend>>({});
  const [view,setView]=useState<'search'|'saved'|'report'>('search');
  const [script,setScript]=useState<Trend|null>(null);
  const [trendData,setTrendData]=useState<Trend[]>(trends);
  const [error,setError]=useState('');
  const [live,setLive]=useState(false);
  const [videoAnalyses,setVideoAnalyses]=useState<Record<string,VideoAnalysisState>>({});
  const [brandSessions,setBrandSessions]=useState<Record<string,BrandSession>>({
    'Economize.vc':{query:'O cliente desconfia quando encontra um produto desejado por um preço muito abaixo do esperado.',category:'Humorístico',platform:'Todas',period:'Últimos 7 dias',trendData:trends,searched:false,live:false,error:'',limit:5,open:1},
    'SAFE-K':{query:'Especialistas explicam como escolas podem reduzir o uso de celulares respeitando exceções, privacidade e segurança dos alunos.',category:'Educacional',platform:'Todas',period:'Últimos 7 dias',trendData:safeKTrends,searched:false,live:false,error:'',limit:5,open:1},
  });
  const loading=Boolean(loadingByBrand[brand]);
  useEffect(()=>{void (async()=>{try{const response=await fetch('/api/saved');if(!response.ok)throw new Error('database unavailable');const data=await response.json() as {items?:Array<{key:string;payload:Trend}>};const items=Array.isArray(data.items)?data.items:[];setSaved(items.map(item=>item.key));setSavedTrends(Object.fromEntries(items.map(item=>[item.key,item.payload])))}catch{const stored=localStorage.getItem('economize-saved-trends');if(!stored)return;try{const parsed=JSON.parse(stored);if(Array.isArray(parsed)&&parsed.every(item=>typeof item==='string'))setSaved(parsed)}catch{localStorage.removeItem('economize-saved-trends')}}})()},[]);
  useEffect(()=>{localStorage.setItem('economize-saved-trends',JSON.stringify(saved))},[saved]);
  function analysisKey(targetBrand:string,source:string){return `${targetBrand}|${source}`}
  async function startVideoAnalysis(trend:Trend,targetBrand:string){
    if(!trend.source)return;const key=analysisKey(targetBrand,trend.source);if(analysisStartedRef.current.has(key))return;analysisStartedRef.current.add(key);
    setVideoAnalyses(current=>({...current,[key]:{status:'queued',phase:'Preparando análise audiovisual',progress:1}}));
    try{
      const response=await fetch('/api/video-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:trend.source,brand:targetBrand,title:trend.title})});
      const created=await response.json() as {jobId?:string;error?:string};if(!response.ok||!created.jobId)throw new Error(created.error||'Não foi possível iniciar a análise.');
      for(let attempt=0;attempt<180;attempt++){
        await new Promise(resolve=>setTimeout(resolve,1500));
        const statusResponse=await fetch(`/api/video-analysis?id=${encodeURIComponent(created.jobId)}`);const state=await statusResponse.json() as VideoAnalysisState&{error?:string};
        if(!statusResponse.ok)throw new Error(state.error||'A análise foi interrompida.');setVideoAnalyses(current=>({...current,[key]:state}));
        if(state.status==='complete'||state.status==='error')return;
      }
      throw new Error('A análise ultrapassou o tempo máximo.');
    }catch(reason){setVideoAnalyses(current=>({...current,[key]:{status:'error',phase:'Não foi possível analisar',progress:0,error:reason instanceof Error?reason.message:'Falha inesperada.'}}))}
  }
  async function runSearch(more=false){
    if(!query.trim()||loading)return;
    const requestBrand=brand;
    const requestBase=trendData;
    const requestVersion=(requestVersionRef.current[requestBrand]||0)+1;
    requestVersionRef.current[requestBrand]=requestVersion;
    setView('search');setLoadingByBrand(current=>({...current,[requestBrand]:true}));setError('');if(!more){setLimit(5);setSearched(false)}
    try{
      const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,platform,period,brand,category,exclude:more?trendData.map(t=>t.source).filter(Boolean):[]}),signal:AbortSignal.timeout(90_000)});
      const raw=await response.text();
      if(!raw.trim())throw new Error(`O servidor respondeu sem conteúdo (HTTP ${response.status}). Reinicie o servidor local e tente novamente.`);
      let data:{error?:string;trends?:Trend[]};
      try{data=JSON.parse(raw) as {error?:string;trends?:Trend[]}}catch{throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}). Trecho recebido: ${raw.slice(0,120)}`)}
      if(!response.ok)throw new Error(data.error==='OPENAI_API_KEY_NOT_CONFIGURED'?'A conexão está pronta, mas falta configurar a chave da OpenAI no arquivo .env.local.':data.error||'Não foi possível concluir a pesquisa.');
      if(!Array.isArray(data.trends))throw new Error('A resposta não contém uma lista válida de vídeos.');
      if(requestVersionRef.current[requestBrand]!==requestVersion)return;
      const incoming=data.trends.map((t,index)=>({...t,rank:(more?requestBase.length:0)+index+1}));
      const nextTrends=more?[...requestBase,...incoming]:incoming;
      const nextLimit=more?requestBase.length+incoming.length:5;
      if(activeBrandRef.current===requestBrand){setTrendData(nextTrends);setLimit(nextLimit);setLive(true);setSearched(true)}
      else setBrandSessions(current=>({...current,[requestBrand]:{...current[requestBrand],trendData:nextTrends,limit:nextLimit,live:true,searched:true,error:''}}));
      incoming.forEach(trend=>void startVideoAnalysis(trend,requestBrand));
    }catch(reason){if(requestVersionRef.current[requestBrand]!==requestVersion)return;const message=reason instanceof Error?reason.message:'Falha inesperada na pesquisa.';if(activeBrandRef.current===requestBrand){setError(message);setSearched(true)}else setBrandSessions(current=>({...current,[requestBrand]:{...current[requestBrand],error:message,searched:true}}))}finally{if(requestVersionRef.current[requestBrand]===requestVersion)setLoadingByBrand(current=>({...current,[requestBrand]:false}))}
  }
  function search(e?:FormEvent){e?.preventDefault();void runSearch(false)}
  function chooseBrand(value:string){
    if(value===brand)return;
    setBrandSessions(current=>({...current,[brand]:{query,category,platform,period,trendData,searched,live,error,limit,open}}));
    const next=brandSessions[value];
    activeBrandRef.current=value;setBrand(value);setScript(null);setView('search');
    setQuery(next.query);setCategory(next.category);setPlatform(next.platform);setPeriod(next.period);setTrendData(next.trendData);setSearched(next.searched);setLive(next.live);setError(next.error);setLimit(next.limit);setOpen(next.open);setAutoInsight(!next.searched);
  }
  function chooseCategory(value:string){
    setCategory(value);
    if(brand==='SAFE-K') setQuery(value==='Humorístico'?'Situações de identificação sobre a resistência do estudante ao ritual de guardar o celular, sem ridicularização.':value==='Educacional'?'Advogados, médicos, psicólogos e educadores respondendo dúvidas sobre uso de celulares em escolas, atenção e implementação responsável.':'Escolas demonstrando chegada, travamento da Bag SAFE-K, permanência com o aluno e desbloqueio pela base.');
    else setQuery(value==='Humorístico'?'O cliente entra apenas para olhar e sai carregando um produto que não planejava comprar.':value==='Educacional'?'Muitas pessoas confundem produto Open Box com produto quebrado ou sem garantia.':'Um pequeno detalhe na embalagem permite oferecer produtos desejados por preços mais acessíveis.');
    setAutoInsight(true);
  }
  function toggleSave(trend:Trend){const key=savedTrendKey(brand,trend);const removing=saved.includes(key);setSaved(current=>removing?current.filter(id=>id!==key):[...current,key]);setSavedTrends(current=>{const next={...current};if(removing)delete next[key];else next[key]=trend;return next});void fetch('/api/saved',{method:removing?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(removing?{key}:{key,brand,trend})}).catch(()=>undefined)}
  const filtered=trendData.filter(t=>platform==='Todas'||t.platform===platform);
  const visible=(view==='saved'?Object.entries(savedTrends).filter(([key])=>key.startsWith(`${brand}:`)).map(([,trend])=>trend):filtered).slice(0,limit);
  const brandSavedCount=saved.filter(key=>typeof key==='string'&&key.startsWith(`${brand}:`)).length;
  const recentInsights=brand==='SAFE-K'?
    [
      {category:'Educacional',insight:'O que a lei permite e quais exceções a escola precisa respeitar'},
      {category:'Educacional',insight:'Como notificações e acesso imediato interferem na atenção'},
      {category:'Institucional',insight:'A case mantém o celular com o aluno, mas inacessível durante a aula'},
    ]:
    [
      {category:'Humorístico',insight:'Preço baixo demais gera desconfiança'},
      {category:'Educacional',insight:'A embalagem pesa mais que o produto'},
      {category:'Humorístico',insight:'Entrar só para olhar raramente termina assim'},
    ];
  return <main className={brand==='SAFE-K'?'trend-app safe-k':'trend-app'}>
    <aside className="sidebar">
      <div className="logo"><b>{brand==='Economize.vc'?'E':'S'}</b><div><strong>{brand==='Economize.vc'?'Economize':'SAFE-K'}</strong><span>Trend Finder</span></div></div>
      <div className="brand-switch"><small>MARCAS</small><button className={brand==='Economize.vc'?'active':''} onClick={()=>chooseBrand('Economize.vc')} aria-pressed={brand==='Economize.vc'}><span>E</span><strong>Economize.vc</strong>{brand==='Economize.vc'&&<i>✓</i>}</button><button className={brand==='SAFE-K'?'active':''} onClick={()=>chooseBrand('SAFE-K')} aria-pressed={brand==='SAFE-K'}><span>S</span><strong>SAFE-K</strong>{brand==='SAFE-K'&&<i>✓</i>}</button></div>
      <nav><small>MENU</small><button className={view==='search'?'active':''} onClick={()=>setView('search')}>⌕ <span>Buscar referências</span></button><button className={view==='saved'?'active':''} onClick={()=>{setView('saved');setSearched(true)}}>◇ <span>Ideias salvas</span><i>{brandSavedCount}</i></button><button className={view==='report'?'active':''} onClick={()=>setView('report')}>▤ <span>Relatório</span></button></nav>
      <div className="profile"><b>{brand==='Economize.vc'?'EV':'SK'}</b><div><strong>{brand==='Economize.vc'?'@economize.vc':'SAFE-K'}</strong><span>Marca de destino</span></div><i>{brand==='Economize.vc'?'✓':'…'}</i></div>
    </aside>
    <section className="workspace">
      <header><div className="online"><i/> Pesquisa de tendências</div><button>GS</button></header>
      <div className="content">
        {view!=='report'&&<section className="hero">
          <span className="eyebrow">RADAR DE CONTEÚDO</span>
          <h1>Encontre vídeos que<br/><em>podem virar o seu próximo.</em></h1>
          <p>O buscador procura referências em diferentes perfis e plataformas, classifica o formato e mostra como adaptar cada vídeo para {brand}.</p>
          <div className="category-picker"><span>Tipo de conteúdo</span>{(brand==='SAFE-K'?['Institucional','Educacional']:['Institucional','Humorístico','Educacional']).map(item=><button key={item} className={category===item?'active':''} onClick={()=>chooseCategory(item)}>{item==='Institucional'?'◉':item==='Humorístico'?'☺':'✦'} {item}</button>)}</div>
          <form className="search" onSubmit={search}>
            <div className="query"><span className="insight-label">INSIGHT</span><input value={query} onFocus={()=>{if(autoInsight){setQuery('');setAutoInsight(false)}}} onChange={e=>{setQuery(e.target.value);setAutoInsight(false)}} placeholder="Escreva uma tensão, comportamento ou necessidade do público…"/><button disabled={!query.trim()||loading}>{loading?'Pesquisando…':'Buscar trends'}</button></div>
            {brand!=='SAFE-K'&&<div className="filters">
              <label>Plataformas<select value={platform} onChange={e=>setPlatform(e.target.value)}><option>Todas</option><option>TikTok</option><option>Instagram</option></select></label>
              <label>Período<select value={period} onChange={e=>setPeriod(e.target.value)}><option>Últimos 7 dias</option><option>Últimas 24 horas</option><option>Últimos 30 dias</option></select></label>
              <label>Aplicar em<strong>{brand}</strong></label><label>Categoria<strong>{category}</strong></label>
            </div>}
          </form>
        </section>}
        {view==='search'&&!searched&&!loading&&<section className="insight-workbench">
          <div className="workbench-head"><div><span>PONTOS DE PARTIDA</span><h2>Insights recentes</h2></div><p>Escolha uma leitura do público para pesquisar referências aplicáveis à marca.</p></div>
          <div className="insight-rows">{recentInsights.map((item,index)=><button className="insight-row" key={item.insight} onClick={()=>{setCategory(item.category);setQuery(item.insight);setAutoInsight(false)}}><span className="insight-index">0{index+1}</span><span className="insight-copy"><small>{item.category}</small><strong>{item.insight}</strong></span><span className="insight-arrow">→</span></button>)}</div>
        </section>}
        {loading&&<div className="loading"><b>⌁</b><div><strong>Procurando referências para {brand}…</strong><span>Categoria {category} · comparando formatos e sinais de crescimento</span></div><i/></div>}
        {view==='report'&&<Report trends={[...trendData,...Object.values(savedTrends)]} saved={saved} brand={brand} category={category} onBack={()=>setView('search')}/>}
        {view!=='report'&&searched&&!loading&&<section className="results">
          <div className="result-head"><div><span>{view==='saved'?'SUAS ESCOLHAS':`${category.toUpperCase()} · CURADORIA CONCLUÍDA`}</span><h2>{view==='saved'?'Ideias salvas':`Melhores referências para ${brand}`}</h2><p>{view==='saved'?'As referências que você separou para produzir.':'Resultados ordenados por evidência numérica e adequação à marca.'}</p></div><div className="count"><b>{visible.length}</b><span>exibidas<br/>de {filtered.length} disponíveis</span></div></div>
          {error&&<div className="api-error"><b>!</b><p><strong>Pesquisa real ainda não disponível.</strong> {error}</p></div>}
          {live&&<div className="demo live"><b>✓</b><p><strong>Pesquisa e verificação concluídas:</strong> todos os resultados abaixo possuem vídeo direto, métricas lidas da plataforma e pontuação calculada apenas com esses dados.</p></div>}
          <div className="list">{visible.map(t=>{const expanded=open===t.rank;const analysis=t.source?videoAnalyses[analysisKey(brand,t.source)]:undefined;return <article className={expanded?'card expanded':'card'} key={t.rank}>
            <button className="summary" onClick={()=>setOpen(expanded?null:t.rank)}><span className="rank">{String(t.rank).padStart(2,'0')}</span><span className={`platform ${t.platform==='TikTok'?'dark':'pink'}`}>{t.platform}</span><span className="title"><small>{t.pattern}</small><strong>{t.title}</strong><em>{t.creator||'Referência externa'} · {t.publishedAt||'pronta para adaptação'}</em></span><span className="metric"><small>Views</small><strong>{t.views}</strong></span><span className="metric"><small>Curtidas</small><strong>{t.likes}</strong></span><span className="score"><small>Potencial</small><strong>{t.score}</strong><i style={{'--score':`${t.score}%`} as React.CSSProperties}/></span><span className="toggle">{expanded?'−':'+'}</span></button>
            {expanded&&<div className="details"><div className="detail-grid">{t.verification&&<div className="wide verification-row"><small>VERIFICAÇÃO DO VÍDEO</small><p><span className={t.verification==='Conteúdo confirmado'?'verified':'partial'}>● {t.verification}</span>{t.observedContent&&<> — {t.observedContent}</>}</p></div>}{analysis&&<div className={`wide audiovisual ${analysis.status}`}><div className="analysis-head"><small>ANÁLISE AUDIOVISUAL</small><strong>{analysis.phase}</strong><span>{analysis.progress}%</span></div>{analysis.status!=='complete'&&analysis.status!=='error'&&<i style={{'--progress':`${analysis.progress}%`} as React.CSSProperties}/>} {analysis.error&&<p>{analysis.error}</p>}{analysis.result&&<div className="analysis-result"><div><small>O QUE ACONTECE</small><p>{analysis.result.summary}</p></div><div><small>GANCHO VISUAL</small><p>{analysis.result.visualHook}</p></div><div><small>GANCHO FALADO</small><p>{analysis.result.spokenHook}</p></div><div><small>EDIÇÃO</small><p>{analysis.result.editing}</p></div><div className="wide"><small>POR QUE FUNCIONA</small><p>{analysis.result.whyItWorks}</p></div><div className="wide"><small>CONCEITO ORIGINAL PARA {brand.toUpperCase()}</small><p>{analysis.result.originalConcept}</p></div>{analysis.result.onScreenText.length>0&&<div className="wide"><small>TEXTOS OBSERVADOS NA TELA</small><p>{analysis.result.onScreenText.join(' · ')}</p></div>}<div className="wide timeline"><small>ESTRUTURA DO VÍDEO</small>{analysis.result.structure.map(item=><p key={`${item.moment}-${item.action}`}><b>{item.moment}</b> {item.action}</p>)}</div></div>}</div>}<div><small>GANCHO IDENTIFICADO NA BUSCA</small><p>“{t.hook}”</p></div><div><small>SINAL DE CRESCIMENTO</small><p className="growth">↗ {t.growth}</p></div><div className="wide"><small>COMO ADAPTAR — SEM COPIAR</small><p>{analysis?.result?.brandFit||t.fit}</p></div>{t.evidence&&<div className="wide"><small>EVIDÊNCIA E LIMITAÇÕES</small><p>{t.evidence}</p></div>}</div>{t.source?<a className="source-link" href={t.source} target="_blank" rel="noreferrer">Assistir ao vídeo original ↗</a>:<span className="source-pending">Link disponível somente na pesquisa real</span>}<div className="steps"><small>ESBOÇO PARA GRAVAÇÃO</small><ol>{t.steps.map(s=><li key={s}>{s}</li>)}</ol></div><div className="actions"><span className={`difficulty ${(analysis?.result?.difficulty||t.difficulty)==='Fácil'?'easy':(analysis?.result?.difficulty||t.difficulty)==='Médio'?'medium':'hard'}`}>● {analysis?.result?.difficulty||t.difficulty} de gravar</span><button onClick={()=>toggleSave(t)}>{saved.includes(savedTrendKey(brand,t))?'✓ Salvo':'◇ Salvar'}</button><button className="primary" onClick={()=>setScript(t)}>Criar roteiro completo →</button></div></div>}
          </article>})}</div>
          {view==='search'&&<button className="load-more" onClick={()=>void runSearch(live)} disabled={loading}>＋ Buscar mais vídeos</button>}
          {view==='saved'&&visible.length===0&&<div className="empty">Você ainda não salvou nenhuma ideia. Volte à busca e clique em <strong>Salvar</strong>.</div>}
        </section>}
      </div>
    </section>
    {script&&<ScriptModal trend={script} brand={brand} category={category} onClose={()=>setScript(null)} onSave={()=>toggleSave(script)} saved={saved.includes(savedTrendKey(brand,script))}/>}
  </main>
}

function ScriptModal({trend,brand,category,onClose,onSave,saved}:{trend:Trend;brand:string;category:string;onClose:()=>void;onSave:()=>void;saved:boolean}){
  const [generated,setGenerated]=useState<GeneratedScript|null>(null);
  const [generationError,setGenerationError]=useState('');
  useEffect(()=>{let active=true;void (async()=>{try{const response=await fetch('/api/scripts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trend,brand,category})});const data=await response.json() as {script?:GeneratedScript;error?:string};if(!response.ok||!data.script)throw new Error(data.error||'Não foi possível gerar o roteiro.');if(active)setGenerated(data.script)}catch(reason){if(active)setGenerationError(reason instanceof Error?reason.message:'Falha inesperada.')}})();return()=>{active=false}},[trend,brand,category]);
  const sceneNotes=[
    {shot:'Plano médio, câmera vertical fixa',line:trend.hook,text:'Use o gancho como legenda principal',edit:'Comece já no movimento; corte em até 1,5 s'},
    {shot:'Close no gesto, objeto ou expressão',line:'Mostre o problema acontecendo sem explicar demais.',text:'O problema em uma frase',edit:'Aproxime a imagem e marque a reação com som curto'},
    {shot:'Plano detalhe do produto ou da solução',line:'Agora revele a mudança que resolve a situação.',text:'A virada',edit:'Corte seco sincronizado com a revelação'},
    {shot:'Plano aberto com marca e resultado visíveis',line:'Feche com uma pergunta simples ligada à situação.',text:'Você também faria isso?',edit:'Segure o quadro final por 1 segundo'},
  ];
  if(!generated)return <div className="modal-bg" onClick={onClose}><section className="script-modal" onClick={e=>e.stopPropagation()}><header><div><span>ROTEIRISTA · {trend.platform}</span><h2>{trend.title}</h2></div><button onClick={onClose}>×</button></header>{generationError?<div className="api-error"><b>!</b><p>{generationError}</p></div>:<div className="loading"><b>⌁</b><div><strong>Roteirista trabalhando…</strong><span>Aplicando a skill e o perfil de {brand}</span></div><i/></div>}</section></div>;
  const generatedRows=generated.scenes.map(scene=>`<tr><td>${wordSafe(scene.time)}</td><td><strong>${wordSafe(scene.action)}</strong><br>${wordSafe(scene.shot)}</td><td>${wordSafe(scene.spokenLine)}</td><td>${wordSafe(scene.onScreenText)}</td><td>${wordSafe(scene.edit)}</td></tr>`).join('');
  function exportGeneratedWord(){if(!generated)return;downloadWord(`Roteiro - ${trend.title}`,`<h1>${wordSafe(trend.title)}</h1><p><strong>Objetivo:</strong> ${wordSafe(generated.objective)}</p><p><strong>Formato:</strong> ${wordSafe(generated.format)} · ${wordSafe(generated.duration)} · ${wordSafe(generated.difficulty)}</p><h2>Recursos</h2><p>${generated.resources.map(wordSafe).join(' · ')}</p><h2>Gancho</h2><blockquote>${wordSafe(generated.chosenHook)}</blockquote><h2>Plano de gravação</h2><table>${generatedRows}</table><h2>Legenda</h2><p>${wordSafe(generated.caption)}</p><h2>CTA</h2><p>${wordSafe(generated.cta)}</p>`)}
  return <div className="modal-bg" onClick={onClose}><section className="script-modal" onClick={e=>e.stopPropagation()}><header><div><span>ROTEIRO GERADO · {trend.platform}</span><h2>{trend.title}</h2></div><button onClick={onClose}>×</button></header><div className="script-meta"><span>{generated.format}</span><span>{generated.duration}</span><span>{generated.difficulty}</span></div><div className="production-brief"><div><small>OBJETIVO</small><p>{generated.objective}</p></div><div><small>RECURSOS</small><p>{generated.resources.join(' · ')}</p></div></div><h3>Gancho escolhido</h3><blockquote>{generated.chosenHook}</blockquote><h3>Plano de gravação</h3><div className="scene-table">{generated.scenes.map((scene,index)=><article key={`${scene.time}-${index}`}><b>{scene.time}</b><div><small>CENA {index+1} · {scene.shot}</small><strong>{scene.action}</strong><p><em>Fala:</em> {scene.spokenLine}</p><p><em>Texto:</em> {scene.onScreenText}</p><p><em>Edição:</em> {scene.edit}</p></div></article>)}</div><h3>Legenda e CTA</h3><p className="caption">{generated.caption}<br/><strong>{generated.cta}</strong></p><footer><button onClick={onSave}>{saved?'✓ Ideia salva':'◇ Salvar ideia'}</button><button className="primary" onClick={exportGeneratedWord}>Exportar para Word</button></footer></section></div>;
  function exportWord(){
    const rows=trend.steps.map((step,index)=>{const note=sceneNotes[Math.min(index,sceneNotes.length-1)];return `<tr><td>${index*5}s–${(index+1)*5}s</td><td><strong>${wordSafe(step)}</strong><br><span class="meta">${wordSafe(note.shot)}</span></td><td>${wordSafe(note.line)}</td><td>${wordSafe(note.text)}</td><td>${wordSafe(note.edit)}</td></tr>`}).join('');
    downloadWord(`Roteiro - ${trend.title}`,`<p class="meta">ROTEIRO DE PRODUÇÃO · ${wordSafe(trend.platform)}</p><h1>${wordSafe(trend.title)}</h1><p><strong>Formato:</strong> Vertical 9:16 · 20 segundos · ${wordSafe(trend.difficulty)} de gravar · 1 pessoa + câmera</p><h2>Objetivo</h2><p>Transformar o padrão observado em uma situação original, clara e aplicável à marca.</p><h2>Recursos</h2><p>Celular, tripé, ambiente silencioso, produto ou objeto de cena e luz frontal.</p><h2>Gancho escolhido</h2><blockquote>${wordSafe(trend.hook)}</blockquote><h2>Plano de gravação</h2><table><thead><tr><th>Tempo</th><th>Cena</th><th>Fala</th><th>Texto na tela</th><th>Edição</th></tr></thead><tbody>${rows}</tbody></table><h2>Antes de gravar</h2><ul><li>Limpar lente e gravar em 1080 × 1920</li><li>Separar produto e objetos de continuidade</li><li>Testar fala e ruído do ambiente</li><li>Confirmar preços, garantias e afirmações</li></ul><h2>Antes de publicar</h2><ul><li>Gancho compreensível sem áudio</li><li>Legendas dentro da área segura</li><li>Produto e marca aparecem naturalmente</li><li>CTA único e link da referência preservado</li></ul><h2>Legenda sugerida</h2><p>Uma situação comum, uma virada rápida e uma pergunta que convida o público a participar. Qual pessoa faria exatamente isso? #Reels #Instagram #ConteudoOriginal</p>`);
  }
  return <div className="modal-bg" onClick={onClose}><section className="script-modal" onClick={e=>e.stopPropagation()}><header><div><span>ROTEIRO DE PRODUÇÃO · {trend.platform}</span><h2>{trend.title}</h2></div><button onClick={onClose} aria-label="Fechar roteiro">×</button></header><div className="script-meta"><span>Vertical 9:16</span><span>20 segundos</span><span>{trend.difficulty} de gravar</span><span>1 pessoa + câmera</span></div><div className="production-brief"><div><small>OBJETIVO</small><p>Transformar o padrão observado em uma situação original, clara e aplicável à marca.</p></div><div><small>RECURSOS</small><p>Celular, tripé, ambiente silencioso, produto ou objeto de cena e luz frontal.</p></div></div><h3>Gancho escolhido</h3><blockquote>{trend.hook}</blockquote><h3>Plano de gravação</h3><div className="scene-table">{trend.steps.map((step,index)=>{const note=sceneNotes[Math.min(index,sceneNotes.length-1)];return <article key={step}><b>{index*5}s–{(index+1)*5}s</b><div><small>CENA {index+1} · {note.shot}</small><strong>{step}</strong><p><em>Fala:</em> {note.line}</p><p><em>Texto na tela:</em> {note.text}</p><p><em>Edição:</em> {note.edit}</p></div></article>})}</div><div className="checklists"><div><h3>Antes de gravar</h3><ul><li>Limpar lente e gravar em 1080 × 1920</li><li>Separar produto e objetos de continuidade</li><li>Testar fala e ruído do ambiente</li><li>Confirmar preços, garantias e afirmações</li></ul></div><div><h3>Antes de publicar</h3><ul><li>Gancho compreensível sem áudio</li><li>Legendas dentro da área segura</li><li>Produto e marca aparecem naturalmente</li><li>CTA único e link da referência preservado</li></ul></div></div><h3>Legenda sugerida</h3><p className="caption">Uma situação comum, uma virada rápida e uma pergunta que convida o público a participar. Qual pessoa faria exatamente isso? #Reels #TikTok #ConteudoOriginal</p><footer><button onClick={onSave}>{saved?'✓ Ideia salva':'◇ Salvar ideia'}</button><button className="primary" onClick={exportWord}>Exportar para Word</button></footer></section></div>
}

function Report({trends,saved,brand,category,onBack}:{trends:Trend[];saved:string[];brand:string;category:string;onBack:()=>void}){
  const selected=Array.from(new Map(trends.filter(t=>saved.includes(savedTrendKey(brand,t))).map(t=>[savedTrendKey(brand,t),t])).values());
  const [generatedReport,setGeneratedReport]=useState<GeneratedReport|null>(null);
  const [reportError,setReportError]=useState('');
  const reportPayload=JSON.stringify({brand,category,trends,selected});
  useEffect(()=>{let active=true;void (async()=>{try{const response=await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:reportPayload});const data=await response.json() as {report?:GeneratedReport;error?:string};if(!response.ok||!data.report)throw new Error(data.error||'Não foi possível gerar o relatório.');if(active)setGeneratedReport(data.report)}catch(reason){if(active)setReportError(reason instanceof Error?reason.message:'Falha inesperada.')}})();return()=>{active=false}},[reportPayload]);
  if(!generatedReport)return <section className="report-page"><div className="report-top"><div><span>RELATÓRIO DO AGENTE</span><h1>{reportError?'Não foi possível gerar':'Consolidando evidências…'}</h1><p>{reportError||'A skill de relatório está verificando a sessão atual.'}</p></div><button onClick={onBack}>← Voltar</button></div></section>;
  const reportRows=generatedReport.opportunities.map(item=>`<h2>${wordSafe(item.title)}</h2><p><strong>${wordSafe(item.status)}</strong> · ${wordSafe(item.evidence)}</p><p>${wordSafe(item.nextAction)}</p><p>${wordSafe(item.source)}</p>`).join('');
  function exportGeneratedReport(){if(!generatedReport)return;downloadWord(`Relatório - ${brand}`,`<h1>${wordSafe(generatedReport.title)}</h1><p>${wordSafe(generatedReport.summary)}</p><p>${wordSafe(generatedReport.reportingWindow)}</p>${reportRows}<h2>Próximas ações</h2><ul>${generatedReport.nextActions.map(item=>`<li>${wordSafe(item)}</li>`).join('')}</ul>`)}
  return <section className="report-page"><div className="report-top"><div><span>RELATÓRIO · {category.toUpperCase()}</span><h1>{generatedReport.title}</h1><p>{generatedReport.summary}</p></div><div><button onClick={onBack}>← Voltar</button><button className="primary" onClick={exportGeneratedReport}>Exportar para Word</button></div></div><div className="report-stats"><div><strong>{generatedReport.funnel.researched}</strong><span>referências pesquisadas</span></div><div><strong>{generatedReport.funnel.selected}</strong><span>ideias selecionadas</span></div><div><strong>{generatedReport.funnel.easy}</strong><span>fáceis de produzir</span></div></div><div className="report-table">{generatedReport.opportunities.map((item,index)=><article key={`${item.source}-${index}`}><b>0{index+1}</b><div><small>{item.status}</small><h3>{item.title}</h3><p>{item.evidence}</p><p><strong>Próximo passo:</strong> {item.nextAction}</p></div></article>)}</div></section>;
  function exportReportWord(){const rows=selected.map(t=>`<tr><td>${t.rank}</td><td><strong>${wordSafe(t.title)}</strong><br><span class="meta">${wordSafe(t.platform)} · ${wordSafe(t.pattern)}</span></td><td>${wordSafe(t.fit)}</td><td>${wordSafe(t.difficulty)}</td><td class="score">${t.score}/100</td></tr>`).join('');downloadWord(`Relatório - ${brand}`,`<p class="meta">RELATÓRIO · ${wordSafe(category.toUpperCase())}</p><h1>Ideias selecionadas para ${wordSafe(brand)}</h1><p>Resumo das referências salvas e dos próximos vídeos a desenvolver.</p><p><strong>${selected.length}</strong> ideias salvas · <strong>${selected.filter(t=>t.difficulty==='Fácil').length}</strong> fáceis de produzir · <strong>${selected.length?Math.round(selected.reduce((a,t)=>a+t.score,0)/selected.length):0}</strong> de potencial médio</p><table><thead><tr><th>#</th><th>Referência</th><th>Aplicação</th><th>Dificuldade</th><th>Potencial</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Nenhuma ideia salva.</td></tr>'}</tbody></table>`)}
  return <section className="report-page"><div className="report-top"><div><span>RELATÓRIO · {category.toUpperCase()}</span><h1>Ideias selecionadas para {brand}</h1><p>Resumo das referências salvas e dos próximos vídeos a desenvolver.</p></div><div><button onClick={onBack}>← Voltar</button><button className="primary" onClick={exportReportWord}>Exportar para Word</button></div></div><div className="report-stats"><div><strong>{selected.length}</strong><span>ideias salvas</span></div><div><strong>{selected.filter(t=>t.difficulty==='Fácil').length}</strong><span>fáceis de produzir</span></div><div><strong>{selected.length?Math.round(selected.reduce((a,t)=>a+t.score,0)/selected.length):0}</strong><span>potencial médio</span></div></div>{selected.length?<div className="report-table">{selected.map(t=><article key={t.rank}><b>0{t.rank}</b><div><small>{t.platform} · {t.pattern}</small><h3>{t.title}</h3><p>{t.fit}</p></div><span>{t.score}/100</span></article>)}</div>:<div className="empty">Salve algumas ideias para montar seu relatório.</div>}<div className="report-note"><strong>Observação</strong><p>A identidade da nova marca será concluída após recebermos o site e o texto de referência.</p></div></section>
}
