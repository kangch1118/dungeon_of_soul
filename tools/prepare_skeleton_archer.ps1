$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$helper=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'prepare_import_monsters.ps1'))
$helper=$helper.Substring(0,$helper.IndexOf('$root =')).Replace('if(navy && i<24 && j<18 && c.R>105 && c.G>105 && max-min<65) bg=true;','')
Invoke-Expression $helper
$out=Join-Path $root 'image/skeleton_archer_20260914'
New-Item -ItemType Directory -Force $out|Out-Null
$source=Join-Path $out 'source.png'
if(!(Test-Path $source)){Copy-Item -LiteralPath 'C:/Users/강치원/Downloads/ChatGPT Image 2026년 9월 14일 오후 12_29_46.png' -Destination $source}
function Row($xs,$y,$w,$h){$r=@();foreach($x in $xs){$r+=,@($x,$y,$w,$h)};return ,$r}
$groups=[ordered]@{
 walk=(Row @(40,110,181,250,320,390,460,530) 388 65 94)
 idle=(Row @(631,694,748,801,857,917) 390 60 92)
 attack=(Row @(1021,1099,1179,1260,1341) 392 77 90)
 hit=(Row @(39,109,179,249,319,389) 589 65 94)
 death=@(@(489,607,59,79),@(551,607,63,79),@(615,607,59,79),@(679,607,77,79),@(764,607,91,79))
 revive=@(@(898,610,80,78),@(980,610,78,78),@(1065,610,69,78),@(1135,610,70,78),@(1212,610,70,78))
}
$manifest=[ordered]@{cellSize=256;baseline=232;animations=[ordered]@{}}
foreach($action in $groups.Keys){
 $frames=@();$i=0
 foreach($r in $groups[$action]){
  $b=[MonsterCut]::Cut($source,$r[0],$r[1],$r[2],$r[3],$true)
  $f=[MonsterCut]::Frame($b,2);$b.Dispose();$frames+=,$f;$f.Save((Join-Path $out ('{0}_{1:d2}.png' -f $action,($i+1))));$i++
 }
 [int[]]$all=0..($frames.Count-1)
 [int[]]$four=if($action -eq 'walk'){@(0,2,4,6)}elseif($action -eq 'attack'){@(0,1,3,4)}else{0..3|ForEach-Object {[int][Math]::Round($_*($frames.Count-1)/3.0)}}
 [MonsterCut]::SaveStrip([Drawing.Bitmap[]]$frames,(Join-Path $out ($action+'_strip_256.png')),$four)
 [MonsterCut]::SaveStrip([Drawing.Bitmap[]]$frames,(Join-Path $out ($action+'_strip_all_256.png')),$all)
 $manifest.animations[$action]=@{count=$frames.Count;indices=$four}
 foreach($f in $frames){$f.Dispose()}
}
$b=[MonsterCut]::Cut($source,251,797,68,28,$true);$box=[MonsterCut]::Bounds($b);$arrow=$b.Clone($box,[Drawing.Imaging.PixelFormat]::Format32bppArgb);$arrow.Save((Join-Path $out 'arrow.png'));$arrow.Dispose();$b.Dispose()
$manifest|ConvertTo-Json -Depth 5|Set-Content -Encoding UTF8 (Join-Path $out 'manifest.json')
