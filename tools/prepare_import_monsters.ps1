$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class MonsterCut {
 public static Bitmap Cut(string path,int x,int y,int w,int h,bool navy) {
  using(var src=new Bitmap(path)) {
   var dst=new Bitmap(w,h,PixelFormat.Format32bppArgb);
   for(int j=0;j<h;j++) for(int i=0;i<w;i++) {
    var c=src.GetPixel(x+i,y+j);
    int max=Math.Max(c.R,Math.Max(c.G,c.B)),min=Math.Min(c.R,Math.Min(c.G,c.B));
    bool bg=navy ? (c.B>c.R*1.20 && c.G>c.R*1.08) : (max-min<22 && min>65);
    if(navy && i<24 && j<18 && c.R>105 && c.G>105 && max-min<65) bg=true;
    if(c.A>0 && !bg) dst.SetPixel(i,j,c);
   }
   var seen=new bool[w*h];var queue=new System.Collections.Generic.Queue<int>();var component=new System.Collections.Generic.List<int>();
   for(int sy=0;sy<h;sy++)for(int sx=0;sx<w;sx++) {
    int start=sy*w+sx;if(seen[start]||dst.GetPixel(sx,sy).A==0)continue;
    component.Clear();queue.Enqueue(start);seen[start]=true;
    while(queue.Count>0){int n=queue.Dequeue();component.Add(n);int px=n%w,py=n/w;
     for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){int nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;int k=ny*w+nx;if(!seen[k]&&dst.GetPixel(nx,ny).A>0){seen[k]=true;queue.Enqueue(k);}}
    }
    if(component.Count<26)foreach(int n in component)dst.SetPixel(n%w,n/w,Color.Transparent);
   }
   return dst;
  }
 }
 public static Rectangle Bounds(Bitmap b) {
  int l=b.Width,t=b.Height,r=-1,d=-1;
  for(int y=0;y<b.Height;y++)for(int x=0;x<b.Width;x++)if(b.GetPixel(x,y).A>32){l=Math.Min(l,x);t=Math.Min(t,y);r=Math.Max(r,x);d=Math.Max(d,y);}
  if(r<0)throw new Exception("Empty sprite");
  return new Rectangle(l,t,r-l+1,d-t+1);
 }
 public static Bitmap Frame(Bitmap b,double scale) {
  var box=Bounds(b);var dst=new Bitmap(256,256,PixelFormat.Format32bppArgb);
  int w=(int)Math.Round(box.Width*scale),h=(int)Math.Round(box.Height*scale);
  if(w>240||h>224)throw new Exception("Sprite exceeds cell");
  using(var g=Graphics.FromImage(dst)) {
   g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
   g.PixelOffsetMode=System.Drawing.Drawing2D.PixelOffsetMode.Half;
   g.DrawImage(b,new Rectangle((256-w)/2,232-h,w,h),box,GraphicsUnit.Pixel);
  }
  return dst;
 }
 public static void SaveStrip(Bitmap[] frames,string path,int[] indices) {
  using(var b=new Bitmap(256*indices.Length,256,PixelFormat.Format32bppArgb)) {
   using(var g=Graphics.FromImage(b))for(int i=0;i<indices.Length;i++)g.DrawImageUnscaled(frames[indices[i]],256*i,0);
   b.Save(path,ImageFormat.Png);
  }
 }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'image/monsters_ready_20260914'
