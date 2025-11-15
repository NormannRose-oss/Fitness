// 2D rectangle to polygon and OBB SAT collision
export function rectToPoly(x:number, y:number, w:number, h:number, rotationDeg:number){
  const cx = x + w/2;
  const cy = y + h/2;
  const theta = rotationDeg * Math.PI / 180.0;
  const dx = w/2;
  const dy = h/2;
  const corners = [
    {x: -dx, y: -dy},
    {x: dx, y: -dy},
    {x: dx, y: dy},
    {x: -dx, y: dy},
  ].map(p => {
    const rx = p.x * Math.cos(theta) - p.y * Math.sin(theta);
    const ry = p.x * Math.sin(theta) + p.y * Math.cos(theta);
    return { x: cx + rx, y: cy + ry };
  });
  return corners;
}

function project(poly:any[], axis:{x:number,y:number}){
  let min = Infinity, max = -Infinity;
  for(const p of poly){
    const proj = (p.x*axis.x + p.y*axis.y);
    if(proj<min) min=proj;
    if(proj>max) max=proj;
  }
  return {min, max};
}

function overlapOnAxis(polyA:any[], polyB:any[], axis:{x:number,y:number}){
  const p1 = project(polyA, axis);
  const p2 = project(polyB, axis);
  return !(p1.max < p2.min || p2.max < p1.min);
}

export function detectOBBOverlap(polyA:any[], polyB:any[]){
  const axes = [];
  for(let i=0;i<polyA.length;i++){
    const p1 = polyA[i];
    const p2 = polyA[(i+1)%polyA.length];
    const edge = {x: p2.x - p1.x, y: p2.y - p1.y};
    axes.push({x: -edge.y, y: edge.x});
  }
  for(let i=0;i<polyB.length;i++){
    const p1 = polyB[i];
    const p2 = polyB[(i+1)%polyB.length];
    const edge = {x: p2.x - p1.x, y: p2.y - p1.y};
    axes.push({x: -edge.y, y: edge.x});
  }
  for(const axis of axes){
    if(!overlapOnAxis(polyA, polyB, axis)) return false;
  }
  return true;
}

// approximate intersection area by sampling bounding box grid (not perfect but OK for prototype)
export function polyIntersectionArea(polyA:any[], polyB:any[]){
  // get bbox
  const xs = polyA.concat(polyB).map(p=>p.x); const ys = polyA.concat(polyB).map(p=>p.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const steps = 20;
  let count = 0; let total = 0;
  for(let i=0;i<steps;i++){
    for(let j=0;j<steps;j++){
      const x = minx + (i+0.5)*(maxx-minx)/steps;
      const y = miny + (j+0.5)*(maxy-miny)/steps;
      if(pointInPoly({x,y}, polyA) && pointInPoly({x,y}, polyB)) count++;
      total++;
    }
  }
  const bboxArea = (maxx-minx)*(maxy-miny);
  return (count/total) * bboxArea;
}

function pointInPoly(pt:{x:number,y:number}, poly:any[]){
  let inside = false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi = poly[i].x, yi=poly[i].y;
    const xj = poly[j].x, yj=poly[j].y;
    const intersect = ((yi>pt.y)!=(yj>pt.y)) && (pt.x < (xj-xi)*(pt.y-yi)/(yj-yi)+xi);
    if(intersect) inside = !inside;
  }
  return inside;
}
