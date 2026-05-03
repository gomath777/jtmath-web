import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// 어드민 탭 전용 아이콘 — 파란 배경으로 학생 탭과 구분
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1d4ed8',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '7px',
        }}
      >
        {/* 가로 획 */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 7,
            width: 18,
            height: 4,
            borderRadius: 2,
            background: '#ffffff',
          }}
        />
        {/* 세로 획 */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 14,
            width: 4,
            height: 16,
            borderRadius: 2,
            background: '#ffffff',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
