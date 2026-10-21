import sys; sys.path.insert(0,".")
from PIL import Image, ImageDraw, ImageFont
K="kit/ASO-Instagram-Kit/"; D=K+"02-highlight-covers/"
f=lambda w,s: ImageFont.truetype(f"fonts/manrope{w}.ttf",s)
NAVY=(14,26,74); RED=(214,34,43); W=2400
B=Image.new("RGB",(W,5200),(238,235,229)); d=ImageDraw.Draw(B)
d.text((100,110),"American Space Oujda",font=ImageFont.truetype("fonts/bodoni600i.ttf",110),fill=NAVY,anchor="lm")
d.text((100,215),"INSTAGRAM DESIGN KIT",font=f(700,34),fill=RED,anchor="lm")
def circ(path,size,crop=True):
    im=Image.open(path).convert("RGB")
    if crop and im.height>im.width: im=im.crop((0,im.height//2-540,im.width,im.height//2+540))
    im=im.resize((size,size),Image.LANCZOS); m=Image.new("L",(size*4,size*4),0); ImageDraw.Draw(m).ellipse([0,0,size*4-1,size*4-1],fill=255); return im,m.resize((size,size),Image.LANCZOS)
def head(t,y,sub=None):
    d.text((100,y),t.upper(),font=f(700,28),fill=NAVY,anchor="lm")
    if sub: d.text((W-100,y),sub,font=f(500,24),fill=(110,110,120),anchor="rm")
    d.line([(100,y+34),(W-100,y+34)],fill=(200,196,190),width=2)
def cap(x,y,t1,t2,w):
    d.text((x+w//2,y),t1,font=f(700,24),fill=NAVY,anchor="mm"); d.text((x+w//2,y+32),t2,font=f(500,21),fill=(95,95,105),anchor="mm")
y=330; head("Highlight covers",y,"1080 x 1920, shown as Instagram crops it")
hl=[(D+"cover-1-this-month.png","This month","Monthly calendar"),("final/cover-links-F-blush-to-ice.png","Links","Registration, useful links"),(D+"cover-3-clubs.png","Clubs","Weekly clubs"),(D+"cover-4-events.png","Events","Upcoming events"),(D+"cover-5-classes.png","Classes","English classes"),(D+"cover-6-visit.png","Visit us","Location, hours, contact"),(D+"cover-7-recaps.png","Recaps","Event photos, videos")]
cs=270; gp=(W-200-cs)//6
for i,(p,a,b) in enumerate(hl):
    im,m=circ(p,cs); x=100+i*gp; B.paste(im,(x,y+80),m); cap(x+cs//2-cs//2,y+80+cs+40,a,b,cs)
y=y+80+cs+190; head("Stories",y,"1080 x 1920")
st=[("final/club-stories-v2/club-psychology-poster.png","Club story","poster and WhatsApp link"),("final/club-stories-v2/club-sports-poster.png","Club story","poster variant"),("final/bilingual-stories/bi-1-visit-map.png","Visit us","English and Arabic"),("final/bilingual-stories/ar-3-join-the-space.png","Join the space","Arabic"),(K+"06-visit-us-stories/visit-2.png","Library hours","opening times"),(K+"11-month-stories/10-october-2026.png","Month calendar","clubs and events"),("final/bilingual-stories/bi-6-weekly-schedule.png","English classes","weekly schedule")]
sw=290; sh_=round(sw*16/9); gp=(W-200-7*sw)//6
for i,(p,a,b) in enumerate(st):
    im=Image.open(p).convert("RGB").resize((sw,sh_),Image.LANCZOS); mk=Image.new("L",(sw,sh_),0); ImageDraw.Draw(mk).rounded_rectangle([0,0,sw-1,sh_-1],radius=26,fill=255)
    x=100+i*(sw+gp); B.paste(im,(x,y+80),mk); cap(x,y+80+sh_+36,a,b,sw)
y=y+80+sh_+190; head("WhatsApp group covers",y,"1080 x 1080, WhatsApp crops them to a circle")
tpl,m=circ("final/whatsapp-template.png",330,False); B.paste(tpl,(100,y+80),m); cap(100,y+80+330+40,"Template","icon, kicker, club name",330)
cv=[("cover-discover-africa","Discover Africa"),("cover-english-reading","English Reading"),("cover-movie-discussion","Movie Discussion"),("cover-philo-physics","Philo Physics"),("cover-psychology","Psychology"),("cover-public-speaking","Public Speaking"),("cover-sports","Sports")]
cs2=210; x0=100+330+90; gp=(W-100-x0-cs2)//6
for i,(p,n) in enumerate(cv):
    im,m=circ(f"final/club-covers/{p}.png",cs2,False); x=x0+i*gp; B.paste(im,(x,y+80+60),m); d.text((x+cs2//2,y+80+60+cs2+34),n,font=f(700,22),fill=NAVY,anchor="mm")
y=y+80+330+190; head("Poster frame templates",y,"1080 x 1440, transparent PNG: waves, footer and logo")
fw_=225; fh=round(fw_*1440/1080); G=(W-200-60-8*fw_)//7
for k,bgc,lab,off in (("light",(236,231,221),"Light",0),("dark",(34,38,56),"Dark",4)):
    for i in range(1,5):
        base=Image.alpha_composite(Image.new("RGBA",(1080,1440),bgc+(255,)),Image.open(f"final/generic/ASO-frame-{k}-{i}.png")).convert("RGB").resize((fw_,fh),Image.LANCZOS)
        x=100+(off+i-1)*(fw_+G)+(60 if off else 0)-(0); B.paste(base,(x,y+80)); d.text((x+fw_//2,y+80+fh+30),f"{lab} frame {i}",font=f(700,22),fill=NAVY,anchor="mm")
d.text((100,y+80+fh+85),"Light frames suit pale posters (coloured crest). Dark frames suit dark or photographic posters (white-filled crest). Each frame has a different corner effect.",font=f(500,22),fill=(95,95,105),anchor="lm")
y=y+80+fh+190; head("Posters",y,"1080 x 1440"); order=["psychology","sports","movie-discussion","discover-africa","philo-physics","public-speaking"]
pw=340; ph=round(pw*4/3); gp=(W-200-6*pw)//5
for i,n in enumerate(order): B.paste(Image.open(f"final/posters-v2/poster-{n}.png").convert("RGB").resize((pw,ph),Image.LANCZOS),(100+i*(pw+gp),y+80))
B=B.crop((0,0,W,y+80+ph+90)); B.save("final/director/2-kit-overview.png"); print(B.size)
