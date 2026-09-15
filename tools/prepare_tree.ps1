$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$helper=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'prepare_import_monsters.ps1'))
Invoke-Expression ($helper.Substring(0,$helper.IndexOf('$root =')))
$out=Join-Path $root 'image/tree_monster_20260914'
New-Item -ItemType Directory -Force $out | Out-Null
$source=Join-Path $out 'source.png'
if(!(Test-Path $source)){Copy-Item -LiteralPath 'C:/Users/강치원/Downloads/ChatGPT Image 2026년 9월 14일 오후 12_08_09.png' -Destination $source}
$src=[Drawing.Bitmap]::new($source)
$groups=[ordered]@{
 walk=@(@(65,365,176,140),@(254,365,156,140),@(438,365,160,140),@(619,365,155,140),@(798,365,153,140),@(978,365,154,140),@(1158,365,153,140),@(1337,365,160,140))
 attack=@(@(27,606,166,130),@(220,606,210,130),@(450,591,273,145),@(731,606,225,130))
 hit=@(@(35,836,151,109),@(201,836,133,109),@(364,836,144,109))
 death=@(@(555,839,137,110),@(708,839,170,110),@(882,839,233,110))
}
$manifest=[ordered]@{cellSize=256;baseline=232;animations=[ordered]@{}}
foreach($action in $groups.Keys){
 $frames=@();$index=0
 foreach($r in $groups[$action]){
  $b=[Drawing.Bitmap]::new($r[2],$r[3])
  for($y=0;$y -lt $r[3];$y++){for($x=0;$x -lt $r[2];$x++){
   $c=$src.GetPixel($r[0]+$x,$r[1]+$y)
   $max=[Math]::Max($c.R,[Math]::Max($c.G,$c.B));$min=[Math]::Min($c.R,[Math]::Min($c.G,$c.B))
   if(!($max -lt 48 -and ($max-$min) -lt 17 -and $min -ge 7)){$b.SetPixel($x,$y,$c)}
  }}
  # Keep one scale across all actions; effects must not change the body size.
  $box=[MonsterCut]::Bounds($b)
  $bodyX=if($action -eq 'attack'){if($index -eq 0){85}else{90}}else{$r[2]/2}
  $frame=[Drawing.Bitmap]::new(256,256);$g=[Drawing.Graphics]::FromImage($frame)
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
  $dest=[Drawing.Rectangle]::new([int](114-($bodyX-$box.X)*.7),[int](232-$box.Height*.7),[int]($box.Width*.7),[int]($box.Height*.7))
  $g.DrawImage($b,$dest,$box,[Drawing.GraphicsUnit]::Pixel);$g.Dispose();$b.Dispose();$frames+=,$frame
  $frame.Save((Join-Path $out ('{0}_{1:d2}.png' -f $action,($index+1))));$index++
 }
 [int[]]$all=0..($frames.Count-1)
 [int[]]$four=if($action -eq 'walk'){@(0,2,4,6)}elseif($frames.Count -eq 3){@(0,1,2,2)}else{@(0,1,2,3)}
 [MonsterCut]::SaveStrip([Drawing.Bitmap[]]$frames,(Join-Path $out ($action+'_strip_256.png')),$four)
 [MonsterCut]::SaveStrip([Drawing.Bitmap[]]$frames,(Join-Path $out ($action+'_strip_all_256.png')),$all)
 $manifest.animations[$action]=@{frames=$frames.Count;compatibilityIndices=$four}
 foreach($frame in $frames){$frame.Dispose()}
}
$src.Dispose()
$manifest|ConvertTo-Json -Depth 5|Set-Content -Encoding UTF8 (Join-Path $out 'manifest.json')