New-Item -ItemType Directory -Force $out | Out-Null
$manifest = [ordered]@{cellWidth=256;cellHeight=256;baseline=232;filter='nearest';monsters=[ordered]@{}}
function Row($xs,$y,$width,$height){ $result=@();foreach($x in $xs){$result+=,@([int]$x,[int]$y,[int]$width,[int]$height)};return ,$result }
$jobs=@(
 @{id='demon_archer';name='마족 궁수';file='KakaoTalk_20260912_230811026_05.png';navy=$true;groups=[ordered]@{
 walk=(Row @(38,147,257,365,475) 455 92 83);attack=(Row @(568,653,738,823,908) 245 74 84);attack_alt=(Row @(38,135,231,329,427) 629 84 77);special=(Row @(38,135,231,329,427) 741 84 83);hit=(Row @(564,673,781,891) 623 92 91);death=(Row @(38,171,304,437,570) 875 116 87)}}
 @{id='fallen_mace';name='타락한 철퇴병';file='KakaoTalk_20260912_230811026_06.png';navy=$true;groups=[ordered]@{
 walk=(Row @(38,147,257,365,475) 453 92 85);attack=(Row @(568,653,738,823,908) 244 74 85);attack_alt=(Row @(38,135,231,329,427) 628 84 78);hit=(Row @(564,673,781,891) 623 92 91);death=(Row @(38,171,304,437,570) 875 116 87)}}
 @{id='demon_warrior';name='마족 전사';file='KakaoTalk_20260912_230811026_07.png';navy=$true;groups=[ordered]@{
 walk=(Row @(38,135,231,329,427) 629 84 77);attack=(Row @(38,147,257,365,475) 453 92 85);hit=(Row @(551,643,736,830,921) 623 73 83);death=(Row @(38,171,304,437,570) 875 116 87)}}
 @{id='corrupt_official';name='탐관오리';file='cleaned_import_20260912/corrupt_official.png';navy=$false;groups=[ordered]@{
 walk=(Row @(25,160,293,429,563) 558 113 139);idle=(Row @(649,777,894,1007,1122) 123 105 136);attack=@(@(13,802,120,125),@(139,802,119,125),@(263,802,119,125),@(385,802,130,125),@(519,802,138,125));hit=(Row @(674,817,956,1095) 776 139 147);death=@(@(28,1020,140,148),@(170,1038,152,130),@(324,1067,158,101),@(486,1080,153,88),@(645,995,181,173))}}
 @{id='demon_slime';name='악마 슬라임';file='cleaned_import_20260912/demon_slime.png';navy=$false;groups=[ordered]@{
 walk=(Row @(14,137,264,390,514) 1090 121 109);directions=(Row @(20,232,431,643,834,1039) 575 197 158);attack=@(@(14,901,140,126),@(154,901,140,126),@(294,901,206,126),@(510,910,142,117));hit=(Row @(681,826,974,1117) 899 128 128);death=@(@(665,1090,128,120),@(790,1090,138,120),@(932,1090,130,120),@(1066,1090,134,120))}}
 @{id='succubus';name='서큐버스';file='cleaned_import_20260912/succubus.png';navy=$false;groups=[ordered]@{
 walk=(Row @(19,158,294,432,574) 566 131 152);idle=(Row @(629,756,878,998,1120) 136 113 141);attack=(Row @(606,732,861,989,1117) 368 125 144);attack_alt=(Row @(13,139,264,397,532) 816 128 135);hit=@(@(674,779,128,174),@(805,779,136,174),@(944,779,155,174),@(1103,779,141,174));death=@(@(28,1021,153,164),@(199,1044,162,141),@(382,1062,161,123),@(557,1085,185,100),@(772,1001,178,184))}}
 @{id='corrupt_official_attacks';name='탐관오리 특수공격';file='cleaned_import_20260912/corrupt_official_attacks.png';navy=$false;groups=[ordered]@{
 bag=@(@(10,141,156,167),@(185,134,179,174),@(379,127,178,181),@(571,110,255,200));charge=@(@(10,369,161,166),@(189,379,183,156),@(375,379,242,156),@(630,335,196,200));bone=(Row @(10,185,346,528,678) 587 163 158);treasure=@(@(1,838,173,137),@(177,800,214,175),@(398,800,207,175),@(608,781,246,194),@(845,788,180,187),@(1020,783,230,192));impact=@(@(830,132,177,181),@(1009,123,243,190),@(826,369,183,164),@(1010,348,243,185));portraits=(Row @(423,589,753,922,1085) 1027 162 144)}}
)
foreach($job in $jobs){
 $dir=Join-Path $out $job.id;New-Item -ItemType Directory -Force $dir | Out-Null
 $entry=[ordered]@{name=$job.name;source=$job.file;animations=[ordered]@{}}
 foreach($anim in $job.groups.Keys){
  $crops=@();$maxW=0;$maxH=0
  foreach($rect in $job.groups[$anim]){
   $b=[MonsterCut]::Cut((Join-Path $root ('image/'+$job.file)),$rect[0],$rect[1],$rect[2],$rect[3],$job.navy)
   $box=[MonsterCut]::Bounds($b);$maxW=[Math]::Max($maxW,$box.Width);$maxH=[Math]::Max($maxH,$box.Height);$crops+=,$b
  }
  $ref=[MonsterCut]::Bounds($crops[0]);$scale=[Math]::Min(176.0/$ref.Height,[Math]::Min(236.0/$maxW,220.0/$maxH))
  $frames=@();$paths=@()
  for($i=0;$i -lt $crops.Count;$i++){
   $frame=[MonsterCut]::Frame($crops[$i],$scale);$file=('{0}_{1:d2}.png' -f $anim,($i+1));$frame.Save((Join-Path $dir $file),[System.Drawing.Imaging.ImageFormat]::Png)
   $frames+=,$frame;$paths+=($job.id+'/'+$file);$crops[$i].Dispose()
  }
  [int[]]$all=0..($frames.Count-1)
  [int[]]$four=0..3|ForEach-Object {[int][Math]::Round($_*($frames.Count-1)/3.0)}
  if($job.id -eq 'demon_archer' -and $anim -eq 'attack'){$four=@(0,1,2,3)}
  [MonsterCut]::SaveStrip([System.Drawing.Bitmap[]]$frames,(Join-Path $dir ($anim+'_strip_all_256.png')),$all)
  [MonsterCut]::SaveStrip([System.Drawing.Bitmap[]]$frames,(Join-Path $dir ($anim+'_strip_256.png')),$four)
  $entry.animations[$anim]=[ordered]@{count=$frames.Count;frames=$paths;strip=($job.id+'/'+$anim+'_strip_all_256.png');compatibilityStrip=($job.id+'/'+$anim+'_strip_256.png');compatibilityIndices=$four;scale=$scale}
  foreach($frame in $frames){$frame.Dispose()}
 }
 $manifest.monsters[$job.id]=$entry
}
$manifest|ConvertTo-Json -Depth 12|Set-Content -Encoding UTF8 (Join-Path $out 'manifest.json')
$preview=[Drawing.Bitmap]::new(1024,896)
$pg=[Drawing.Graphics]::FromImage($preview)
$pg.Clear([Drawing.Color]::FromArgb(40,50,60))
$row=0
foreach($dir in (Get-ChildItem $out -Directory)){
 $strips=@(Get-ChildItem $dir.FullName -Filter '*_strip_all_256.png')
 $atlas=[Drawing.Bitmap]::new(1536,256*$strips.Count);$ag=[Drawing.Graphics]::FromImage($atlas);$ar=0
 foreach($file in $strips){$b=[Drawing.Bitmap]::new($file.FullName);$ag.DrawImageUnscaled($b,0,256*$ar);$b.Dispose();$ar++}
 $atlas.Save((Join-Path $dir.FullName 'atlas.png'));$ag.Dispose();$atlas.Dispose()
 $col=0
 foreach($file in (Get-ChildItem $dir.FullName -Filter '*_01.png')){
  $b=[Drawing.Bitmap]::new($file.FullName)
  if($b.GetPixel(0,0).A -ne 0){throw ('Non-transparent margin: '+$file.FullName)}
  $pg.DrawImage($b,$col*128,$row*128,128,128);$b.Dispose();$col++
 }
 $row++
}
$preview.Save((Join-Path $out 'preview.png'));$pg.Dispose();$preview.Dispose()
Write-Output ('Prepared '+$jobs.Count+' sheets in '+$out)
