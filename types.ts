export type Room = { w:number; d:number; h:number; units:'cm' };
export type ObjSpec = {
  id:string; type:string; label?:string;
  size:{l:number;b:number;h:number};
  usageRadius:number;
  x:number; y:number; rotation:number;
  modelUrl?:string|null;
};
export type Project = { meta:{name:string,created:string}, room:Room, objects:ObjSpec[], settings:{gridSize:number, snapToGrid:boolean, snapToWall:boolean} };
