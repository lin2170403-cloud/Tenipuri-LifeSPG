/* One visual crop editor for avatars, headers and stamps.
   Keep coordinates in the displayed image rectangle: what the frame shows is what is saved. */
(()=>{'use strict';
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 const geometry={
  fit(imgW,imgH,stageW,stageH){
   const scale=Math.min(stageW/imgW,stageH/imgH);
   const width=imgW*scale,height=imgH*scale;
   return {x:(stageW-width)/2,y:(stageH-height)/2,width,height,scale};
  },
  initial(rect,ratio){
   const width=Math.min(rect.width*.78,rect.height*.78*ratio);
   const height=width/ratio;
   return {x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height};
  },
  move(box,dx,dy,rect){
   return {...box,x:clamp(box.x+dx,rect.x,rect.x+rect.width-box.width),
     y:clamp(box.y+dy,rect.y,rect.y+rect.height-box.height)};
  },
  resize(box,dx,dy,rect,ratio,min=40){
   const width=clamp(box.width+Math.max(dx,dy*ratio),min,
     Math.min(rect.x+rect.width-box.x,(rect.y+rect.height-box.y)*ratio));
   return {...box,width,height:width/ratio};
  },
  source(box,rect,imgW,imgH){
   return {sx:Math.round((box.x-rect.x)/rect.width*imgW),
     sy:Math.round((box.y-rect.y)/rect.height*imgH),
     sw:Math.round(box.width/rect.width*imgW),
     sh:Math.round(box.height/rect.height*imgH)};
  }
 };
 function open({file,shape='square',onSave,onCancel}={}){
  return new Promise((resolve,reject)=>{
   if(!file){reject(Error('写真を選択してください'));return}
   const ratio=shape==='header'?640/270:1;
   const circular=shape==='circle';
   const src=URL.createObjectURL(file);
   const original=new Image();
   original.onload=()=>{
    const layer=document.createElement('div');
    layer.className='hime-image-editor';
    layer.innerHTML='<section class="hime-image-editor-dialog" role="dialog" aria-modal="true" aria-label="写真の切り抜き">'
      +'<h3>写真を切り抜く</h3><p>写真の上の枠を動かして位置を決めます。右下の角を引っ張ると大きさを変えられます。</p>'
      +'<div class="hime-crop-stage"><img draggable="false" alt="選択した写真" class="hime-crop-original">'
      +'<div class="hime-crop-frame'+(circular?' circular':'')+'"><span class="hime-crop-handle" aria-label="切り抜き枠の大きさを変える"></span></div></div>'
      +'<div class="hime-image-editor-actions"><button type="button" data-crop-cancel>キャンセル</button>'
      +'<button type="button" data-crop-confirm>この範囲で保存</button></div></section>';
    document.body.appendChild(layer);
    const stage=layer.querySelector('.hime-crop-stage'),preview=layer.querySelector('.hime-crop-original');
    const frame=layer.querySelector('.hime-crop-frame'),confirm=layer.querySelector('[data-crop-confirm]');
    preview.src=src;
    const stageW=stage.getBoundingClientRect().width||Math.min(window.innerWidth-40,340),stageH=stageW;
    const rect=geometry.fit(original.naturalWidth,original.naturalHeight,stageW,stageH);
    Object.assign(preview.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
    let box=geometry.initial(rect,ratio);
    let disposed=false;
    const render=()=>Object.assign(frame.style,{left:box.x+'px',top:box.y+'px',width:box.width+'px',height:box.height+'px'});
    render();
    function done(result){
     if(disposed)return;disposed=true;layer.remove();URL.revokeObjectURL(src);resolve(result);
    }
    layer.querySelector('[data-crop-cancel]').onclick=()=>{try{onCancel?.()}catch(_){}done(null)};
    // A frame moves directly over a stationary, fully visible photograph.
    let gesture=null;
    frame.addEventListener('pointerdown',e=>{
     if(disposed)return;e.preventDefault();e.stopPropagation();
     const resize=e.target.closest('.hime-crop-handle')!==null;
     gesture={id:e.pointerId,x:e.clientX,y:e.clientY,box:{...box},resize};
     try{frame.setPointerCapture(e.pointerId)}catch(_){}
    });
    frame.addEventListener('pointermove',e=>{
     if(!gesture||e.pointerId!==gesture.id)return;e.preventDefault();
     const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
     box=gesture.resize?geometry.resize(gesture.box,dx,dy,rect,ratio):geometry.move(gesture.box,dx,dy,rect);
     render();
    });
    const stop=e=>{if(gesture&&e.pointerId===gesture.id)gesture=null};
    frame.addEventListener('pointerup',stop);
    frame.addEventListener('pointercancel',stop);
    frame.addEventListener('lostpointercapture',stop);
    confirm.onclick=async()=>{
     if(disposed)return;confirm.disabled=true;confirm.textContent='保存中…';
     try{
      const crop=geometry.source(box,rect,original.naturalWidth,original.naturalHeight);
      const canvas=document.createElement('canvas');
      canvas.width=shape==='header'?640:360;canvas.height=shape==='header'?270:360;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('画像を描画できません');
      if(circular){ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,canvas.width/2,0,Math.PI*2);ctx.clip();}
      ctx.drawImage(original,crop.sx,crop.sy,crop.sw,crop.sh,0,0,canvas.width,canvas.height);
      const encoded=canvas.toDataURL(circular?'image/png':'image/jpeg',.78);
      if(!encoded.startsWith('data:image/'))throw Error('画像の変換に失敗しました');
      await onSave(encoded);
      done({width:canvas.width,height:canvas.height});
     }catch(error){
      console.error('写真の保存に失敗:',error);
      let errorElement=layer.querySelector('.hime-crop-error');
      if(!errorElement){errorElement=document.createElement('p');errorElement.className='hime-crop-error';layer.querySelector('.hime-image-editor-dialog').appendChild(errorElement);}
      errorElement.textContent='保存できませんでした：'+(error?.message||'もう一度お試しください');
      confirm.disabled=false;confirm.textContent='この範囲で保存';
     }
    };
   };
   original.onerror=()=>{URL.revokeObjectURL(src);reject(Error('画像を開けませんでした。JPEGかPNGで試してください'))};
   original.src=src;
  });
 }
 window.HimeImageEditor={open,geometry};
})();