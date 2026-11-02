# 자동 테스트와 봇 시뮬레이션

처음 한 번, 테스트용 브라우저를 받는다.

```powershell
npx.cmd playwright install chromium
```

기능 테스트 전부 (사건 데이터 검사 → 개발 서버를 4174 포트로 띄워 아래 표의 기능 테스트를 차례로):

```powershell
npm.cmd test
```

하나만, 또는 몇 개만:

```powershell
node tools/tests/run.cjs tools/tests/out equip camp
```

봇 세 종류 계측 (흔적·능선·초보, 기본 30판씩. 판 수를 줄 수 있다):

```powershell
npm.cmd run test:bots -- 10
```

로그와 스크린샷은 `tools/tests/out/` 에 남는다 (git 에는 안 올라간다).
통과 기준: 끝까지 돌고, `FAILS:` 가 0 이고, `errors:` 줄이 모두 `[]`.

| 파일 | 하는 일 |
|---|---|
| equip | 장비(지게·손전등·성냥·방독면·우비·칼·소모품·밧줄) 효과 |
| camp | 거점 단계(텐트·바위굴·집), 저장고, 잠자리 |
| settings | 설정 화면 |
| secure-scout | 자리 안정, 위험한 길 막기, 정찰 |
| places | 고정 지도, 자리 사건 잇기, 기억, 엔딩 회상 |
| trail-marks | 흔적 표시 |
| map-view | 지도 화면, 말풍선, 거리 |
| wear-crisis | 장비 마모, 정비, 고비, 라디오, 건전지 |
| all-events | 모든 사건의 모든 선택지 강제 통과 |
| bot-trail | 흔적 봇 30판 (bot-sim 과 bot-radiation 이 이 봇을 읽는다) |
| bot-sim | 봇 한 종류 계측: `node tools/tests/bot-sim.cjs tools/tests/out trail 30` (trail·ridge·naive). 서버가 떠 있어야 한다 |
| bot-radiation | 흔적 봇의 피폭이 어디서 쌓이는지. 서버가 떠 있어야 한다 |
| run | 위 테스트를 서버와 함께 돌리고 판정하는 실행기 |

서버 없이 도는 것은 `run` 뿐이다. 나머지를 직접 돌릴 때는 먼저 `npx.cmd vite --port 4174 --strictPort` 를 띄운다.
