# 삽화 넣는 곳

파일 이름만 맞추면 코드 수정 없이 바로 쓰인다. 없는 파일은 조용히 무시된다.

- `scene-<종류>.webp` (또는 png) 정사각형(1024×1024). 종류: start, peak, pass, temple, shelter, village, valley, spring, military, goal
- `event-<이벤트 id>.webp` (또는 png) 가로 띠(3:1, 1536×512). id 는 `src/data/events.ts` 의 id
- `title.webp` (또는 png) 제목 화면 배경(16:9, 1920×1080)

전체 목록과 프롬프트는 `docs/art-list.md`.

아이콘: `obj-<사물>`, `equip-<장비>`, `supply-<보급품>` (512×512). 보강 카드: `upgrade-<이름>` (768×512). 엔딩: `ending-<이름>` (16:9).
스토어용 이미지는 번들에 넣지 않으므로 저장소 루트의 `store/` 에 둔다.
