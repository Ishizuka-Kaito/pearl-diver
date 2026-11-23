/* Pearl Diver — sprite artwork and game logic share a 240 × 150 pixel grid. */
(() => {
  'use strict';
  const W = 240, H = 150;
  const INK = '#122b43', DEEP = '#143d57', SEA = '#18778b', AQUA = '#73dcce';
  const FOAM = '#e4f5da', GOLD = '#ffc47c', ORANGE = '#ee8759', RUST = '#ad5560';
  const SWIM=70, WINCH=176;
  const MAP_W=840, MAP_H=470, GRAB_RADIUS=26;
  const MINI={x:365,y:7,w:108,h:60};
  const bound=(x,min,max)=>Math.max(min,Math.min(x,max));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function rect(c,x,y,w,h,color) {
    c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  // Filling scanlines keeps lighthouses, reef faces and all sprite edges on the pixel grid.
  function polygon(c,pts,col) {
    const ys = pts.map(p=>p[1]);
    c.fillStyle=col;
    for (let y=Math.ceil(Math.min(...ys)); y<=Math.floor(Math.max(...ys)); y++) {
      const hits=[];
      for(let i=0,j=pts.length-1; i<pts.length; j=i++) {
        const [ax,ay]=pts[j],[bx,by]=pts[i];
        if ((ay<=y+.5 && by>y+.5)||(by<=y+.5 && ay>y+.5)) hits.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
      }
      hits.sort((a,b)=>a-b);
      for (let i=0;i+1<hits.length;i+=2) c.fillRect(Math.round(hits[i]),y,Math.round(hits[i+1])-Math.round(hits[i]),1);
    }
  }
  function line(c,x1,y1,x2,y2,col,wide=1) {
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(x2-x1),Math.abs(y2-y1))));
    for(let i=0;i<=n;i++) rect(c,x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,wide,wide,col);
  }
  function oval(c,x,y,rx,ry,color) {
    c.fillStyle=color;
    for (let row=-Math.floor(ry);row<=Math.floor(ry);row++) {
      const half=Math.round(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));
      c.fillRect(Math.round(x)-half,Math.round(y)+row,half*2+1,1);
    }
  }
  function dotStar(c,x,y,size,color) {
    rect(c,x,y-size,1,size*2+1,color); rect(c,x-size,y,size*2+1,1,color);
    if (size>2) rect(c,x-1,y-1,3,3,color);
  }
  function bubble(c,x,y,r,col) {
    x=Math.round(x); y=Math.round(y);
    if(r<2){rect(c,x,y,1,1,col);return;}
    rect(c,x-r+1,y-r,2*r-1,1,col);rect(c,x-r,y-r+1,1,2*r-1,col);
    rect(c,x+r,y-r+1,1,2*r-1,col);rect(c,x-r+1,y+r,2*r-1,1,col);
    rect(c,x-r+1,y-r+1,1,1,FOAM);
  }
  function noise(i){const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);}
  function seaBackdrop(c,poster) {
    const levels = poster ? [[0,'#47afa9'],[13,'#349a9f'],[30,'#238895'],[48,'#1c798a'],[68,'#196d82'],[92,'#185a73'],[118,'#15465f']] : [[0,'#a4e3cf'],[25,'#2e9d9f'],[44,'#268e95'],[62,'#207e8a'],[82,'#1c7181'],[105,'#185d73'],[128,'#174c65']];
    for (const [y,col] of levels) rect(c,0,y,W,H-y,col);
    for(let j=1;j<levels.length;j++){
      const [y,col]=levels[j];
      for(let x=(j%2)*2;x<W;x+=4){rect(c,x,y-1,2,1,col);if(x%8===0)rect(c,x+3,y-2,1,1,col);}
    }
    const start=poster?0:26;
    for(const [x,w,len] of [[19,12,120],[44,4,80],[89,23,147],[120,6,114],[185,18,142],[216,4,96]]){
      c.save();c.globalAlpha=.075;
      polygon(c,[[x,start],[x+w,start],[x+w-55,len],[x-58,len]],'#dcffe4');c.restore();
    }
    for(let n=0;n<100;n++){
      const x=noise(n)*W, y=start+noise(n+401)*(H-start);
      rect(c,x,y,noise(n+2)>.87?2:1,1,y>90?'#367787':'#4d9d9e');
    }
  }
  function fish(c,x,y,s,col) {
    polygon(c,[[x,y],[x+3*s,y-1.5*s],[x+7*s,y],[x+3*s,y+1.5*s]],col);
    polygon(c,[[x,y],[x-3*s,y-2*s],[x-3*s,y+2*s]],col);
  }
  function kelp(c,x,y,h,col,edge) {
    let px=x,py=y;
    for(let i=1;i<=6;i++){
      const nx=x+Math.sin(i*.95+x*.5)*h*.11,ny=y-h*i/6;
      line(c,px,py,nx,ny,col,2);
      if(i%2)polygon(c,[[nx,ny+2],[nx-h*.12,ny-1],[nx-h*.18,ny-h*.15],[nx,ny]],edge);
      else polygon(c,[[nx,ny+2],[nx+h*.14,ny-2],[nx+h*.18,ny-h*.16],[nx,ny]],edge);
      px=nx;py=ny;
    }
  }
  function coral(c,x,y,scale,dark,light){
    const branches=[[[0,0],[-1,-8],[2,-13],[1,-22]],[[0,-7],[-6,-11],[-7,-17]],
      [[-6,-11],[-10,-12],[-11,-15]],[[1,-12],[6,-15],[7,-19]],[[2,-17],[-2,-18],[-3,-21]],[[0,-4],[5,-6],[9,-10]],[[7,-8],[11,-8],[12,-12]]];
    for(const pts of branches){for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i];line(c,x+a[0]*scale,y+a[1]*scale,x+b[0]*scale,y+b[1]*scale,dark,Math.max(1,Math.round(2.4*scale)));
      line(c,x+a[0]*scale,y+a[1]*scale,x+b[0]*scale,y+b[1]*scale,light,Math.max(1,Math.round(scale)));
    }}
  }
  function boat(c,x,y) {
    c.save();c.translate(Math.round(x),Math.round(y));
    rect(c,-13,1,29,2,'#459a98');
    polygon(c,[[-18,-5],[-12,0],[9,0],[18,-6],[8,-5]],INK);
    polygon(c,[[-16,-5],[-12,-2],[9,-2],[15,-5]],ORANGE);
    rect(c,-17,-6,32,2,FOAM);rect(c,-6,-14,13,8,FOAM);rect(c,-8,-15,16,2,'#bd695a');
    rect(c,-4,-12,4,4,DEEP);rect(c,2,-12,3,4,DEEP);rect(c,-1,-19,1,5,INK);
    rect(c,0,-19,5,2,ORANGE);rect(c,-11,-9,3,3,GOLD);
    c.restore();
  }
  function makeCanvas(){const el=document.createElement('canvas');el.width=W;el.height=H;return el;}
  let coverLayer;
  // Copper helmet, hose, canvas suit and fins are painted in the same palette in both views.
  function diver(c,x,y,size,facing,kick){
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(size*facing,size);
    const flipper = kick>0?1:-1;
    polygon(c,[[-9,1],[-17,-2],[-21,-4],[-24,-9],[-28,-10],[-28,-6],[-23,0],[-15,4],[-7,6]],INK);
    polygon(c,[[-12,0],[-18,-2],[-22,-6],[-24,-6],[-21,-1],[-12,3]],'#477e84');
    polygon(c,[[-9,4],[-14,9],[-19,8+flipper],[-25,10+flipper],[-30,9+flipper],[-29,5+flipper],[-22,5+flipper],[-17,3],[-12,-1]],INK);
    polygon(c,[[-10,3],[-15,7],[-20,7+flipper],[-21,5+flipper],[-16,4],[-12,1]],'#66a69b');
    polygon(c,[[-21,6+flipper],[-28,7+flipper],[-28,8+flipper],[-23,8+flipper]],'#36878a');
    oval(c,-5,2,9,6,INK);oval(c,-5,1,7,5,'#bc7963');
    polygon(c,[[-12,-2],[-8,-3],[-5,-2],[-6,3],[-10,4]],'#ddab76');
    rect(c,-11,-4,12,3,INK);rect(c,-12,-6,11,3,'#71a29a');rect(c,-11,-6,8,1,'#ace1bb');
    rect(c,-8,-4,2,9,'#304d59');rect(c,-4,2,8,4,'#885b59');
    polygon(c,[[3,2],[8,4],[12,5],[16,2],[18,1],[20,3],[19,6],[14,8],[7,8],[2,6]],INK);
    polygon(c,[[3,3],[8,5],[12,6],[14,5],[14,7],[9,7],[4,5]],'#d99b75');rect(c,16,3,3,2,'#efbb7e');
    // helmet and ring
    oval(c,5,-4,9,9,INK);oval(c,5,-5,8,7,'#b56753');oval(c,4,-6,7,6,ORANGE);
    oval(c,4,-7,5,4,GOLD);rect(c,1,-13,6,1,FOAM);rect(c,-1,-10,2,3,GOLD);
    oval(c,9,-5,5,6,'#724c4c');oval(c,9,-6,5,5,GOLD);oval(c,9,-6,4,4,INK);
    oval(c,9,-6,3,3,'#39808c');rect(c,9,-8,2,1,'#c7edd4');rect(c,8,-7,1,2,'#94d5c5');
    rect(c,-3,-6,3,4,INK);rect(c,-3,-5,2,2,GOLD);
    rect(c,-1,2,11,2,'#65474a');rect(c,0,2,9,1,GOLD);rect(c,4,0,1,1,'#fbd294');
    c.restore();
  }
  function shell(c,x,y,n,full,t){
    c.save();c.translate(Math.round(x),Math.round(y));
    if(!full){polygon(c,[[-7,-1],[-5,-4],[3,-5],[6,-2],[6,0],[2,2],[-3,2]],'#284852');rect(c,-4,-3,7,1,'#759b92');c.restore();return;}
    const edge=n===4?'#dc924f':'#d67b73',high=n===4?'#ffd984':'#f4b899';
    polygon(c,[[-7,0],[-7,-4],[-4,-7],[-1,-6],[1,-8],[4,-7],[7,-5],[7,-1],[4,1],[-4,1]],INK);
    polygon(c,[[-6,-2],[-5,-5],[-3,-6],[0,-5],[2,-7],[5,-5],[6,-2],[2,0],[-3,0]],edge);
    rect(c,-4,-5,2,1,high);rect(c,1,-6,2,1,high);rect(c,-1,-4,1,2,high);rect(c,-5,-1,11,2,INK);
    for(let i=0;i<n;i++) {const px=(i-(n-1)/2)*3;oval(c,px,-2+(i%2),1.5,1.5,'#a8cbc3');rect(c,px-1,-3+(i%2),2,1,FOAM);}
    polygon(c,[[-7,0],[6,0],[5,2],[1,4],[-3,3]],edge);rect(c,-4,0,9,1,high);
    if(Math.sin(t*3+n*1.6)>.55)dotStar(c,6,-8,2,'#fff1b6');
    c.restore();
  }
  function coverImage(){
    if(coverLayer)return coverLayer;
    coverLayer=makeCanvas();const c=coverLayer.getContext('2d');seaBackdrop(c,true);
    // The rope curves from the bright surface toward the helmet, guiding the eye to the shell.
    const rope=[[-3,1],[11,21],[24,32],[45,32],[59,28],[72,30],[80,38],[81,45],[90,53]];
    for(let i=1;i<rope.length;i++){const [a,b]=rope[i-1],[x,y]=rope[i];line(c,a,b,x,y,'#3b666b',2);line(c,a,b,x,y,'#93c7a7');}
    for(const [x,y,s] of [[177,34,.85],[187,28,.65],[203,33,.70],[185,40,.6],[14,62,.8],[27,66,.65],[21,72,.6]])fish(c,x,y,s,'#61a9a2');
    polygon(c,[[0,107],[18,99],[31,103],[48,94],[69,100],[99,118],[124,120],[152,110],[174,101],[192,109],[214,97],[240,96],[240,150],[0,150]],'#1b6375');
    for(const [x,y,h] of [[9,119,28],[21,120,16],[160,122,15],[218,127,39],[236,122,55],[47,129,23]])kelp(c,x,y,h,'#236c75','#2c8080');
    polygon(c,[[0,124],[12,116],[27,115],[49,122],[66,124],[85,132],[102,131],[127,126],[147,125],[162,121],[180,118],[195,122],[215,116],[240,119],[240,150],[0,150]],'#133d55');
    for(let i=0;i<170;i++){const x=noise(i)*W,y=128+noise(i+421)*25;rect(c,x,y,2+noise(i+80)*4,1,i%3?'#235368':'#2f6872');}
    coral(c,29,129,1.10,'#77566c','#cc8176');coral(c,14,127,.68,'#764e65','#ab6b71');coral(c,227,132,1.45,'#894c61','#d8786f');
    kelp(c,234,131,29,'#277779','#48948b');kelp(c,55,133,15,'#23696d','#398583');
    for(const [x,y,r] of [[114,43,3],[118,32,2],[112,23,3],[122,13,2],[125,47,1],[143,72,2],[155,79,1]])bubble(c,x,y,r,'#a9e0c9');
    // A large, scalloped, hand-pixeled shell with a single hero pearl.
    c.save();c.translate(174,115);
    polygon(c,[[-22,-3],[-22,-9],[-18,-17],[-12,-17],[-11,-21],[-5,-22],[0,-20],[4,-23],[10,-23],[13,-18],[18,-18],[22,-13],[24,-5],[20,0],[11,4],[-10,4]],INK);
    polygon(c,[[-20,-5],[-20,-10],[-17,-15],[-12,-15],[-11,-18],[-6,-20],[0,-18],[5,-21],[9,-21],[13,-16],[18,-16],[21,-11],[22,-6],[17,-1],[-11,1]],'#d98278');
    for(const [x,y] of [[-17,-15],[-10,-17],[-5,-19],[5,-19],[13,-15],[18,-13]])line(c,x,y,0,0,'#f5af89',2);
    polygon(c,[[-21,-4],[-14,-7],[6,-9],[20,-7],[23,-4],[17,1],[2,4],[-13,1]],INK);
    oval(c,1,-7,8,8,'#4e7e84');oval(c,1,-8,7,7,'#8fcabd');oval(c,0,-9,6,6,'#d6e6bf');oval(c,-1,-10,4,4,'#fff0c6');rect(c,-3,-12,3,2,'#fffce0');
    polygon(c,[[-22,-3],[-11,-2],[6,-1],[23,-5],[22,-1],[14,6],[4,10],[-4,10],[-15,5]],INK);
    polygon(c,[[-21,-2],[-7,0],[7,0],[21,-4],[19,0],[11,5],[4,8],[-4,7],[-14,3]],'#bb6870');
    line(c,-19,-2,-4,1,'#f6bc92',2);line(c,-3,1,8,1,'#f6bc92',2);line(c,8,1,20,-3,'#f6bc92',2);
    for(const x of [-10,-4,4,11])line(c,x,2,2,7,'#e19881');c.restore();
    dotStar(c,184,91,4,'#ffefba');dotStar(c,151,105,2,'#ffefba');
    const hero=document.createElement('canvas');hero.width=56;hero.height=30;
    diver(hero.getContext('2d'),31,15,1,1,1);
    c.save();c.imageSmoothingEnabled=false;c.translate(104,69);c.rotate(.25);c.scale(2.45,2.45);
    c.drawImage(hero,-31,-15);c.restore();
    polygon(c,[[0,144],[19,137],[30,138],[46,147],[58,147],[67,150],[0,150]],INK);
    polygon(c,[[155,150],[169,144],[189,142],[208,134],[221,135],[240,126],[240,150]],INK);
    kelp(c,5,149,37,INK,'#1c4756');kelp(c,213,150,18,INK,'#245263');
    return coverLayer;
  }
  function paintImage(ctx,image){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,480,300);ctx.restore();}
  // Each sea describes its passage network. Hand-placed beds let a route have empty stretches.
  const seaTypes=[
    {name:'真珠の指輪礁',mouths:[0,4],
      sites:[[415,23],[410,161],[332,108],[242,99],[151,128],[94,191],[99,253],[157,309],[246,330],[328,307],[391,242],
        [475,174],[540,202],[603,216],[668,207],[706,212],[738,211],[773,210]],
      paths:[[0,1,2,3,4,5,6,7,8,9,10,1],[1,11,12,13,14,15,16,17]],
      pink:[2,4,6,7,8,10],gold:[15,16,17],vents:[6,12],
      tip:'左は桃の貝を拾って一周。右奥の金の貝は3つ。'},
    {name:'ふたまた谷',mouths:[0,11,17],
      sites:[[406,23],[404,96],[337,115],[467,112],[505,133],[220,173],[159,276],[598,163],[684,227],[397,237],[351,59],
        [54,120],[45,345],[222,426],[382,433],[562,366],[762,409],[793,114],[557,65],[252,63]],
      paths:[[0,1,2,5,6,12],[1,3,4,7,8,16],[1,9,14],[0,10,19,11],[6,13],[8,15],[7,17],[4,18]],
      vents:[4,6,8,9,18]},
    {name:'環礁の回廊',mouths:[0,10,16],
      sites:[[202,23],[203,103],[141,126],[272,129],[315,146],[72,200],[127,339],[340,401],[617,369],[760,211],[538,74],
        [52,84],[42,427],[267,270],[460,218],[581,442],[799,78],[793,421],[214,63]],
      paths:[[0,1,2,5,6,7,8,9,10,18,0],[1,3,4,13,7],[4,14,9],[5,11],[6,12],[8,15],[9,16],[8,17]],
      vents:[4,6,14,9,8]},
    {name:'段々水道',mouths:[0,10,11],
      sites:[[646,23],[640,89],[703,117],[569,106],[532,120],[779,170],[679,226],[507,210],[366,263],[244,319],[417,119],
        [50,80],[193,159],[44,287],[82,426],[290,424],[520,383],[760,421],[634,320]],
      paths:[[0,1,2,5,6],[1,3,4,10,12,11],[4,7,6],[7,8,9,13],[9,15,14],[6,18,17],[18,16,15]],
      vents:[4,6,8,12,15]},
    {name:'真珠の縦穴',mouths:[0,6],
      sites:[[410,23],[410,103],[427,204],[406,300],[421,414],[321,99],[239,111],[524,91],[578,101],
        [326,217],[235,240],[521,195],[612,218],[282,317],[173,343],[543,301],[668,327],[326,414],[288,419],[500,418]],
      paths:[[0,1,2,3,4],[6,5,1,7,8],[10,9,2,11,12],[14,13,3,15,16],[18,17,4,19]],
      pink:[1,5,6,7,8,9,11],gold:[10,12,14,16,17,18,19],vents:[2,15],
      tip:'縦穴の左右に貝の棚。どの深さで折り返す？'},
    {name:'潮だまりの三つ叉',mouths:[0,11],
      sites:[[215,23],[242,112],[196,170],[125,172],[61,206],[245,211],[299,257],[360,291],[421,322],
        [332,111],[434,99],[531,117],[578,151],[656,173],[729,168],[762,180],[257,190]],
      paths:[[0,1,2,3,4],[1,5,6,7,8],[1,9,10,11,12,13,14,15],[2,16,5]],
      pink:[2,3,4,5,6,9,10],gold:[7,8,12,14,15],vents:[16,11],
      tip:'浅い枝はすぐ船へ。中央の枝と遠い枝は入口で分かれる。'},
    {name:'双子環礁',rockTint:'#234c4b',rim:'#a2c795',mouths:[0,7,11],
      sites:[[419,23],[417,220],[333,132],[212,103],[94,157],[83,273],[175,351],[276,325],[524,123],[648,97],[755,178],[766,272],[657,351],[543,318]],
      paths:[[0,1],[1,2,3,4,5,6,7,1],[1,8,9,10,11,12,13,1]],
      pink:[2,3,4,7,8,9,10],gold:[5,6,11,12,13],vents:[3,12],tip:'中央でつながる二つの輪。外側から潜れば、輪の奥に近い。'},
    {name:'うずまき洞',rockTint:'#333954',rim:'#aa9eb7',mouths:[0,6],
      sites:[[147,23],[112,134],[85,263],[173,388],[398,414],[652,362],[730,224],[641,112],[442,105],[272,165],[246,271],[366,332],[516,290],[520,204],[423,186]],
      paths:[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]],
      pink:[1,2,3,5,7,8,10],gold:[11,12,13,14],vents:[4,9,12],tip:'渦の芯に金の貝。入口で芯までの道のりが変わる。'},
    {name:'砂時計の海門',rockTint:'#514848',rim:'#dbb486',mouths:[0,2],
      sites:[[186,23],[121,124],[676,123],[403,220],[408,299],[201,374],[94,422],[339,431],[590,394],[746,416],[527,429],[402,95]],
      paths:[[0,1,3,2,11,0],[3,4,5,6,7,4],[4,8,9,10,4]],
      pink:[1,2,11,3,5],gold:[6,7,8,9,10],vents:[4,2],tip:'下の貝場からは中央のくびれを通って帰る。'}
  ];
  const firstTour=[6,7,0,8,4,2,5,3,1];
  const orderKey='pearl-voyage-order-'+seaTypes.length;
  let voyageOrder=[];
  function generateChart(){
    try{
      const saved=JSON.parse(localStorage.getItem(orderKey)||'null');
      if(Array.isArray(saved)&&saved.length>0&&saved.length<=seaTypes.length&&new Set(saved).size===saved.length&&saved.every(i=>Number.isInteger(i)&&seaTypes[i]))voyageOrder=saved;
    }catch{/* Keep the order in memory when browser storage is unavailable. */}
    if(!voyageOrder.length)voyageOrder=[...firstTour];
    const current=voyageOrder.shift(),type=seaTypes[current];
    if(!voyageOrder.length){
      voyageOrder=seaTypes.map((_,i)=>i);
      for(let i=voyageOrder.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [voyageOrder[i],voyageOrder[j]]=[voyageOrder[j],voyageOrder[i]];
      }
      if(voyageOrder[0]===current)[voyageOrder[0],voyageOrder[1]]=[voyageOrder[1],voyageOrder[0]];
    }
    try{localStorage.setItem(orderKey,JSON.stringify(voyageOrder));}catch{}
    const jitter=()=>Math.floor(Math.random()*11)-5;
    const nodes=type.sites.map(([x,y],i)=>({x:x+jitter(),y:i===0?78:y+jitter()}));
    const edges=[];
    for(const path of type.paths){
      for(let i=1;i<path.length;i++)edges.push({a:path[i-1],b:path[i],length:dist(nodes[path[i-1]],nodes[path[i]])});
    }
    const beds=type.pink
      ? [...type.pink.map(node=>({node,value:100})),...type.gold.map(node=>({node,value:300}))]
      : scatterBeds(nodes,edges);
    const stations=type.vents.map(node=>({node,used:false}));
    const mouths=type.mouths.map(index=>{
      const target=nodes[index],surface={x:target.x,y:23},top=nodes.length;
      nodes.push(surface);edges.push({a:top,b:index,length:dist(surface,target)});
      return surface;
    });
    return {name:type.name,tip:type.tip,rockTint:type.rockTint,rim:type.rim,nodes,edges,beds,stations,mouths,entry:nodes.indexOf(mouths[0])};
  }

  function scatterBeds(nodes,edges){
    const beds=[2,3,5,6,8,9,10].map((node,i)=>({node,value:[300,300,100,300,300,300,100][i]}));
    // Seed distinct gathering grounds, then scatter smaller catches along the long passages.
    for(let node=11;node<nodes.length;node++)beds.push({node,value:nodes[node].y>220?300:100});
    for(const e of edges){
      const a=nodes[e.a],b=nodes[e.b];
      const count=Math.floor(e.length/75);
      for(let i=1;i<=count;i++){
        const t=i/(count+1),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        beds.push({anchor:{x:Math.round(x),y:Math.round(y)},value:y>200?300:100});
      }
    }
    return beds;
  }

  function horizon(c,showSun) {
    if(showSun)oval(c,198,9,8,8,'#ffdb9b');
    for(const [x,y,w] of [[13,7,20],[23,5,12],[87,11,24],[153,3,13],[208,14,22]]) rect(c,x,y,w,2,'#ceecd1');
    polygon(c,[[0,21],[19,18],[32,19],[47,15],[59,18],[68,17],[82,21],[105,20],[125,23],[156,20],[179,21],[196,17],[211,18],[221,15],[239,16],[240,25],[0,25]],'#78afa3');
    rect(c,0,22,240,3,'#77bdaf');rect(c,0,24,240,1,'#e1efca');
    for(let i=0;i<24;i++){rect(c,noise(i+921)*W,23+noise(i)*4,3+noise(i+10)*8,1,'#b6dfc0');}
    for(const [x,y] of [[120,9],[133,6],[143,10]]){line(c,x-3,y-1,x,y+1,'#508689');line(c,x,y+1,x+3,y-1,'#508689');}
  }
  // The same rock mask supplies the silhouette in the survey and the swimming boundary.
  function makeReef(chart){
    const {nodes,edges}=chart,rock=new Uint8Array(MAP_W*MAP_H);
    const seed=nodes[0].x+nodes[1].y;
    const sections=edges.map(e=>{
      const a=nodes[e.a],b=nodes[e.b];
      return {a,dx:b.x-a.x,dy:b.y-a.y,l2:e.length*e.length,lo:Math.min(a.x,b.x)-27,hi:Math.max(a.x,b.x)+27};
    });
    for(let x=0;x<MAP_W;x++){
      const column=sections.filter(s=>s.lo<=x&&x<=s.hi);
      const swell=5*Math.sin(x*.061+seed)+3*Math.sin(x*.13+seed*.5);
      const shelf=40+3*Math.sin(x*.027+seed)+swell*.25;
      const atMouth=chart.mouths.some(m=>Math.abs(m.x-x)<15);
      for(let y=0;y<MAP_H;y++){
        if(y<shelf)continue;
        if(y>=44&&y<=50&&!atMouth){rock[y*MAP_W+x]=1;continue;}
        const px=x+4*Math.sin(y*.073+seed),py=y+swell;
        const radius=18+4*Math.sin(x*.042+y*.028+seed);
        const water=column.some(({a,dx,dy,l2})=>{
          const t=bound(((px-a.x)*dx+(py-a.y)*dy)/l2,0,1);
          return (px-a.x-t*dx)**2+(py-a.y-t*dy)**2<radius*radius;
        });
        rock[y*MAP_W+x]=water?0:1;
      }
    }
    function solid(x,y){
      x=Math.round(x);y=Math.round(y);
      return x<0||x>=MAP_W||y<0||y>=MAP_H||rock[y*MAP_W+x]===1;
    }
    function open(p){
      return p.y>=23&&p.x>=4&&p.x<MAP_W-4&&p.y<MAP_H-4&&
        !solid(p.x-2,p.y)&&!solid(p.x+2,p.y)&&!solid(p.x,p.y-2)&&!solid(p.x,p.y+2);
    }
    // Put each shell on an actual ledge close to its own pocket.
    const used=[];
    for(const item of [...chart.beds,...chart.stations]){
      const center=item.anchor||nodes[item.node];let best=null,cost=Infinity;
      for(const radius of [33,50]){
        for(let dx=-radius;dx<=radius;dx+=2)for(let dy=-14;dy<=radius+3;dy++){
          const p={x:center.x+dx,y:center.y+dy};
          if(!open(p)||!solid(p.x,p.y+6)||used.some(other=>dist(p,other)<20))continue;
          const d=Math.hypot(dx,dy-9);if(d<cost){cost=d;best=p;}
        }
        if(best)break;
      }
      item.pos=best||{x:center.x,y:center.y};used.push(item.pos);
    }
    return {solid,open};
  }

  // Short, unobstructed taps swim directly. A grid search handles bends around rock shelves.
  function swimRoute(start,end,reef){
    const clear=(a,b)=>{
      const n=Math.max(1,Math.ceil(dist(a,b)/1.5));
      for(let i=1;i<=n;i++)if(!reef.open({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;
      return true;
    };
    if(clear(start,end))return [end];
    const step=4,cols=Math.ceil(MAP_W/step),rows=Math.ceil(MAP_H/step);
    const pos=id=>({x:(id%cols)*step,y:Math.floor(id/cols)*step});
    function nearby(p){
      const col=Math.round(p.x/step),row=Math.round(p.y/step);
      let id=-1,best=Infinity;
      for(let y=row-2;y<=row+2;y++)for(let x=col-2;x<=col+2;x++){
        if(x<0||y<0||x>=cols||y>=rows)continue;
        const k=y*cols+x,q=pos(k),d=dist(p,q);
        if(d<best&&reef.open(q)&&clear(p,q)){id=k;best=d;}
      }
      return id;
    }
    const first=nearby(start),last=nearby(end);
    if(first<0||last<0)return [];
    const parent=new Int32Array(cols*rows).fill(-1),queue=[first];parent[first]=first;
    for(let i=0;i<queue.length&&parent[last]<0;i++){
      const id=queue[i],p=pos(id);
      for(const next of [id-1,id+1,id-cols,id+cols]){
        if(next<0||next>=parent.length||parent[next]>=0)continue;
        const q=pos(next);
        if(dist(p,q)>step||!clear(p,q))continue;
        parent[next]=id;queue.push(next);
      }
    }
    if(parent[last]<0)return [];
    const path=[end];for(let id=last;id!==first;id=parent[id])path.push(pos(id));path.push(pos(first));path.reverse();
    const result=[];let origin=start;
    for(let i=0;i<path.length;i++){
      while(i+1<path.length&&clear(origin,path[i+1]))i++;
      origin=path[i];result.push(origin);
    }
    return result;
  }

  function landscape(chart,reef){
    const layer=document.createElement('canvas');layer.width=MAP_W;layer.height=MAP_H;
    const c=layer.getContext('2d');
    c.save();c.translate(0,25);c.scale(MAP_W/W,(MAP_H-25)/(H-25));c.translate(0,-25);seaBackdrop(c,false);c.restore();
    rect(c,0,0,MAP_W,25,'#a4e3cf');
    for(let x=0;x<MAP_W;x+=W){c.save();c.translate(x,0);horizon(c,x===Math.floor(chart.nodes[chart.entry].x/W)*W);c.restore();}
    // A distant ridge sits behind the reef and darkens toward the deeper pockets.
    const ridge=[[0,MAP_H]];
    for(let x=0;x<=MAP_W;x+=9)ridge.push([x,126+Math.sin(x*.051)*13+Math.sin(x*.097)*4]);
    ridge.push([MAP_W,MAP_H]);polygon(c,ridge,'#205970');
    for(let i=0;i<27;i++){const x=noise(i+55)*MAP_W;kelp(c,x,165+noise(i+2)*12,12+noise(i+13)*16,'#23586c','#286979');}
    for(let i=0;i<44;i++){const x=noise(i+15)*MAP_W,y=32+noise(i+51)*(MAP_H-45);if(!reef.solid(x,y))fish(c,x,y,.42,'#398593');}
    for(let x=0;x<MAP_W;x++){
      let depth=0;
      for(let y=25;y<MAP_H;y++){
        if(!reef.solid(x,y)){depth=0;continue;}
        depth++;
        const col=depth===1?(chart.rim||'#79b7a0'):depth<4?'#438387':!reef.solid(x,y+1)?'#426875':(chart.rockTint||'#163b51');
        rect(c,x,y,1,1,col);
        if(depth>5&&(x*31+y*17)%117<3)rect(c,x,y,2,1,'#285568');
      }
    }
    for(let x=7;x<MAP_W-3;x+=7){
      for(let y=47;y<MAP_H-1;y++){
        if(!reef.solid(x,y)||reef.solid(x,y-1)||noise(x+y)<.34)continue;
        const h=7+noise(x+5*y)*13;
        if(noise(x+y*3)>.69)coral(c,x,y+1,h/26,'#805367','#db8477');
        else kelp(c,x,y+1,h,'#235b66','#499785');
      }
    }
    return layer;
  }

  function airVent(c,p,used,clock){
    // A dark fissure in the rock stays visible after the last bubbles escape.
    const lip=p.y+4;
    polygon(c,[[p.x-9,lip],[p.x-7,lip-4],[p.x-3,lip-6],[p.x+4,lip-5],[p.x+9,lip],[p.x+5,lip+2],[p.x-6,lip+2]],'#254957');
    line(c,p.x-7,lip-3,p.x-3,lip-5,'#83aaa0');
    oval(c,p.x,lip-3,5,2,INK);oval(c,p.x,lip-4,3,1,used?'#537171':AQUA);
    if(used)return;
    for(let i=0;i<3;i++){
      const rise=(clock*8+i*5)%15;
      bubble(c,p.x+Math.sin(rise*.25+i)*2,lip-6-rise,i===1?1:2,FOAM);
    }
  }
  function create(api,round){
    const chart=generateChart(),reef=makeReef(chart),background=landscape(chart,reef);
    const {nodes,entry,beds,stations}=chart,home={x:nodes[entry].x,y:nodes[entry].y};
    const held=new Set(),surface=makeCanvas(),c=surface.getContext('2d');
    let aboard=true,boatGoal=home.x,diveQueued=false;
    let location=home,rope=null,ropePath=[],course=[],lift='';
    const dashKeys=new Set();
    let grip=null,dashing=false;
    let landedPearls=0,landedAt=-2;
    let clock=0,facing=1,feedback=null;
    const minimap=document.createElement('canvas');minimap.width=MINI.w;minimap.height=MINI.h;
    const mapInk=minimap.getContext('2d');
    rect(mapInk,0,0,MINI.w,MINI.h,'#244558');
    for(let y=0;y<MINI.h;y++)for(let x=0;x<MINI.w;x++){
      if(!reef.solid(x*MAP_W/MINI.w,y*MAP_H/MINI.h))rect(mapInk,x,y,1,1,'#568785');
    }
    function grabPoint(p){
      let start=rope,best=null,nearest=GRAB_RADIUS;
      if(!start)return null;
      for(let i=0;i<ropePath.length;i++){
        const end=ropePath[i],dx=end.x-start.x,dy=end.y-start.y;
        const t=bound(((p.x-start.x)*dx+(p.y-start.y)*dy)/(dx*dx+dy*dy||1),0,1);
        const point={x:start.x+t*dx,y:start.y+t*dy},distance=dist(p,point);
        if(distance<=nearest){
          // A generous reach through water must still stop at the face of a reef.
          const steps=Math.max(1,Math.ceil(distance));
          let clear=true;
          for(let j=1;j<=steps;j++){
            if(!reef.open({x:p.x+(point.x-p.x)*j/steps,y:p.y+(point.y-p.y)*j/steps})){clear=false;break;}
          }
          if(clear){best={point,index:i};nearest=distance;}
        }
        start=end;
      }
      return best;
    }
    function tag(text,color){feedback={text,color,until:clock+1};}
    function landed(points,pearls){
      landedAt=clock;landedPearls=pearls;
      tag('+'+points,GOLD);api.tone(850,.18);
    }
    function useRope(){
      if(round.plan>0||round.ended||lift||aboard)return;
      if(!rope){
        if(location.y<42){api.message('海中の分かれ道まで泳いで、ロープを置こう。');return;}
        const path=swimRoute(location,home,reef);
        if(!path.length){api.message('少し開けた場所にロープを置こう。');return;}
        rope={...location};ropePath=path;tag('ROPE',GOLD);api.tone(560,.1);
        api.message('ロープを設置。金色の線の近くで乗れます。');return;
      }
      const grab=grabPoint(location);
      if(!grab){api.message('金色のロープの近くまで泳ごう。');return;}
      grip=grab;lift='choose';course=[grab.point];held.clear();dashing=false;api.tone(750,.12);
      api.message('ロープをつかんだ。↑ 船へ　↓ 設置点へ');
    }
    function rideRope(toBoat){
      const along=toBoat?ropePath.slice(grip.index):[...ropePath.slice(0,grip.index).reverse(),rope];
      course=[grip.point,...along];grip=null;lift=toBoat?'up':'down';
      api.message((toBoat?'船へ移動中。':'設置点へ移動中。')+'途中で方向キーを押すと、その方向へ降ります。');
    }
    function moveCourse(budget){
      const initial=budget;
      while(course.length){
        const next=course[0],length=dist(location,next);
        if(next.x!==location.x)facing=Math.sign(next.x-location.x);
        if(length<=budget+.0001){location=course.shift();budget-=length;continue;}
        location={x:location.x+(next.x-location.x)*budget/length,y:location.y+(next.y-location.y)*budget/length};return initial;
      }
      return initial-budget;
    }
    function steer(dx,dy,dt,speed=SWIM){
      const start=location,step=dt*speed/Math.hypot(dx,dy),x=location.x+dx*step,y=location.y+dy*step;
      if(reef.open({x,y}))location={x,y};
      else if(reef.open({x,y:location.y}))location={x,y:location.y};
      else if(reef.open({x:location.x,y}))location={x:location.x,y};
      if(dx)facing=Math.sign(dx);
      return dist(start,location);
    }
    function sail(dt){
      const gap=boatGoal-home.x;
      home.x+=Math.sign(gap)*Math.min(Math.abs(gap),300*dt);
      location=home;
      if(diveQueued&&home.x===boatGoal)castOff();
    }
    function selectMouth(direction){
      const choices=chart.mouths.filter(m=>(m.x-boatGoal)*direction>1);
      if(choices.length)boatGoal=choices.reduce((a,b)=>Math.abs(a.x-boatGoal)<Math.abs(b.x-boatGoal)?a:b).x;
    }
    function castOff(){
      diveQueued=false;aboard=false;location={...home};
      steer(0,1,.06);
      api.message('船の位置を覚えておこう。真珠を拾ったら船へ！');
    }
    function detach(){
      grip=null;lift='';course=[];held.clear();api.message('ロープを離した。近くでまた乗れます。');
    }
    function stepBoat(dt){
      clock+=dt;
      if(aboard)sail(dt);
    }
    function advanceLift(dt){
      moveCourse(dt*(lift==='rescue'?32:WINCH));
      if(course.length||lift==='choose')return '';
      const destination=lift==='down'?'anchor':'boat';
      lift='';return destination;
    }
    function swim(dt,speed){
      const axis=(a,b)=>Number(held.has(a)||held.has(b));
      const dx=axis('ArrowRight','KeyD')-axis('ArrowLeft','KeyA');
      const dy=axis('ArrowDown','KeyS')-axis('ArrowUp','KeyW');
      const moved=dx||dy?steer(dx,dy,dt,speed):moveCourse(dt*speed);
      dashing=dashKeys.size>0&&moved>0;return moved;
    }
    function takeBeds(){
      const values=[];
      for(const bed of beds)if(!bed.taken&&dist(location,bed.pos)<=8){
        bed.taken=true;values.push(bed.value);
      }
      return values;
    }
    function useVent(){
      const vent=stations.find(s=>!s.used&&dist(location,s.pos)<=9);
      if(!vent)return false;
      vent.used=true;tag('AIR',AQUA);return true;
    }
    function rescue(){
      lift='rescue';course=swimRoute(location,home,reef);held.clear();dashing=false;
    }
    function camera(){
      const p=location;
      return {zoom:1,x:bound(p.x-W/2,0,MAP_W-W),y:bound(p.y-H/2,0,MAP_H-H)};
    }
    function drawSurvey(ctx){
      ctx.save();ctx.imageSmoothingEnabled=false;
      rect(ctx,0,0,480,300,'#143b48');
      const scale=432/MAP_W;
      ctx.save();ctx.translate(27,(276-MAP_H*scale)/2);ctx.scale(scale,scale);
      ctx.drawImage(background,0,0);
      const shade=ctx.createLinearGradient(0,25,0,MAP_H);
      shade.addColorStop(0,'rgba(11,40,73,0)');shade.addColorStop(1,'rgba(6,24,56,.52)');
      ctx.fillStyle=shade;ctx.fillRect(0,25,MAP_W,MAP_H-25);
      for(const mouth of chart.mouths){
        const selected=mouth.x===boatGoal;
        const x=mouth.x,y=48;
        polygon(ctx,[[x-10,y-8],[x+10,y-8],[x,y+3]],INK);
        polygon(ctx,[[x-7,y-7],[x+7,y-7],[x,y]],selected?GOLD:FOAM);
      }
      boat(ctx,home.x,home.y+Math.round(Math.sin(clock*2)*.55));
      for(let i=0;i<18;i++){
        const y=31+((noise(i+60)*(MAP_H-42)-clock*(2+i%3))%(MAP_H-42)+(MAP_H-42))%(MAP_H-42);
        const x=noise(i+77)*MAP_W+Math.sin(y*.12);
        if(!reef.solid(x,y))bubble(ctx,x,y,i%4===0?2:1,'#80c5c1');
      }
      // Keep the small overview symbols readable while their centres follow the actual reef.
      for(const b of beds){
        ctx.save();ctx.translate(b.pos.x,b.pos.y);ctx.scale(1.35,1.35);
        shell(ctx,0,0,b.value===300?4:1,true,clock);ctx.restore();
      }
      for(const s of stations){
        ctx.save();ctx.translate(s.pos.x,s.pos.y);ctx.scale(1.65,1.65);
        airVent(ctx,{x:0,y:0},false,clock);ctx.restore();
      }
      ctx.restore();
      // Marginal depth marks leave the entire playable reef visible.
      ctx.fillStyle=FOAM;ctx.textAlign='center';ctx.font='bold 12px sans-serif';
      ctx.fillText('浅',13,47);ctx.fillText('深',13,266);
      rect(ctx,17,56,1,190,'#689995');
      for(let y=56;y<=246;y+=19)rect(ctx,13,y,5,1,'#83aba2');
      ctx.textAlign='left';ctx.fillStyle=FOAM;ctx.font='bold 13px sans-serif';
      ctx.fillText(chart.name,28,14);
      rect(ctx,27,276,432,1,'#568182');
      ctx.font='bold 13px sans-serif';ctx.fillStyle=FOAM;ctx.textAlign='left';
      shell(ctx,53,290,1,true,0);ctx.fillText('100点',67,294);
      shell(ctx,150,290,4,true,0);ctx.fillText('300点',164,294);
      airVent(ctx,{x:247,y:294},false,clock);ctx.fillStyle=FOAM;ctx.fillText('泡で補給',260,294);
      ctx.textAlign='right';ctx.fillText('潜水まで '+Math.ceil(round.plan)+' 秒',458,294);
      ctx.restore();
    }
    function drawMinimap(ctx){
      const {x,y,w,h}=MINI,sx=w/MAP_W,sy=h/MAP_H;
      ctx.save();ctx.translate(x,y);
      rect(ctx,-2,-2,w+4,h+4,INK);rect(ctx,-1,-1,w+2,h+2,'#8eaba0');
      ctx.drawImage(minimap,0,0);
      for(const b of beds)if(!b.taken)rect(ctx,b.pos.x*sx-1,b.pos.y*sy,2,1,b.value===300?GOLD:'#dda09a');
      for(const vent of stations)if(!vent.used)rect(ctx,vent.pos.x*sx,vent.pos.y*sy-1,2,2,AQUA);
      if(rope){
        ctx.beginPath();ctx.moveTo(rope.x*sx,rope.y*sy);
        for(const p of ropePath)ctx.lineTo(p.x*sx,p.y*sy);
        ctx.lineWidth=1.25;ctx.strokeStyle=GOLD;ctx.stroke();
      }
      for(const mouth of chart.mouths){
        rect(ctx,mouth.x*sx-1,47*sy-1,3,2,mouth.x===boatGoal?GOLD:FOAM);
      }
      const hx=home.x*sx,hy=home.y*sy;
      polygon(ctx,[[hx-3,hy-1],[hx+3,hy-1],[hx+1,hy+2],[hx-2,hy+2]],FOAM);
      rect(ctx,hx-1,hy-3,2,2,ORANGE);
      const px=location.x*sx,py=location.y*sy;
      oval(ctx,px,py,3,3,INK);oval(ctx,px,py,2,2,'#fff6d9');rect(ctx,px,py,1,1,RUST);
      ctx.restore();
    }
    function draw(ctx){
      if(round.plan>0){drawSurvey(ctx);return;}
      const view=camera();
      c.save();c.imageSmoothingEnabled=false;c.scale(view.zoom,view.zoom);c.translate(-view.x,-view.y);c.drawImage(background,0,0);
      boat(c,home.x,home.y+(Math.sin(clock*2.2)>.55?1:0));
      const landing=clock-landedAt;
      if(landing<1.15){
        for(let i=0;i<landedPearls;i++){
          const t=bound((landing-i*.05)/.65,0,1);
          const x=home.x-9+t*(11+2*i),y=home.y-7-Math.sin(Math.PI*t)*(5+i%3);
          oval(c,x,y,2,2,INK);oval(c,x,y-1,1.5,1.5,FOAM);rect(c,x,y-2,1,1,'#ffffff');
        }
      }
      for(let i=0;i<32;i++){
        const x=noise(i+190)*MAP_W,y=30+((noise(i+130)*(MAP_H-40)-clock*(1.4+i%3))%(MAP_H-40)+(MAP_H-40))%(MAP_H-40);
        if(!reef.solid(x,y))bubble(c,x+Math.sin(y*.08),y,i%5===0?2:1,'#74b6b3');
      }
      if(rope){
        let p=rope;
        c.save();c.strokeStyle='#e4b476';c.lineWidth=1.6;c.beginPath();c.moveTo(p.x,p.y);
        for(const loc of ropePath){c.lineTo(loc.x,loc.y);}c.stroke();c.restore();
        oval(c,p.x,p.y,7,7,INK);oval(c,p.x,p.y,5,5,GOLD);oval(c,p.x,p.y,3,3,INK);
      }
      for(const bed of beds){
        const p=bed.pos;shell(c,p.x,p.y+2,bed.value===300?4:1,!bed.taken,clock);
        if(round.plan===0&&!bed.taken){rect(c,p.x-9,p.y-18,19,9,INK);c.fillStyle=FOAM;c.textAlign='center';c.font='bold 8px monospace';c.fillText(String(bed.value),p.x,p.y-11);}
      }
      for(const station of stations)airVent(c,station.pos,station.used,clock);
      if(!aboard){
        const p=location;diver(c,p.x,p.y,.51,facing,Math.sin(clock*10));
        if(p.y>32){
          const rise=(clock*8)%13;bubble(c,p.x+facing*5,p.y-5-rise,2,'#ade4d2');
          if(dashing){
            const wake=(clock*32)%8;
            bubble(c,p.x-facing*(9+wake),p.y+2-wake/3,2,AQUA);
            bubble(c,p.x-facing*(17+wake),p.y-wake/2,1,FOAM);
          }
          rect(c,p.x-11,p.y+8,22,3,INK);rect(c,p.x-10,p.y+9,20*round.air/round.capacity,1,round.air<round.warning?ORANGE:AQUA);
        }
        if(feedback&&clock<feedback.until){c.fillStyle=feedback.color;c.font='bold 10px monospace';c.textAlign='center';c.fillText(feedback.text,p.x,p.y-11);}
      }
      c.restore();paintImage(ctx,surface);drawMinimap(ctx);

    }
    api.message(chart.name+'　← → または下見図のタップで船の入口を選ぶ。'+(chart.tip||''));
    return {draw,stepBoat,advanceLift,swim,landed,takeBeds,useVent,rescue,
      onDeck:()=>aboard,onRope:()=>Boolean(lift),atBoat:()=>dist(location,home)<=9,
      wantsDash:()=>dashKeys.size>0, isDashing:()=>dashing,
      key(code,down){
      if(!down){held.delete(code);dashKeys.delete(code);return;}
      if(code==='ShiftLeft'||code==='ShiftRight'){dashKeys.add(code);return;}
      if(round.ended||lift==='rescue')return;
      const directions={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]};
      const dir=directions[code];
      if(aboard&&dir){
        if(dir[0]){selectMouth(dir[0]);return;}
        if(round.plan>0||dir[1]<0)return;
        if(home.x!==boatGoal){diveQueued=true;held.add(code);return;}
        castOff();
      }
      if(round.plan>0)return;
      if(code==='KeyB'||code==='Space'){useRope();return;}
      if(dir){
        if(lift==='choose'&&dir[1]){rideRope(dir[1]<0);return;}
        if(lift){
          detach();
          for(let i=0;i<4;i++)steer(dir[0],dir[1],1/60);
        }
        course=[];held.add(code);
      }
    },pointer(x,y,down){
      if(!down||round.ended||lift==='rescue')return;
      if(round.plan>0){
        const mapX=(x-27)*MAP_W/432;
        boatGoal=chart.mouths.reduce((a,b)=>Math.abs(a.x-mapX)<Math.abs(b.x-mapX)?a:b).x;
        return;
      }
      if(x>=MINI.x-2&&x<=MINI.x+MINI.w+2&&y>=MINI.y-2&&y<=MINI.y+MINI.h+2)return;
      const wasRiding=Boolean(lift);
      const view=camera(),p={x:x/2+view.x,y:y/2+view.y};
      if(!wasRiding&&rope&&dist(p,location)<=GRAB_RADIUS+12){
        const touch=grabPoint(p);
        if(touch&&dist(touch.point,p)<=12&&grabPoint(location)){useRope();return;}
      }
      let dest=Math.abs(p.x-home.x)<=16&&p.y>=home.y-19&&p.y<=home.y+3?home:p;
      if(!reef.open(dest)){
        const item=[...beds,...stations].find(item=>dist(item.pos,p)<12);
        if(!item)return;
        dest=item.pos;
      }
      const next=swimRoute(location,dest,reef);
      if(!next.length)return;
      if(aboard){
        if(home.x!==boatGoal){diveQueued=true;return;}
        castOff();
      }
      if(wasRiding)detach();
      held.clear();course=next;
    }};
  }
  window.PearlScene={create,cover(ctx){paintImage(ctx,coverImage());}};
})();
