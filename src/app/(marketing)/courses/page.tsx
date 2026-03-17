'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainHeader from '@/components/MainHeader';
import { ChevronRight, Gift, Clock, ShieldCheck, Zap, BookOpen } from 'lucide-react';

// ─── 7 Subjects ───
const subjects = [
  { id: "common-math-1", name: "공통수학 1" },
  { id: "common-math-2", name: "공통수학 2" },
  { id: "algebra", name: "대수" },
  { id: "calculus-1", name: "미적분 1" },
  { id: "geometry", name: "기하" },
  { id: "calculus-2", name: "미적분 2" },
  { id: "probability", name: "확률과 통계" },
];

// ─── Product Templates (per subject) ───
const productTemplates = [
  {
    key: "delta-0-regular",
    season: "방학",
    badge: "BEST",
    badgeColor: "bg-brand-mint text-brand-dark",
    label: "Δ0",
    name: "실전 개념 완성",
    tag: "Regular · 겨울방학 8주",
    price: 560000,
    duration: "8주 과정",
    modules: ["Δ0 개념 완성"],
    features: ["실전 개념 탑재 · 기본기 완성", "학교 생기부 가이드", "수행평가 가이드"],
    hasGuide: true,
    accentColor: "brand-mint",
    dotColor: "bg-brand-mint",
    borderHover: "hover:border-brand-mint/30",
  },
  {
    key: "delta-0-fast",
    season: "방학",
    badge: null,
    badgeColor: "",
    label: "Δ0",
    name: "Fast 압축 개념",
    tag: "Fast · 여름방학 5주",
    price: 350000,
    duration: "5주 과정",
    modules: ["Δ0 압축 개념"],
    features: ["핵심 개념 압축 완성"],
    hasGuide: false,
    accentColor: "brand-mint",
    dotColor: "bg-brand-mint",
    borderHover: "hover:border-brand-mint/30",
  },
  {
    key: "delta-1-final-bundle",
    season: "학기중",
    badge: "BUNDLE",
    badgeColor: "bg-brand-blue text-white",
    label: "Δ1 + ΔF",
    name: "내신 풀패키지",
    tag: "내신 대비 · 중간/기말 8주",
    price: 560000,
    duration: "8주 과정",
    modules: ["Δ1 기출 패턴 분석", "Δ FINAL 실전 모의고사"],
    features: ["필수 기출 유형 분석", "실전 모의고사", "학교 생기부 가이드", "수행평가 가이드"],
    hasGuide: true,
    accentColor: "brand-blue",
    dotColor: "bg-brand-blue",
    borderHover: "hover:border-brand-blue/30",
  },
  {
    key: "delta-final-only",
    season: "학기중",
    badge: null,
    badgeColor: "",
    label: "Δ F",
    name: "FINAL 단과",
    tag: "시험 직전 · 4주 집중",
    price: 280000,
    duration: "4주 과정",
    modules: ["Δ FINAL 실전 모의고사"],
    features: ["실전 모의고사 · 최종 점검"],
    hasGuide: false,
    accentColor: "purple-400",
    dotColor: "bg-purple-400",
    borderHover: "hover:border-purple-400/30",
  },
];

