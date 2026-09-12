'use strict';

const ADV_ART = 'image/advancements_20260912/';
const ADVANCED_JOBS = [
  {id:'dragon',base:'warrior',name:'용기사',color:'#ff873e',statBonus:{hp:25,atk:5},basic:'용염 검격',passive:'세 번째 기본 공격이 화염을 폭발시킵니다.',q:'용아 돌진',qd:7,e:'용의 포효',cd:25,desc:'전방으로 용의 잔상과 브레스를 내보내 8배 피해를 줍니다.'},
  {id:'berserker',base:'warrior',name:'광전사',color:'#ff4661',statBonus:{hp:35,atk:7},basic:'혈흔 베기',passive:'체력 30% 이하에서 주는 피해가 25% 증가합니다.',q:'피의 참격',qd:6,e:'피의 축복',cd:40,desc:'체력 30% 이하에서 사용. 8초 동안 공격속도 +50%, 흡혈 5%, 혈폭발. 최대체력 20%의 보호막을 얻습니다.'},
  {id:'commander',base:'warrior',name:'기사단장',color:'#85c9ff',statBonus:{hp:30,def:8},basic:'지휘검',passive:'소환한 기사들은 독립적으로 적을 추격하고 공격합니다.',q:'집결 명령',qd:8,e:'빛의 기사단',cd:30,desc:'12초 동안 빛의 기사 3명을 소환합니다. 각 기사는 공격력 50%로 1.2초마다 공격합니다.'},
  {id:'warlock',base:'mage',name:'흑마법사',color:'#d27cff',statBonus:{atk:9,hp:15},basic:'저주 탄환',passive:'세 번째 기본 공격이 적 주변에 저주를 남깁니다.',q:'어둠의 속박',qd:7,e:'금단의 룰렛',cd:30,random:true,desc:'악마 소환 / 저주의 씨앗 / 되살린 대지 중 무작위 선택. 결과를 10초 보유하고 E를 다시 눌러 사용합니다.'},
  {id:'archmage',base:'mage',name:'대마법사',color:'#80dcff',statBonus:{atk:10},basic:'연쇄 번개',passive:'기본 공격이 주변 최대 3명의 적에게 연쇄됩니다.',q:'낙뢰',qd:6,e:'천공의 마법진',cd:20,desc:'전방에 점점 펼쳐지는 번개 마법진 3개가 각각 3배 피해를 줍니다.'},
  {id:'magician',base:'mage',name:'마술사',color:'#e1a3ff',statBonus:{atk:5,critChance:.05},basic:'관통 트럼프',passive:'공격속도가 빠른 관통 카드로 공격합니다.',q:'카드 부채',qd:6,e:'트럼프 룰렛',cd:30,random:true,desc:'에이스는 카드 폭풍과 감속, 쿨타임 2~5% 반환. 조커는 다른 전직의 궁극기를 무작위 복제. 결과는 10초 보유합니다.'},
  {id:'ninja',base:'rogue',name:'닌자',color:'#ff745f',statBonus:{atk:6,critChance:.08},basic:'그림자 칼날',passive:'세 번째 기본 공격은 추가 그림자 타격을 일으킵니다.',q:'그림자 이동',qd:7,e:'화차',cd:25,desc:'전방에 火 형태의 연속 폭격을 가합니다. 각 폭발은 2.2배 피해를 줍니다.'},
  {id:'honggildong',base:'rogue',name:'홍길동',color:'#66e8e4',statBonus:{hp:15,atk:6},basic:'쾌속 단봉',passive:'기본 공격 30% 확률로 분신이 같은 적을 추가 타격합니다.',q:'축지법',qd:6,e:'분신타격',cd:20,desc:'5초 동안 기본 공격마다 두 분신이 각각 45% 피해로 따라 공격합니다.'},
  {id:'pirate',base:'rogue',name:'해적',color:'#5cd9ed',statBonus:{atk:8,hp:15},basic:'권총과 커틀러스',passive:'가까운 적은 칼, 멀리 있는 적은 강력한 관통 권총으로 공격합니다.',q:'산탄 사격',qd:7,e:'바다의 왕',cd:30,desc:'전방으로 해적선의 해일을 보내 7배 피해와 밀치기. 4초 동안 이동속도 +50%.'},
  {id:'paladin',base:'cleric',name:'팔라딘',color:'#ffdf8d',statBonus:{hp:40,def:10},basic:'성스러운 방패',passive:'기본 공격 적중 시 보호막을 소량 회복합니다.',q:'방패 밀치기',qd:7,e:'빛의 성벽',cd:25,desc:'3초 동안 주변 일반 적의 진입을 막고 보호막 25%를 얻습니다. 종료 시 빛 파편 5배 피해와 체력 15% 회복.'},
  {id:'crusader',base:'cleric',name:'성전사',color:'#fff0ae',statBonus:{hp:25,atk:8},basic:'성광 검격',passive:'세 번째 기본 공격에 성스러운 폭발이 추가됩니다.',q:'심판 베기',qd:6,e:'빛의 검',cd:20,desc:'거대한 성검을 내리꽂아 6배 피해. 6초 동안 피해 +25%, 이동속도 +20%, 체력 15% 회복.'},
  {id:'madmonk',base:'cleric',name:'광마',color:'#ef5478',statBonus:{hp:20,atk:7},basic:'혈마권',passive:'적중·처치로 광기 중첩(최대20, 6초)이 쌓여 피해 +1%씩. 처치 시 체력 0.5% 회복. 50처치마다 체력·공격력 +2%(최대5회).',q:'파쇄권',qd:5,e:'혈계 개방',cd:25,desc:'주변에 5배 피해를 주고 광기 20중첩을 얻습니다. 8초 동안 공격속도 +35%, 흡혈 3%.'},
].map(j=>({...j,tier:1,icon:'✦',cost:{gold:150,soul:8},motion:ADV_ART+j.id+'_motion.png',iconImg:ADV_ART+j.id+'_skill.png',eSkill:{name:j.e,icon:'✦',cdMax:j.cd,desc:j.desc},qSkill:{name:j.q,cdMax:j.qd}}));

function selectedAdvancement(save=meta) {
  return ADVANCED_JOBS.find(j=>j.base===save.appearance && j.id===save.advancements?.selected?.[save.appearance]) || null;
}
