import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function qaCss(): string {
  const tailwindPreflightCss = readTailwindPreflightCss();
  const faithfulTutorCss = readGlobalsTutorCss();

  return `
    ${tailwindPreflightCss}
    body{margin:0;background:#f5f4ed;color:#141413;font-family:Pretendard,system-ui,sans-serif}button,textarea{font:inherit}a{color:inherit;text-decoration:none}iframe{display:block}fieldset{margin:0;border:0;padding:0;min-inline-size:0}legend{padding:0}
    .bg-parchment{background:#f5f4ed}.bg-ivory,.bg-white,.hover\\\\:bg-white:hover{background:#faf9f5}.bg-white\\/70{background:rgba(250,249,245,.7);}.bg-sand,.hover\\\\:bg-sand:hover{background:#e8e6dc}.bg-terracotta,.hover\\\\:bg-terracotta:hover{background:#c96442}.bg-terracotta-light,.hover\\\\:bg-terracotta-light:hover{background:#d97757}.bg-black{background:#000}
    .text-ink{color:#141413}.text-charcoal{color:#4d4c48}.text-olive{color:#5e5d59}.text-stone{color:#87867f}.text-terracotta{color:#c96442}.text-crimson{color:#b53333}.text-white{color:#fff}.hover\\\\:text-white:hover{color:#fff}.hover\\\\:text-terracotta:hover{color:#c96442}.hover\\\\:text-ink:hover{color:#141413}
    .border{border:1px solid}.border-t{border-top:1px solid #f0eee6}.border-b{border-bottom:1px solid #f0eee6}.border-border-cream{border-color:#f0eee6}.border-border-warm{border-color:#e8e6dc}.border-terracotta{border-color:#c96442}.border-0{border:0}.border-2{border-width:2px}.border-l-\\[3px\\]{border-left-width:3px}.hover\\\\:border-terracotta:hover{border-color:#c96442}
    .rounded-lg{border-radius:8px}.rounded-xl{border-radius:12px}.rounded-2xl{border-radius:16px}.rounded-md{border-radius:6px}.rounded-full{border-radius:999px}.shadow-whisper,.hover\\\\:shadow-ring-warm:hover{box-shadow:0 10px 24px rgba(67,51,31,.08)}.ring-1{box-shadow:0 0 0 1px rgba(255,255,255,.06)}
    .m-0{margin:0}.mx-auto{margin-left:auto;margin-right:auto}.mt-0\\.5{margin-top:2px}.mt-1{margin-top:4px}.mt-1\\.5{margin-top:6px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-8{margin-top:32px}.mb-2{margin-bottom:8px}.mb-2\\.5{margin-bottom:10px}.mb-4{margin-bottom:16px}.mb-8{margin-bottom:32px}.ml-8{margin-left:32px}.mr-8{margin-right:32px}
    .block{display:block}.inline-block{display:inline-block}.grid{display:grid}.flex{display:flex}.inline-flex{display:inline-flex}.hidden{display:none}.w-full{width:100%}.h-full{height:100%}.h-4{height:16px}.w-4{width:16px}.h-5,.w-5{height:20px;width:20px}.h-7,.w-7{height:28px;width:28px}.h-8,.w-8{height:32px;width:32px}.h-9,.w-9{height:36px;width:36px}.h-10,.w-10{height:40px;width:40px}.h-12,.w-12{height:48px;width:48px}.w-px{width:1px}.max-w-2xl{max-width:672px}.max-w-3xl{max-width:768px}.max-w-\\[85\\%\\]{max-width:85%;}.max-h-\\[24dvh\\]{max-height:24dvh}.min-h-12{min-height:48px}.min-h-\\[100dvh\\]{min-height:100dvh}.min-w-0{min-width:0}.flex-1{flex:1}.shrink-0{flex-shrink:0}
    .relative{position:relative}.absolute{position:absolute}.sticky{position:sticky}.inset-0{inset:0}.top-3{top:12px}.bottom-0{bottom:0}.left-3{left:12px}.z-10{z-index:10}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.overflow-x-auto{overflow-x:auto}.resize-none{resize:none}.aspect-video{aspect-ratio:16/9}.items-center{align-items:center}.items-start{align-items:flex-start}.self-end{align-self:flex-end;}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.place-items-center{place-items:center}.text-left{text-align:left}.text-center{text-align:center}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}
    .gap-1\\.5{gap:6px}.gap-2{gap:8px}.gap-2\\.5{gap:10px}.gap-3{gap:12px}.gap-4{gap:16px}.space-y-2>*+*{margin-top:8px}.space-y-3>*+*{margin-top:12px}.space-y-4>*+*{margin-top:16px}.space-y-6>*+*{margin-top:24px}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.divide-x>*+*{border-left:1px solid #f0eee6}.divide-y>*+*{border-top:1px solid #f0eee6}
    .p-0{padding:0}.p-3{padding:12px}.p-4{padding:16px}.p-5{padding:20px}.px-2\\.5{padding-left:10px;padding-right:10px}.px-3{padding-left:12px;padding-right:12px}.px-4{padding-left:16px;padding-right:16px}.px-5{padding-left:20px;padding-right:20px}.py-1{padding-top:4px;padding-bottom:4px}.py-1\\.5{padding-top:6px;padding-bottom:6px}.py-2{padding-top:8px;padding-bottom:8px}.py-2\\.5{padding-top:10px;padding-bottom:10px}.py-3{padding-top:12px;padding-bottom:12px}.py-3\\.5{padding-top:14px;padding-bottom:14px}.py-4{padding-top:16px;padding-bottom:16px}.py-8{padding-top:32px;padding-bottom:32px}.py-12{padding-top:48px;padding-bottom:48px}.pb-2{padding-bottom:8px}.pb-4{padding-bottom:16px}.pb-6{padding-bottom:24px}.pb-7{padding-bottom:28px}.pt-1{padding-top:4px}.pt-2{padding-top:8px}.pt-6{padding-top:24px}.pr-1{padding-right:4px}
    .text-\\[10px\\]{font-size:10px}.text-\\[11px\\]{font-size:11px}.text-\\[12px\\]{font-size:12px}.text-\\[13px\\]{font-size:13px}.text-\\[14px\\]{font-size:14px}.text-\\[15px\\]{font-size:15px}.text-\\[16px\\]{font-size:16px}.text-\\[28px\\]{font-size:28px}.text-\\[32px\\]{font-size:32px}
    .font-medium{font-weight:500}.font-semibold{font-weight:600}.font-normal{font-weight:400}.font-serif{font-family:Georgia,"Noto Serif KR",serif}.font-mono{font-family:ui-monospace,monospace}.leading-5{line-height:20px}.leading-6{line-height:24px}.leading-snug{line-height:1.35}.leading-tight{line-height:1.25}.tracking-\\[0\\.08em\\]{letter-spacing:.08em}.tracking-\\[0\\.12em\\]{letter-spacing:.12em}.tracking-tight{letter-spacing:0}.tracking-wider{letter-spacing:.05em}.uppercase{text-transform:uppercase}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.line-through{text-decoration:line-through}.no-underline{text-decoration:none}
    .transition,.transition-all,.transition-colors{transition:all .15s ease-out}.duration-150{transition-duration:150ms}.ease-out{transition-timing-function:ease-out}.outline-none{outline:none}.break-keep{word-break:keep-all;overflow-wrap:break-word}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.bg-white\\/60,.hover\\\\:bg-white\\/60:hover{background:rgba(250,249,245,.6)}.bg-sand\\/50{background:rgba(232,230,220,.5)}.bg-crimson\\/10{background:rgba(181,51,51,.1)}.bg-terracotta\\/10{background:rgba(201,100,66,.1)}
    button:focus-visible,textarea:focus-visible,a:focus-visible{outline:2px solid #c96442;outline-offset:2px}button:disabled{opacity:.65;cursor:not-allowed}#unmount-harness{position:fixed;right:8px;bottom:8px;opacity:.01}${faithfulTutorCss}
    .bg-terracotta{background:#c96442;background-color:#c96442}.text-white{color:#fff}.bg-white\\/70{background:rgba(250,249,245,.7);background-color:rgba(250,249,245,.7)}
  `;
}

