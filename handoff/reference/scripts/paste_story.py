import numpy as np
from PIL import Image, ImageDraw
def paste(slug, poster_path, out):
    st=Image.open(f"final/club-stories/club-{slug}.png").convert("RGB")
    x0,y0,x1,y1=199,857,880,1763; w,h=x1-x0,y1-y0
    p=Image.open(poster_path).convert("RGB").resize((w,h),Image.LANCZOS)
    m=Image.new("L",(w*4,h*4),0); ImageDraw.Draw(m).rounded_rectangle([0,0,w*4-1,h*4-1],radius=84*4,fill=255); m=m.resize((w,h),Image.LANCZOS)
    st.paste(p,(x0,y0),m); st.save(out)
if __name__=="__main__":
    paste("psychology","final/posters-v2/poster-psychology.png","/tmp/test-psy.png")
    a=np.asarray(Image.open("/tmp/test-psy.png")).astype(int); b=np.asarray(Image.open("final/club-stories-v2/club-psychology-poster.png").convert("RGB")).astype(int)
    d=np.abs(a-b); print(d.max(), d.mean(), np.argwhere(d.max(axis=2)>30)[:3], (d.max(axis=2)>30).sum())
