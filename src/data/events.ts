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
          { chance: 0.5, text: '그는 한참을 말없이 먹더니 주머니에서 알약 통을 꺼냈다. "요오드예요. 반은 드릴게요." 입안이 쓰다. 이름은 묻지 않았다. 그가 먼저 "정우"라고 했다.', effects: { food: -1, mind: 8, rad: -12, flag: 'survivor_friend' } },
          { text: '그는 고맙다는 말 대신 북쪽 능선 이야기를 해 줬다. 어디서 물이 나고 어디가 무너졌는지. 이름은 정우라고 했다.', effects: { food: -1, mind: 8, flag: 'survivor_friend' } },
        ],
      },
      { text: '거리를 두고 쉰다', outcomes: [{ text: '서로 등을 보이지 않은 채 밤을 보냈다. 아침에 그는 먼저 떠나 있었다.', effects: { mind: -3 } }] },
      {
        text: '나가라고 한다',
        hint: '위험',
        outcomes: [
          { chance: 0.3, text: '그가 일어섰다. 짧고 지저분한 몸싸움. 그는 코피를 흘리며 나갔고 나는 갈비뼈가 아프다. 문 밖에서 그가 말했다. "기억해 둘게."', effects: { hp: -15, mind: -8, flag: 'survivor_enemy' } },
          { text: '그는 나를 오래 쳐다보더니 배낭을 챙겨 나갔다. 문이 닫히고 난로 소리만 남았다. 그는 내 얼굴을 오래 봤다.', effects: { mind: -8, flag: 'survivor_enemy' } },
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
      { text: '먹을 것을 건넨다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '아이가 먼저 손을 내밀다가 아버지를 봤다. 아버지가 고개를 끄덕였다. 여자는 울지 않으려고 입을 꽉 다물고 있었다. 아이는 하율이 또래였다.', effects: { food: -1, mind: 10, flag: 'family_fed' } }] },
      { text: '못 본 척 지나간다', outcomes: [{ text: '등 뒤에서 아이가 뭐라고 물었고 남자가 "쉿" 했다. 그 소리가 한참을 따라왔다.', effects: { mind: -8 } }] },
      { text: '북쪽 소식을 묻는다', outcomes: [{ text: '"향로봉에 군인들이 있대요. 헬기도 봤다는 사람이 있고. 우리는 거기까지 못 가요. 아이가." 남자는 말을 끝내지 않았다. 나는 사진을 꺼내 보였다. 그들은 고개를 저었다.', effects: { mind: 2, flag: 'heard_haero' } }] },
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
      { text: '먹을 것을 준다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '그는 받자마자 봉지를 뜯어 입에 넣었다. 총구는 끝까지 내려가지 않았다. "꺼져. 북쪽은 다 죽었어." 그의 명찰에 "이"자만 남아 있었다.', effects: { food: -1, mind: -3, flag: 'deserter_met' } }] },
      { text: '없다고 한다', hint: '위험', outcomes: [
        { chance: 0.5, text: '그는 배낭을 뒤집어 보더니 침을 뱉고 돌아섰다. 거짓말이 통했는지, 그냥 지쳤는지 모르겠다.', effects: { mind: -2, flag: 'deserter_met' } },
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

  // ---------- 지역 고유 이벤트 ----------
  {
    id: 'deogyu_gondola',
    trigger: 'arrive',
    title: '멈춘 곤돌라',
    text: '덕유산 설천봉. 리조트 곤돌라가 케이블 중간에 멈춰 있다. 가장 가까운 곤돌라 안에 사람들의 윤곽이 보인다. 움직이지 않는다. 정류장 매점은 유리가 깨져 있다.',
    once: true,
    weight: 3,
    when: { stages: [2] },
    choices: [
      { text: '매점을 뒤진다', hint: '1시간 · 물건', outcomes: [
        { chance: 0.7, text: '진열대 아래 생수와 초코바가 흩어져 있었다. 곤돌라 쪽은 보지 않으려고 등을 돌리고 주웠다.', effects: { water: 2, food: 1, hours: 1, mind: -3 } },
        { text: '누군가 먼저 다녀갔다. 빈 봉지와 유리 조각뿐이었다. 곤돌라만 바람에 흔들렸다.', effects: { hours: 1, mind: -5 } },
      ] },
      { text: '곤돌라 쪽으로 소리친다', outcomes: [{ text: '대답은 없었다. 당연한 일이었다. 그래도 한 번은 불러 봐야 했다.', effects: { mind: -4, flag: 'gondola_called' } }] },
      { text: '지나간다', outcomes: [{ text: '케이블 삐걱거리는 소리가 한참을 따라왔다.', effects: { mind: -2 } }] },
    ],
  },
  {
    id: 'minjuji_samdobong',
    trigger: 'arrive',
    title: '삼도봉',
    text: '세 도가 만나는 봉우리. 기념탑 아래 돌무더기에 쪽지들이 눌려 있다. 수십 장. 이름과 날짜, 어디로 간다는 말. 누군가를 찾는다는 말.',
    once: true,
    weight: 3,
    when: { stages: [3], kinds: ['peak', 'pass'] },
    choices: [
      { text: '쪽지를 전부 읽는다', hint: '1시간 · 정보', outcomes: [{ text: '대부분 북쪽으로 간다고 적혀 있다. 한 장에는 "속리산 법주사에 쌀이 있다"고, 다른 한 장에는 "소백 죽령은 밤에 지나라"고. 그리고 맨 아래, 아는 글씨. "하율이 열이 내렸다 올랐다 한다. 법주사에 의사가 있다고 해서 간다. 수연." 쪽지를 손에 쥔 채 한참 서 있었다.', effects: { hours: 1, mind: 6, flag: 'notes_samdobong', clue: 'minjuji' } }] },
      { text: '내 쪽지를 남긴다', outcomes: [{ text: '날짜와 이름, 북쪽으로 간다는 말. 돌로 눌렀다. 누가 읽을지는 모른다.', effects: { mind: 6, flag: 'note_left' } }] },
      { text: '건드리지 않는다', outcomes: [{ text: '남의 편지를 읽는 기분이 들어 그냥 두었다.', effects: {} }] },
    ],
  },
  {
    id: 'hwangak_jikji',
    trigger: 'arrive',
    title: '직지사',
    text: '황악산 아래 큰 절. 승려들은 없고 대웅전 벽에 종이가 빼곡히 붙어 있다. 거쳐 간 사람들의 이름이다. 공양간 문에는 "먹을 만큼만"이라고 쓰여 있다.',
    once: true,
    weight: 3,
    when: { stages: [4], kinds: ['temple', 'village'] },
    choices: [
      { text: '먹을 만큼만 가져간다', hint: '먹을 것', outcomes: [{ text: '쌀통에 아직 반이 남아 있었다. 두 끼 분량만 덜었다. 뚜껑을 닫으며 다음 사람을 생각했다.', effects: { food: 2, mind: 5 } }] },
      { text: '있는 대로 챙긴다', hint: '먹을 것 · 정신', outcomes: [{ text: '배낭이 찰 때까지 담았다. 벽의 이름들이 등을 보고 있는 것 같았다.', effects: { food: 4, mind: -8, flag: 'took_all_jikji' } }] },
      { text: '벽에 이름을 적는다', outcomes: [{ text: '빈자리를 찾아 이름을 적었다. 수백 개의 이름 사이에 내 이름이 있으니 덜 외로웠다.', effects: { mind: 8, flag: 'name_on_wall' } }] },
    ],
  },
  {
    id: 'songni_buddha',
    trigger: 'arrive',
    title: '미륵대불',
    text: '속리산 법주사. 서른 미터 금동 미륵불이 흐린 하늘 아래 서 있다. 발치에 타다 남은 모닥불 자리와 비닐 천막들. 사람들이 여기 모였다가 흩어졌다.',
    once: true,
    weight: 3,
    when: { stages: [5] },
    choices: [
      { text: '천막을 뒤진다', hint: '1시간 · 물건', outcomes: [
        { chance: 0.6, text: '버려진 천막 안에 라면과 생수가 있었다. 그리고 아이 신발 한 짝. 신발은 두고 왔다.', effects: { food: 2, water: 1, hours: 1, mind: -3 } },
        { text: '천막은 비어 있었다. 바닥에 "소백으로"라고 쓴 글씨만 남아 있었다.', effects: { hours: 1, flag: 'to_sobaek' } },
      ] },
      { text: '불상 앞에 앉는다', hint: '1시간 · 정신', outcomes: [{ text: '한 시간을 앉아 있었다. 믿는 건 없지만 저렇게 큰 것이 아직 서 있다는 게 위로가 됐다.', effects: { hours: 1, mind: 10 } }] },
      { text: '진료소 천막을 찾는다', hint: '단서', outcomes: [{ text: '적십자 마크가 그려진 천막. 접이식 침대와 빈 약병, 그리고 벽에 붙은 진료 명단. 손가락으로 훑다가 멈췄다. "하율, 7세, 발열, 해열제 3일분. 보호자 수연. 북쪽 이동." 날짜는 아흐레 전. 살아 있었다. 아흐레 전에는.', effects: { mind: 8, clue: 'songni' } }] },
      { text: '지나간다', outcomes: [{ text: '불상의 눈이 북쪽을 보고 있었다. 나도 그쪽으로 갔다.', effects: { mind: 2 } }] },
    ],
  },
  {
    id: 'sobaek_tunnel',
    trigger: 'arrive',
    title: '죽령 터널',
    text: '소백산 죽령. 옛 고갯길 아래 고속도로 터널 입구가 보인다. 차들이 터널 안쪽까지 줄지어 멈춰 있고 입구에 바리케이드가 넘어져 있다. 안은 완전한 어둠이다.',
    once: true,
    weight: 3,
    when: { stages: [6] },
    choices: [
      { text: '터널 안 차들을 뒤진다', hint: '2시간 · 물건 · 위험', outcomes: [
        { chance: 0.55, text: '어둠 속에서 손으로 더듬어 트렁크를 열었다. 생수 묶음과 과자 상자. 뒤쪽에서 무언가 움직이는 소리에 뛰쳐나왔다.', effects: { water: 2, food: 2, hours: 2, mind: -6 } },
        { text: '터널 안에서 들개 떼와 마주쳤다. 손전등도 없이 뒷걸음질 치다 넘어졌다. 겨우 빠져나왔다.', effects: { hp: -12, hours: 2, mind: -8 } },
      ] },
      { text: '입구 근처만 본다', hint: '1시간', outcomes: [{ text: '바리케이드 옆 군용 상자에 정수 알약 한 통이 남아 있었다. 깊이 들어가지 않길 잘했다.', effects: { hours: 1, rad: -8, mind: 2 } }] },
      { text: '고갯길로 넘어간다', outcomes: [{ text: '터널은 등지고 옛길로 올랐다. 어둠 속에 무엇이 있든 내 것이 아니다.', effects: {} }] },
    ],
  },
  {
    id: 'taebaek_mine',
    trigger: 'arrive',
    title: '폐광',
    text: '태백. 산비탈에 막장 입구가 입을 벌리고 있다. 안쪽에서 희미한 불빛과 사람 소리. 피난민들이 갱도에 들어가 있다. 바위 수십 미터 아래라면 비는 닿지 않는다.',
    once: true,
    weight: 3,
    when: { stages: [7] },
    choices: [
      { text: '들어가 하룻밤 청한다', hint: '8시간 · 피폭 거의 없음', outcomes: [
        { chance: 0.7, text: '노인들과 아이들이 대부분이었다. 그들은 자리를 내주고 멀건 죽 한 그릇을 건넸다. 갱도 안은 바위 냄새가 났고 비 소리가 들리지 않았다. 사진을 보여 주자 한 할머니가 말했다. "아이 열 있던 엄마. 하룻밤 자고 갔어. 사흘 전. 북쪽으로." 손이 떨려서 사진을 떨어뜨렸다.', effects: { hours: 8, fatigue: 50, temp: 20, hunger: 15, mind: 12, flag: 'mine_people', clue: 'taebaek' } },
        { text: '입구에서 남자 둘이 막았다. "자리 없어요." 그들의 눈에 미안함이 있었다. 돌아섰다.', effects: { mind: -5 } },
      ] },
      { text: '먹을 것을 나누고 간다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '아이 손에 봉지를 쥐여 주고 돌아섰다. 아이는 고맙다는 말 대신 "북쪽에 군인 있어요"라고 했다.', effects: { food: -1, mind: 8, flag: 'mine_people' } }] },
      { text: '지나간다', outcomes: [{ text: '불빛을 등지고 능선으로 올랐다. 그들에게는 그들의 방식이 있다.', effects: {} }] },
    ],
  },
  {
    id: 'taebaek_stay',
    trigger: 'arrive',
    title: '남을 것인가',
    text: '폐광 사람들이 다시 자리를 내준다. 할머니가 말한다. "북쪽은 멀어. 여기는 비도 안 들어오고 사람도 있어. 남아도 돼." 갱도 안은 따뜻하고 조용하다. 사진 속 두 사람은 사흘 먼저 북쪽으로 갔다.',
    once: true,
    weight: 4,
    when: { stages: [7], flag: 'mine_people', minDay: 6 },
    choices: [
      { text: '북쪽으로 간다', outcomes: [{ text: '"고맙습니다. 가야 할 사람이 있어요." 할머니는 말린 감 두 개를 쥐여 주었다.', effects: { food: 2, mind: 6 } }] },
      { text: '여기 남는다', hint: '여정이 끝난다', outcomes: [{ text: '배낭을 벽에 기대 두었다. 갱도 안에서는 비 소리가 들리지 않는다. 사진은 꺼내지 않았다. 언젠가 꺼낼 것이다. 언젠가는.', effects: { ending: 'stay' } }] },
    ],
  },
  {
    id: 'hambaek_manhangjae',
    trigger: 'arrive',
    title: '만항재',
    text: '함백산 만항재. 포장도로가 넘는 가장 높은 고개. 군용 트럭 다섯 대가 길을 막은 채 서 있다. 짐칸의 천막이 바람에 펄럭이고, 운전석에는 아무도 없다.',
    once: true,
    weight: 3,
    when: { stages: [8], kinds: ['pass', 'peak', 'military'] },
    choices: [
      { text: '짐칸을 뒤진다', hint: '1시간 · 물건', outcomes: [
        { chance: 0.6, text: '전투식량 상자 하나가 뜯기지 않은 채 남아 있었다. 그리고 담요. 군인들은 급하게 떠난 것이다.', effects: { food: 2, hours: 1, gear: 'blanket' } },
        { text: '짐칸은 빈 탄약 상자뿐이었다. 바닥에 피 자국이 말라 있었다.', effects: { hours: 1, mind: -4 } },
      ] },
      { text: '운전석의 무전기를 켠다', hint: '정보', outcomes: [{ text: '잡음 사이로 끊어진 말. "...향로봉 집결... 피폭 선별... 반복한다, 동해안 접근 금지..." 무전기는 곧 죽었다. 운전석 서류판에 수송 일지가 끼워져 있었다. "민간인 14명 향로봉 이송. 아동 2명 포함, 1명 발열." 날짜는 닷새 전.', effects: { mind: 8, flag: 'radio_haero', clue: 'hambaek' } }] },
      { text: '지나간다', outcomes: [{ text: '트럭 사이를 빠르게 지났다. 군인이 버린 길을 걷는 기분은 좋지 않다.', effects: {} }] },
    ],
  },
  {
    id: 'duta_smoke',
    trigger: 'arrive',
    title: '무릉계곡의 연기',
    text: '두타산. 계곡 아래 마을에서 연기가 올라온다. 밥 짓는 연기다. 사람들이 살아 있다. 하지만 저 마을은 동해에서 십 킬로미터도 안 된다.',
    once: true,
    weight: 3,
    when: { stages: [9] },
    choices: [
      { text: '내려가 본다', hint: '3시간 · 피폭 · 정신', outcomes: [{ text: '바닷가에서 올라온 사람들이었다. 반은 누워 있었고 머리카락이 빠진 아이가 있었다. 그들은 내게 물을 달라 하지 않았다. 대신 북쪽으로 가라고 했다. 나는 가진 것을 조금 나누고 돌아섰다.', effects: { hours: 3, rad: 8, food: -1, mind: 6, flag: 'duta_people' } }] },
      { text: '능선에서 지켜본다', hint: '1시간', outcomes: [{ text: '한 시간을 지켜봤다. 연기는 세 줄에서 두 줄이 됐다. 내려가지 않은 이유를 스스로에게 설명하지 못했다.', effects: { hours: 1, mind: -6 } }] },
      { text: '보지 않고 간다', outcomes: [{ text: '연기를 등졌다. 등 뒤가 뜨거웠다.', effects: { mind: -4 } }] },
    ],
  },
  {
    id: 'odae_forest',
    trigger: 'arrive',
    title: '전나무 숲',
    text: '오대산 월정사 전나무 숲길. 수백 년 된 전나무가 양쪽에 서 있다. 바람이 지나가면 숲 전체가 숨을 쉬는 소리를 낸다. 이 길만은 아무것도 변하지 않은 것 같다.',
    once: true,
    weight: 3,
    when: { stages: [10] },
    choices: [
      { text: '천천히 걷는다', hint: '2시간 · 정신', outcomes: [{ text: '두 시간을 걸었다. 전쟁도 바다도 없는 두 시간이었다. 숲 끝에서 다시 배낭을 고쳐 멨다.', effects: { hours: 2, mind: 14, fatigue: 5 } }] },
      { text: '쓰러진 나무에서 땔감을 모은다', hint: '1시간 · 땔감', outcomes: [{ text: '마른 전나무 가지는 불이 잘 붙는다. 송진 냄새가 손에 뱄다.', effects: { hours: 1, wood: 3, mind: 3 } }] },
      { text: '지나간다', outcomes: [{ text: '숲은 아름다웠지만 북쪽은 아직 멀다.', effects: { mind: 2 } }] },
    ],
  },
  {
    id: 'seorak_checkpoint',
    trigger: 'arrive',
    title: '살아 있는 검문소',
    text: '설악산 아래 고개. 처음으로 사람이 지키는 검문소를 만났다. 방독면을 쓴 군인 둘이 계수기를 들고 다가온다. "향로봉 가십니까? 측정하겠습니다."',
    once: true,
    weight: 4,
    when: { stages: [11] },
    choices: [
      { text: '순순히 측정을 받는다', hint: '피폭에 따라 다르다', outcomes: [{ text: '계수기가 몸을 훑었다. 군인은 수치를 적더니 통행증 대신 종이 한 장을 줬다. "향로봉 수용소. 수치 높은 분은 격리동입니다. 그래도 가세요. 거기가 낫습니다." 나는 사진을 내밀었다. 군인은 명단을 넘기더니 손가락을 멈췄다. "수연, 하율. 엿새 전 통과. 아이는 의무대로." 물 한 통을 건넸다.', effects: { water: 1, mind: 10, flag: 'checkpoint_pass', clue: 'seorak' } }] },
      { text: '측정을 거부하고 우회한다', hint: '3시간 · 위험', outcomes: [
        { chance: 0.7, text: '산비탈로 돌아 검문소를 피했다. 세 시간을 더 걸었다. 왜 피했는지 나도 모르겠다.', effects: { hours: 3, fatigue: -15, mind: -5, flag: 'checkpoint_evaded' } },
        { text: '비탈에서 미끄러져 돌에 다리를 찧었다. 검문소 군인이 올라와 나를 부축했다. 결국 측정을 받았다.', effects: { hp: -12, hours: 3, flag: 'checkpoint_pass' } },
      ] },
      { text: '북쪽 사정을 묻는다', hint: '정보', outcomes: [{ text: '"수용소는 있습니다. 배급은 하루 한 끼. 헬기는 사흘에 한 번. 남쪽에서 오신 분은 당신이 이번 주 둘째입니다." 둘째. 그 말이 오래 남았다. 사진을 보이자 군인은 명단을 넘겼다. "수연, 하율. 엿새 전. 아이는 의무대." 그 말도.', effects: { mind: 8, flag: 'checkpoint_info', clue: 'seorak' } }] },
    ],
  },

  // ---------- 다시 만나는 사람 ----------
  {
    id: 'survivor_return',
    trigger: 'arrive',
    title: '정우',
    text: '지붕 아래 누군가 먼저 불을 피워 두었다. 돌아보는 얼굴이 낯익다. 대피소에서 먹을 것을 나눴던 남자, 정우다. "또 만나네요. 살아 계셨군요."',
    once: true,
    weight: 4,
    when: { flag: 'survivor_friend', minDay: 3, kinds: ['shelter', 'temple', 'village', 'military'] },
    choices: [
      { text: '함께 밤을 보낸다', hint: '8시간 · 회복', outcomes: [{ text: '그는 남쪽 소식을 묻고 나는 북쪽 소식을 물었다. 그가 가진 지도에 물 나는 곳이 표시되어 있었다. 아침에 그는 사본을 그려 줬다. "향로봉에서 봅시다."', effects: { hours: 8, fatigue: 45, temp: 20, mind: 14, water: 1, flag: 'survivor_map' } }] },
      { text: '먹을 것을 주고 떠난다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '"또 신세 지네요." 그는 웃으며 받았다. 두 번 만난 사람은 더 이상 남이 아니다.', effects: { food: -1, mind: 8 } }] },
    ],
  },
  {
    id: 'survivor_revenge',
    trigger: 'night',
    title: '기억해 둔 얼굴',
    text: '잠결에 배낭이 움직였다. 눈을 뜨자 어둠 속에 낯익은 얼굴. 대피소에서 쫓아냈던 남자다. "기억한다고 했잖아요." 그의 손에 내 배낭 끈이 잡혀 있다.',
    once: true,
    weight: 4,
    when: { flag: 'survivor_enemy', minDay: 2 },
    choices: [
      { text: '배낭을 붙잡는다', hint: '위험', outcomes: [
        { chance: 0.5, text: '끈을 놓지 않았다. 그가 주먹을 휘둘렀고 나도 휘둘렀다. 그는 먹을 것 하나를 쥐고 어둠 속으로 사라졌다.', effects: { hp: -10, food: -1, mind: -6 } },
        { text: '그가 돌로 머리를 쳤다. 정신이 들었을 때 배낭의 먹을 것은 전부 사라져 있었다. 물통은 남겨 두었다. 그 정도는 남겨 두는 사람이었다.', effects: { hp: -18, foodAll: true, mind: -10 } },
      ] },
      { text: '가져가라고 한다', outcomes: [{ text: '"먹을 것만 가져가요." 그는 봉지 두 개를 꺼내고 배낭을 던졌다. "그때 나눠 줬으면 하나만 가져갔을 거요." 그 말이 맞았다.', effects: { food: -2, mind: -8 } }] },
    ],
  },

  // ---------- 라디오. 전기가 든 거점에서 밤에 ----------
  {
    id: 'radio_news_camp',
    trigger: 'night',
    title: '라디오 소식',
    text: '발전기 소리 사이로 라디오가 잡힌다. "...향로봉 임시 수용소는 정상 운영 중... 남쪽 능선을 따라 올라오시는 분들은 설악 검문소에서 선별을... 배급은 하루 두 끼로 늘렸습니다..." 사람 목소리다. 살아 있는 사람의.',
    weight: 3,
    when: { facility: 'radio' },
    choices: [
      { text: '끝까지 듣는다', outcomes: [{ text: '방송은 같은 말을 세 번 반복하고 애국가를 틀었다. 애국가를 듣다가 웃음이 났다. 그리고 조금 울었다.', effects: { mind: 10, flag: 'radio_heard' } }] },
      { text: '끄고 잔다', outcomes: [{ text: '알아야 할 건 알았다. 북쪽에 사람이 있다.', effects: { mind: 5 } }] },
    ],
  },
  {
    id: 'radio_news_drop',
    trigger: 'night',
    title: '보급 투하 예고',
    text: '라디오. "...능선 생존자를 위한 보급품을 봉우리와 고개 위에 투하합니다. 붉은 낙하산을 찾으십시오. 반복합니다..." 좌표를 불렀지만 받아 적을 새가 없었다. 봉우리와 고개. 그것만 기억했다.',
    once: true,
    weight: 2,
    when: { facility: 'radio', minDay: 2 },
    choices: [
      { text: '내일 능선을 뒤져 본다', outcomes: [{ text: '잠이 오지 않았다. 붉은 낙하산을 생각했다.', effects: { mind: 6, flag: 'drop_coming' } }] },
      { text: '믿지 않는다', outcomes: [{ text: '정부 방송은 전쟁 전에도 믿을 게 못 됐다. 그래도 봉우리를 지날 때 하늘을 볼 것이다.', effects: { mind: 2, flag: 'drop_coming' } }] },
    ],
  },
  {
    id: 'supply_drop',
    trigger: 'arrive',
    title: '붉은 낙하산',
    text: '바위 사이에 붉은 천이 걸려 있다. 낙하산이다. 상자는 떨어지면서 한쪽이 찌그러졌지만 봉인은 그대로다. 라디오가 말한 그 상자다.',
    once: true,
    weight: 6,
    when: { flag: 'drop_coming', kinds: ['peak', 'pass'] },
    choices: [
      { text: '상자를 연다', outcomes: [{ text: '생수, 전투식량, 요오드 알약, 그리고 부품 몇 개가 든 수리 키트. 상자 뚜껑 안쪽에 "살아서 오십시오"라고 쓰여 있었다.', effects: { water: 2, food: 3, parts: 2, rad: -10, mind: 12, flag: 'drop_found' } }] },
      { text: '낙하산 천부터 챙긴다', outcomes: [{ text: '낙하산 천을 잘라 배낭에 넣었다. 비를 막고 몸을 덮을 수 있다. 상자도 열었다.', effects: { water: 2, food: 2, parts: 1, gear: 'blanket', mind: 10, flag: 'drop_found' } }] },
    ],
  },

  // ---------- 차량에서 연료 뽑기 ----------
  {
    id: 'pass_siphon',
    trigger: 'arrive',
    title: '멈춘 차들',
    text: '고갯길에 승용차 몇 대가 문을 연 채 서 있다. 연료 주입구를 열어 보니 기름 냄새가 올라온다. 호스만 있으면 뽑을 수 있다. 트렁크의 세차용 호스가 보인다.',
    weight: 2,
    when: { kinds: ['pass'], noFlag: 'siphon_pass_done' },
    choices: [
      { text: '호스로 휘발유를 뽑는다', hint: '2시간 · 휘발유', outcomes: [
        { chance: 0.75, text: '입으로 빨아 올리다 한 모금 삼켰다. 토하면서도 통을 채웠다. 휘발유 냄새가 하루 종일 났다.', effects: { gasoline: 2, hours: 2, hp: -4, mind: -3, flag: 'siphon_pass_done' } },
        { text: '연료통은 거의 비어 있었다. 누군가 먼저 뽑아 갔다. 한 통도 안 됐다.', effects: { gasoline: 1, hours: 2, flag: 'siphon_pass_done' } },
      ] },
      { text: '차 안만 뒤진다', hint: '1시간', outcomes: [{ text: '글로브박스에서 손전등 건전지와 사탕. 뒷좌석 담요는 가져왔다.', effects: { food: 1, hours: 1, gear: 'blanket' } }] },
      { text: '지나간다', outcomes: [{ text: '기름은 무겁다. 발전기도 없는데 기름부터 챙길 일은 아니다.', effects: {} }] },
    ],
  },
  {
    id: 'military_siphon',
    trigger: 'arrive',
    title: '군용 트럭',
    text: '위장막 아래 군용 트럭 두 대. 디젤 엔진 냄새가 아직 남아 있다. 연료 탱크는 자물쇠가 없다. 짐칸에 드럼통도 하나 있다.',
    weight: 2,
    when: { kinds: ['military'], noFlag: 'siphon_mil_done' },
    choices: [
      { text: '경유를 뽑는다', hint: '2시간 · 경유', outcomes: [
        { chance: 0.7, text: '탱크와 드럼통에서 경유를 뽑았다. 경유는 휘발유보다 냄새가 덜하고 덜 위험하다. 군용 발전기가 있으면 요긴할 것이다.', effects: { diesel: 3, hours: 2, flag: 'siphon_mil_done' } },
        { text: '드럼통은 비어 있고 탱크에서 조금 나왔다.', effects: { diesel: 1, hours: 2, flag: 'siphon_mil_done' } },
      ] },
      { text: '짐칸을 뒤진다', hint: '1시간', outcomes: [
        { chance: 0.5, text: '공구함과 부품 상자. 군인들이 정비 중이었던 모양이다.', effects: { parts: 2, hours: 1, gear: 'tools' } },
        { text: '빈 탄약 상자와 군화 한 짝.', effects: { hours: 1 } },
      ] },
      { text: '지나간다', outcomes: [{ text: '트럭은 두고 왔다. 짐은 이미 무겁다.', effects: {} }] },
    ],
  },
  {
    id: 'village_tractor',
    trigger: 'arrive',
    title: '경운기',
    text: '마을 어귀에 경운기가 서 있다. 짐칸에 배추 몇 포기와 기름통. 주인은 밭에 엎드려 있다. 일하다가 그대로.',
    weight: 2,
    when: { kinds: ['village'], noFlag: 'tractor_done' },
    choices: [
      { text: '기름통과 배추를 챙긴다', hint: '경유 · 신선식', outcomes: [{ text: '경유 한 통과 배추 두 포기. 주인에게 고개를 숙였다. 배추는 빨리 먹어야 한다.', effects: { diesel: 1, fresh: 2, mind: -3, flag: 'tractor_done' } }] },
      { text: '주인을 묻어 주고 챙긴다', hint: '2시간 · 정신', outcomes: [{ text: '밭 가장자리에 얕게 묻었다. 경운기 열쇠는 그 위에 올려 두었다. 기름통과 배추는 가져왔다.', effects: { diesel: 1, fresh: 2, hours: 2, mind: 6, flag: 'tractor_done' } }] },
      { text: '지나간다', outcomes: [{ text: '남의 밭이다. 아직은 그런 생각이 남아 있다.', effects: { mind: 2 } }] },
    ],
  },

  // ---------- 시작 장면과 첫 여정 안내 ----------
  {
    id: 'intro_morning',
    trigger: 'start',
    title: '엿새째 아침',
    text: '중산리 야영장. 대피령이 내린 지 엿새째다. 그날 버스가 왔을 때 하율이 열이 났고 나는 텐트로 약을 가지러 뛰었다. 돌아왔을 때 버스는 없었다. 수연이 남긴 쪽지가 텐트 기둥에 꽂혀 있었다. "향로봉 수용소로 간대. 꼭 와." 남은 건 텐트 한 동, 시동이 안 걸리는 발전기, 냉장고, 기름통 둘, 사진 한 장, 그리고 나.',
    choices: [
      { text: '쪽지를 다시 읽는다', outcomes: [{ text: '"향로봉 수용소로 간대. 버스가 능선 길로 간다고. 하율이 약 챙겨서 꼭 와. 기다릴게." 글씨가 흔들렸다. 버스 안에서 썼을 것이다. 쪽지를 사진 뒤에 끼웠다. 능선을 따라가면 버스가 간 길을 따라가는 것이다.', effects: { mind: 4, clue: 'note' } }] },
      { text: '짐을 살핀다', outcomes: [{ text: '물 네 통, 통조림과 라면 여섯 끼, 휘발유 둘, 부품 하나. 발전기를 고치면 냉장고와 전등이 돈다. 주변을 뒤지며 모아야 한다. 떠날 때 질 수 있는 만큼만 가져갈 수 있다. 쪽지는 사진 뒤에 끼웠다.', effects: { mind: 2, clue: 'note' } }] },
    ],
  },
  {
    id: 'tut_scout',
    trigger: 'arrive',
    title: '첫 조사',
    text: '야영장이 아래로 보인다. 여기서부터는 처음 걷는 길이다. 한 번 걸은 길은 돌아갈 때 빠르다. 배낭에 든 것만 가져갈 수 있고, 무거운 장비는 두 개까지다. 쓸 만한 것을 찾으면 야영장 저장고에 쌓아 두자.',
    once: true,
    weight: 10,
    when: { stages: [1], firstRun: true, phase: 'base' },
    choices: [{ text: '알았다', outcomes: [{ text: '배낭 끈을 조였다.', effects: {} }] }, { text: '야영장을 한 번 더 본다', outcomes: [{ text: '텐트가 작게 보인다. 돌아갈 곳이 있다는 건 좋은 일이다.', effects: { mind: 3 } }] }],
  },
  {
    id: 'tut_water',
    trigger: 'arrive',
    title: '물',
    text: '물소리. 약수터와 절의 물은 깨끗하지만 계곡과 우물은 낮은 땅의 물이라 오염되어 있다. 오염된 물은 불을 피워 끓이고 천에 거르면 마실 수 있다. 통에 담아 두면 길에서 마신다.',
    once: true,
    weight: 10,
    when: { kinds: ['spring', 'valley'], firstRun: true },
    choices: [{ text: '알았다', outcomes: [{ text: '물통을 꺼냈다.', effects: {} }] }],
  },
  {
    id: 'tut_rain',
    trigger: 'arrive',
    title: '비',
    text: '빗방울이 미끈하다. 바다를 지나온 비다. 비를 맞으면 피폭이 세 배로 오른다. 비 오는 날은 지붕 아래서 기다리는 게 낫고, 바람이 오는 쪽 사면은 피해야 한다. 가이거 계수기가 있으면 수치가 보인다.',
    once: true,
    weight: 10,
    when: { weather: ['rain'], firstRun: true },
    choices: [{ text: '알았다', outcomes: [{ text: '옷깃을 여몄다.', effects: {} }] }],
  },
  {
    id: 'tut_night',
    trigger: 'night',
    title: '첫 밤',
    text: '능선의 밤은 춥다. 지붕이 없으면 불을 피우거나 텐트를 치는 게 낫다. 담요는 밤을 절반으로 줄인다. 불이 있으면 오염된 물도 끓일 수 있다. 땔감은 나무가 있는 곳 어디서든 모은다.',
    once: true,
    weight: 10,
    when: { outdoor: true, firstRun: true },
    choices: [{ text: '알았다', outcomes: [{ text: '손을 비볐다.', effects: {} }] }],
  },
  {
    id: 'tut_depart',
    trigger: 'night',
    title: '떠날 때',
    text: '야영장의 밤. 날이 갈수록 비는 더러워지고 주변에서 찾을 것은 줄어든다. 언제 떠날지는 내가 정한다. 거점 화면에 "북쪽으로 떠난다"가 있다. 떠날 때 배낭에 든 것만 가져간다. 발전기와 냉장고는 두고 간다.',
    once: true,
    weight: 10,
    when: { kinds: ['start'], firstRun: true, phase: 'base', minDay: 2 },
    choices: [{ text: '알았다', outcomes: [{ text: '아직은 아니다. 하지만 곧.', effects: {} }] }],
  },

  // ---------- 가족의 흔적 ----------
  {
    id: 'clue_jiri',
    trigger: 'arrive',
    title: '임시 정류장',
    text: '고갯마루에 임시 정류장 표지가 서 있다. 종이에 손으로 쓴 시간표. "향로봉행 1차 07:00, 2차 09:30." 2차 옆에 "만석"이라고 적혀 있고 그 아래 사람들의 이름이 빼곡하다.',
    once: true,
    weight: 6,
    when: { stages: [1], kinds: ['pass', 'peak'] },
    choices: [
      { text: '이름을 찾는다', outcomes: [{ text: '2차 명단 열한 번째 줄. "수연, 하율(7)." 수연의 글씨다. 두 사람은 두 번째 버스를 탔다. 나는 손끝으로 그 줄을 오래 눌렀다.', effects: { mind: 8, clue: 'jiri' } }] },
      { text: '그냥 간다', outcomes: [{ text: '이름을 읽지 않았다. 읽으면 걸음이 느려질 것 같았다.', effects: { mind: -3 } }] },
    ],
  },
  {
    id: 'clue_deogyu',
    trigger: 'arrive',
    title: '휴게소 벽',
    text: '덕유산 고개 휴게소. 버스 행렬이 쉬어 간 자리다. 바닥에 빈 도시락과 기저귀. 벽에는 아이들이 크레파스로 그린 그림이 붙어 있다. 어른들이 아이들을 달래려고 그리게 한 것이다.',
    once: true,
    weight: 6,
    when: { stages: [2] },
    choices: [
      { text: '그림을 하나씩 본다', hint: '30분', outcomes: [{ text: '산, 버스, 개. 그리고 셋이서 손을 잡은 그림. 한 사람은 크게, 한 사람은 작게, 한 사람은 점선으로. 점선 옆에 "아빠 온다"라고 적혀 있다. 하율의 글씨다. 점선은 나였다.', effects: { mind: 10, clue: 'deogyu' } }] },
      { text: '지나간다', outcomes: [{ text: '아이들 그림은 보지 않기로 했다. 그래야 걸을 수 있었다.', effects: { mind: -4 } }] },
    ],
  },
  {
    id: 'clue_sobaek',
    trigger: 'arrive',
    title: '멈춘 버스',
    text: '죽령 옛길 중턱에 버스 한 대가 비스듬히 서 있다. "향로봉 2차"라고 유리창에 적혀 있다. 바퀴 하나가 빠졌다. 사람들은 여기서부터 걸었다.',
    once: true,
    weight: 6,
    when: { stages: [6] },
    choices: [
      { text: '버스 안을 본다', hint: '30분', outcomes: [{ text: '좌석마다 두고 간 짐. 열한 번째 줄쯤, 창가에 아이 머리끈이 걸려 있다. 노란 곰. 하율이 것이다. 머리끈을 손목에 묶었다. 두 사람은 여기서부터 걸었다. 엿새 전쯤.', effects: { mind: 8, clue: 'sobaek' } }] },
      { text: '트렁크를 연다', hint: '물건', outcomes: [
        { chance: 0.6, text: '생수 묶음과 과자 상자. 사람들이 급해서 두고 간 것이다. 창가의 노란 머리끈도 챙겼다.', effects: { water: 2, food: 1, mind: 4, clue: 'sobaek' } },
        { text: '트렁크는 비어 있었다. 창가에 걸린 노란 머리끈만 챙겼다.', effects: { mind: 4, clue: 'sobaek' } },
      ] },
    ],
  },
  {
    id: 'monk_letter',
    trigger: 'arrive',
    title: '편지',
    text: '월정사 요사채에 젊은 승려가 남아 있다. 남쪽에서 왔다고 하자 그는 봉투를 꺼냈다. "지리산 노스님께서 능선으로 오는 사람 편에 보내셨습니다. 남쪽에서 오는 이에게 읽어 주라고."',
    once: true,
    weight: 6,
    when: { stages: [9, 10], kinds: ['temple'] },
    choices: [
      { text: '편지를 듣는다', outcomes: [
        { chance: 1, text: '"오는 사람은 다 이 길로 온다. 그러니 먼저 간 사람도 이 길로 갔다. 열 있는 아이와 어머니를 사흘 재웠다. 헬기가 와서 둘을 먼저 태웠다. 향로봉으로." 승려는 편지를 접어 내게 주었다. 노스님 글씨 아래 다른 글씨로 "고맙습니다. 수연"이라고 적혀 있었다.', effects: { mind: 14, clue: 'odae', flag: 'monk_letter' } },
      ] },
    ],
  },
  {
    id: 'family_again',
    trigger: 'arrive',
    title: '그 가족',
    text: '지붕 아래 세 사람. 헛간에서 만났던 피난민 가족이다. 아이가 먼저 나를 알아봤다. 남자가 일어서며 말했다. "그때 그 봉지 덕에 여기까지 왔어요."',
    once: true,
    weight: 5,
    when: { flag: 'family_fed', minDay: 5, kinds: ['shelter', 'temple', 'village', 'military'] },
    choices: [
      { text: '같이 밤을 보낸다', hint: '8시간', outcomes: [{ text: '여자가 죽을 끓였다. 아이는 내 사진을 보더니 "이 언니 봤어요" 했다. 폐광에서. 사흘 전. 남자는 아이 말을 막지 않았다. 아침에 그들은 북쪽으로 먼저 떠났다.', effects: { hours: 8, fatigue: 45, temp: 20, hunger: 20, mind: 14, clue: 'family_again' } }] },
      { text: '먹을 것을 나누고 간다', hint: '먹을 것 1', req: { food: 1 }, outcomes: [{ text: '"또 주시면 어떡해요." 여자는 받으면서 울었다. 아이가 말했다. "사진 속 언니 봤어요. 폐광에서." 그 한마디를 들고 걸었다.', effects: { food: -1, mind: 10, clue: 'family_again' } }] },
    ],
  },
  {
    id: 'deserter_again',
    trigger: 'arrive',
    title: '아는 얼굴',
    text: '검문소 옆 천막에서 군인 하나가 삽질을 하고 있다. 총은 없다. 고개를 든 얼굴이 낯익다. 벙커에서 총을 겨눴던 탈영병이다. 그가 먼저 눈을 피했다.',
    once: true,
    weight: 5,
    when: { flag: 'deserter_met', stages: [11] },
    choices: [
      { text: '모른 척한다', outcomes: [{ text: '그는 다시 삽질을 했다. 나는 지나갔다. 서로에게 그게 나았다.', effects: { mind: 2 } }] },
      { text: '말을 건다', outcomes: [{ text: '"잡혔어요. 총 든 거 들켜서. 땅 파면 밥은 줘요." 그는 사진을 보더니 말했다. "아이 열 있던 분들. 의무대 천막이에요. 왼쪽 세 번째." 그가 아는 척해 준 게 이상하게 고마웠다.', effects: { mind: 6, flag: 'deserter_help' } }] },
    ],
  },

  // ---------- 향로봉. 엔딩 ----------
  {
    id: 'goal_reunion',
    trigger: 'arrive',
    title: '향로봉',
    text: '철책 문. 군인이 계수기를 들이댔다가 고개를 끄덕였다. "들어가세요. 이름은요?" 이름을 말했다. 군인이 명단을 넘기다 무전기를 들었다. "의무대, 남쪽에서 한 분 더. 가족 찾으십니다." 무전기 너머에서 누군가 뛰는 소리가 났다.',
    once: true,
    weight: 10,
    when: { kinds: ['goal'], minClues: 5, maxRad: 59 },
    choices: [
      { text: '문 안으로 들어간다', outcomes: [{ text: '천막 사이로 작은 사람이 먼저 뛰어왔다. 그 뒤로 수연. 하율은 내 무릎에 부딪히듯 안겼다. 열은 없었다. 수연은 아무 말도 하지 않았다. 배낭이 어깨에서 흘러내렸다. 더는 질 것이 없었다.', effects: { ending: 'reunion' } }] },
    ],
  },
  {
    id: 'goal_quarantine',
    trigger: 'arrive',
    title: '향로봉',
    text: '철책 문. 계수기가 몸을 훑자 군인이 멈췄다. 두 번 더 쟀다. "격리동으로 가셔야 합니다. 치료는 됩니다. 시간이 걸릴 뿐입니다." 격리동은 수용소 끝, 유리창이 달린 긴 천막이었다.',
    once: true,
    weight: 10,
    when: { kinds: ['goal'], minRad: 60 },
    choices: [
      { text: '격리동으로 간다', outcomes: [
        { chance: 1, text: '침대에 눕자 간호병이 이름을 물었다. 사흘 뒤 유리창 밖에 두 사람이 서 있었다. 수연이 하율을 안아 올렸다. 하율이 유리에 손바닥을 댔다. 나도 댔다. 유리는 차가웠지만 그 너머는 따뜻할 것이다. 시간이 걸릴 뿐이다.', effects: { ending: 'quarantine' } },
      ] },
    ],
  },
  {
    id: 'goal_names',
    trigger: 'arrive',
    title: '향로봉',
    text: '철책 문. 군인이 계수기를 들이대고 고개를 끄덕였다. "들어가세요. 찾는 분 있으면 명단 천막으로." 명단 천막 벽에는 종이가 수백 장 붙어 있었다. 도착한 사람, 찾는 사람, 기다리는 사람.',
    once: true,
    weight: 10,
    when: { kinds: ['goal'], maxClues: 4, maxRad: 59 },
    choices: [
      { text: '명단을 찾는다', outcomes: [{ text: '도착 명단에 수연도 하율도 없었다. 찾는 사람 명단에 두 이름을 적었다. 그 아래 묻어 준 사람들의 이름도 적었다. 누군가는 적어야 한다. 종이를 벽에 붙이고 천막 밖으로 나왔다. 헬기는 사흘에 한 번 온다고 했다. 기다릴 것이다.', effects: { ending: 'names' } }] },
    ],
  },
];