export function productKatexCss(): string {
  return readKatexCss();
}

function readTailwindPreflightCss(): string {
  return readFileSync(join(process.cwd(), 'node_modules/tailwindcss/lib/css/preflight.css'), 'utf8')
    .replace(/theme\('borderColor\.DEFAULT', currentColor\)/g, '#e5e7eb')
    .replace(/theme\('fontFamily\.sans', [^)]+\)/g, 'ui-sans-serif, system-ui, sans-serif')
    .replace(/theme\('fontFamily\.mono', [^)]+\)/g, 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace')
    .replace(/theme\('fontFamily\.sans\[1\]\.fontFeatureSettings', normal\)/g, 'normal')
    .replace(/theme\('fontFamily\.sans\[1\]\.fontVariationSettings', normal\)/g, 'normal')
    .replace(/theme\('fontFamily\.mono\[1\]\.fontFeatureSettings', normal\)/g, 'normal')
    .replace(/theme\('fontFamily\.mono\[1\]\.fontVariationSettings', normal\)/g, 'normal')
    .replace(/theme\('colors\.gray\.400', #9ca3af\)/g, '#9ca3af');
}

function readKatexCss(): string {
  const katexDist = join(process.cwd(), 'node_modules/katex/dist');
  return readFileSync(join(katexDist, 'katex.min.css'), 'utf8').replace(/url\(fonts\/([^)]+)\)/g, (_match, fontFile: string) => {
    const fontPath = join(katexDist, 'fonts', fontFile);
    const mimeType = fontFile.endsWith('.woff2')
      ? 'font/woff2'
      : fontFile.endsWith('.woff')
        ? 'font/woff'
        : 'font/ttf';
    return `url(data:${mimeType};base64,${readFileSync(fontPath).toString('base64')})`;
  });
}

function readGlobalsTutorCss(): string {
  const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
  const startMarker = '/* AI Tutor math rendering guardrails.';
  const endMarker = '/* --------------------------------------------------------';
  const startIndex = globalsCss.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error('Missing AI Tutor CSS block in globals.css');
  }
  const endIndex = globalsCss.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    throw new Error('Missing Utility classes marker after AI Tutor CSS block');
  }
  return globalsCss.slice(startIndex, endIndex).replace(/\/\*[\s\S]*?\*\//g, '');
}
