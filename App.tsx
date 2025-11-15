import React, { useEffect, useState } from 'react';
import Scene from './scene/Scene';
import { Room, ObjSpec, Project } from './types';
import localforage from 'localforage';

export default function App(){
  const [room, setRoom] = useState<Room>({w:500,d:400,h:250,units:'cm'});
  const [objects, setObjects] = useState<ObjSpec[]>([]);
  const [gridSize, setGridSize] = useState<number>(10);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToWall, setSnapToWall] = useState(true);
  const [freeText, setFreeText] = useState('');

  useEffect(()=>{ // load
    (async()=>{
      const p = await localforage.getItem<Project>('og_project_v1') as Project|null;
      if(p){ setRoom(p.room); setObjects(p.objects); setGridSize(p.settings.gridSize); setSnapToGrid(p.settings.snapToGrid); setSnapToWall(p.settings.snapToWall); }
    })();
  },[]);

  const save = async ()=>{
    const p:Project = { meta:{name:'Gym Project', created: new Date().toISOString()}, room, objects, settings:{gridSize, snapToGrid, snapToWall} };
    await localforage.setItem('og_project_v1', p);
    alert('Projekt gespeichert (IndexedDB)');
  }

  const exportJSON = ()=>{
    const p = { meta:{name:'Gym Project', created: new Date().toISOString()}, room, objects, settings:{gridSize,snapToGrid,snapToWall} };
    const blob = new Blob([JSON.stringify(p,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'gym_project.json'; a.click(); URL.revokeObjectURL(url);
  }

  // Mocked LLM suggestion - replace with real call (see README)
  const suggest = async (text:string)=>{
    const t = text.toLowerCase();
    const res:ObjSpec[] = [];
    if(t.includes('rack') || t.includes('powerrack')) res.push({ id:'obj_'+Math.random().toString(36).slice(2,8), type:'powerrack', label:'Power Rack', size:{l:124,b:120,h:220}, usageRadius:150, x:120,y:120,rotation:0, modelUrl:null});
    if(t.includes('bar') || t.includes('langhantel')) res.push({ id:'obj_'+Math.random().toString(36).slice(2,8), type:'barbell', label:'Olympic Bar 220', size:{l:220,b:5,h:5}, usageRadius:100, x:200,y:120,rotation:90, modelUrl:null});
    if(res.length===0) res.push({ id:'obj_'+Math.random().toString(36).slice(2,8), type:'generic', label:text, size:{l:100,b:60,h:100}, usageRadius:80, x:150,y:150,rotation:0, modelUrl:null});
    return res;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="header"><h3>Gym Planner</h3><div className="small">2.5D isometric • Mobile-ready</div></div>

        <div className="panel">
          <div className="small">Room (cm)</div>
          <input className="input" value={room.w} onChange={e=>setRoom({...room, w: Number(e.target.value)})} />
          <input className="input" value={room.d} onChange={e=>setRoom({...room, d: Number(e.target.value)})} />
          <input className="input" value={room.h} onChange={e=>setRoom({...room, h: Number(e.target.value)})} />
          <div style={{display:'flex',gap:8}}>
            <button className="button" onClick={save}>Save</button>
            <button className="button" onClick={exportJSON}>Export JSON</button>
          </div>
        </div>

        <div className="panel">
          <div className="small">Freitext (KI)</div>
          <input className="input" value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="z.B. Olympische Langhantel 220 cm" />
          <div style={{display:'flex',gap:8}}>
            <button className="button" onClick={async ()=>{
              const sugg = await suggest(freeText);
              if(sugg.length>0){
                if(confirm(`Vorschlag: ${sugg[0].label}\nEinfügen?`)){
                  setObjects(o=>[...o, sugg[0]]);
                }
              }
            }}>Suggest & Add</button>
          </div>
        </div>

        <div className="panel small">
          <div>Grid</div>
          <input className="input" value={gridSize} onChange={e=>setGridSize(Number(e.target.value||10))} />
          <label className="small"><input type="checkbox" checked={snapToGrid} onChange={e=>setSnapToGrid(e.target.checked)} /> Snap to Grid</label><br/>
          <label className="small"><input type="checkbox" checked={snapToWall} onChange={e=>setSnapToWall(e.target.checked)} /> Snap to Wall</label>
        </div>

        <div className="panel small">
          <div>Quick Add</div>
          <button className="button" onClick={()=> setObjects(o=>[...o, { id:'obj_'+Math.random().toString(36).slice(2,8), type:'powerrack', label:'Power Rack', size:{l:124,b:120,h:220}, usageRadius:150, x:120,y:120,rotation:0, modelUrl:null }])}>Add Rack</button>
          <button className="button" onClick={()=> setObjects(o=>[...o, { id:'obj_'+Math.random().toString(36).slice(2,8), type:'barbell', label:'Bar 220', size:{l:220,b:5,h:5}, usageRadius:100, x:200,y:120,rotation:90, modelUrl:null }])}>Add Bar</button>
        </div>

        <div className="panel small">
          <div>Objects: {objects.length}</div>
        </div>
        <div className="footer">Tip: Use Free-text to let the AI suggest objects. Replace mocked AI with OpenAI key in README.</div>
      </div>

      <div className="canvas">
        <div style={{padding:8, background:'#061126', color:'#9fb0c8'}}>Room: {room.w} x {room.d} x {room.h} cm • Grid: {gridSize}cm</div>
        <div className="canvasArea" style={{flex:1}}>
          <Scene room={room} objects={objects} setObjects={setObjects} gridSize={gridSize} snapToGrid={snapToGrid} snapToWall={snapToWall} />
        </div>
      </div>
    </div>
  )
}
