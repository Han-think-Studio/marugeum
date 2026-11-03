# itch.io 에 올리기

웹 판(브라우저에서 바로 하는 판)을 itch.io 에 무료로 올리는 순서. 올리는 데 돈이 들지 않는다. 반응을 보고 스팀(등록비 약 10만원)을 정한다.

## 1. 올릴 것 만들기

```bash
npm run pack:itch
```

- `release/marugeum-web-<버전>.zip` 이 생긴다(지금 99MB, 파일 344개. itch 한도는 zip 1GB·파일 1000개)
- zip 맨 위에 `index.html` 이 있다. 폴더째 묶지 않는다
- 올리기 전에 itch 틀 안에서 도는지 한 번 더: `node tools/tests/itch-frame.cjs tools/tests/out` (하위 경로, 클릭 뒤 키보드, 저장 이어하기)

## 2. itch.io 에서 (직접 해야 하는 일)

계정 만들기와 올리기는 직접 한다.

1. itch.io 가입 → 오른쪽 위 메뉴 → **Upload new project**
2. 칸 채우기

| 칸 | 넣을 것 |
|---|---|
| Title | 마루금 (Marugeum) |
| Project URL | `marugeum` |
| Short description | 아래 '한 줄 소개' |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | In development (처음엔) 또는 Released |
| Pricing | No payments 또는 Donate(기부 받기). 처음엔 무료가 낫다 |
| Uploads | `release/marugeum-web-0.1.0.zip` 올리고 **This file will be played in the browser** 체크 |
| Embed options | Viewport **1280 × 800**, **Fullscreen button** 켬, Mobile friendly 끔, Automatically start on page load 끔(눌러서 시작해야 소리가 난다), Scrollbars 끔 |
| Description | 아래 '소개 글' |
| Genre | Survival |
| Tags | survival, post-apocalyptic, narrative, korean, story-rich, roguelite, singleplayer, mountains |
| AI generation disclosure | **Yes** 로 표시하고 그림(Graphics)에 생성 AI 를 썼다고 적는다. 코드도 AI 도움을 받았다고 적는다. itch 정책상 숨기면 안 된다 |
| Cover image | `store/itch-cover.png` (630×500) |
| Screenshots | `store/screenshots/` 의 6장 |
| Visibility | 처음엔 **Draft** 로 저장 → 미리보기에서 한 판 해 보고 → **Public** |

3. Draft 미리보기에서 확인할 것: 틀 안에서 '새 여정'이 눌리는지, 화면을 한 번 누른 뒤 키보드가 먹는지, 전체 화면 버튼, 새로 고침 뒤 '이어하기'

## 3. 한 줄 소개

> 바다가 죽은 한국. 지리산에서 향로봉까지 백두대간 능선을 걸어, 먼저 떠난 가족을 따라간다.

English: *The sea is dead. Walk the Baekdudaegan ridge from Jirisan to Hyangnobong and follow the family that went ahead.*

## 4. 소개 글

**마루금**은 백두대간 능선을 걷는 생존 이야기다.

바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 칠십 년 동안 아무도 밟지 않은 땅만이 깨끗하다. 대피령 엿새째, 3차 버스는 오지 않았다. 열이 나는 딸 하율과 아내 수연은 2차 버스로 먼저 떠났다. 버스 창문 틈으로 떨어진 쪽지 한 장. "향로봉 수용소로 간대. 하율이 약은 당신이 갖고 와."

- 마흔일곱 자리, 백오십 편의 사건. 지리산부터 향로봉까지 실제 백두대간의 고개와 절과 대피소
- 물, 먹을 것, 체온, 피폭. 비 오는 날은 걷지 않고, 불을 피우고, 지붕을 찾는다
- 거점을 세우고 창을 막고 화덕을 쌓는다. 올무를 놓고 고기를 훈연하고 숯과 모래로 물을 거른다
- 망치질, 드라이버, 성냥 긋기, 국 끓이기를 손으로 한다
- 가족이 남긴 흔적을 따라가면 끝이 달라진다. 재회, 격리, 명단, 그리고 남는 것
- 어려운 갈림길 셋. 고속도로로 갈 것인가, 하율의 해열제를 아픈 아이에게 줄 것인가, 헬기의 마지막 자리에 오를 것인가
- 숨은 것 아홉. 앞의 작은 선택이 뒤의 자리에서 열린다. 어떤 것은 어려움에서만
- 죽어도 기록 수첩은 남는다. 지난 여정에 묶은 리본은 다음 여정의 길이 된다

키보드(숫자 키, Space, Tab)와 마우스. 저장은 브라우저에 자동으로. 한국어.

### English

**Marugeum** is a survival story on foot along the Baekdudaegan, the mountain spine of Korea.

The sea is dead and the lowlands turn deadly in the rain. Only the ridgeline, untouched for seventy years, is clean. On the sixth day of the evacuation the third bus never came. Your wife and feverish daughter left on the second. One note fell through the bus window: *"They're taking us to the Hyangnobong camp. Bring Hayul's medicine."*

Water, food, warmth and radiation. Build camps, light fires, follow the traces your family left, and choose at three hard crossroads. Korean text only for now.

## 5. butler (선택)

itch 의 올리기 도구. 버전을 자주 올릴 때 편하다. 처음 한 번은 웹에서 올리는 게 쉽다.

```bash
butler push release/marugeum-web-0.1.0.zip <itch 사용자 이름>/marugeum:html5
```

## 6. 윈도우 설치 파일도 함께 (선택)

웹 판 옆에 내려받는 판을 하나 더 둘 수 있다.

```bash
npm run desktop:build
```

- `src-tauri\target\release\bundle\nsis\Marugeum_<버전>_x64-setup.exe` (지금 102MB). 그림이 실행 파일 안에 들어 있다
- itch 의 Uploads 에 이 파일을 더 올리고 **Windows** 표시. "played in the browser" 는 체크하지 않는다
- 코드 서명을 하지 않은 설치 파일이라, 처음 실행하면 윈도우가 "Windows의 PC 보호" 창을 띄운다. 페이지 글에 "추가 정보 → 실행"을 눌러 달라고 한 줄 적는다. 서명 인증서는 해마다 돈이 들어 지금은 하지 않는다
- 저장은 웹 판과 따로다(실행 파일 안의 저장소)
- 앱 아이콘은 `store/app-icon.png` 에서 `npx tauri icon store/app-icon.png` 로 만든다