export default function CoursesPage() {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <MainHeader />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface border border-white/[0.06] text-xs font-mono text-white/40">
            CURRICULUM v2.0 — PRODUCT LINEUP
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">교육과정 & 수강신청</h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            과목을 선택하고, 나에게 맞는 패키지를 골라보세요.
          </p>
        </div>

        {/* Subject Selector Tabs */}
        <div className="mb-12">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedSubject.id === subject.id
                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                    : 'bg-brand-surface text-white/40 border border-white/[0.06] hover:text-white/70 hover:border-white/[0.12]'
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Subject Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedSubject.name}</h2>
            <p className="text-xs font-mono text-white/30">/{selectedSubject.id}/</p>
          </div>
        </div>

        {/* Season Sections */}
        {["방학", "학기중"].map((season) => {
          const seasonProducts = productTemplates.filter(p => p.season === season);
          return (
            <div key={season} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                  season === "방학" 
                    ? "bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
                    : "bg-brand-blue/10 text-brand-blue border border-brand-blue/20"
                }`}>
                  {season === "방학" ? "☀️ 방학 시즌" : "📚 학기 중 · 내신 대비"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seasonProducts.map((product) => (
                  <div
                    key={product.key}
                    className={`relative brand-card overflow-hidden flex flex-col ${product.borderHover} transition-all duration-300 group`}
                  >
                    {/* Top gradient accent */}
                    <div className={`h-1 w-full bg-${product.accentColor}`} />

                    <div className="p-6 md:p-8 flex flex-col flex-1">
                      {/* Badge + Label */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`w-2 h-2 rounded-full ${product.dotColor}`} />
                        <span className={`text-xs font-mono font-bold text-${product.accentColor}`}>
                          {product.label}
                        </span>
                        {product.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${product.badgeColor}`}>
                            {product.badge}
                          </span>
                        )}
                      </div>

                      {/* Title & Tag */}
                      <h3 className="text-xl font-bold text-white mb-1">
                        {selectedSubject.name} {product.name}
                      </h3>
                      <p className="text-xs font-mono text-white/30 mb-5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {product.tag}
                      </p>

                      {/* Included Modules */}
                      <div className="mb-4">
                        <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">포함 모듈</p>
                        <div className="flex flex-wrap gap-2">
                          {product.modules.map((mod, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/50 font-medium">
                              {mod}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-2 mb-6">
                        {product.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-white/50">
                            {product.hasGuide && (feature.includes("생기부") || feature.includes("수행평가")) ? (
                              <Gift className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 text-brand-mint shrink-0" />
                            )}
                            <span className={
                              product.hasGuide && (feature.includes("생기부") || feature.includes("수행평가"))
                                ? "text-yellow-400/80 font-semibold"
                                : ""
                            }>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Price + CTA */}
                      <div className="mt-auto pt-6 border-t border-white/[0.06]">
                        <div className="flex items-end justify-between mb-4">
                          <div>
                            <span className="text-3xl font-extrabold text-white">
                              {product.price.toLocaleString()}
                            </span>
                            <span className="text-sm font-normal text-white/40 ml-1">원</span>
                          </div>
                          <span className="text-xs font-mono text-white/25 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {product.duration}
                          </span>
                        </div>

                        <Link
                          href={`/checkout/${selectedSubject.id}?product=${product.key}`}
                          className={`flex justify-center items-center gap-2 w-full font-bold py-4 rounded-xl transition-all text-sm ${
                            product.badge === "BEST"
                              ? "bg-brand-mint text-brand-dark hover:bg-green-400 shadow-lg shadow-brand-mint/20"
                              : product.badge === "BUNDLE"
                              ? "bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/20"
                              : "bg-brand-surface hover:bg-brand-elevated text-white/80 border border-white/[0.08]"
                          }`}
                        >
                          수강 신청하기
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Delta 2 Hidden Teaser */}
        <div className="mt-4 brand-card p-6 md:p-8 border-dashed border-brand-orange/20 group hover:border-brand-orange/40 transition-all">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-brand-orange">Δ2</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedSubject.name} 심화 킬러
                  <span className="ml-2 text-[10px] font-mono text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full border border-brand-orange/20 align-middle">
                    최상위권 전용
                  </span>
                </h3>
                <p className="text-xs text-white/30 mt-1">킬러 문항 및 자사고/최상위권 고난도 딥다이브 · 별도 문의</p>
              </div>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange font-bold rounded-xl transition-all text-sm border border-brand-orange/20"
            >
              1:1 상담 문의
            </a>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center brand-card p-8 md:p-12">
          <h3 className="text-xl font-bold text-white mb-2">어떤 과목, 어떤 패키지가 맞을지 고민되시나요?</h3>
          <p className="text-white/40 text-sm mb-6">카카오톡으로 상담하시면 학생에게 맞는 커리큘럼을 추천해드립니다.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#371D1E] font-bold rounded-xl transition-colors text-sm"
            >
              카카오톡 상담하기
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-blue/20 text-sm"
            >
              회원가입 후 수강신청
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
