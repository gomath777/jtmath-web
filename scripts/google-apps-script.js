/**
 * jtmath 구글 폼 → 자동 계정 생성 연동 스크립트
 *
 * [설치 방법]
 * 1. 구글 시트 열기 → 확장프로그램 → Apps Script
 * 2. 이 코드 전체 붙여넣기
 * 3. WEBHOOK_URL, SECRET_KEY 값 설정
 * 4. 트리거 설정: onFormSubmit 함수 → 이벤트: 스프레드시트에서 → 폼 제출 시
 * 5. 저장 후 권한 승인
 *
 * [구글 폼 열 순서 가정]
 * A: 타임스탬프
 * B: 스마트 스토어 구매자 네이버 아이디
 * C: 수강 옵션
 * D: 이름(학생)
 * E: 본인(학생) 핸드폰
 * F: 본인(학생) 이메일
 * G: 생년월일 (yyyy-mm-dd)
 * H: 재학중인 학교
 * I: 학부모님 성함
 * J: 학부모님 핸드폰
 * K: 남기고 싶은 메세지
 * L: 개인정보 수집 동의서
 */

// ★ 여기 두 값을 설정하세요
var WEBHOOK_URL = 'https://jtmath-web.vercel.app/api/register-from-sheet';
var SECRET_KEY = 'jtmath-sheet-sync-2026';

function onFormSubmit(e) {
  var sheet = e.source.getActiveSheet();
  var row = e.range.getRow();
  var values = sheet.getRange(row, 1, 1, 12).getValues()[0];

  // 열 파싱
  var timestamp    = values[0];
  var naverId      = values[1];
  var courseOption = values[2];
  var name         = values[3];
  var phoneStudent = values[4];
  var email        = values[5];
  var birthDate    = values[6];
  var school       = values[7];
  var parentName   = values[8];
  var phoneParent  = values[9];
  var message      = values[10];
  // var consent   = values[11]; // 동의서 (참고용)

  // 이메일 없으면 스킵
  if (!email || email.trim() === '') {
    logResult(sheet, row, '스킵: 이메일 없음', '');
    return;
  }

  // 생년월일 포맷 정규화 (yyyy-mm-dd 또는 숫자 6자리 모두 허용)
  var birthDateStr = String(birthDate);
  // 구글 시트에서 날짜를 Date 객체로 인식하는 경우 처리
  if (birthDate instanceof Date) {
    var y = birthDate.getFullYear();
    var m = String(birthDate.getMonth() + 1).padStart(2, '0');
    var d = String(birthDate.getDate()).padStart(2, '0');
    birthDateStr = y + '-' + m + '-' + d;
  }

  var payload = {
    email: email.trim(),
    name: name.trim(),
    school: school.trim(),
    birth_date: birthDateStr.trim(),
    phone_student: String(phoneStudent).trim(),
    phone_parent: String(phoneParent).trim(),
    course_option: String(courseOption).trim(),
    naver_id: String(naverId).trim(),
    duration_months: 6,  // 기본 6개월. 필요시 수정
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + SECRET_KEY,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var code = response.getResponseCode();
    var result = JSON.parse(response.getContentText());

    if (code === 200 && result.success) {
      logResult(sheet, row, '✅ 성공', result.message + ' | PW: ' + result.password);
    } else {
      logResult(sheet, row, '❌ 실패', result.error || '알 수 없는 오류');
    }
  } catch (err) {
    logResult(sheet, row, '❌ 오류', err.toString());
  }
}

// 시트에 처리 결과 기록 (M, N열)
function logResult(sheet, row, status, detail) {
  sheet.getRange(row, 13).setValue(status);         // M열: 처리 상태
  sheet.getRange(row, 14).setValue(detail);          // N열: 상세 내용
  sheet.getRange(row, 15).setValue(new Date());      // O열: 처리 시각
}
