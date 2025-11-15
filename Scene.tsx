import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Room, ObjSpec } from '../types';
import { detectOBBOverlap, rectToPoly, polyIntersectionArea } from '../utils/collision';

type Props = { room:Room, objects:ObjSpec[], setObjects:(o:ObjSpec[])=>void, gridSize:number, snapToGrid:boolean, snapToWall:boolean };

export default function Scene({room, objects, setObjects, gridSize, snapToGrid, snapToWall}:Props){
  const mount = useRef<HTMLDivElement|null>(null);
  const [dragging, setDragging] = useState<string|null>(null);
  const pointer = useRef({x:0,y:0});
  const selectedRef = useRef<string|null>(null);

  useEffect(()=> {
    const el = mount.current!;
    const width = el.clientWidth;
    const height = el.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071029);

    const aspect = width/height;
    const d = Math.max(room.w, room.d) * 0.6;
    const camera = new THREE.OrthographicCamera(-d*aspect, d*aspect, d, -d, 0.1, 5000);
    camera.position.set(-d, d, d);
    camera.lookAt(0,0,0);

    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(width, height);
    el.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100,200,100);
    scene.add(light);

    // floor
    const floorGeom = new THREE.PlaneGeometry(room.w, room.d);
    const floorMat = new THREE.MeshBasicMaterial({color:0x071029, side:THREE.DoubleSide});
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    // grid helper
    const grid = new THREE.GridHelper(Math.max(room.w,room.d), Math.round(Math.max(room.w,room.d)/gridSize), 0x334155, 0x0b1220);
    grid.rotation.x = Math.PI/2;
    scene.add(grid);

    const objGroup = new THREE.Group();
    scene.add(objGroup);

    function draw(){
      // clear
      while(objGroup.children.length) objGroup.remove(objGroup.children[0]);

      // draw objects (boxes) and usage radius
      objects.forEach(o=>{
        const box = new THREE.Mesh(new THREE.BoxGeometry(o.size.l, o.size.h, o.size.b), new THREE.MeshStandardMaterial({color:0x7c3aed}));
        const ox = o.x - room.w/2;
        const oz = o.y - room.d/2;
        box.position.set(ox, o.size.h/2, oz);
        box.rotation.y = -o.rotation * Math.PI/180;
        objGroup.add(box);

        // usage radius
        const radius = o.usageRadius || 0;
        if(radius>0){
          const circle = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0.12}));
          circle.rotation.x = -Math.PI/2;
          circle.position.set(ox, 0.02, oz);
          objGroup.add(circle);
        }
      });

      // collisions: if overlap between footprint polygons, draw transparent plane
      for(let i=0;i<objects.length;i++){
        for(let j=i+1;j<objects.length;j++){
          const a = objects[i], b = objects[j];
          const polyA = rectToPoly(a.x - a.size.l/2, a.y - a.size.b/2, a.size.l, a.size.b, a.rotation);
          const polyB = rectToPoly(b.x - b.size.l/2, b.y - b.size.b/2, b.size.l, b.size.b, b.rotation);
          if(detectOBBOverlap(polyA, polyB)){
            const mx = (a.x + b.x)/2 - room.w/2;
            const mz = (a.y + b.y)/2 - room.d/2;
            const area = polyIntersectionArea(polyA, polyB);
            const plane = new THREE.Mesh(new THREE.PlaneGeometry( Math.min(a.size.l,b.size.l), Math.min(a.size.b,b.size.b) ), new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity: Math.min(0.6, 0.2 + area/10000)}));
            plane.rotation.x = -Math.PI/2;
            plane.position.set(mx, 0.02, mz);
            objGroup.add(plane);
          }
          // usage radius overlap (simplified): check circle distance
          const dx = a.x - b.x, dy = a.y - b.y;
          const rsum = (a.usageRadius||0) + (b.usageRadius||0);
          if(rsum>0 && Math.sqrt(dx*dx+dy*dy) < rsum){
            const mx = (a.x + b.x)/2 - room.w/2;
            const mz = (a.y + b.y)/2 - room.d/2;
            const plane = new THREE.Mesh(new THREE.PlaneGeometry( Math.min(a.usageRadius||50, b.usageRadius||50)*1.2, Math.min(a.usageRadius||50, b.usageRadius||50)*1.2 ), new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0.12}));
            plane.rotation.x = -Math.PI/2;
            plane.position.set(mx, 0.015, mz);
            objGroup.add(plane);
          }
        }
      }
    }

    draw();

    function animate(){ requestAnimationFrame(animate); renderer.render(scene, camera); }
    animate();

    // Mouse interaction: simple picking -> move objects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function getMousePlaneIntersection(clientX:number, clientY:number){
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
      const pos = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, pos);
      // convert back to room coords
      const rx = pos.x + room.w/2;
      const ry = pos.z + room.d/2;
      return {x: rx, y: ry};
    }

    let selectedId:string|null = null;
    let offset = {x:0,y:0};

    function onDown(e:MouseEvent){
      const p = getMousePlaneIntersection(e.clientX, e.clientY);
      // find top-most object under mouse via distance
      let found:ObjSpec|null = null;
      let minDist = Infinity;
      objects.forEach(o=>{
        const dx = o.x - p.x, dy = o.y - p.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if(dist < Math.max(o.size.l,o.size.b)/2){
          if(dist < minDist){ minDist = dist; found = o; }
        }
      });
      if(found){
        selectedId = found.id;
        selectedRef.current = found.id;
        offset.x = p.x - found.x; offset.y = p.y - found.y;
      } else {
        selectedId = null;
        selectedRef.current = null;
      }
    }

    function onMove(e:MouseEvent){
      if(!selectedId) return;
      const p = getMousePlaneIntersection(e.clientX, e.clientY);
      let nx = p.x - offset.x, ny = p.y - offset.y;
      // snap to grid
      if(snapToGrid){
        nx = Math.round(nx / gridSize) * gridSize;
        ny = Math.round(ny / gridSize) * gridSize;
      }
      // snap to wall
      if(snapToWall){
        const margin = 10;
        nx = Math.max(margin, Math.min(nx, room.w - margin));
        ny = Math.max(margin, Math.min(ny, room.d - margin));
      }
      setObjects(prev => prev.map(o => o.id === selectedId ? {...o, x: nx, y: ny } : o));
      draw();
    }

    function onUp(e:MouseEvent){
      selectedId = null;
      selectedRef.current = null;
    }

    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // cleanup
    return ()=> {
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.dispose();
      if(el.firstChild) el.removeChild(el.firstChild);
    }
  }, [objects, room, gridSize, snapToGrid, snapToWall]);

  return <div ref={mount} style={{width:'100%',height:'100%'}} />;
}
