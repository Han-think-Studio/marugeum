import type { EventDef } from '../core/types';

// 마루금 이벤트. 도착했을 때(arrive)와 밤을 보낼 때(night) 일어난다.
// 새 이야기를 더하려면 이 배열에 항목을 하나 추가하면 된다.
// outcomes 는 위에서부터 chance 를 굴리고, chance 가 없는 마지막 항목이 기본 결과다.

export const EVENTS: EventDef[] = [
  // ---------- 산사 ----------
  {
    id: 'temple_monk',
    trigger: 'arrive',
    title: '남은 사람',
    text: '법당 문이 열려 있다. 늙은 승려가 촛불 하나를 켜 두고 앉아 있다. 그는 놀라지 않는다. "올 줄 알았소. 남쪽에서 오는 사람은 다 이 길로 오니까."',
    once: true,
    weight: 3,
    when: { kinds: ['temple'] },
    choices: [
      {
        text: '공양을 청한다',
        hint: '먹을 것 · 정신',
        outcomes: [{ text: '미역국과 찬밥. 뜨거운 것을 넘긴 게 며칠 만인지 모르겠다. 승려는 말없이 한 그릇을 더 담아 준다.', effects: { hunger: 35, thirst: 20, mind: 8, hours: 1 } }],
      },
      {
        text: '북쪽 길을 묻는다',
        hint: '정보',
        outcomes: [{ text: '"능선을 벗어나지 마시오. 비 오는 날은 걷지 말고. 향로봉 아래 군인들이 있다는 말은 나도 들었소. 거기까지 가는 사람을 보지는 못했지만."', effects: { mind: 5, flag: 'monk_advice' } }],
      },
      {
        text: '하룻밤 묵게 해 달라 한다',
        hint: '8시간 · 회복',
        outcomes: [{ text: '요사채 아랫목이 미지근했다. 새벽 예불 소리에 깼다. 승려는 떠나는 등에 대고 아무 말도 하지 않았다.', effects: { fatigue: 45, temp: 25, mind: 10, hours: 8 } }],
      },
    ],
  },
  {
    id: 'temple_bell',
    trigger: 'arrive',
    title: '범종',
    text: '종각의 범종이 멀쩡하다. 당목에 손을 대자 차가운 쇠의 감촉이 올라온다. 치면 골짜기 전체에 울릴 것이다.',
    when: { kinds: ['temple'] },
    choices: [
      {
        text: '친다',
        hint: '정신 · 위험',
        outcomes: [
          { chance: 0.3, text: '종소리가 산을 건너갔다. 한참 뒤 멀리서 대답하듯 총성 두 발이 울렸다. 누군가 듣고 있다.', effects: { mind: 4, flag: 'bell_rung' } },
          { text: '종소리가 골짜기를 채우고 천천히 사라졌다. 세상에 아직 소리가 있다는 게 이상하게 위로가 됐다.', effects: { mind: 12, flag: 'bell_rung' } },
        ],
      },
      { text: '손을 뗀다', outcomes: [{ text: '종은 그대로 두었다. 산은 조용한 편이 낫다.' }] },
    ],
  },

  // ---------- 대피소 ----------
  {
    id: 'shelter_journal',
    trigger: 'arrive',
    title: '산장지기의 일지',
    text: '책상 위에 일지가 펼쳐져 있다. 마지막 장의 글씨가 흔들린다. "라디오가 끊겼다. 동쪽 비는 받지 말 것. 북쪽 대피소에 물탱크가 있다고 들었다. 내려가 본다."',
    once: true,
    when: { kinds: ['shelter'] },
    choices: [
      { text: '일지를 끝까지 읽는다', hint: '1시간 · 정보', outcomes: [{ text: '날짜별 바람 방향이 적혀 있다. 동풍이 사흘 이상 가면 동쪽 사면은 비우라고 했다. 그의 글씨를 따라 머릿속에 지도를 그렸다.', effects: { mind: 5, hours: 1, flag: 'journal_read' } }] },
      { text: '선반을 뒤진다', hint: '1시간', outcomes: [
        { chance: 0.5, text: '일지 밑 서랍에 건전지와 사탕 한 봉지. 사탕은 배낭에 넣었다.', effects: { food: 1, hours: 1 } },
        { text: '서랍은 비어 있었다. 그가 다 챙겨 간 모양이다.', effects: { hours: 1 } },
      ] },
    ],
  },
  {
    id: 'shelter_survivor',
    trigger: 'arrive',
    title: '먼저 온 사람',
    text: '난로 앞에 남자 하나가 앉아 있다. 삼십 대쯤, 군복 바지에 등산 재킷. 그는 손을 들어 보이고 다시 불을 들여다본다. "자리는 많아요."',
    when: { kinds: ['shelter'] },
    choices: [
      {
        text: '먹을 것을 나눈다',
        hint: '먹을 것 1',
        req: { food: 1 },
        outcomes: [
          { chance: 0.5, text: '그는 한참을 말없이 먹더니 주머니에서 알약 통을 꺼냈다. "요오드예요. 반은 드릴게요." 입안이 쓰다.', effects: { food: -1, mind: 8, rad: -12 } },
          { text: '그는 고맙다는 말 대신 북쪽 능선 이야기를 해 줬다. 어디서 물이 나고 어디가 무너졌는지.', effects: { food: -1, mind: 8, flag: 'survivor_tips' } },
        ],
      },
      { text: '거리를 두고 쉰다', outcomes: [{ text: '서로 등을 보이지 않은 채 밤을 보냈다. 아침에 그는 먼저 떠나 있었다.', effects: { mind: -3 } }] },
      {
        text: '나가라고 한다',
        hint: '위험',
        outcomes: [
          { chance: 0.3, text: '그가 일어섰다. 짧고 지저분한 몸싸움. 그는 코피를 흘리며 나갔고 나는 갈비뼈가 아프다.', effects: { hp: -15, mind: -8 } },
          { text: '그는 나를 오래 쳐다보더니 배낭을 챙겨 나갔다. 문이 닫히고 난로 소리만 남았다.', effects: { mind: -8 } },
        ],
      },
    ],
  },
  {
    id: 'shelter_body',
    trigger: 'arrive',
    title: '침상 위',
    text: '이층 침상에 누군가 누워 있다. 가까이 가지 않아도 안다. 머리맡에 배낭이 있다.',
    when: { kinds: ['shelter'] },
    choices: [
      { text: '배낭을 뒤진다', hint: '물건 · 정신', outcomes: [
        { chance: 0.6, text: '통조림 두 개와 물 한 병. 미안하다고 중얼거리며 챙겼다. 그 사람은 대답하지 않았다.', effects: { food: 2, water: 1, mind: -6 } },
        { text: '배낭은 비어 있었다. 이미 누군가 다녀간 것이다. 그래도 손이 떨렸다.', effects: { mind: -6 } },
      ] },
      { text: '이불을 덮어 주고 나온다', outcomes: [{ text: '얼굴까지 덮어 주었다. 할 수 있는 건 그것뿐이었다.', effects: { mind: 3 } }] },
    ],
  },

  // ---------- 폐마을 ----------
  {
    id: 'village_family',
    trigger: 'arrive',
    title: '피난민 가족',
    text: '헛간 안에 세 사람이 웅크리고 있다. 남자와 여자, 그리고 일곱 살쯤 된 아이. 남자가 몸으로 아이를 가리며 말한다. "우리는 아무것도 없어요."',
    when: { kinds: ['village'] },
    choices: [
      { text: '먹을 것을 건넨다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '아이가 먼저 손을 내밀다가 아버지를 봤다. 아버지가 고개를 끄덕였다. 여자는 울지 않으려고 입을 꽉 다물고 있었다.', effects: { food: -1, mind: 10 } }] },
      { text: '못 본 척 지나간다', outcomes: [{ text: '등 뒤에서 아이가 뭐라고 물었고 남자가 "쉿" 했다. 그 소리가 한참을 따라왔다.', effects: { mind: -8 } }] },
      { text: '북쪽 소식을 묻는다', outcomes: [{ text: '"향로봉에 군인들이 있대요. 헬기도 봤다는 사람이 있고. 우리는 거기까지 못 가요. 아이가." 남자는 말을 끝내지 않았다.', effects: { mind: 2, flag: 'heard_haero' } }] },
    ],
  },
  {
    id: 'village_radio',
    trigger: 'arrive',
    title: '라디오',
    text: '빈집 안방에서 지직거리는 소리가 난다. 건전지 라디오가 켜진 채 방치되어 있다. 누군가 주파수를 맞춰 두고 떠났다.',
    once: true,
    weight: 2,
    when: { kinds: ['village'] },
    choices: [
      { text: '귀를 기울인다', hint: '1시간', outcomes: [{ text: '"...동해안 전역 접근 금지... 국군과 연합군은 향로봉 일대에 임시 수용소를... 남하하는 북한군 잔존 병력은... 반복합니다..." 방송은 같은 말을 되풀이하다 끊겼다. 거기 사람이 있다.', effects: { mind: 8, hours: 1, flag: 'radio_heard' } }] },
      { text: '라디오를 챙긴다', outcomes: [{ text: '건전지가 거의 다 됐다. 그래도 가방에 넣었다. 밤에 소리라도 들릴지 모른다.', effects: { mind: 3 } }] },
    ],
  },
  {
    id: 'village_well',
    trigger: 'arrive',
    title: '우물',
    text: '우물 뚜껑을 열자 냄새가 올라온다. 두레박을 내리기도 전에 안다. 누가 저 안에 있다.',
    when: { kinds: ['village'] },
    choices: [
      { text: '그래도 긷는다', hint: '물 2 · 피폭', outcomes: [{ text: '눈을 감고 두 통을 길었다. 이 물을 마실 날이 안 오기를.', effects: { dirty: 2, rad: 3, mind: -6 } }] },
      { text: '뚜껑을 닫는다', outcomes: [{ text: '뚜껑 위에 돌을 올려 두었다. 이 마을 물은 끝났다.', effects: { poisonWell: true, mind: -3 } }] },
    ],
  },
  {
    id: 'village_graves',
    trigger: 'arrive',
    title: '뒷산의 무덤',
    text: '마을 뒤 비탈에 새 무덤이 여섯. 나무 팻말에 이름이 적혀 있다. 마지막 팻말에는 이름 대신 "나는 묻어 줄 사람이 없다"고 쓰여 있다.',
    when: { kinds: ['village'] },
    choices: [
      { text: '잠시 선다', hint: '1시간', outcomes: [{ text: '여섯 개의 이름을 소리 내어 읽었다. 누군가는 읽어야 할 것 같았다.', effects: { mind: 4, hours: 1 } }] },
      { text: '지나친다', outcomes: [{ text: '돌아보지 않았다. 돌아보면 거기 눕고 싶어질 것 같았다.', effects: { mind: -3 } }] },
    ],
  },

  // ---------- 군 시설 ----------
  {
    id: 'military_deserter',
    trigger: 'arrive',
    title: '총',
    text: '철문 뒤에서 소총이 먼저 나온다. 군복은 더럽고 눈은 더 더럽다. "먹을 거 내놔. 천천히."',
    weight: 2,
    when: { kinds: ['military'] },
    choices: [
      { text: '먹을 것을 준다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '그는 받자마자 봉지를 뜯어 입에 넣었다. 총구는 끝까지 내려가지 않았다. "꺼져. 북쪽은 다 죽었어."', effects: { food: -1, mind: -3 } }] },
      { text: '없다고 한다', hint: '위험', outcomes: [
        { chance: 0.5, text: '그는 배낭을 뒤집어 보더니 침을 뱉고 돌아섰다. 거짓말이 통했는지, 그냥 지쳤는지 모르겠다.', effects: { mind: -2 } },
        { text: '개머리판이 날아왔다. 정신을 차렸을 때 배낭의 먹을 것은 전부 사라져 있었다.', effects: { hp: -20, foodAll: true, mind: -10 } },
      ] },
      { text: '달아난다', hint: '2시간 · 위험', outcomes: [
        { chance: 0.3, text: '등 뒤에서 총성. 허벅지가 뜨겁다. 스친 것뿐이지만 한참을 절뚝거렸다.', effects: { hp: -15, fatigue: -15, hours: 2 } },
        { text: '비탈을 굴러 내려왔다. 그는 쫓아오지 않았다. 총알이 아까웠을 것이다.', effects: { fatigue: -15, hours: 2 } },
      ] },
    ],
  },
  {
    id: 'military_medkit',
    trigger: 'arrive',
    title: '구급상자',
    text: '벙커 벽에 구급상자가 걸려 있다. 자물쇠는 이미 누군가 부쉈지만 안에 약병이 몇 개 굴러다닌다. 라벨에 "요오드화칼륨"이라고 적혀 있다.',
    once: true,
    weight: 2,
    when: { kinds: ['military'] },
    choices: [
      { text: '지금 먹는다', hint: '피폭 감소', outcomes: [{ text: '두 알을 삼켰다. 효과가 있는지는 모르겠지만 적어도 무언가를 했다는 기분은 든다.', effects: { rad: -20, mind: 3 } }] },
      { text: '상자를 더 뒤진다', hint: '1시간', outcomes: [
        { chance: 0.5, text: '붕대와 소독약. 발뒤꿈치 물집과 손등의 상처를 제대로 손봤다. 요오드도 먹었다.', effects: { rad: -20, hp: 15, hours: 1 } },
        { text: '나머지는 빈 병뿐이었다. 요오드만 챙겨 먹었다.', effects: { rad: -20, hours: 1 } },
      ] },
    ],
  },
  {
    id: 'military_mines',
    trigger: 'arrive',
    title: '지뢰 표지판',
    text: '철책 너머에 보급 창고가 보인다. 철책에는 붉은 역삼각형 표지판. "지뢰". 창고 문은 열려 있고 상자들이 보인다.',
    when: { kinds: ['military'] },
    choices: [
      { text: '철책을 넘는다', hint: '물건 · 큰 위험', outcomes: [
        { chance: 0.7, text: '한 걸음씩, 앞사람 발자국을 밟듯이. 창고에는 전투식량과 생수가 남아 있었다.', effects: { food: 2, water: 1, mind: -4 } },
        { text: '발밑에서 딸깍. 몸이 떴다. 정신이 들었을 때 왼쪽 다리가 내 것 같지 않았다.', effects: { hp: -40, fatigue: -30, mind: -15 } },
      ] },
      { text: '돌아선다', outcomes: [{ text: '상자 속에 뭐가 있든 다리보다 비싸지는 않다.', effects: {} }] },
    ],
  },

  // ---------- 계곡 ----------
  {
    id: 'valley_boar',
    trigger: 'arrive',
    title: '멧돼지',
    text: '덤불이 갈라지며 멧돼지가 나온다. 어깨가 허리까지 온다. 녀석도 굶었다. 콧김이 보인다.',
    weight: 2,
    when: { kinds: ['valley'] },
    choices: [
      { text: '나무 위로 피한다', hint: '1시간 · 피로', outcomes: [{ text: '한 시간을 가지 위에서 버텼다. 녀석은 밑동을 들이받다가 흥미를 잃고 갔다.', effects: { fatigue: -10, hours: 1 } }] },
      { text: '불을 들이댄다', hint: '땔감 1', req: { wood: 1 }, outcomes: [{ text: '마른 가지에 불을 붙여 휘둘렀다. 녀석은 뒷걸음질 치다가 사라졌다. 심장이 한참을 뛰었다.', effects: { wood: -1, mind: 2 } }] },
      { text: '맞선다', hint: '고기 · 큰 위험', outcomes: [
        { chance: 0.4, text: '돌로 머리를 쳤다. 몇 번인지 모른다. 피비린내 속에서 고기를 발랐다. 오늘은 먹는다.', effects: { food: 3, hp: -8, mind: -4 } },
        { text: '엄니가 허벅지를 찢었다. 녀석이 돌아서 가는 걸 보며 지혈만 했다.', effects: { hp: -25, mind: -8 } },
      ] },
    ],
  },
  {
    id: 'valley_bodies',
    trigger: 'arrive',
    title: '떠내려온 것',
    text: '계곡 바위 틈에 걸린 것들. 구명조끼, 가방, 그리고 그것을 입고 메고 있던 사람들. 바다에서 여기까지 올라왔을 리 없다. 상류에서 내려온 것이다.',
    when: { kinds: ['valley'] },
    choices: [
      { text: '가방을 건진다', hint: '물건 · 피폭', outcomes: [
        { chance: 0.5, text: '젖은 가방 안에 밀봉된 과자와 물병. 손을 씻고 또 씻었다.', effects: { food: 1, water: 1, rad: 3, mind: -5 } },
        { text: '가방 안은 옷가지와 사진뿐이었다. 사진은 돌려놓았다.', effects: { rad: 3, mind: -5 } },
      ] },
      { text: '상류 쪽을 보지 않고 지나간다', outcomes: [{ text: '물소리만 들으며 걸었다. 물소리가 이렇게 시끄러운 줄 몰랐다.', effects: { mind: -4 } }] },
    ],
  },
  {
    id: 'valley_bridge',
    trigger: 'arrive',
    title: '끊어진 다리',
    text: '출렁다리가 중간에서 끊겨 있다. 아래 물살이 세다. 바위를 디디면 건널 수 있을 것 같기도 하다.',
    when: { kinds: ['valley'] },
    choices: [
      { text: '바위를 디뎌 건넌다', hint: '위험', outcomes: [
        { chance: 0.6, text: '세 번째 바위에서 미끄러질 뻔했지만 건넜다. 신발만 젖었다.', effects: { temp: -5 } },
        { text: '물에 빠졌다. 바위를 붙잡고 기어 나왔지만 온몸이 젖고 배낭 속까지 물이 들어갔다.', effects: { hp: -10, temp: -25, rad: 4, fatigue: -15 } },
      ] },
      { text: '상류로 돌아간다', hint: '3시간', outcomes: [{ text: '물이 얕은 곳을 찾아 세 시간을 더 걸었다. 다리는 멀쩡했다.', effects: { hours: 3, fatigue: -8 } }] },
    ],
  },

  // ---------- 약수터 ----------
  {
    id: 'spring_note',
    trigger: 'arrive',
    title: '쪽지',
    text: '약수터 돌에 비닐로 싼 쪽지가 눌려 있다. "이 물은 괜찮다. 10월 12일. 북쪽 고개는 군인이 막고 있다. 밤에 돌아가라."',
    when: { kinds: ['spring'] },
    choices: [
      { text: '쪽지 밑에 한 줄 보탠다', hint: '정신', outcomes: [{ text: '날짜와 이름을 적었다. 누군가 읽는다면 나도 여기 있었다는 뜻이다.', effects: { mind: 5, flag: 'note_left' } }] },
      { text: '쪽지를 도로 눌러 둔다', outcomes: [{ text: '다음 사람에게도 필요할 것이다.', effects: { mind: 2 } }] },
    ],
  },
  {
    id: 'spring_snake',
    trigger: 'arrive',
    title: '뱀',
    text: '물가 바위 위에 살모사가 몸을 말고 있다. 햇볕을 쬐는 중이다. 물을 뜨려면 저 바위를 지나야 한다.',
    when: { kinds: ['spring'] },
    choices: [
      { text: '기다렸다가 돌아간다', hint: '1시간', outcomes: [{ text: '한 시간 뒤 뱀은 사라졌다. 바위 위에 허물만 남아 있었다.', effects: { hours: 1 } }] },
      { text: '막대로 잡는다', hint: '먹을 것 · 위험', outcomes: [
        { chance: 0.5, text: '목을 눌러 잡았다. 껍질을 벗기니 생각보다 살이 많다.', effects: { food: 1, mind: 2 } },
        { text: '놓쳤다. 손등에 이빨 자국 두 개. 입으로 빨아내고 천으로 묶었다. 팔이 붓는다.', effects: { hp: -15, mind: -5 } },
      ] },
    ],
  },

  // ---------- 봉우리 ----------
  {
    id: 'peak_view',
    trigger: 'arrive',
    title: '동쪽',
    text: '구름이 걷히고 동쪽이 열린다. 바다가 보인다. 바다 위에 검은 띠가 떠 있고 해안선을 따라 연기가 몇 줄 올라온다. 저기가 집이었던 사람들이 있다.',
    when: { kinds: ['peak'], weather: ['clear'] },
    choices: [
      { text: '오래 본다', hint: '1시간', outcomes: [{ text: '연기가 몇 줄인지 셌다. 세는 동안 하나가 꺼졌다.', effects: { mind: -4, hours: 1, flag: 'saw_sea' } }] },
      { text: '등을 돌린다', outcomes: [{ text: '북쪽만 보기로 했다. 북쪽에는 아직 연기가 없다.', effects: { mind: -2 } }] },
    ],
  },
  {
    id: 'peak_heli',
    trigger: 'arrive',
    title: '헬리콥터',
    text: '북쪽에서 로터 소리. 능선을 따라 헬리콥터 한 대가 낮게 날아온다. 국군 마크다. 문이 열려 있고 누군가 아래를 살핀다.',
    once: true,
    weight: 2,
    when: { kinds: ['peak', 'pass'], minDay: 3 },
    choices: [
      { text: '팔을 흔든다', outcomes: [
        { chance: 0.35, text: '헬기가 한 바퀴 돌더니 상자 하나를 떨어뜨리고 북쪽으로 갔다. 생수와 전투식량. 그리고 "향로봉으로"라고 쓰인 종이.', effects: { food: 2, water: 2, mind: 12, flag: 'heli_drop' } },
        { text: '헬기는 고도를 낮추지 않았다. 그래도 누군가 손을 흔든 것 같았다. 북쪽에 사람이 있다.', effects: { mind: 8, flag: 'heli_seen' } },
      ] },
      { text: '바위 뒤에 숨는다', outcomes: [{ text: '누구 편인지 알 수 없었다. 소리가 사라질 때까지 숨을 죽였다. 지나가고 나서야 마크를 떠올렸다.', effects: { mind: -2 } }] },
    ],
  },
  {
    id: 'peak_lights',
    trigger: 'arrive',
    title: '북쪽의 불빛',
    text: '밤의 능선. 북쪽 멀리, 산 하나 너머에 불빛이 줄지어 있다. 흔들리지 않는 불빛. 전기가 있는 곳이다.',
    once: true,
    when: { kinds: ['peak'], night: true },
    choices: [
      { text: '불빛을 세어 본다', outcomes: [{ text: '열둘. 아니 열셋. 바람에 눈물이 났을 뿐이다.', effects: { mind: 10, flag: 'saw_lights' } }] },
      { text: '눕는다', outcomes: [{ text: '불빛을 등지고 누웠다. 내일도 저기 있을 것이다.', effects: { mind: 4 } }] },
    ],
  },

  // ---------- 고개 ----------
  {
    id: 'pass_checkpoint',
    trigger: 'arrive',
    title: '검문소',
    text: '고갯길에 검문소 잔해. 바리케이드 뒤로 버려진 차들이 줄지어 서 있다. 문은 열려 있고 열쇠는 꽂혀 있다. 기름은 한 방울도 없다.',
    when: { kinds: ['pass'] },
    choices: [
      { text: '차 안을 뒤진다', hint: '1시간 · 물건', outcomes: [
        { chance: 0.6, text: '트렁크에서 생수 묶음과 과자. 뒷좌석의 아기 의자는 보지 않기로 했다.', effects: { water: 2, food: 1, rad: 2, hours: 1 } },
        { text: '전부 털린 뒤였다. 유리 조각만 신발에 밟혔다.', effects: { rad: 2, hours: 1 } },
      ] },
      { text: '지나간다', outcomes: [{ text: '차는 쓸모없다. 길도 끊겼고 기름도 없다. 발만 믿는다.', effects: {} }] },
    ],
  },
  {
    id: 'pass_fallen',
    trigger: 'arrive',
    title: '쓰러진 사람',
    text: '고갯마루에 사람이 누워 있다. 아직 숨을 쉰다. 입술이 갈라져 피가 났다. 그는 눈만 움직여 나를 본다.',
    when: { kinds: ['pass'] },
    choices: [
      { text: '물을 준다', hint: '물 1', req: { water: 1 }, outcomes: [{ text: '물을 넘기고 그는 한참 뒤에 말했다. "동쪽으로 가지 마요." 그리고 눈을 감았다. 자는 것이기를.', effects: { water: -1, mind: 8 } }] },
      { text: '지나친다', outcomes: [{ text: '내게도 물이 모자란다고 되뇌며 걸었다. 열 걸음쯤 가서 뛰었다.', effects: { mind: -7 } }] },
    ],
  },

  // ---------- 비 ----------
  {
    id: 'rain_fallout',
    trigger: 'arrive',
    title: '검은 비',
    text: '도착하자마자 비가 거세진다. 빗방울이 이상하게 미끈하고 바위 위에 회색 자국을 남긴다. 바다를 지나온 비다.',
    when: { kinds: ['peak', 'pass', 'valley', 'spring'], weather: ['rain'] },
    choices: [
      { text: '바위 밑에서 기다린다', hint: '2시간', outcomes: [{ text: '바위 틈에 몸을 구겨 넣고 두 시간을 버텼다. 비는 그치지 않았지만 몸은 덜 젖었다.', effects: { hours: 2, rad: 1, temp: -5 } }] },
      { text: '그냥 맞으며 할 일을 한다', outcomes: [{ text: '비를 맞으며 움직였다. 옷이 몸에 달라붙고 머리카락에서 쓴물이 흘렀다.', effects: { rad: 6, temp: -8 } }] },
    ],
  },

  // ---------- 밤 ----------
  {
    id: 'night_dogs',
    trigger: 'night',
    title: '들개',
    text: '잠결에 눈을 떴다. 어둠 속에 눈이 여럿. 들개 떼다. 목줄 자국이 남은 녀석도 있다. 한때 누군가의 개였다.',
    weight: 2,
    when: { outdoor: true },
    choices: [
      { text: '불을 키운다', hint: '불 필요', req: { fire: true }, outcomes: [{ text: '가지를 던져 넣자 불꽃이 치솟았다. 녀석들은 불빛 끝에서 서성이다 물러갔다.', effects: { mind: -2 } }] },
      { text: '먹을 것을 던진다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '봉지를 멀리 던졌다. 녀석들이 그쪽으로 달려가 싸우는 소리를 들으며 다시 누웠다.', effects: { food: -1, mind: -3 } }] },
      { text: '소리치며 막대를 휘두른다', hint: '위험', outcomes: [
        { chance: 0.6, text: '목이 쉬도록 소리쳤다. 녀석들은 물러갔지만 날이 샐 때까지 잠들지 못했다.', effects: { mind: -5, fatigue: -15 } },
        { text: '한 마리가 달려들어 종아리를 물었다. 배낭을 끌고 가려는 걸 겨우 뺏었지만 먹을 것 하나는 녀석 입에 있었다.', effects: { hp: -15, food: -1, mind: -8 } },
      ] },
    ],
  },
  {
    id: 'night_storm',
    trigger: 'night',
    title: '비바람',
    text: '한밤중에 바람이 바뀌었다. 비가 옆으로 들이치고 침낭 안까지 젖는다. 능선 위에 숨을 곳은 없다.',
    when: { outdoor: true, weather: ['rain', 'cloud'] },
    choices: [
      { text: '바위 밑으로 기어든다', outcomes: [{ text: '바위와 땅 사이의 틈. 몸이 반밖에 안 들어갔지만 바람은 막아 줬다.', effects: { temp: -10, mind: -3 } }] },
      { text: '그대로 버틴다', outcomes: [{ text: '이를 악물고 아침을 기다렸다. 아침은 늦게 왔다.', effects: { temp: -20, mind: -5, rad: 2 } }] },
    ],
  },
  {
    id: 'night_gunfire',
    trigger: 'night',
    title: '총성',
    text: '멀지 않은 곳에서 총성. 한 발, 그리고 잠시 뒤 세 발. 누군가 누군가를 쏘고 있다.',
    when: { minDay: 2 },
    choices: [
      { text: '불을 끈다', hint: '불 필요', req: { fire: true }, outcomes: [{ text: '흙을 덮어 불을 죽였다. 어둠 속에서 추위와 함께 귀를 세웠다.', effects: { fireOut: true, mind: -3, temp: -5 } }] },
      { text: '숨을 죽인다', outcomes: [
        { chance: 0.2, text: '발소리가 가까워졌다. 손전등 빛이 바위를 훑고 지나갔다. 아침에 보니 배낭이 열려 있었다.', effects: { food: -2, mind: -8 } },
        { text: '총성은 더 없었다. 하지만 날이 샐 때까지 잠들지 못했다.', effects: { mind: -5, fatigue: -10 } },
      ] },
    ],
  },
  {
    id: 'night_dream',
    trigger: 'night',
    title: '꿈',
    text: '꿈에서 바다는 멀쩡했다. 모래사장에 사람들이 있었고 누군가 내 이름을 불렀다. 돌아봤지만 얼굴이 기억나지 않았다.',
    choices: [
      { text: '이름을 떠올리려 애쓴다', outcomes: [{ text: '떠오르지 않았다. 대신 그 사람이 웃던 모양은 떠올랐다. 그걸로 됐다.', effects: { mind: 5 } }] },
      { text: '다시 눈을 감는다', outcomes: [{ text: '꿈은 돌아오지 않았다. 새벽바람만 돌아왔다.', effects: { mind: -2 } }] },
    ],
  },
];
