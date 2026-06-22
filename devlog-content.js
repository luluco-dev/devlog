const DEVLOG_MD = `# DevLog

---

## 2026-04-10

### 아이템 시스템 (막대기 + 동반자)

- \`ItemBase\`, \`ItemSlot\`, \`CostPool\`, \`ItemManager\` 구현
  - CostPool: 아이템 사용/회수 시 코스트 관리
  - ItemSlot: 아이템 + 동반자 부여 상태 관리
  - ItemManager: Update 루프에서 UseItem / RecallItem / GrantCompanion / PrevItem / NextItem 입력 처리
- \`StickItem\`, \`StickProjectile\` 구현
  - 중력 없이 일직선으로 날아가 벽에 박히는 막대기
  - 박힌 위치 보정: contact point 기준으로 끝점이 벽 표면에 오도록 위치 조정
  - 스프라이트 레이어 order로 벽 안으로 살짝 들어가는 부분 가림 (프로토타입)
- \`CompanionItem\` 구현
  - 동반자 부여 후 던지면 막대기 착지 시 파트너 텔레포트
- \`RaccoonController\` 확장
  - \`RaccoonState\` (Follow / POV / Waiting) 도입
  - \`TeleportToStick\`: 텔레포트 후 카메라 이동 완료까지 입력 잠금 (UnlockAfterCameraSettle 코루틴)
  - 점프 버퍼 (\`jumpBufferTime = 0.12f\`): 모서리 착지 시 점프 누락 방지
  - OverlapBox → OverlapCircle: 지면 감지 안정성 개선
  - 점프 시 \`rb.position += Vector2.up * 0.05f\`: 코너 마찰로 점프 속도 죽는 현상 방지
  - \`isInputLocked\`를 이동/점프 입력에도 적용

### 씬 전환 연동 (막대기 상태 유지)

- \`StickItem.SaveState\` / \`RestoreState\` 구현
  - 플레이어 씬 언로드 전 막대기 위치 저장
  - 씬 복원 시 저장된 위치에 막대기 재생성 (Kinematic 상태)
- \`PlayerRoot.SaveItemState\` / \`RestoreItemState\` 노출
- \`SceneTransitionManager\` 3곳에 호출 연결
  - 라쿤 단독 전환 / SwitchToRaccoon 시 SaveItemState
  - RestorePlayer 시 RestoreItemState

---

## 2026-04-11

### 씬 너머 막대기 던지기

- \`TransitionPoint\`: Stick 레이어 감지 추가
  - Flying 상태 막대기만 처리 (\`IsStuck\` 체크로 복원된 막대기 재트리거 방지)
  - 통과 시 \`offset = 막대기 위치 - TransitionPoint 위치\` 저장 후 Destroy
  - 동반자 부여 상태이면 \`triggeredByStick = true\`로 씬 전환 트리거
- \`StickItem\`: 크로스씬 처리 추가
  - \`SetCrossSceneOffset()\`: offset + flyDir 저장
  - \`RestoreStateAtEntrance()\`: B씬 entrance 위치 기준으로 Flying 상태로 복원
  - \`Recall()\`: 크로스씬 상태에서 \`SwitchToPlayer()\` 호출
- \`SceneTransitionManager\` 수정
  - \`TransitionData\`에 \`triggeredByStick\` 플래그 추가
  - 막대기 복원 시 \`entrance.SetIgnoreStick(true)\` → 1 FixedUpdate 후 해제 (재트리거 방지)
  - \`triggeredByStick\` 전환 시 동반자 entrance 배치 스킵 → 막대기 박힌 후 \`HandleStuck\`에서 텔레포트
- \`CompanionItem.Recall()\`: 크로스씬 상태에서 \`SwitchToPlayer()\` 호출
- Player ↔ Stick 레이어 충돌 무시 추가 (스폰 시 충돌로 박히는 버그 수정)

### TODO

- ~~크로스씬 동반자 회수 스펙 확정 후 수정 예정~~ → 완료 (2026-04-12)
- 나중에: preload 방식으로 두 씬 동시 로드 상태에서 구현 (현재는 A씬 언로드 방식)

---

## 2026-04-12

### 크로스씬 동반자 회수 동작 수정

- \`StickItem.Recall()\` 수정
  - 크로스씬 상태(IsPlayerHidden)에서 K 회수 시 \`SwitchToPlayer()\` 대신 아무것도 호출하지 않음
  - 기존 버그: \`ExitPOV()\` 호출 시 \`isPOV = false\` → \`Update()\` 입력 차단으로 이동 불가
  - 수정 후: 라쿤이 B씬에서 POV 상태 유지, 막대기만 회수 후 자유롭게 이동 가능
  - E키(Interact)로 A씬 복귀는 \`RaccoonController.Update()\` 에서 그대로 처리

---

## 2026-04-13

### 카메라 씬 세팅 (Direction Bias + Camera Bounds)

- \`CameraController\` 신규 생성 (DontDestroyOnLoad 싱글턴)
  - Direction Bias: LateUpdate마다 FacingDirection 읽어 \`TargetOffset.x\` lerp 적용
  - Camera Bounds: \`SetBounds(Collider2D)\` — 두 vCam의 \`CinemachineConfiner2D\` 갱신
  - Planet of Lana 참조값: \`lookAheadDistance=1.8f\`, \`lookAheadSpeed=1.2f\`
- \`SceneCameraSettings\` 신규 생성
  - 씬마다 배치, Collider2D로 카메라 이동 범위 지정
  - \`Start()\`에서 CameraController에 Bounds 등록 (Awake 타이밍 이슈 수정)
- \`RaccoonController\`: \`FacingDirection\` 파생 프로퍼티 추가 (\`spriteRenderer.flipX\` 기반)
- \`PlayerRoot\`: \`GetMovement()\` 추가
- PlayerCam X Damping 0.5 → 1.0 조정 (Planet of Lana 참조)

---

## 2026-04-14

### 패럴랙스 스크롤링 (Perspective 카메라)

- Perspective 카메라 방식으로 패럴랙스 구현 확정
  - Cinemachine 카메라 및 Main Camera 모두 Perspective로 변경 (FOV 33.4°)
  - Z축 배치만으로 패럴랙스 자동 처리 — 별도 이동 스크립트 불필요
  - Z 높을수록 느리게, 낮을수록 빠르게 이동 (카메라 Z=-10 기준)
- \`ParallaxLayer\` 제거
  - 배경 크기 자동 조정 기능이었으나 스프라이트를 충분히 크게 만드는 방식으로 대체
  - \`CameraController\`에서 관련 코드 전부 제거

### 맵 에디터 SpawnSetting 개선

- \`ImportSceneAsPrefab\` → 씬 오브젝트를 프리팹 없이 현재 씬 Hierarchy에 직접 복사하는 방식으로 변경
  - 기존: 씬 전체를 프리팹화 후 인스턴스 배치 (언팩 필요)
  - 변경: 루트 오브젝트들을 Instantiate로 복사 후 씬에 바로 배치
  - \`CloseScene\` 파라미터 \`false\` → \`true\` 수정 (not loaded 씬 Hierarchy 잔류 버그 수정)
- \`TemplateScene\` 구성
  - CameraController, SceneCameraSettings, Player, Partner, 배경 Hierarchy 구조 포함
  - 아티스트가 SpawnSetting으로 가져와 배경 배치 및 패럴랙스 테스트 가능

---

## 2026-04-15

### 섬광 폭발물 (BombItem) 구현

**새로 생성**
- \`Assets/Scripts/Item/BombItem.cs\` — 설치형 폭발물 아이템 로직
  - Use: PC 앞 1 Unit에 배치, 낙하 지원 (바닥 없으면 수직 낙하)
  - Reuse: 섬광 토글 (코스트 1 추가 소모 / 이미 부여 시 환불)
  - Recall: 3초 쿨다운 후 기폭, 반경 1 Unit 폭발 (섬광 부여 시 4 Unit)
  - 동반자 부여: 라쿤이 폭탄 위치로 텔레포트 후 POV 진입
- \`Assets/Scripts/Item/BombObject.cs\` — 배치된 폭발물 오브젝트
  - Rigidbody2D로 중간 속도 낙하 (FreezeRotation은 Inspector 설정)
  - 3초 경과 시 색상 변경으로 기폭 가능 여부 시각 피드백
  - Collider2D.bounds.center 기준으로 blast 방향 계산, X축으로만 AddForce(Impulse) 적용
  - 플레이어 + POV 상태 동반자 모두 blast 적용

**수정**
- \`ItemBase.cs\` — TryUse/TryRecall virtual 추가, WithCompanion protected set
- \`PlayerRoot.cs\` — BombItem 등록, SetPendingTransitionType/ConsumePendingTransitionType 추가
- \`PlayerMovement.cs\` — KnockbackTimer + ApplyKnockback() 추가
- \`IdleState.cs\` / \`MoveState.cs\` — KnockbackTimer 동안 X축 velocity 덮어쓰기 방지
- \`RaccoonController.cs\` — Bomb 레이어 ↔ Player, Partner 충돌 무시 추가
- \`ItemManager.cs\` — 슬롯/사용 로그를 GetType().Name 기반으로 개선

### TransitionType enum 추가

- \`SceneTransitionManager.cs\` — \`TransitionType { Default, Stick, Bomb }\` enum 정의, \`TransitionData.triggeredByStick\` → \`type\` 교체, \`carryVelocity\` 필드 추가, Bomb 타입 velocity 복원 로직
- \`TransitionPoint.cs\` — 플레이어 진입 시 PendingTransitionType 읽어 TransitionData에 Bomb velocity 전달

### 기타

- \`MapEditorWindow.cs\` — deprecated \`TextureImporter.spritesheet\` → \`ISpriteEditorDataProvider\` (GetSpriteRects/SetSpriteRects)로 교체

### 에디터 작업 미완
- Bomb 프리팹 생성 필요 (Rigidbody2D + BombObject + Collider2D, Freeze Rotation Z 체크, Bomb 레이어 설정)
- Player 오브젝트 BombItem 컴포넌트에 bombPrefab 연결 필요

---

## 2026-04-18

### 네이밍 전면 교체

- \`TeamSeekers.*\` → \`TeamPluto.*\` 네임스페이스 전체 교체 (전체 .cs 파일)
- \`RaccoonController\` → \`PartnerController\`, \`RaccoonState\` → \`PartnerState\`
- 파일 이동: \`Scripts/Raccoon/RaccoonController.cs\` → \`Scripts/Partner/PartnerController.cs\`
- \`raccoon*\` 변수/필드명 전체 → \`partner*\`

### 아이템 키 매핑 재정의

- E키: POV 전환 완전 제거 → 순수 상호작용 전용
- J/K/L 키 역할 확정: J=Use/Reuse, K=Recall, L=동반자 부여
- \`CompanionItem\`: J로 POV 진입/해제, 씬 전환 로직 흡수 (\`SwitchToPartner\` / \`SwitchToPlayer\`), **코스트 소모 없음**

### ItemBase 구조 변경

- \`ItemType\` enum 추가 (\`Companion\`, \`Stick\`, \`Bomb\`)
- \`abstract ItemType Type\` 프로퍼티 — 외부 식별 및 로그 활용
- \`virtual bool ReuseFree\` 플래그 — Reuse 코스트 여부를 base에서 처리
- \`ItemManager.LogSlots()\` 에서 \`Type\` 출력

### ItemManager 개선

- \`TryUseSelected()\`, \`RecallSelected()\`, \`SelectPrev()\`, \`SelectNext()\` public 메서드 추가
- POV 상태 파트너에서 J/K/PrevItem/NextItem 아이템 조작 가능

### 폭발물 동작 수정

- \`ApplyBlastToPlayer\` → \`ApplyBlastToPartner\`: 플레이어 blast 제거, 동반자만 밀림
- \`PartnerController.ApplyKnockback()\` 추가, \`HandleFollowMovement\`에서 knockback/inputLocked 중 velocity 덮어쓰기 방지
- \`BombObject.hasSettled\`: 착지 후 Kinematic 전환 → 플레이어/파트너 충돌로 밀림 방지
- Player ↔ Bomb, Partner ↔ Bomb 충돌 복원 (IgnoreLayerCollision false)

### 폭발물 파트너 씬 전환 추가

- \`PartnerController.IsKnockedBack\` 프로퍼티 노출
- \`TransitionPoint\`: 파트너 knockback 중 TransitionPoint 진입 허용, \`carryVelocity\` 저장
- \`SceneTransitionManager\`: 파트너 Bomb 전환 시 \`ForceEnterPOV()\` + \`carryVelocity\` 복원

### 에디터 작업 미완
- Bomb 프리팹 생성 필요 (Rigidbody2D + BombObject + Collider2D, Freeze Rotation Z 체크, Bomb 레이어 설정)
- Player 오브젝트 BombItem 컴포넌트 추가 및 bombPrefab 연결
- RaccoonController 컴포넌트 → PartnerController 교체 (Inspector 재연결 필요)
- SceneTransitionManager, CameraController Inspector 필드 재연결 (\`partnerController\`, \`partnerVCam\`)

---

## 2026-04-19

### ActiveController enum — POV 중 아이템 입력 차단

- \`ItemManager\`에 \`ActiveController { Player, Partner }\` enum 추가
- \`SetActiveController()\` 메서드로 외부에서 제어
- POV 진입 시 \`ActiveController.Partner\` → \`ItemManager.Update()\` 전체 차단 (L/Prev/Next 포함)
- POV 해제 시 \`ActiveController.Player\` 복원
- PartnerController POV 포워딩: J(UseItem) / K(RecallItem) 만 유지

### POV 진입 시 Companion 슬롯 자동 선택

- \`ItemManager.SelectCompanion()\` 추가 — ItemType.Companion 슬롯을 찾아 자동 전환
- \`PartnerController.TogglePOV()\` POV 진입 시 호출
- 폭발물로 씬 전환 후 POV 상태에서 J/K가 BombItem 대신 CompanionItem에 작용

### 폭발물 씬 전환 시 blast 힘 전달 수정

- \`ApplyCarryVelocity(Vector2, float)\` 추가 — velocity 직접 설정 + knockbackTimer 동시 리셋
  - 기존 방식: \`linearVelocity\` 직접 설정 → 다음 FixedUpdate에서 HandlePOVMovement가 덮어써 힘 소실
- \`HandlePOVMovement\`: knockbackTimer > 0 중 velocity 덮어쓰기 방지 (\`return\` 추가)
- 씬 전환 중 Kinematic 고정 제거 → Dynamic 유지로 자연낙하 착지 후 FadeIn 완료 시 blast 힘 적용
  - 기존: entrance 위치(지면 위)에 Kinematic 고정 → 화면에 떠있는 상태로 등장
  - 수정: 화면 꺼진 동안 자연낙하 착지 → FadeIn 후 \`ApplyCarryVelocity\`로 수평 blast 힘 인가

---

## 2026-04-21

### 맵 에디터 Place Mode 추가

- \`MapEditorWindow.cs\` 탭 정리
  - "Transform" 탭 제거 (미구현 상태였음)
  - 탭 순서: \`None\`, \`SpawnSetting\`
- **Place Mode** 추가 (Scene View 직접 배치)
  - None 탭 상단에 토글 버튼 (활성 시 녹색 표시) + Z 깊이 입력 필드
  - \`SceneView.duringSceneGui += OnSceneGUI\` 로 Scene View 마우스 이벤트 수신
  - 마우스 위치에 선택 스프라이트 바운드 기준 노란 아웃라인 프리뷰 렌더링
  - 좌클릭 시 해당 위치에 프리팹 인스턴스 배치 + Undo 지원
  - ESC 키로 Place Mode 종료
- \`EnsurePrefab()\` 헬퍼 추출
  - 기존 \`SpawnSprites()\`에 인라인이던 프리팹 생성/조회 로직 분리
  - \`SpawnSprites()\` / \`PlaceAt()\` 양쪽에서 재사용

---

## 2026-04-22

### 씬 메모리 유지 방식 전환 (SetActive Hide/Show)

- \`SceneTransitionManager.cs\`
  - \`currentScene\` 필드 추가 — Scene 오브젝트 직접 추적
  - \`SetSceneVisible(Scene, bool)\` 헬퍼 — 씬 루트 오브젝트 전체 SetActive
  - \`EnsureSceneLoaded(address)\` 헬퍼 — 최초 1회만 로드, 로드 직후 즉시 Hide
  - \`ShowScene(address)\` 헬퍼 — SetActiveScene + 루트 오브젝트 표시
  - \`TransitionRoutine\` / \`SwitchToPlayerRoutine\` / \`SwitchToPartnerRoutine\` — \`UnloadSceneRoutine\` 호출 전부 제거, Hide→Show 패턴으로 교체
  - \`FindEntrance()\` — \`GetComponentsInChildren(true)\` 로 비활성 오브젝트도 탐색
- \`SceneCameraSettings.cs\` — \`Start()\` → \`OnEnable()\` 교체 (씬 재표시 시 카메라 바운드 재등록)
- \`StickItem.RestoreState()\` — \`current != null\` 시 즉시 return (씬이 메모리에 유지되므로 원본 그대로 사용, 중복 생성 방지)

### 막대기-동반자 충돌 예외처리

- \`StickProjectile.cs\` — \`IgnoreCollisionWith(Collider2D, float)\` 추가
  - \`Physics2D.IgnoreCollision\` (per-collider) 방식, duration 후 복원
  - 전역 레이어 무시(\`IgnoreLayerCollision\`)와 달리 특정 두 콜라이더 사이만 영향
- \`StickItem.cs\`
  - \`throwHeightOffset\` 필드 추가 (기본 0.5f) — 파트너 머리 위 높이로 스폰
  - \`Throw()\` 수정: \`!WithCompanion\` 일 때만 0.3초 충돌 무시 적용
    - WithCompanion 시 파트너가 막대기에 올라타야 하므로 무시하면 안 됨

### 폭발물 개선

- \`BombObject.cs\`
  - \`IsOnGround()\` private 메서드 추가 — 하향 Raycast로 Ground 레이어 감지
  - 정착(Kinematic 전환) 조건에 \`IsOnGround()\` 추가 — 동반자 위에 착지 시 중력 유지
  - \`StartPush()\` / \`EndPush(fellOff)\` 추가 — 파트너 밀기 상태 지원
  - \`HasFloorBelow()\` public 노출

### 폭발물 씬 전환 시 동반자 재사용 상태 설정

- \`PlayerRoot.cs\` — \`ForceDeployCompanion()\` 추가 (CompanionItem.ForceDeployed + NotifyStateChanged)
- \`SceneTransitionManager.cs\` — Bomb 타입 전환 시 \`ForceEnterPOV()\` 직후 \`playerRoot.ForceDeployCompanion()\` 호출
  - 막대기 WithCompanion 케이스(\`HandleStuck\`)와 동일한 패턴으로 통일

### 크로스씬 막대기 버그 수정

- \`TransitionPoint.cs\` — Stick 레이어 진입 시 Rigidbody2D velocity로 실제 flyDir 추출
  - 기존: \`movement.FacingDirection\` 기반 (X축 단위 벡터) → 실제 속도 방향 아님
  - 수정: \`stickRb.linearVelocity.normalized\` 사용, sqrMagnitude 조건 없으면 \`Vector2.right\` 폴백
- \`StickItem.SetCrossSceneOffset()\` — \`flyDir\` 파라미터 추가 (실제 속도 방향 수신)
- \`StickItem.RestoreStateAtEntrance()\` — 스폰 Y 좌표 수정
  - 기존: offset을 normalized해서 작은 값으로 계산됨
  - 수정: \`crossSceneOffset.Value.y\` 그대로 사용 (TransitionPoint 기준 상대 높이)
- \`StickProjectile.cs\` — \`FixedUpdate\`에서 velocity 지속 유지 추가
  - 씬 전환 코루틴 타이밍에 의해 \`Launch()\`에서 설정한 velocity가 사라지는 문제 방지
  - \`hasLanded == false && flySpeed > 0f\` 조건 중 매 FixedUpdate마다 \`rb.linearVelocity = flyDir * flySpeed\`
- \`StickItem.RestoreStateAtEntrance()\` — \`Launch\` → \`LaunchWithColliderDelay(0.2f)\` 교체
  - 버그: 동반자가 입구 근처에 서있으면 스폰된 막대기가 동반자에 즉시 충돌해 박힘
  - 수정: 0.2초간 Collider2D 비활성 후 복원 → 동반자 통과 후 벽에 정상 착지
  - 주의: \`Physics2D.IgnoreLayerCollision(partnerLayer, stickLayer)\` 전역 무시는 사용 불가 (동반자가 막대기 위에 올라타는 케이스 존재)

---

## 2026-04-23

### 폭발물-막대기 상호작용 구현

- \`StickItem.cs\`
  - E키 상호작용 — 폭발물 위에 막대기 꽂기
    - \`TryInteract(CostPool)\`: 주변 폭발물 감지 후 코스트 1 소모, \`AwaitingDirection\` 상태 진입
    - \`Update()\` — \`AwaitingDirection\` 중 방향키 입력으로 5방향(우/좌/위/우상/좌상) 스냅, 장애물 레이캐스트로 유효 방향 필터링
    - 유효 방향 프리뷰 인스턴스(\`preview\`) 실시간 갱신, 반투명(alpha 0.4) 표시
    - \`PlantOnBomb()\`: 폭발물 콜라이더 edge + dir * HalfLength 위치에 방향 맞게 막대기 고정, \`OnExplode\` 구독
    - \`HandleBombExplode()\`: 폭발물-막대기 콜라이더 충돌 무시, stickPos-bombCenter 방향을 5방향 스냅 후 \`Relaunch()\`
    - \`GetPlantPos()\`: \`bombEdge + dir * projectilePrefab.HalfLength\` — 막대기 끝이 폭발물 표면에 맞닿도록 오프셋 적용
  - \`Recall()\`: \`OnExplode\` 구독 해제 추가

- \`BombObject.cs\`
  - \`OnExplode\` 이벤트 추가 — \`Explode()\` 시작 시 발생 (Destroy 전)

- \`StickProjectile.cs\`
  - \`HalfLength\` 프로퍼티 노출 (\`halfLength\` SerializeField 기반)
  - \`Relaunch(Vector2 dir, float speed)\` 추가 — hasLanded 리셋, Kinematic → Dynamic 복원 후 재발사

### 폭발물 파트너 밀기/당기기 구현

- \`PartnerController.cs\`
  - \`PartnerState.Push\` 추가
  - \`pushedBombCol\` 필드 추가 — 밀기 진입 시 \`Physics2D.IgnoreCollision(partnerCol, pushedBombCol, true)\`, 해제 시 복원
    - 파트너 콜라이더가 폭발물에 막혀 한쪽 방향만 작동하던 버그 수정
  - \`TryEnterPush()\`: OverlapBox로 인접 폭발물 감지, \`StartPush()\` 호출, \`pushedBombOffsetX\` 저장
  - \`ExitPush(fellOff)\`: 충돌 복원, \`EndPush()\` 호출
  - \`HandlePushMovement()\`: 파트너 이동에 고정 오프셋만큼 폭발물 위치 동기화, 발판 없으면 \`ExitPush(fellOff: true)\`
  - \`Update()\`: E키 입력 — POV 상태에서 \`TryEnterPush\`, Push 상태에서 \`ExitPush\`

- \`BombObject.cs\`
  - \`StartPush()\` / \`EndPush(fellOff)\` 추가
  - \`HasFloorBelow()\` 노출 — 파트너 밀기 중 낙하 판단에 사용

### 방향 선택 대기 중 입력 잠금

- \`PlayerMovement.cs\`
  - \`IsMovementLocked\` 프로퍼티 + \`SetMovementLocked(bool)\` 추가
  - 잠금 시 수평 velocity 즉시 0, 잠금 해제 시 정상 복원
- \`IdleState.cs\` — \`IsMovementLocked\` 시 상태 전환 차단
- \`MoveState.cs\` — \`IsMovementLocked\` 시 Idle 강제 전환, FixedUpdate 수평 velocity 0
- \`JumpState.cs\` — \`IsMovementLocked\` 시 착지 후 MoveState 진입 차단, 수평 이동 0
- \`ItemManager.cs\`
  - \`SetItemInputLocked(bool)\` 추가 — 잠금 시 J(Use) / K(Recall) / L(Companion) 입력 차단
  - E(Interact) 는 방향 확정에 필요하므로 유지
- \`StickItem.cs\` — \`AwaitingDirection\` 진입/해제 시 이동 잠금 + 아이템 입력 잠금 연동
  - 해제 경로: \`PlantOnBomb()\`, 폭발물 소멸 감지, 전방향 막힘, \`Recall()\`

### 버그 수정 및 기능 보완

- \`JumpState.cs\`
  - \`FixedUpdate\`에서 \`SetFacingDirection\` 누락 수정
  - 공중에서 방향 전환 후 막대기 던질 시 이전 방향으로 날아가던 버그 수정

- \`StickItem.cs\`
  - \`TryUse()\` 오버라이드 추가 — \`stickState == Stuck\` 상태에서 J 입력 시 코스트 소모 없이 무시
    - 폭발물에 꽂은 막대기가 폭발 후 벽에 재박힌 뒤 J를 눌러도 코스트가 소모되던 버그 수정
  - \`PlantOnBomb()\`에 \`current.SetTrackedTarget(targetBomb.transform)\` 추가
    - E키 꽂기는 충돌 없이 코드로 배치되므로 \`OnCollisionEnter2D\`가 미동작해 추종 미등록이던 문제 수정

- \`StickProjectile.cs\`
  - \`trackedTarget\`, \`lastTargetRot\`, \`localOffset\` 필드 추가
  - \`OnCollisionEnter2D\` — \`col.rigidbody != null\`이면 충돌 오브젝트를 추종 대상으로 등록
  - \`FixedUpdate\` — Stuck 상태에서 \`trackedTarget\` 있으면 \`rb.position\`으로 이동/회전 동기화
  - \`SetTrackedTarget(Transform)\` 추가 — 외부 수동 등록용
  - \`Relaunch()\` — 추종 대상 해제 추가

- \`BombObject.cs\`
  - \`SnapToGround()\` 추가 — 자체 \`groundLayer\`로 하향 레이캐스트, 즉시 지면 스냅
    - 동반자 부여 설치 시 폭탄 낙하 중 콜라이더 비활성 구간에서 파트너가 아래로 떨어지던 문제 해결

- \`PartnerController.cs\`
  - \`TeleportToBomb(Vector2 bombPos, BombObject bomb)\` 추가
    - 동반자 부여 폭발물 설치 시 파트너 탑승 + Push 자동 진입
    - \`isRidingBomb = true\`, \`pushedBombOffsetX = 0\` — 파트너 X 이동이 폭탄에 그대로 전달
    - \`IgnoreCollision\` 미적용 (탑승은 위에 올라타므로 통과 방지)
  - \`isRidingBomb\`, \`rideYOffset\` 필드 추가
    - \`HandlePushMovement()\` 탑승 분기: 매 FixedUpdate마다 \`rb.position.y\` 강제 고정, Y velocity 0 유지
    - 일반 Push(E키 옆 밀기)와 탑승 Push(동반자 부여) 분리 처리
  - \`TryEnterPush()\` — 파트너 Y가 폭탄 중심보다 높으면 진입 차단
    - 폭탄 위에 있을 때 E키로 Push 진입되던 버그 수정
  - \`HandlePushMovement()\` 상단 \`knockbackTimer > 0f\` 체크 추가
    - 폭발 임펄스가 velocity 덮어쓰기로 취소되고 파트너가 0.4초간 입력 불가 상태가 되던 버그 수정
  - \`ExitPush()\` — \`isRidingBomb = false\` 리셋
  - \`pushEnterGrace\` 추가 — 탑승 진입 직후 \`HasFloorBelow()\` 조기 실패 방지

- \`BombItem.cs\`
  - WithCompanion 설치 시: \`SnapToGround()\` → \`StartPush()\` → \`TeleportToBomb()\` 순서 호출
  - \`ForceDeployCompanion()\` 호출 추가 — 동반자 부여 폭발물 설치 후 J를 두 번 눌러야 전환되던 버그 수정

---

## 2026-04-28

### 신호기 (BeaconItem) 구현

**새로 생성**
- \`Assets/Scripts/Item/BeaconItem.cs\` — 비설치형 신호기 아이템
  - Use(J): 이동 잠금, \`pendingDir = Vector2.up\` 초기화, directionLabel UI 표시
  - Reuse(J): \`pendingDir\`를 \`inputSequence(List<Vector2>)\`에 추가 → BeaconTestData SO와 비교 → 로그 출력
  - Recall(K): 시퀀스 초기화, 이동 잠금 해제, UI 숨김
  - IsDeployed는 TryRecall()만 false로 변경 — CompanionItem(토글)과 달리 Reuse는 상태 유지
  - 8방향 스냅: dot product 기반 \`SnapTo8Dir()\`, 각도 기반 \`DirToString()\` (float 정밀도 문제 우회)
  - 방향 UI 레이블: 유니코드 화살표 → ASCII (U/D/L/R/UR/UL/DR/DL) — LiberationSans 폰트 미지원
- \`Assets/Scripts/Item/IBeaconTarget.cs\` — \`OnBeaconSignal(Vector2 direction)\` 인터페이스
- \`Assets/Scripts/Item/BeaconTestData.cs\` — \`Vector2[] testSequence\` ScriptableObject

**시퀀스 비교 로직**
- Reuse마다 입력 로그 출력 (\`[Beacon] 입력 N번째: X\`)
- 해당 인덱스 위치 불일치 시 \`"틀렸습니다 (N번째)"\` 로그 + 자동 회수
- 전체 일치 시 \`"시퀀스 일치!"\` 로그 + 자동 회수
- 최대 10개 초과 시 시퀀스 전체 초기화

**수정**
- \`ItemBase.cs\` — \`ItemType.Beacon\` 추가, \`virtual bool LogOnUse\` 프로퍼티 추가
- \`ItemManager.cs\` — \`isBeaconActive\` 플래그 + \`SetBeaconActive()\` 추가
  - beacon 활성 중 L(동반자 부여) / PrevItem / NextItem 차단
  - \`TryUseSelected()\` 로그를 \`LogOnUse\` 조건으로 분기 (Beacon은 미출력)
- \`PlayerRoot.cs\` — BeaconItem 등록, items 배열을 List 기반으로 유연하게 구성

### 에디터 작업 미완
- Player 오브젝트에 BeaconItem 컴포넌트 추가 필요
- BeaconTestData SO 생성 및 testSequence 입력, BeaconItem에 연결 필요
- directionLabel TextMeshProUGUI 연결 필요

---

## 2026-04-29

### GameSettings 허브 (Odin Inspector)

- \`Assets/Scripts/Settings/GameSettings.cs\` 신규 생성
  - Odin Inspector \`[TabGroup]\` + \`[InlineEditor]\` 활용
  - Player 탭: PlayerMovement / ItemManager / StickItem / BombItem / BeaconItem
  - Partner 탭: PartnerController
  - Camera 탭: CameraController
  - 모든 레퍼런스 SerializeField — Inspector에서 드래그 연결
  - 각 컴포넌트를 인라인으로 표시, 수정값은 실제 컴포넌트에 직접 반영

### 전환 가능 거리 범위 표시

- \`PartnerController.cs\`
  - \`4f\` 하드코딩 3군데 → \`[SerializeField] private float recallRange = 4f;\` 통일
  - \`public float RecallRange\` 프로퍼티 노출
  - Awake에서 \`recallRangeIndicator\` 스케일 \`recallRange * 2\`로 자동 설정
  - \`SetActive\` 방식 → DOTween \`DOColor\` 색상 전환 방식으로 교체
    - Follow 상태: 완전 투명
    - 비Follow + 범위 밖: 흰색 반투명 (범위 인지)
    - 비Follow + 범위 안: 초록색 (K 전환 가능 신호)
  - 상태 변경 시에만 DOTween 호출 (\`RangeIndicatorState\` enum으로 중복 방지)
  - \`OnDrawGizmos()\` 반지름도 \`recallRange\` 참조로 통일
- \`CompanionItem.cs\` — \`dist <= 4f\` → \`dist <= partner.RecallRange\` 참조

### 에디터 작업 미완
- Partner 오브젝트 하위에 원형 스프라이트 오브젝트 생성 → \`recallRangeIndicator\` 연결 필요
- GameSettings 오브젝트 생성 후 각 컴포넌트 드래그 연결 필요

### Inspector 한글화 (Odin PropertyTooltip + LabelText)

기획자가 조정할 수치값 필드에 \`[LabelText]\` (항상 보이는 한글 라벨) + \`[PropertyTooltip]\` (호버 시 상세 설명) 추가.

- \`PlayerMovement.cs\` — 이동 속도 / 점프 높이 / 점프 정점 도달 시간 / 낙하 중력 배수
- \`ItemManager.cs\` — 최대 코스트
- \`StickItem.cs\` — 발사 속도 / 발사 높이 오프셋 / 상호작용 범위 / 꽂기 거리
- \`BeaconItem.cs\` — 신호 감지 반경
- \`CameraController.cs\` — 전방 시야 거리 / 전방 시야 전환 속도
- \`PartnerController.cs\` — 따라가기 간격 / 최대 추적 속도 / 추적 부드러움 / 최대 추적 거리 / 이동 속도 / 전환 가능 거리 / 밀기 감지 범위 / 점프 높이 / 점프 정점 도달 시간 / 낙하 중력 배수 / 최대 점프 횟수 / 점프 버퍼 시간
- \`InlineEditor\` NullReferenceException — 인스펙터 초기화 시 한 번 뜨는 알려진 Odin 버그, 기능 영향 없음

### 막대기 프리뷰 충돌 버그 수정

- \`StickItem.cs\` — \`UpdatePreview()\` 프리뷰 생성 시 \`Collider2D\` 비활성화
  - 폭발물에 막대기 꽂기 방향 선택 중(AwaitingDirection) 프리뷰 오브젝트가 동반자와 충돌하던 버그 수정
  - 프리뷰는 순수 시각 표시용이므로 물리 콜라이더 불필요

---

## 2026-05-06

### 사다리 시스템 구현

- \`PlayerMovement.cs\` — bool 플래그 방식으로 사다리 이동 구현 (별도 State 없음)
  - \`ladderLayer\` SerializeField 추가 — 사다리 레이어 지정
  - \`isInLadderZone\` / \`isOnLadder\` 플래그 분리
    - \`isInLadderZone\`: 트리거 안에 있는지 (\`OnTriggerEnter/Exit2D\`로 관리)
    - \`isOnLadder\`: 실제로 타고 있는지 (위 키 누를 때만 \`true\`)
  - \`Update()\` — \`isInLadderZone && MoveInput.y > 0\` 시 사다리 모드 진입, 활성 중 상태머신 Update 스킵
  - \`FixedUpdate()\` — 사다리 모드 중 gravity=0, velocity=(0, MoveInput.y * MoveSpeed), 상태머신 FixedUpdate 스킵
  - \`HandleLadder()\` — Jump 입력 시 사다리 해제 + JumpState 전환
  - 사다리 트리거 이탈 시 \`isOnLadder = false\` + gravity 복원
  - \`snapXToLadder\` SerializeField(bool, 기본 true) — 사다리 진입 시 \`currentLadderCollider.bounds.center.x\`로 플레이어 X 스냅, Inspector에서 토글 가능
  - \`ladderHasLeftGround\` 플래그 — 진입 후 한 번이라도 지면을 벗어나야 \`IsGrounded()\` 이탈 체크 활성화 (JumpState의 hasLeftGround 패턴 동일)
    - 진입 직후 IsGrounded=true로 즉시 이탈하던 예외 방지
    - 하강 중 바닥에 닿으면 자동으로 IdleState 이탈

### 에디터 작업 미완 / 추후 고려

- 사다리 상단 스냅 미구현
  - 사다리를 다 올라갔을 때 위 키를 계속 누르고 있지 않으면 트리거를 벗어나는 순간 낙하하는 현상 존재
  - 해결 방안: 사다리 상단에 별도 트리거 배치, 진입 시 \`PlayerRoot.TeleportTo()\`로 플랫폼 위 지점 강제 스냅
  - \`TeleportTo()\`는 이미 구현되어 있어 연결 용이

### 버그 수정

- \`StickItem.cs\` — Flying 상태에서 J 입력 시 코스트 소모되던 버그 수정
  - 기존: \`IsDeployed && stickState == Stuck\`만 차단 → Flying 중 \`base.TryUse\` 호출돼 코스트 소모 + \`Reuse()\`(빈 메서드) 실행
  - 수정: \`IsDeployed\`면 전부 차단 (\`if (IsDeployed) return;\`)

---

## 2026-05-08

### 플랫폼 시스템 구현

- \`PlatformType\` enum 도입: \`Solid\`, \`OneWay\`, \`Trap\`
- \`Platform.cs\` 단일 컴포넌트로 3가지 타입 통합 관리
  - Awake에서 타입에 따라 Collider2D / PlatformEffector2D 자동 구성
  - Solid: BoxCollider2D만, 완전 막힘
  - OneWay: BoxCollider2D (UsedByEffector) + PlatformEffector2D (UseOneWay, surfaceArc=170f) — 아래서 통과 가능
  - Trap: isTrigger=true, \`affectedLayers\`(LayerMask)로 반응 대상 인스펙터에서 지정 → 접촉 시 \`TeleportTo(respawnPoint)\` 호출
- \`PlayerMovement.IsGrounded()\` 수정: \`rb.linearVelocity.y > 0.05f\`이면 false 반환
  - OneWay 아래 점프 중 OverlapBox가 플랫폼 콜라이더 감지해 IsGrounded=true 오작동하던 문제 방지

**설계 결정:**
- 레이어 3개 대신 레이어 1개(\`Platform\`) + enum으로 타입 구분 — 레이어 슬롯 절약, 인스펙터에서 타입 변경 용이
- \`affectedLayers\` LayerMask로 타입별 충돌 필터링 — 레이어 매트릭스 없이도 인스턴스마다 개별 설정 가능
- Trap HP 연동은 HP 시스템 구현 후 추가 예정

**에디터 작업 필요:**
- Project Settings → Tags & Layers → \`Platform\` 레이어 추가
- PlayerMovement 인스펙터 → \`groundLayer\`에 \`Platform\` 추가
- Platform 프리팹 3종 생성 (BoxCollider2D + Platform.cs, PlatformType 지정)
- Trap 프리팹 → \`affectedLayers\` 할당 (respawnPoint 제거됨)

### 플랫폼 시스템 수정

- \`Platform.cs\` — OneWay 방식 변경: \`PlatformEffector2D\` 제거 → \`Physics2D.IgnoreCollision\` 방식으로 교체
  - PlatformEffector2D는 플랫폼 회전/스케일 방향에 따라 동작이 달라지는 문제 존재
  - FixedUpdate마다 플레이어 발(bounds.min.y)과 플랫폼 위면(bounds.max.y) 비교 → 아래면 충돌 무시
- \`PlayerMovement.IsGrounded()\` — \`rb\` → \`Rb\` 수정 (PlayerMovement는 프로퍼티 Rb 사용)
- \`CheckpointManager.cs\` 신규 — 싱글톤, \`LastRespawnPoint\` / \`HasCheckpoint\` 보관
- \`Checkpoint.cs\` 신규 — 플레이어 통과 시 \`CheckpointManager.Register()\` 호출, \`respawnOffset\` 지원
- \`Platform.cs\` — Trap의 \`respawnPoint\` 제거, \`CheckpointManager.Instance.LastRespawnPoint\` 참조로 교체
  - 체크포인트 미등록 상태면 함정 무시 (\`HasCheckpoint\` 체크)

**설계 결정:**
- Trap이 특정 respawnPoint를 직접 알 필요 없음 → CheckpointManager를 통해 결합도 낮춤
- CheckpointManager는 현재 씬 오브젝트 (DDOL 아님)
- 추후 씬 전환 시 entrance 위치를 자동 등록하는 방식으로 확장 예정 (\`Assets/Docs/Notes/CheckpointSceneIntegration.md\` 참고)

### 아키텍처 논의 — VContainer + UniTask 설계 방향

실제 프로젝트 전환 시 적용할 DI 구조 정리. (\`Assets/Docs/Notes/VContainerArchitecture.md\` 참고)

- Unity 싱글톤 → VContainer 전환 시 \`Instance\` 참조 전부 생성자 주입으로 교체
- 매니저들은 순수 C# 클래스로, \`ProjectLifetimeScope\` (DDOL) 하나에서 관리
- 등록 순서 불필요 — 생성자 파라미터가 의존성 그래프 역할, 컨테이너가 위상 정렬로 순서 계산
- 비동기 초기화: \`IAsyncStartable\` — 의존 순서대로 \`StartAsync()\` await, 폴링 아님
- 오류 범위 명확: 등록 누락 / 순환 의존 → 컨테이너 빌드 시점에 즉시 예외
- MonoBehaviour 제거 → UniTask async/await 자연스럽게 사용 가능, GC 압박 감소

### Git 워크플로우 학습

팀 협업 Git 패턴 정리

- PR은 특정 커밋이 아닌 브랜치를 추적 → 머지 전까지 추가 푸시하면 자동 반영
- 머지 이후 추가 작업 시 새 브랜치 + 새 PR
- 특정 커밋만 다른 브랜치에 이식할 때 cherry-pick 사용 — 단, 의존성 있는 커밋(씬 파일 등)은 순서대로 모두 가져와야 함
- Merge: 머지 커밋 생성, 히스토리 보존 (팀 작업 / PR 머지 권장)
- Rebase: 일직선 히스토리, 커밋 해시 변경 (로컬 브랜치 정리 용도, 이미 푸시된 브랜치엔 지양)

---

## 2026-05-12

### 플랫폼 시스템 개선

- \`Platform.cs\` — OneWay 방식 재변경: \`Physics2D.IgnoreCollision\` → \`PlatformEffector2D\` 복귀
  - 매 FixedUpdate마다 플레이어별 IgnoreCollision 호출하는 방식 제거 → 엔진 레벨 처리로 C# 비용 없음
  - \`rotationalOffset = 180f\` 추가 — 기본값(0)이 천장 기준이라 바닥 플랫폼에서 방향이 반전되던 문제 수정

### 사다리 시스템 개선

- **사다리 점프 분기** (\`PlayerMovement.HandleLadder()\`)
  - 방향키 없이 점프: velocity 0 → IdleState (그냥 놓기, 낙하 후 점프 가능)
  - 방향키 + 점프: 낮은 높이로 JumpState 진입 (\`ladderJumpMultiplier = 0.6f\`, 인스펙터 조절 가능)
  - \`JumpState.SetJumpVelocityOverride(float)\` 추가 — 1회성 velocity override 후 null 리셋

- **사다리 상단 자동 hop** (\`OnTriggerExit2D\`)
  - 사다리 트리거 상단을 위로 벗어날 때(\`velocity.y > 0\`) 자동으로 작은 hop velocity 적용
  - 기존 HandleLadderPhysics에서 bounds 체크하던 방식 → OnTriggerExit2D 이후 시점으로 이전
    - bounds 체크는 OnTriggerExit2D 이후 isOnLadder가 이미 false라 조건 미충족하던 문제 해결

- **LadderTopEntry.cs 신규** — 사다리 꼭대기 플랫폼에서 아래로 재진입하는 전용 컴포넌트
  - 플랫폼 표면에 배치, \`entryOffset\` (기본 \`(0, -0.5f)\`)으로 사다리 진입 위치 지정
  - 플레이어가 트리거 안에서 아래키 입력 시 \`PlayerMovement.EnterLadderFromTop()\` 호출
  - \`PlayerMovement.EnterLadderFromTop()\` — \`IsGrounded()\` 체크 후 진입 위치로 텔레포트 + 사다리 모드 진입

- **OneWay 플랫폼 false positive 버그 수정**
  - 사다리를 타고 OneWay 플랫폼 레벨에서 위키를 떼면 즉시 사다리 이탈하던 버그 수정
  - 원인: \`IsGrounded()\` OverlapBox가 OneWay 플랫폼을 감지 + \`OnCollisionEnter2D\`도 fire되어 탈출 조건 충족
  - \`IsGroundedSolid()\` 추가 — \`standingColliders\`에서 \`PlatformType.OneWay\`를 필터링, 바닥 착지 판단에만 사용
  - \`HandleLadder()\` 하단 이탈 조건을 \`IsGrounded()\` → \`IsGroundedSolid()\`로 교체

**설계 결정:**
- 사다리 있는 위치에 플랫폼 배치하지 않는 방향 (Nine Sols / 메이플스토리 참조)
- 사다리 꼭대기에만 OneWay 플랫폼 배치, 상단 진입·하단 재진입을 분리된 시스템으로 처리

### 코드 정리

- \`PlayerMovement.cs\` — LadderTopEntry 도입으로 불필요해진 코드 제거
  - 아래키 + OneWay 플랫폼 통과 진입 블록 제거
  - \`GetStandingOneWayPlatforms()\` / \`IgnoreUntilBelow()\` 코루틴 제거
  - \`myCol\` 필드 + \`using System.Collections\` 제거

### 사다리 상단 hop 개선

- hop 시 \`JumpState\` 진입 제거 → velocity 직접 부여 + \`IdleState\` 전환
  - 점프 모션 없이 자연스럽게 플랫폼 위로 올라가는 느낌
- \`ladderTopHopMultiplier\` 기본값 0.6 → 0.25 조정
  - 씬 세팅에 따라 인스펙터에서 튜닝 가능

---

## 2026-05-13

### Claude Code 환경 정리

- \`superpowers\` 플러그인 v5.1.0 설치 (\`~/.claude/plugins/\`)
  - 워크플로우에 활용할 스킬: \`brainstorming\` (브레인스토밍) / \`writing-plans\` (계획 작성) / \`subagent-driven-development\` (구현 병렬화)
- 글로벌 CLAUDE.md 수정
  - gstack 섹션(브라우저 사용 규칙 + 스킬 목록 전체) 제거
  - superpowers 스킬 3종을 작업 워크플로우 각 단계에 명시 (기존에 이미 반영되어 있던 내용)
- \`~/.claude/skills/\` 내 gstack 관련 스킬 폴더 전체 삭제 (\`unity-mcp-skill\` 만 유지)

---

## 2026-05-14

### 에디터 작업 및 버그 수정 (브랜치: proto/hj/mechanics-revision)

**에디터 수정**
- \`PartnerController.groundMask\` — Platform 레이어 추가: 동반자가 Ground뿐 아니라 Platform에서도 점프 가능

**버그 수정**
- \`CompanionItem.Recall()\` — 장애물 체크 박스 중심 높이 수정 (\`+0.5f\` → \`+1.1f\`)
  - 기존: 박스 하단이 지면까지 내려와 파트너가 서 있는 바닥을 obstacle로 감지 → 항상 동반자가 플레이어 위치로 텔레포트
  - 수정: 박스 하단이 발 위로 올라가 지면 제외, 범위 내 플레이어가 동반자 위치로 정상 텔레포트
- \`RecallRangeIndicator\` 스케일 수정 — 부모(파트너) 오브젝트 scale 상속으로 타원이 되던 문제
  - \`transform.lossyScale\` 기반으로 X/Y 보정, 스프라이트 실제 크기 반영 → 항상 정원 표시

**신규 기능**
- 폭발물 폭발 시 동반자 POV 자동 전환 (\`BombObject.ApplyBlastToPartner\`)
  - 넉백 적용 즉시가 아닌 넉백 종료 후 진입 (\`UniTask.WaitUntil\` 사용)
  - POV 진입 직후 \`ForceDeployCompanion()\` 호출 — K 회수 즉시 가능
- \`PlayerMovement.IsJumping\` 프로퍼티 추가 (\`currentState == JumpState\`)
- \`PartnerJumpTrigger\` — 플레이어가 점프 중일 때만 동반자 점프 발동 (Idle/Move 상태에서 PartnerJumpWall 접촉 무시)

**기타 수정**
- \`FadePanel.Awake()\` — \`DontDestroyOnLoad\` 중복 호출 제거
  - \`SceneTransitionManager\` 자식 오브젝트라 부모 DDOL로 이미 씬 유지됨, 직접 호출 시 경고 발생

---

### 동반자 막대기 비행 동반 (브랜치: proto/hj/mechanics-revision)

기존 막대기 착지 후 순간이동 방식을 물리 비행 방식으로 전환.

**변경 동기:** 막대기와 플랫폼 사이 공간이 동반자 크기보다 작을 때 끼임 현상 발생 → 동반자가 날아가는 도중 물리적으로 밀려 떨어지도록 설계 변경

**새 흐름**
1. 동반자 부여 막대기 던짐 → 즉시 POV 전환
2. 동반자 Dynamic 상태 유지, \`isRidingStick = true\` — 매 FixedUpdate마다 막대기 velocity 동기화, 중력 0
3. 동반자 콜라이더가 장애물 충돌(\`OnCollisionEnter2D\`) → \`DetachFromStick()\` → 물리 낙하
4. 막대기 착지(\`HandleStuck\`) → \`DetachFromStick()\` → 동반자 자연 안착

**PartnerController.cs**
- \`isRidingStick\` / \`ridingStickRb\` 필드 추가
- \`StartRidingStick(StickProjectile)\` / \`DetachFromStick()\` 추가
- \`HandlePOVMovement()\` — riding 중 gravity=0 + velocity 동기화 분기
- \`OnCollisionEnter2D\` 추가 — riding 중 충돌 시 자동 분리
- \`TeleportToStick()\` 제거

**StickItem.cs**
- \`Throw()\` — WithCompanion 시 즉시 POV+riding 진입, stick-partner 충돌 무시(\`Physics2D.IgnoreCollision\`)
- \`HandleStuck()\` — 착지 시 충돌 복원 후 \`DetachFromStick()\` 호출
- \`Recall()\` — 회수 시 \`DetachFromStick()\` 먼저 호출하여 동반자 부유 방지

---

### Claude Code 워크플로우 개선

- Matt Pocock의 스킬 플러그인 추가
- 글로벌 CLAUDE.md 수정
  - 리뷰 2단계에 \`grill-with-docs\` 스킬 지정 — 기존 도메인 모델·관례 대비 구현 검증
  - 리팩터링 섹션 신설 — "리팩터링", "아키텍처 개선" 언급 시 \`improve-codebase-architecture\` 스킬 사용 (실제 개발 전환 이후 적용)

### 동반자 부여 코스트 통일 + 씬전환 riding 복원 + 카메라 Cut 전환

- **동반자 부여 코스트 통일** — L키 동반자 부여 시 코스트 소모 방식 통일
- **씬전환 riding 복원** — 씬 전환 후 파트너가 막대기를 타고 있던 상태 정상 복원
- **카메라 Cut 전환** (\`EnterPOVInstant()\`)
  - 막대기 탑승 순간 \`CinemachineBrain.DefaultBlend\`를 Cut으로 임시 교체 → 카메라가 파트너 위치로 즉시 스냅
  - \`RestoreDefaultBlend()\` 추가 — 탑승 해제 후 원래 블렌드 복원
  - \`DetachFromStick()\` 내부에서도 \`cachedBrain\` 복원 처리 (stick 탑승 중 회수/분리 시 누락 방지)

---

## 2026-05-15

### 기획 기반 시스템 수정 + HP 시스템 도입 (브랜치: proto/hj/mechanics-revision)

**UniTask 도입**
- Unity 프로젝트 첫 UniTask 적용
- \`FadePanel\`에 \`FadeOutAsync()\` / \`FadeInAsync()\` 추가 — \`UniTask.Yield()\`로 직접 구현 (코루틴 버전과 공존)
- \`FadePanel\` 싱글톤 적용 (\`SceneTransitionManager\` 자식이므로 별도 DDOL 불필요)

**HP 시스템 신규**
- \`PlayerHP\` 컴포넌트 — \`TakeDamage()\`, \`HandleDeathAsync()\` (UniTask 사망 흐름)
  - 사망 시: 입력 비활성 → 페이드아웃 → 체크포인트 리스폰 → HP 회복 → 페이드인
  - \`HasCheckpoint\` 미등록 시 현재 위치 폴백
- \`PlayerRoot\`에 \`GetPlayerHP()\` 노출

**폭발물 수정**
- 플레이어↔폭발물 충돌 제거 (\`IgnoreLayerCollision true\`)
- 폭발 시 범위 내 플레이어 데미지 1 추가
- Platform Trap: 즉시 리스폰 → \`TakeDamage(MaxHp)\` 방식으로 변경

**신호기 수정**
- 재사용(J) 시 자동 회수 제거 — K 회수로만 해제
- 시퀀스 틀려도/일치해도 로그만 출력

**동반자 시스템 수정**
- 동반자 부여 아이템 사용 후 슬롯 부여 상태 자동 리셋
- 동반자 회수(K) 텔레포트 전 1×2 공간 체크 — 공간 없으면 동반자가 플레이어 위치로
- 동반자 따라오기 점프: \`PartnerJumpTrigger\` 컴포넌트 — 전방 전용 레이어(\`PartnerJumpWall\`) 감지 시 수평 이동 유지하며 점프

**플랫폼 신규 기능**
- \`InteractableOnce\` 추상 컴포넌트 — E키 1회용 상호작용 베이스
- \`Switch\` + \`Door\` 시스템 — E키 누름 영구 유지, 전체 스위치 누르면 문 영구 열림
- \`CheckpointManager\` 스위치 상태 스냅샷 — 체크포인트 도달 시 저장, 사망 시 미저장 스위치 초기화

### RecallRangeIndicator 버그 수정

- **원인**: 인디케이터는 거리만 체크해 초록색으로 표시했으나, \`Recall()\`은 동반자 머리 위 1×2 공간을 추가로 체크 → 공간 없으면 PC가 이동하지 않는 불일치 발생
- **해결**: \`RangeIndicatorState.InsideBlocked\` + \`ColorInsideBlocked\`(주황) 추가, 인디케이터에도 동일한 장애물 체크 적용
  - 초록(\`Inside\`): 범위 내 + 공간 있음 → PC가 동반자 위치로 이동
  - 주황(\`InsideBlocked\`): 범위 내 + 공간 없음 → 동반자가 PC 위치로 이동
  - 흰(\`Outside\`): 범위 밖 → 동반자가 PC 위치로 이동

### 문서 작성

- \`Assets/Docs/Cinemachine3.md\` 신규 작성
  - \`CinemachineBrain\` 인스펙터 전체 — Show Debug Text, Show Camera Frustum, Ignore Time Scale, World Up Override, Channel Mask, Default Blend(Style 7종 + Time), Custom Blends, 이벤트
  - \`CinemachineCamera\` 인스펙터 전체 — Priority, Blend Hint, Lens, Position/Rotation/Noise/Extension 컴포넌트들
  - 특수 카메라 타입 — StateDriven, BlendList, Mixing, ClearShot
  - Cut vs Time 심층 비교 — 내부 동작 차이, 상황별 선택 기준, 코드 패턴 3가지

---

## 2026-05-16

### 개발자용 시스템 구조도 가독성 개선

- \`개발자용_시스템구조도.drawio\` 수정
  - 화살표 전체 제거 — GetComponent / ChangeState / TryUse·TryRecall / SelectCompanion / SetBounds 연결선이 클래스 박스 내용을 가려 가독성 저하
  - 주석 텍스트 색상 \`#aaaaaa\` → \`#d0d0d0\` 상향 — 다크 배경(#2d2d2d) 위에서 너무 연하게 보이던 문제 수정
- \`개발자용_시스템구조도.md\` 신규 생성 — drawio 내용을 네임스페이스·클래스별 Markdown 표로 정리 (이름 / 타입 / 접근제한 / 직렬화 / 설명)

---

## 2026-05-20

### 레벨 디자인 에셋 병합 (브랜치: proto/hj/mechanics-revision)

- \`proto/Tenut/LevelDesign\` 브랜치에서 타일 교체 + 레벨 업데이트 에셋 cherry-pick
  - 충돌로 인해 cherry-pick 대신 \`git checkout\` 직접 방식으로 가져옴

### Partner 시스템 전면 제거

- \`PartnerController.cs\`, \`CompanionItem.cs\`, \`RaccoonController.cs\` 삭제
- \`Partner.prefab\` 삭제
- \`ItemType.Companion\`, \`ActiveController\` enum, L키 동반자 부여(\`GrantCompanionPressed\`) 제거
- \`ItemBase.WithCompanion\` / \`ItemSlot.IsCompanionGranted\` 제거 → 아이템 코스트 로직 단순화
- \`SceneTransitionManager\` — \`triggeredByPartner\`, \`SwitchToPlayer/Partner()\`, \`isPlayerHidden\` 제거
- \`CameraController\` — 파트너 VCam, POV 방향 감지 제거
- \`StickItem\` / \`BombItem\` / \`BombObject\` 파트너 관련 로직 제거

### Door 시스템 — Tilemap 방식 전환

- \`Door.cs\` — \`SpriteRenderer.DOFade()\` → \`Tilemap.color\` DOTween 페이드아웃으로 변경
  - LevelTest 씬의 Door가 Tilemap 기반이라 SpriteRenderer 없어 DOTween 에러 발생하던 문제 해결
  - \`TilemapCollider2D\` 비활성화로 충돌 제거

### OneWay 플랫폼 개선

- \`Platform.cs\`
  - \`TilemapCollider2D\` 감지 시 \`CompositeCollider2D\` + \`Rigidbody2D(Static)\` 자동 추가
  - \`rotationalOffset\` 수정: 180° → 0° — 아래서 위로 통과, 위에서 착지하는 올바른 방향
  - \`usedByComposite\` deprecated → \`compositeOperation = Merge\`로 교체

### Drop-Through 기능 구현

- 아래+점프로 OneWay 플랫폼 통과 낙하, 통과 즉시 재착지 가능 (Nine Sols 스타일)
- \`PlayerInputReader\` — \`DropThroughPressed\` 추가, \`JumpPressed\`와 분리
- \`PlayerMovement.TryDropThrough()\` — \`standingColliders\`에서 OneWay 감지, \`Physics2D.IgnoreCollision\` 일시 해제, \`playerCollider\` 캐싱
- \`RestoreCollision()\` coroutine — \`playerCollider.bounds.max.y < platformMinY\` 시 복원 (두께 있는 플랫폼 대응)
- \`IdleState\` / \`MoveState\` — \`DropThroughPressed\` 감지 추가
- \`HandleLadder()\` — \`DropThroughPressed\`로도 사다리 탈출 가능

### 사다리 시스템 개선

- \`Ladder.cs\` 신규 — \`CenterX\` 노출 (\`other.bounds.center.x\` 기반, 타일맵 좌표 대응)
- \`PlayerMovement\` 개선
  - \`currentLadderCenterX\` — \`OnTriggerEnter2D\`에서 \`other.bounds.center.x\` 직접 저장
  - 사다리 진입 시 X 스냅 (\`Rb.position\`, \`transform.position\` 모두 적용)
  - 사다리 진입 조건 확장: \`MoveInput.y > 0\` → \`Mathf.Abs(MoveInput.y) > 0.5f\`
  - 바닥+DOWN 가드 — 지상에서 DOWN 진입 차단, \`LadderTopEntry\`에 위임
  - \`IsGroundedSolid()\` — \`standingColliders\` 기반 → \`Physics2D.OverlapBoxAll\` 기반으로 개선
  - \`OnTriggerExit2D\` 3분기 명확화: hop / 비탑승 존 이탈 / 하단 이탈
- \`LadderTopEntry.cs\` — \`Ladder\` 참조 추가, \`entryOffsetY\` float로 변경, \`CenterX\`로 X 정렬

### JumpState 버그 수정

- 천장이 낮아 점프 공간이 없을 때 \`JumpState\`에 갇히는 버그 수정
  - \`hasLeftGround = false\` 상태에서 0.1초 타임아웃 → \`IdleState\` 강제 복귀

---

## 2026-05-21

### 사다리 시스템 재구현

**구조 변경**
- \`LadderTopEntry.cs\` 삭제 — 순간이동 진입 방식 제거
- \`Ladder.cs\` 마커 컴포넌트로 단순화
- \`PlayerMovement\`에 \`headCheck\` Transform 추가 — 아래에서 접근 여부 감지

**진입 방식**
- 상단 진입: OneWay 발판 위 + DOWN + 하향 레이캐스트로 Ladder 감지 → TryDropThrough + 사다리 모드
- 하단/측면 진입: headCheck가 Ladder 존 안에 있을 때 + UP
- 플랫폼 위에서 UP으로 의도치 않게 사다리 타는 현상 방지

**이탈 방식**
- 하단: \`IsGroundedOnLadder()\` 레이캐스트로 Solid 바닥 감지 시 이탈
- 상단: \`OnTriggerExit2D\` 위로 이탈 시 hop
- Jump / DropThrough 입력으로 수동 이탈

**버그 수정**
- \`RestoreCollision\` 코루틴에 \`!isOnLadder\` 체크 추가 → 사다리 이탈 즉시 IgnoreCollision 복원
- \`activeLadderZones\` HashSet으로 복수 사다리 존 겹침 대응
- \`IsStandingOnSolid()\` 도입 (standingColliders 기반) — OverlapBox 오감지 문제 해결

---

## 2026-05-22

### Climb 시스템 구현

- \`PlayerMovement.cs\` 인라인 방식으로 구현 (별도 State 없음)
  - \`climbLayer\` SerializeField 추가 — groundLayer 대신 별도 레이어로 클라이밍 가능 발판만 지정
    - groundLayer(타일맵) 사용 시 전체 bounds.max.y를 최고점으로 인식하는 문제 방지
  - \`isClimbing\` bool 플래그, \`climbDuration\` float (기본 0.15f) 추가
  - \`TryClimb()\` — headCheck OverlapBox → climbLayer 감지, IgnoreCollision으로 충돌 우회
    - \`DOTween.To(() => Rb.position, x => Rb.MovePosition(x), ...)\` — 물리 기반 이동 (transform.DOMove 대신)
    - pivotToFeet 오프셋으로 발이 발판 표면에 정확히 닿도록 위치 계산
  - \`OnClimbComplete()\` — IgnoreCollision 복원, 중력 복원, IdleState 전환
  - \`OnDestroy()\` — \`DOTween.Kill(Rb)\` 추가 (MonoBehaviour 파괴 시 Tween 안전 정리)
  - 발동 조건: JumpState + MoveInput.y > 0.5f + !isInLadderZone
  - Update/FixedUpdate 상단에 \`if (isClimbing) return;\` 가드 추가

### Drop-Through 버그 수정

- \`RestoreCollision\` 코루틴의 \`if (!isOnLadder) break;\` 제거
  - 원인: 비사다리 drop-through에서 isOnLadder가 항상 false → WaitForFixedUpdate 한 틱 후 즉시 충돌 복원 → 플레이어가 발판 통과 불가
  - 수정: 자연 종료 조건(\`bounds.max.y <= platformMinY\`, \`velocity.y > 0.1f\`)만으로 충분

---

## 2026-05-24

### 아이템 슬롯 직접 선택 + 탐사기(ExplorerBot) 구현 (브랜치: proto/hj/mechanics-revision)

**아이템 슬롯 시스템 개편**
- PrevItem / NextItem 순환 방식 → 숫자키 1~4 직접 선택 방식으로 교체
- \`InputSystem_Actions.inputactions\` — Slot1~4 Button 액션 추가 (키보드 1/2/3/4 바인딩), PrevItem/NextItem 제거
- \`InputSystem_Actions.cs\` — Slot1~4 필드 / 프로퍼티 / 콜백 추가, PrevItem/NextItem 제거
- \`PlayerInputReader.cs\` — Slot1~4Pressed 프로퍼티 추가
- \`ItemManager.cs\` — Update()에서 Slot1~4 입력 감지 → SelectSlot(0~3), SelectPrev/SelectNext 제거, isBeaconActive / SetBeaconActive() 제거
- \`ItemHUD.cs\` — Refresh() 전체 슬롯(1~4) 표시, 배치 인디케이터(●) + 선택 인디케이터(*) 추가
- \`PlayerRoot.cs\` — items 배열을 \`{ stickItem, bombItem, explorerItem, null }\`로 고정

**탐사기 (ExplorerItem + ExplorerBot) 신규**
- \`ExplorerBot.cs\` — 자율 이동 봇
  - Moving / Falling / Waiting 3상태 FSM
  - \`HandleMoving()\`: 전진 + 접촉 법선 기반 벽 감지 → Waiting 전환, 바닥 OverlapBox로 엣지 낙하 처리
  - \`HandleFalling()\`: 착지 감지 후 Moving 복귀
  - \`ActivateRadius()\`: Waiting 전환 시 LineRenderer로 6유닛 원 표시
  - 소환 시 플레이어 콜라이더 충돌 무시
  - 피해 파괴 시 \`OnDestroyedByDamage\` 이벤트 발생
- \`ExplorerItem.cs\` — 탐사기 아이템
  - Use: 플레이어 진행 방향으로 봇 소환
  - Reuse: 소음 발생 (isNoiseActive 중복 방지)
  - TryRecall: Waiting 상태에서만 회수 가능, 범위 내 플레이어 텔레포트
  - 피해 파괴 시 코스트 자동 반환

**버그 수정**
- \`BeaconItem.cs\` — \`SetBeaconActive()\` 참조 제거 (ItemManager에서 해당 메서드 삭제로 인한 컴파일 오류 수정)

**에디터 작업 필요**
- ExplorerBot 프리팹 생성 (groundCheck 자식 오브젝트, groundLayer 설정)
- PlayerRoot ExplorerItem 컴포넌트 추가 및 explorerBotPrefab 연결 필요

---

## 2026-05-25

### 탐사기 이동 및 감지 개선 (브랜치: proto/hj/mechanics-revision)

**ExplorerBot 개선**
- \`Awake()\` 분리 — rb / col / lr 컴포넌트 참조를 Init() 대신 Awake()에서 초기화 (소환 직후 FixedUpdate 실행 타이밍 문제 방지)
- \`playerIgnoreDuration\` SerializeField 추가 — 소환 시 플레이어 충돌 무시 시간 인스펙터에서 조절 가능
- 벽 감지 방식 변경: \`OnCollisionEnter2D\` 법선 체크 → \`HandleMoving()\` 내 레이캐스트로 교체
  - 타일맵 스텝 모서리에서 법선이 (0,1)로 나와 벽 감지 누락되던 문제 해결
  - 레이 발사 위치: \`col.bounds.max/min.x\`(봇 앞면) + \`col.bounds.max.y\`(봇 상단) 기준
- \`edgeNudge\` SerializeField 추가 — 바닥 없음 감지 시 진행 방향으로 살짝 밀어 엣지에 걸림 방지
- \`OnDrawGizmos()\` 추가 — groundCheck 박스(초록), 벽 감지 레이(빨강) 씬 뷰 시각화

**ExplorerItem 개선**
- \`CanTeleportTo()\` 추가 — 텔레포트 전 플레이어 크기 90% 박스로 장애물 체크, 불가 시 봇만 회수

**버그 수정**
- \`BombItem.TryRecall()\` — 섬광 부여 상태에서 회수 시 2코스트 환불되지 않던 버그 수정 (\`UseCost + (hasFlash ? 1 : 0)\` 직접 계산)

**FloorSwitch 탐사기 감지 추가**
- \`FloorSwitch.cs\` — \`OnTriggerEnter2D\`에서 Player 레이어 외 \`ExplorerBot\` 컴포넌트 보유 오브젝트도 활성화

---

## 2026-05-27

### 메카닉 리비전 — 신호기 R키 특수 아이템 분리 및 입력 동작 수정 (브랜치: proto/hj/mechanics-revision)

**신규 파일**
- \`SpecialItemBase.cs\` — R키 특수 아이템 추상 베이스 (\`TryActivate / TryReuse / TryRecall / OnForceRecall\`)
- \`SpecialItemManager.cs\` — R키 입력 처리, 활성 중 공중 강제 회수, J/K 차단 플래그 노출
- \`UmbrellaItem.cs\` — 슬롯 4 우산 아이템 플레이스홀더 (모든 메서드 빈 구현)

**BeaconItem 마이그레이션 (\`ItemBase\` → \`SpecialItemBase\`)**
- 슬롯/코스트 의존성 제거 — \`TryUse(CostPool)\` / \`TryRecall(CostPool)\` 삭제
- \`IsDeployed\` → \`IsActive\` 통일 (SpecialItemBase 프로퍼티)
- \`CheckSequenceLog()\` 자동 회수 경로: \`PlayerRoot.GetItemManager().RecallSelected()\` → \`TryRecall()\`

**입력 동작 수정**
- R키: 비활성 → 활성화 전용. 활성 상태 재입력 시 무시 (회수 불가)
- K키: 활성 중 신호기 회수 전용
- 신호기 활성 중 슬롯 아이템 J/K 전부 차단 (\`ItemManager\` — \`IsItemActive\` 플래그 참조)

**BeaconItem 자동 회수 동작 수정**
- 틀린 방향 입력 시 자동 회수 제거 → 로그만 출력, UI 유지
- 최대 초과(11번째 입력): \`inputSequence.Clear()\` → \`TryRecall()\` 변경
- 시퀀스 완성 시 자동 회수 유지
- \`SendBeaconSignal()\` / \`CheckSequenceLog()\` 호출 순서 교체 — 완성 시 마지막 신호 전송 후 회수

**기타 수정**
- \`BombObject.flashRadius\` 4u → 5u
- \`InputSystem_Actions.inputactions\` — Signal(R키) 액션 추가
- \`InputSystem_Actions.cs\` — OnSignal 콜백 자동 생성 반영
- \`PlayerInputReader\` — \`SignalPressed\` 프로퍼티 추가
- \`ItemType\` enum — \`Beacon\` 제거, \`Umbrella\` 추가

**에디터 작업**
- LevelTest 씬: SpecialItemManager / UmbrellaItem / BeaconItem 컴포넌트 Player에 추가

---

### HP 시스템 및 HUD 구현 (브랜치: proto/hj/hp-ui)

**신규 구현**
- \`PlayerHp\` — 칸 단위 HP 컴포넌트. \`TakeDamage\` / \`RestoreFull\` 메서드 및 HP 변화 이벤트 제공. \`RestoreFull\` 중복 이벤트 방지 가드 추가
- \`DamageSource\` — 적·트랩에 부착하는 트리거 기반 피해 컴포넌트
- \`PlayerHUD\` — Image 기반 HUD 스크립트 신규 추가. 기존 \`ItemHUD\` 제거
- \`SpecialItemManager.ForceRecall()\` — 피해 수신 시 특수 아이템 강제 회수 메서드 추가

**연결 및 수정**
- \`PlayerRoot\` — \`PlayerHp\` 초기화, 사망/피해 이벤트 → \`SpecialItemManager.ForceRecall\` 연결, \`PlayerHUD\` 연결
- \`PlayerRoot\` — \`playerHp\` null 체크 추가로 \`NullReferenceException\` 방지
- \`PlayerHUD\` — \`instance\` 클리어 누락 및 \`Init\` 중복 구독 버그 수정
- 씬 파일 Missing Script 정리 및 신규 스크립트 \`.meta\` 추가
- \`ExplorerBot\` / \`ExplorerItem\` / \`BombItem\` / \`FloorSwitch\` — mechanics-revision 미커밋 개선사항 반영

---

## 2026-05-28

### 우산 아이템 버그 수정 및 코드 리뷰 반영 (브랜치: proto/hj/umbrella)

**버그 수정**
- 우산 착용 + 폭발물 상호작용(E키) 후 낙하 중 K로 회수 시 글라이드 중력이 그대로 남아 있던 문제 수정
  - \`SetGlide(false)\` 호출 시 \`gravityScale\`을 즉시 \`DefaultGravityScale\`로 복원하도록 수정

**코드 리뷰 반영 (4종)**
- \`SetGlide(false)\` — \`isClimbing\` 중에는 \`gravityScale\` 덮어쓰기 금지 (DOTween 클라이밍 트윈 보호)
- \`TryInteract\` — \`bombLayer\` 콜라이더 감지 시 \`BombObject\` 컴포넌트 존재 여부 확인 추가
- \`HandleBombRemoved\` — \`OnRemoved\` 구독 해제를 null 처리 이전에 수행하도록 순서 수정
- \`ExitAirFixed\` — 불필요한 \`pool\` 파라미터 제거, \`cachedPool\` 직접 참조로 단일화

---

## 2026-06-01

### 탐사기 이동 방식 탐구

플레이어 옆에 항상 떠다니는 탐사기가 어떻게 움직이는 게 가장 자연스럽고 게임 플레이에 적합한지 비교하기 위해 12가지 이동 패턴을 브라우저에서 직접 확인할 수 있는 프로토타입을 만들었습니다.

각 패턴은 실제 게임의 레퍼런스를 참고해 설계했습니다.

<img src="images/prototype-explorer.png" width="700">
<figcaption>탐사기 이동 패턴 바리에이션 프로토타입</figcaption>

정지·걷기·점프 상태에서도 각각 어떻게 보이는지 버튼으로 전환하며 확인할 수 있게 했습니다.

| 이동 방식 | 느낌 | 참고 게임 |
|---|---|---|
| 어깨 옆 따라오기 | 항상 내 곁에 있는 느낌 | Ori — Sein |
| 머리 위 공전 | 독자적으로 살아있는 느낌 | Ori — Sein |
| 앞쪽 선두 이동 | 내 앞을 탐색하는 느낌 | Ori — Sein |
| 자유 배회 | 제멋대로인 성격 있는 느낌 | Dust — Fidget |
| 경로 추적 | 뒤에서 발자국을 따라오는 느낌 | Hollow Knight — Grimmchild |
| 항상 앞쪽 대기 | 출격 준비 중인 느낌 | Iconoclasts |
| 과거 위치 재현 | 1.5초 전 내가 있던 곳에 유령처럼 | Celeste — Badeline |
| 딱 붙어서 따라오기 | 즉각 반응하는 밀착 느낌 | Spyro — Sparx |
| 자유 비행 + 범위 이탈 시 복귀 | 자유롭게 날아다니다 너무 멀면 돌아옴 | Kirby — Helper |
| 고정 위치 상하 부유 | 기계적으로 일정하게 움직이는 느낌 | Crash — Aku Aku |
| 방향 전환 시 관성 스윙 | 방향 바꿀 때 한 번 반대로 튕기는 느낌 | (독자적) |
| 미래 위치 예측 이동 | 내가 가려는 곳을 먼저 가있는 느낌 | (독자적) |

---

## 2026-06-02

### 탐사기 이동 방식 탐구

아트 팀과 함께 어제 만든 프로토타입을 보며 이동 방식을 비교했습니다.

- **서있을 때** → 탐사기가 플레이어 머리 주변을 느리게 공전합니다.
- **걷거나 점프할 때** → 탐사기가 플레이어 어깨 뒤쪽에 달라붙어 따라옵니다.

두 상태 간 전환은 끊기지 않고 자연스럽게 이어집니다. 걷다가 멈추면 어깨에 있던 탐사기가 공전 궤도로 부드럽게 흘러들어가고, 다시 걷기 시작하면 궤도에서 어깨로 돌아옵니다.

<img src="images/prototype-companion.png" width="500">
<figcaption>탐사기 이동 방식 프로토타입</figcaption>

### 막대기 사용 방식 탐구

탐사기가 막대기를 사용할 때 "어디에서 던지는가"에 따라 느낌이 크게 달라집니다. 5가지 방식을 비교할 수 있는 프로토타입을 만들었습니다.

| 방식 | 설명 |
|---|---|
| ① 앞으로 이동 후 발사 | 탐사기가 플레이어 앞으로 먼저 이동해 거기서 막대기를 던집니다 |
| ② 레이 조준 후 발사 | 플레이어가 목표 지점을 지정하면 탐사기가 그 높이에 맞춰 위치를 조정한 뒤 던집니다 |
| ③ 뒤로 이동 후 발사 | 탐사기가 플레이어 뒤쪽으로 이동해 던져 더 멀리 날아갑니다 |
| ④ 던지고 그 자리 대기 | 던진 후 바로 돌아오지 않고 잠시 그 위치에서 대기합니다 |
| ⑤ 충전 후 발사 | 위치에 도착한 뒤 짧게 준비 동작을 거친 후 던집니다 |

<img src="images/prototype-items.png" width="700">
<figcaption>막대기 아이템 사용 바리에이션 프로토타입</figcaption>

발사는 항상 플레이어가 바라보는 방향을 향하며, 발사 속도와 이동 시간을 슬라이더로 조절하며 비교할 수 있습니다.

---

## 2026-06-04

### 탐사기 오브 (ExplorerOrbFollower) — Walk 모드 설계

**브랜치:** \`proto/hj/explorer-orb\`

#### 설계 내용

Walk↔Idle 전환 구조의 근본 문제를 진단하고 재설계 방향을 결정했다.

**진단된 문제:**

- 기존 구현의 \`ApplySpring\`은 \`modeBlend > 0.5\` 하드스위치 + \`velocity = Vector2.zero\` 강제 리셋으로 전환 시 루프 버그 발생
- Walk lag은 velocity inheritance로 구현됐으나 프레임률 독립성 없음
- 두 제어 법칙(Shoulder/Idle)이 분리돼 있어 전환이 구조적으로 불연속

**설계 결정:**

- Daniel Holden(theorangeduck.com)의 임계감쇠 2차 ODE(\`SimpleSpringDamper2D\`) 도입 → 수학적 오버슛 없음
- Walk 3-케이스 분리: Idle(임계감쇠) / Walk(자유이동+히스테리시스) / 전환(블렌드 스프링)
- Dead Zone 히스테리시스: 자유이동↔catch-up 경계 진동 방지
- \`velocity\` 리셋 제거로 전환 연속성 확보

---

## 2026-06-05

### 탐사기 오브 (ExplorerOrbFollower) — Walk 모드 구현

**브랜치:** \`proto/hj/explorer-orb\`

Walk 모드를 완성했다. 전환 버그도 잡고, Sein처럼 느슨하게 떠다니다가 경계에 닿으면 빠르게 돌아오는 느낌도 만들었다.

---

#### 왜 안 됐었나 — 디버깅 과정

**버그 1: Walk→Idle 전환할 때 오브가 한 바퀴 빙 도는 문제**

처음엔 방향값이 뒤집히나 싶었는데 \`smoothDir\`, \`facing\` 다 정상이었다.

로그를 심어서 보니까 진짜 원인은 구조 자체였다. 기존 \`ApplySpring\`이 \`modeBlend > 0.5\`일 때 Shoulder 분기에서 \`transform.position\`을 직접 덮어쓰고 \`return\` 해버렸다. \`CalcEffectiveTarget\`이 만든 블렌드 타겟은 이 구간에서 **아예 쓰이지 않는 코드**였다. 전환이 블렌딩처럼 보여도 실제로는 0.5에서 뚝 끊기는 **하드 스위치**였던 것.

거기다 그 순간 \`velocity = Vector2.zero\`로 강제 리셋까지 되니까:
1. 오브가 순간 정지
2. Lissajous 드리프트(회전하는 벡터)가 즉시 풀 진폭으로 가동
3. 멈춰있는 오브가 회전하는 타겟을 뒤쫓으면서 → 나선형 루프

드리프트만 꺼봤더니 루프가 사라지는 걸 확인하면서 구조 문제라고 확정했다.

---

**버그 2: Walk 중 오브가 Dead Zone 경계에 딱 붙어서 떨어지지 않는 문제**

값 문제인 줄 알고 halflife 이것저것 바꿔봤는데 안 됐다. 알고 보니 수학적인 문제였다.

\`velocityInheritMult = 0.3\`이면 오브는 플레이어 속도의 30%로 이동하는데, 어깨(shoulderTarget)는 100%로 간다. 그러니까 매 프레임 오브는 어깨에서 70% 속도로 멀어진다. 경계에 닿으면 catch-up 스프링이 복귀시키고, 복귀하면 즉시 또 밀려나고, 이게 반복되면서 **경계에서 진동 = 외각 고정**처럼 보였다.

해결은 히스테리시스였다. 단순 이진 전환 대신 **\`deadZone × 0.3\` 이내까지 완전히 돌아와야** 자유이동을 다시 허용하는 식으로. 이 완충 구간이 진동을 잡았다.

---

**막다른 시도들**

처음엔 \`laggedShoulder\`(어깨를 느리게 따라가는 중간 목표)를 뒀다. lag 느낌이 날 것 같았는데, \`laggedShoulder\` 자체가 결국 플레이어 속도로 수렴하니까 오브도 같이 그 속도로 움직였다. lag가 없었다.

다음엔 TrackingSpring(\`(xGoal-x)/dt\` 항 포함)을 써봤다. travelTime=0인 워프 같은 상황에서 이 항이 폭발적으로 커지면서 velocity가 과도하게 쌓여 **오버슛**이 생겼다.

여러 번 막히면서 깨달은 건: **lag는 목표를 느리게 따라가는 게 아니라, 오브 자체가 빠른 목표를 자연스럽게 못 따라가는 데서 나온다**. 느슨한 halflife의 SimpleSpringDamper2D가 빠르게 이동하는 shoulderTarget을 뒤처지며 추격하는 구조가 맞았다.

---

#### 스프링 수학 — Daniel Holden의 코드를 가져다 쓴 이유

직접 스프링을 구현하다 보니 오버슛 문제가 계속 나왔다. 찾다 보니 Ubisoft 애니메이션 엔지니어인 **Daniel Holden**이 [theorangeduck.com](https://theorangeduck.com/page/spring-roll-call)에 올린 임계감쇠 스프링(Critically Damped Spring) 수식이 있었다.

이게 좋았던 이유:
- **수학적으로 오버슛이 불가능**하다. 2차 ODE의 닫힌 해(analytic solution)라서 dt가 아무리 크거나 초기 속도가 뭐든 항상 목표로 수렴한다.
- 기존에 쓰던 \`Mathf.Pow(damping, norm)\` 방식은 프레임률에 따라 감쇠량이 달라지는데, 이건 \`exp(-y·dt)\` 기반이라 **프레임률 독립적**이다.
- 파라미터가 \`halflife\`(거리가 절반으로 줄어드는 시간, 초)라서 직관적으로 튜닝할 수 있다.

C++ 코드를 Unity C#으로 포팅해서 \`#region SpringMath\`에 인라인으로 넣었다. 외부 라이브러리 없이 파일 하나에 다 있어서 관리도 편하다.

---

#### 구현 결과

**수정된 버그:**
- Walk→Idle 루프: velocity 리셋 제거 + SimpleSpringDamper2D로 구조적 해결
- Dead Zone 외각 고정: isCatchingUp 히스테리시스
- Idle 웨이포인트 오버슛: SimpleSpringDamper2D로 교체

**Walk 동작:**
- Dead Zone 안: 자유이동 (속도 상속 + Lissajous 드리프트)
- 경계 도달: 어깨로 빠르게 복귀
- deadZone × catchUpInnerMult 이내 복귀 시 자유이동 재개

---

#### 인스펙터 필드 설명

<img src="images/explorer-orb-inspector-2026-06-05.png" width="500">
<figcaption>ExplorerOrbFollower 인스펙터</figcaption>

| 그룹 | 필드 | 역할 |
|---|---|---|
| **웨이포인트** | 위치 목록 | Idle 시 오브가 방문하는 지점. 씬뷰 핸들로 편집 가능. |
| **웨이포인트** | 방문 순서 | 방문 인덱스 시퀀스. 중복 허용, 드래그 재정렬. |
| **어깨 부유** | 뒤 오프셋 (배율) | Walk 어깨 위치 = 플레이어 키 × 이 값 (뒤 방향) |
| **어깨 부유** | 머리 위 오프셋 (배율) | Walk 어깨 위치 = 플레이어 키 × 이 값 (위 방향) |
| **어깨 부유** | Dead Zone 반지름 (배율) | 오브가 자유롭게 부유하는 반경. 이 경계를 넘으면 catch-up 시작. |
| **어깨 부유** | 속도 상속 비율 | Dead Zone 안 자유이동 시 플레이어 속도 비율. 낮을수록 더 뒤처짐. |
| **어깨 부유** | Halflife (catch-up) | 경계 도달 후 어깨로 복귀하는 스프링 속도. 작을수록 빠름. |
| **어깨 부유** | Catch-up 해제 임계 (배율) | catch-up 완료 기준 거리 = Dead Zone × 이 값. [0-1] |
| **어깨 부유** | Halflife (전환 블렌드) | Idle↔Walk 전환 구간 전용 스프링 반응 시간. |
| **스프링** | Idle Halflife | Idle 웨이포인트 수렴 시간. 클수록 더 유기적으로 부유. |
| **전환 타이밍** | Idle → Shoulder 시간 | Idle→Walk 블렌드 시간 |
| **전환 타이밍** | Shoulder → Idle 시간 | Walk→Idle 블렌드 시간 |
| **전환 타이밍** | Idle 정착 시간 | Idle 진입 후 첫 웨이포인트 이동 전 대기 시간 |
| **드리프트** | X/Y 진폭 (배율) | Lissajous 부유 궤도 크기. 클수록 크게 떠다님. |
| (최상단) | 방향 스무딩 속도 | 방향 전환 시 오브 반응 부드러움. 클수록 즉각. |

---

## 2026-06-06

### 탐사기 오브 코드 리뷰 및 버그 수정

- **코드 리뷰 (grill-with-docs)** 진행 — 5개 항목 점검
  - Walk 모드 stale 주석 수정 (Lissajous → walkAnchor로 수렴)
  - walkAnchor를 Walk/전환 구간에서만 업데이트 (Idle 중 불필요 연산 제거)
  - Walk 진입 시 walkAnchor를 shoulder 위치로 즉시 스냅 — lag가 이동 시작부터 자연스럽게 쌓임
  - sequenceIdx 초기값   → -1 버그 수정 — 첫 Idle 시 waypointSequence[0] 건너뛰던 문제
  - CalcDriftDelta 미사용 메서드 제거
- FallState 즉시 스냅 미처리 항목 메모리에 기록 (추후 처리 예정)
- 임계감쇠 스프링 레퍼런스 문서 작성 (devlog/docs/critically-damped-spring.md)
  - halflife 파라미터 직관적 설명, 닫힌 해 수학 해설, 프로젝트 내 사용처 정리

---

## 2026-06-07

### OneWay 플랫폼 밑점프 버그 수정 + 클라이밍 감지 기즈모

**버그 원인 분석**

TryDropThrough가 OneWay 플랫폼에서 동작하지 않던 버그 수정.

- RestoreCollision 코루틴에 if (!isOnLadder) break 가드가 있었는데, 일반 밑점프 시 isOnLadder=false이므로 매 프레임에서 즉시 루프를 탈출 → 플레이어가 낙하하기 전에 충돌이 복원됨.

**수정 내용 (PlayerMovement.cs)**

- TryDropThrough(bool ladderMode = false) 파라미터 추가 — 사다리 진입 경로에서만 ladderMode: true 전달
- RestoreCollision(Collider2D, float, bool ladderMode = false) 시그니처 통일
  - ladderMode && !isOnLadder 조건으로만 사다리 이탈 즉시 복원 (일반 밑점프와 분리)

**클라이밍 감지 기즈모 추가**

- OnDrawGizmosSelected() + DrawClimbZone() 추가
  - 런타임: 현재 FacingDirection 기준 초록 와이어 박스 표시
  - 에디터: 좌우 양방향 동시 표시

---<img src="images/explorer-orb-inspector-2026-06-06.png" width="500">
<figcaption>ExplorerOrbFollower 인스펙터 (2026-06-06)</figcaption>
6월 5일 대비 어깨 부유 섹션에 필드 두 개가 추가됐습니다. **Drift Halflife** — Dead Zone 안에서 walkAnchor 쪽으로 얼마나 천천히 흘러나갈지 결정합니다. 값이 클수록 느리게 수렴해 orb가 더 오래 떠돌아다닙니다. **Anchor Halflife** — 가상 앵커(walkAnchor)가 shoulder를 따라가는 지연 시간입니다. 클수록 앵커가 더 뒤처져 drift 폭이 커집니다. 이 두 값이 Sein 특유의 속도 펄스(빠른 스냅 → 느린 흘러나감)를 만들어냅니다.

- **코드 리뷰 (grill-with-docs)** — 5개 항목 점검
  - Walk 모드 stale 주석 수정 (Lissajous 부유 → walkAnchor로 수렴)
  - walkAnchor를 Walk/전환 구간에서만 업데이트 (Idle 중 불필요 연산 제거)
  - Walk 진입 시 walkAnchor를 shoulder 위치로 즉시 스냅 — lag가 이동 시작부터 자연스럽게 쌓임
  - sequenceIdx 초기값   → -1 버그 수정 — 첫 Idle 시 waypointSequence[0] 건너뛰던 문제
  - CalcDriftDelta 미사용 메서드 제거
- FallState 즉시 스냅 미처리 항목 메모리에 기록 (추후 처리 예정)
- 임계감쇠 스프링 레퍼런스 문서 작성 (devlog/docs/critically-damped-spring.md)
  - halflife 파라미터 직관적 설명, 닫힌 해 수학 해설, 프로젝트 내 사용처 정리

---

## 2026-06-11

### Spine 애니메이션 연동

- \`PlayerMovement\`에 Spine 애니메이션 재생 / 좌우반전 연결
- 낙하 상태(\`FallState\`) 추가 — Jump_Down 애니메이션 재생
- \`JumpState\` — 낙하 시작 시 \`FallState\`로 전환, Jump_UP 애니메이션 재생
- Idle/Move 상태에 Spine 애니메이션 재생 추가
- 플레이어 좌우 반전 방향 수정 (ScaleX 부호 반전) 및 Spine 캐릭터 텍스처 화질 개선 (Mip Map/Aniso 활성화)
- Spine 캐릭터 Physics Constraints 외부 영향 제거
  - \`physicsPositionInheritanceFactor\` / \`physicsRotationInheritanceFactor\`를 0으로 설정하여 Rigidbody2D 이동 관성이 머리카락 등 물리 본에 영향을 주지 않도록 수정
  - 초기 애니메이션을 Animation/Idle로 설정

---

## 2026-06-12

### 물 이동(Water) 및 매달림(Hang) 상태 구현 (브랜치: proto/hj/water-movement)

- \`PlayerMovement\`에 Water 트리거 추적 추가 (\`waterLayer\`, \`activeWaterZones\`)
- \`HangState\` 신규 — 발판 가장자리에 매달린 상태
  - 기존 클라이밍 감지 시 즉시 등반하던 동작을 Hang으로 분리: 위 입력 시에만 등반(\`PerformClimb\`), 아래/점프 입력 시 낙하
  - 물속에서도 머리 위 지형 감지 시 Hang 진입 (\`TryGrabLedgeFromWater\`)
- \`WaterState\` 신규 — buoyancy(부력) 기반 물리로 잠김/이동 처리
  - \`GetSubmergence()\`로 잠김 비율 계산, 잠김 비율에 따라 \`gravityScale\`을 부력으로 보정 (\`buoyancy\` 평형 잠김비율 = 1/buoyancy)
  - \`waterDrag\`로 Y축 진동(bobbing) 감쇠, \`waterSpeedMultiplier\`로 잠김 깊이에 따른 좌우 이동속도 보간
  - 부력 공식에 설명 주석 추가
- \`FallState\` 추가

### 플레이어 이동 상태 전환표 정리 (기획 문서)

- Idle / Walk / Jump / Fall / Land / Climb(사다리·플랫폼·매달림) / Water(Idle·Move) 각 상태에서 전환 가능한 상태와 조건을 기획자 공유용으로 정리
  - 예외 상황(발판 소실, 벽 끝 매달림, 물 진입 시점 등)을 포함해 작성, 임시본으로 추후 기획자 리뷰 반영 예정
- \`StateTransition.drawio\` 상태 전환 다이어그램 초안 작성

---

## 2026-06-13

### arttestscene → animationtest 머지 (테스트 씬2 이식)

- \`proto/Square/arttestscene\`의 \`LevelTest _2.unity\`(테스트씬2) 및 관련 아트 에셋을 \`proto/Square/animationtest\`로 가져오기 위해 전체 브랜치 머지 진행
  - 머지 전: 머지로 인한 충돌 범위 사전 분석 (공통 조상 대비 양쪽 변경 파일 비교, 충돌 후보 234개 → 실제 충돌 8개)
  - 충돌 해결
    - \`Assets/Prefabs/SampleTile\` 폴더/타일 메타 GUID 충돌 → animationtest 쪽 유지
    - \`AddressableAssetSettings.asset\` 캐시 해시 충돌 → animationtest 값 유지
    - \`ProjectSettings/TagManager.asset\`의 Sorting Layer uniqueID 충돌 → arttestscene 쪽 값으로 채택 (머지되어 들어오는 \`LevelTest _2.unity\`가 해당 ID를 참조하고 있어 추가 리맵 불필요)
    - \`LevelTest.unity\` (양쪽이 같은 경로에 독립적으로 만든 별개 씬) → animationtest 기존 씬 유지
    - \`MapEditorWindow.cs\` 이름 충돌(\`(1)\` 접미사) → 원래 이름으로 정리
  - \`LevelTest _2.unity\`, \`LevelTest _3.unity\`, \`ArtTestScene.unity\`, \`ArtTestScene2.unity\`, \`TestScene_A/B.unity\`, \`TemplateScene.unity\` 등은 충돌 없이 정상 머지됨

### 플레이어가 기둥보다 항상 앞에 그려지는 문제 수정

- 원인: \`Player.prefab\`의 \`Visual_Spine\`(SkeletonAnimation) Sorting Layer가 \`Default\`로 설정되어 있었음
  - TagManager의 Sorting Layer 목록 순서는 \`BackGround15 ~ BackGround1, Player_Ground, Front_1, Front_2, Default\` 순이며, 목록 아래쪽일수록 화면 앞쪽에 그려짐
  - \`Default\`가 목록 맨 아래 → 항상 모든 환경 오브젝트보다 앞에 그려짐
- 수정: \`Visual_Spine\`의 SkeletonAnimation Sorting Layer를 \`Default\` → \`Player_Ground\`로 변경 → 기둥(Player_Ground 레이어) 등 환경 오브젝트가 의도대로 플레이어 앞/뒤에 배치됨
- 부가: TilePalette 중복 GUID 9건 정리(머지 후 Unity가 자동 재할당), 변경 사항 커밋 및 PR 생성

---

## 2026-06-14

### Scene Graph Tool — 데이터 레이어 구축 (Plan 1)

씬 간 전환 관계를 에디터에서 시각화하는 **Scene Graph Tool**의 첫 번째 계획을 구현했다. UI 없이 데이터 파이프라인 전체를 완성하는 데 집중했다.

**구현 항목**

- \`SceneGraphPaths\`: 데이터 에셋 저장 경로 정의 + 폴더 자동 생성
- \`SceneNodeSerialized\` / \`SceneGraphCollection\`: 씬 노드와 컬렉션 데이터를 ScriptableObject로 영속화
- \`SceneGraphDataUtility\`: 컬렉션/노드 에셋 부트스트랩 (없으면 자동 생성)
- \`TransitionPointScanner\`: 씬 내 SceneTransitionPoint 컴포넌트를 스캔해 입출구 목록 반환
- \`SceneAddressResolver\`: Addressables 등록 정보 기반 주소 → 씬 경로 역변환
- \`TransitionLinkWriter\`: 씬 파일에 직접 연결 정보(ConnectedScene, ConnectedEntrance) 기록
- \`SceneLinkGraphBuilder\`: 두 씬의 TransitionPoint 데이터를 받아 단방향 엣지 목록 구성
- 모든 로직에 EditMode 테스트 작성

---

## 2026-06-15

### Scene Graph Tool v0.1 — GraphView UI 완성

GraphView 기반 에디터 창을 완성했다. 씬 에셋을 드래그해 노드로 등록하고, 노드 간 연결(Edge)을 그래프로 시각화할 수 있다.

<img src="V0.1버전.png" width="600">
<figcaption>Scene Graph Tool v0.1</figcaption>

**SceneCapture 파이프라인**

씬을 Additive로 열고 임시 Camera로 RenderTexture에 캡처 후 PNG 저장. Renderer bounds 기준 카메라 프레이밍 자동 계산.

**SceneNode 비주얼**

- 썸네일 이미지 + 우클릭 Recapture 메뉴
- 입출구(TransitionPoint)마다 Port 생성, 썸네일 위 좌표에 마커 배치
- \`MarkerCoordinateConverter\`: 월드 좌표 → 이미지 픽셀 → 디스플레이 좌표 변환
- 연결되지 않은 마커에 경고 배지(!) 표시

**SceneTransitionPointCache**

씬 파일 mtime 기반 캐싱. 연결/해제 시 캐시 자동 무효화, 씬 변경 시 다음 그래프 열기에서 재스캔.

**기타**

- Project 뷰에서 씬 에셋 드래그 → 노드 자동 등록 및 캡처
- 양방향 엣지 중복 제거 (A→B, B→A를 하나의 Edge로)
- 포트 연결/해제 시 씬 파일에 즉시 반영
- 노드 더블클릭으로 씬 열기, 창 닫을 때 뷰 위치/줌 저장

---

## 2026-06-16

### Scene Graph Tool v2 — 비주얼 테마 + Group 노드

v0.1의 기본 기능 위에 비주얼 다듬기와 그룹 노드 기능을 추가했다.

<img src="V0.2버전.png" width="700">
<figcaption>Scene Graph Tool v2</figcaption>

**포트/마커 구조 개선**

도어(입출구)당 Output + Input Port를 썸네일 위 같은 위치에 겹쳐 배치. Unity GraphView의 native EdgeConnector가 direction이 다른 두 Port를 자연스럽게 연결하게 됨. 마커는 반투명 처리해 썸네일을 가리지 않도록.

**USS 비주얼 테마**

\`SceneGraphView.uss\`로 다크 테마 적용. 그리드 배경, 노드 바디 색상, 마커 투명화, 경고 배지 스타일 정의.

**SceneEdge 커스텀 Bezier**

기본 \`EdgeControl\`이 Port 방향에 따라 제어점을 치우치게 설정하는 문제를 해결. \`SceneEdge\`에서 direction bias 없이 마커 사이 수평 bezier를 직접 그리도록 override. Unity 6 \`EdgeControl\` 공개 API 제한(setter 없음)으로 v4에서 커스텀 VisualElement로 완전 대체 예정.

**Group 노드**

- 배경 우클릭 → Create Group
- 노드를 드래그해 Group 안에 포함
- \`SceneGroupData\` ScriptableObject로 위치·레이블·멤버 씬 경로 영속화
- Group 삭제 시 멤버 SceneNode는 그래프에 유지
- Unity 6에 \`elementsAddedToGroup\` 이벤트 없음 → 창 닫을 때 \`GetContainingScope()\`로 멤버십 동기화

### Scene Graph Tool v3 — 노드 비주얼 개선 + bounds 기반 썸네일

<img src="V0.3버전.png" width="700">
<figcaption>Scene Graph Tool v3</figcaption>

**SceneGraphBoundary 컴포넌트**

씬 내 Level Scrolling Bounds에 붙이는 \`SceneGraphBoundary\` 컴포넌트 추가. 4개의 \`EdgeCollider2D\` points를 world 좌표로 변환해 씬의 정확한 bounds를 반환.

버그 수정: \`leftEdge.transform.position.x\`로 X를 읽으면 부모가 origin에 있을 때 0이 반환됨. local points가 실제 좌표를 인코딩하고 있어 \`TransformPoint(pt).x\`로 읽어야 정확함.

**SceneCapture bounds 우선 프레이밍**

씬에 \`SceneGraphBoundary\`가 있으면 해당 bounds 최우선 사용. bounds × PixelsPerUnit(8) = RenderTexture 크기. 씬 실제 비율이 그대로 썸네일 크기가 됨.

**SceneNode 비주얼 개선**

- \`#collapse-button\` 숨김 (GraphView 기본 접기 버튼 제거)
- \`#node-border\` border-radius 16px, 헤더 상단 코너도 라운드 처리
- 헤더 좌측에 햄버거 아이콘, 우측에 씬 열기 버튼
- 썸네일 고정 크기 제거 → \`data.RenderSize\`를 display 크기로 그대로 사용
- Recapture 후 썸네일 컨테이너 크기도 함께 갱신

---

## 2026-06-17

### Scene Graph Tool v4 — 핵심 기능 개선

- **자동 Recapture**: SceneGraphBoundary 컴포넌트를 껐다 켜면 해당 씬의 썸네일이 자동 갱신됨. \`[ExecuteAlways]\` + static event 패턴으로 Runtime→Editor 어셈블리 분리 해결. 씬 이동 시에는 \`sceneOpening\` 이벤트로 캡처 억제. 캡처 후 \`RebuildView()\`로 윈도우 갱신 (UI Toolkit Image 텍스처 직접 갱신 불가 → View 전체 재생성이 유일한 방법).
- **노드 더블클릭 → 씬 열기**: Scene Graph에서 노드를 더블클릭하면 해당 씬이 에디터에서 열림.
- **SceneGroup**: \`elementsAddedToGroup\`/\`elementsRemovedFromGroup\` 콜백 기반 멤버십 관리. 노드 추가 시 자동 리사이즈. \`SyncGroupMemberships()\` 폴링 제거.
- **마커 비주얼**: USS \`#cap\` 스타일링이 Port에서 작동 안 함 → PNG 다이아몬드 이미지로 전환. 코드에서 Image 요소 직접 추가, Port \`#connector\`는 \`visibility: hidden\`.
- **Edge 곡선**: \`EdgeControl.UpdateRenderPoints()\` override + reflection으로 \`m_RenderPoints\` 직접 제어. 노드 중심→마커 방향 벡터 기반 자연스러운 bezier 곡선 (Indie Tales 스타일).

### Scene Graph Tool v5 — UX 편의 기능

- **줌 아웃 범위**: \`SetupZoom(0.05f, 12f)\` — 100개+ 씬을 한 화면에 볼 수 있는 수준.
- **Group에서 노드 분리**: ☰ 아이콘 클릭+드래그 + 우클릭 \\"Remove from Group\\" 메뉴. \`Scope.RemoveElement\` + \`GraphView.AddElement\` 재배치 방식. Group 멤버십은 시각 트리(부모-자식)가 아닌 데이터로 관리됨.
- **씬 열기 버튼 개선**: ⊡ 텍스트 → 화살표 PNG 아이콘. 클릭 시 \`EditorApplication.delayCall\`로 Scene 탭 자동 전환.
- **검색 기능**: 상단 툴바에 상시 검색 필드. 씬/그룹 이름으로 검색, 드롭다운 결과 표시, 클릭/Enter로 해당 노드 위치로 카메라 이동.
- **커스텀 인스펙터**: \`SceneGraphCollectionEditor\` — \`ReorderableList\`로 씬 순서 변경 + ObjectField로 직접 추가/제거, Add/Remove All To Build 버튼.

<img src=\\"images/scene-graph-v5.png\\" alt=\\"Scene Graph Tool v5\\" style=\\"width:100%;max-width:860px;display:block;margin:16px 0;border-radius:8px;\\">

---

## 2026-06-21

### Scene Graph Tool v6 — 구조 설계

- **런타임/에디터 데이터 분리 설계**: 기존 \`SceneNodeSerialized\`가 런타임 씬 정보(GUID, 경로)와 에디터 전용 정보(썸네일, 그래프 위치, 캐시)를 혼합 보관하던 구조를 분리하기로 결정.
- **SceneMeta (런타임 SO)**: 씬 GUID + ReferencePath만 보관. 빌드에 포함 가능한 경량 ScriptableObject.
- **SceneNodeEditorData (에디터 전용 SO)**: 기존 SceneNodeSerialized를 리네임. 썸네일, 그래프 노드 위치, TransitionPoint 캐시 등 에디터 전용 데이터. SceneMeta 참조 포함.
- **SceneInstanceCollection (런타임 허브)**: Dictionary<GUID, SceneMeta> 기반 조회. 프리팹 참조(Engine, Camera, Player) 보관. 커스텀 인스펙터로 Build Settings / Addressables 검증.
- **SceneGraph (에디터 전용)**: 기존 SceneGraphCollection 리네임. 그래프 뷰 상태(위치, 줌), 노드/그룹 목록 관리.
- **폴더 구조 설계**: \`SceneMeta/\` (런타임 SO), \`SceneNodeEditor/\` (에디터 SO), \`Screenshots/\` (썸네일 PNG) 분리.
- **[FormerlySerializedAs] 전략**: 모든 리네임에 직렬화 호환 어트리뷰트 적용하여 기존 .asset 파일 마이그레이션 무중단.
- **스펙 문서 작성**: \`C:\\Git\\devlog\\specs\\2026-06-22-scene-instance-collection-design.md\`
- **구현 계획 작성**: \`C:\\Git\\devlog\\plans\\2026-06-22-scene-instance-collection-plan.md\` — Task 1~6 단계별 계획.

---

## 2026-06-22

### Scene Graph Tool v6 — 구현

- **Task 1: 런타임 데이터 모델 생성**
  - \`SceneMeta.cs\` (Runtime/) — SceneGUID + ReferencePath, #if UNITY_EDITOR setter
  - \`SceneInstanceCollection.cs\` (Runtime/) — List<SceneMeta> 기반 Dictionary 룩업, Register/Unregister, 프리팹 참조
  - EditMode 테스트: SceneMetaTests, SceneInstanceCollectionTests

- **Task 2: SceneNodeSerialized → SceneNodeEditorData 리네임**
  - 클래스/파일 리네임 + 모든 필드를 \`[SerializeField] private\` + 프로퍼티/setter 캡슐화
  - \`[FormerlySerializedAs]\` 적용으로 기존 .asset 호환 유지
  - 11개 파일 전체 참조 치환 (SceneCapture, SceneNode, SceneGraphView, MarkerCoordinateConverter 등)

- **Task 3: SceneGraphCollection → SceneGraph 리네임**
  - 동일 패턴: private 필드 + 프로퍼티/setter + FormerlySerializedAs
  - SceneInstanceCollection 참조(\`_registry\`) 추가
  - SceneGraphEditor, SceneGraphDataUtility, SceneGraphView 전체 업데이트

- **Task 4: SceneInstanceCollectionEditor 커스텀 인스펙터**
  - Save / Add All To Build / Remove All From Build 버튼
  - Scene Metas foldout (Keys: GUID, Values: ObjectField)
  - Validation: Addressables 미등록 경고, 파일 없음 경고, Build Settings 현황
  - Groups 표시, Global Prefab References (Engine/Camera/Player)

- **Task 5: SceneMetaWindow 전용 EditorWindow**
  - \`Window > Scene Graph Tool > Scene Meta\`로 접근
  - 그래프 노드 선택 시 스크린샷 미리보기 + 씬 이름/경로 + SceneMeta 인스펙터 표시
  - Snapshot ObjectField로 스크린샷 교체 가능
  - PointerUpEvent + TrickleDown으로 선택 감지

- **Task 6: 마이그레이션 + 경로 정리**
  - \`SceneGraphPaths\`에 SceneNodeEditor 폴더 + InstanceCollection 경로 추가
  - \`SceneGraphDataUtility.GetOrCreateSceneNode\`에서 SceneMeta 자동 생성/등록
  - \`SceneGraphMigrationUtility\` — 기존 노드에 SceneMeta 생성 + 파일 이동 일회성 스크립트

- **추가 개선**
  - 노드 삭제 시 관련 에셋(SceneNodeEditorData, SceneMeta, Screenshot, SceneInstanceCollection 등록) 정리 다이얼로그
  - 선 연결/해제 시 \`CachedTransitionPoints\` 즉시 갱신 (기존: 그래프 재시작 시에만)
  - \`SceneTransitionPointCache.Invalidate\` null 체크 추가 (삭제된 노드 MissingReferenceException 방지)

### 접근 방법

\`Window > Scene Graph Tool\` 메뉴에서 Scene Graph, Scene Meta, Migrate to v6 Data Model에 접근 가능.

<img src="images/scene-graph-v6-menu.png" width="500">

<figcaption>Window > Scene Graph Tool 메뉴 — Scene Graph / Scene Meta / 마이그레이션</figcaption>

### 스크린샷

<img src="images/scene-graph-v6-overview.png" width="800">
<figcaption>Scene Graph + SceneMetaWindow 전체 화면</figcaption>

<img src="images/scene-graph-v6-folder.png" width="400">
<figcaption>SceneGraphData 폴더 구조 — SceneMeta / SceneNodeEditor / Screenshots 분리</figcaption>

<img src="images/scene-instance-collection-inspector.png" width="500">
<figcaption>SceneInstanceCollection 커스텀 인스펙터</figcaption>

<img src="images/scene-meta-inspector.png" width="600">
<figcaption>SceneMeta 인스펙터 — Scene GUID + Reference Path</figcaption>

<img src="images/scene-node-editor-data-inspector.png" width="500">
<figcaption>SceneNodeEditorData 인스펙터 — Meta 참조, 캐시된 TransitionPoints</figcaption>

---

`;