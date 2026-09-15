$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$helper=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'prepare_import_monsters.ps1'))
$helper=$helper.Substring(0,$helper.IndexOf('$root =')).Replace('if(navy && i<24 && j<18 && c.R>105 && c.G>105 && max-min<65) bg=true;','')
$helper=$helper.Replace('(c.B>c.R*1.20 && c.G>c.R*1.08)','((c.B>c.R*1.20 && c.G>c.R*1.08) || (max<55 && max-min<25 && min>8))')
Invoke-Expression $helper
$out=Join-Path $root 'image/poison_slime_20260914'
New-Item -ItemType Directory -Force $out|Out-Null
$source=Join-Path $root 'image/KakaoTalk_20260912_230811026_08.png'
function Row($xs,$y,$w,$h){$r=@();foreach($x in $xs){$r+=,@($x,$y,$w,$h)};return ,$r}
$groups=[ordered]@{
 walk=(Row @(20,142,257,377,505) 933 110 87)
 attack=(Row @(39,168,295,515) 782 114 101)
 hit=(Row @(667,812,973,1115) 778 118 105)
 death=(Row @(668,811,957,1111) 921 120 103)
 puddle=@(@(20,1090,88,85),@(115,1090,126,85),@(247,1090,132,85),@(385,1090,124,85),@(514,1090,131,85),@(662,1073,140,116),@(803,1073,140,116))
}
$manifest=[ordered]@{cellSize=256;baseline=232;animations=[ordered]@{}}
foreach($action in $groups.Keys){
 $frames=@();$i=0
 foreach($r in $groups[$action]){
  $b=[MonsterCut]::Cut($source,$r[0],$r[1],$r[2],$r[3],$true)
  $scale=if($action -eq 'puddle'){1.6}else{1.8}
  $f=[MonsterCut]::Frame($b,$scale);$b.Dispose();$frames+=,$f;$f.Save((Join-Path $out ('{0}_{1:d2}.png' -f $action,($i+1))));$i++
 }
 [int[]]$all=0..($frames.Count-1)
 [int[]]$four=if($action -eq 'puddle'){@(1,3,5,6)}elseif($action -eq 'walk'){@(0,1,3,4)}else{@(0,1,2,3)}
 [MonsterCut]::SaveStrip([Drawing.Bitmap[]]$frames,(Join-Path $out ($action+'_strip_256.png')),$four)
 [MonsterCut]::SaveStrip([Drawing.Bitmap[]]$frames,(Join-Path $out ($action+'_strip_all_256.png')),$all)
 $manifest.animations[$action]=@{count=$frames.Count;indices=$four}
 foreach($f in $frames){$f.Dispose()}
}
# Tight puddle image for the ground renderer, with no sprite-cell padding.
$b=[MonsterCut]::Cut($source,662,1073,140,116,$true);$box=[MonsterCut]::Bounds($b);$puddle=$b.Clone($box,[Drawing.Imaging.PixelFormat]::Format32bppArgb);$puddle.Save((Join-Path $out 'puddle.png'));$puddle.Dispose();$b.Dispose()
$manifest|ConvertTo-Json -Depth 5|Set-Content -Encoding UTF8 (Join-Path $out 'manifest.json')
