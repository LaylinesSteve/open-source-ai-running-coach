'use client';

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { FormVisual, PlanVisual, WeekVisual } from '@/app/components/ToolCardVisuals';
import { SKINS } from '@/lib/weekly-skins';

const KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // up up down down left right left right B A

const TOOLS: {
  title: string;
  visual: ReactNode;
  badge?: string;
  body: string;
  note?: string;
  link?: { label: string; href: string };
  secondary?: { label: string; href: string };
}[] = [
  {
    title: 'Training plan',
    visual: <PlanVisual />,
    body: 'A plan built from your goal, your race date and your Strava runs, with a coach you can ask anything.',
    note: 'Free · Takes under a minute',
    link: { label: 'Create my plan', href: '/app/form' },
    secondary: { label: 'View a sample plan', href: '/training-plan.html' },
  },
  {
    title: 'Weekly recap',
    visual: <WeekVisual />,
    body: `Turn your Strava week into a card worth sharing. Pick from ${SKINS.length} visual themes, save the image and post it.`,
    note: 'Free · Connect Strava',
    link: { label: 'See my week', href: '/app/weekly' },
  },
  {
    title: 'Running form analysis',
    visual: <FormVisual />,
    badge: 'Coming soon',
    body: 'See how your cadence, ground contact time and stride change at the same pace, using your Garmin data, then ask AI what to work on.',
  },
];

export default function HomePage() {
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [konamiFired, setKonamiFired] = useState(false);
  const [eggClicks, setEggClicks] = useState(0);
  const [egg2Revealed, setEgg2Revealed] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({ hero: true });
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (konamiFired) return;
      const next = KONAMI[konamiIndex];
      if (e.keyCode === next) {
        if (konamiIndex === KONAMI.length - 1) {
          setKonamiFired(true);
        } else {
          setKonamiIndex((i) => i + 1);
        }
      } else {
        setKonamiIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex, konamiFired]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-section');
          if (id && entry.isIntersecting) {
            setVisible((v) => ({ ...v, [id]: true }));
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleEggWordClick = useCallback(() => {
    const next = eggClicks + 1;
    setEggClicks(next);
    if (next >= 2 && !egg2Revealed) {
      setEgg2Revealed(true);
    }
  }, [eggClicks, egg2Revealed]);

  const handleHeadlineDoubleClick = useCallback(() => {
    setKonamiFired(true);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes konamiCelebrate {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .landing-hero-bg {
          background: radial-gradient(ellipse 80% 50% at 50% 120%, rgba(232, 93, 4, 0.12) 0%, transparent 50%), #0a0a0a;
        }
        .landing-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(232, 93, 4, 0.35);
        }
        .landing-cta:active {
          transform: translateY(0);
        }
        .landing-cta {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
        .egg-word { cursor: pointer; user-select: none; }
        .egg-word:hover { color: #e85d04; }
        .landing-tools {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 560px;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 20px;
          text-align: left;
        }
        .landing-tool {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (min-width: 960px) {
          .landing-tools {
            max-width: 1240px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-template-rows: auto 1fr;
            row-gap: 0;
          }
          .landing-tool {
            display: grid;
            grid-row: span 2;
            grid-template-rows: subgrid;
          }
        }
        .landing-tool-card {
          transition: border-color 0.2s, background 0.2s;
        }
        .landing-tool-card:hover {
          border-color: rgba(232, 93, 4, 0.55);
          background: rgba(255, 255, 255, 0.05);
        }
        .landing-hero-github-link {
          color: #e85d04;
          text-decoration: none;
        }
        .landing-hero-github-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#f5f5f5',
          fontFamily: "'Syne', system-ui, sans-serif",
        }}
      >
        {/* Hero */}
        <section
          className="landing-hero-bg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(24px, 6vw, 64px) 24px clamp(24px, 4vh, 48px) 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 720 }}>
            <p
              style={{
                fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)',
                color: '#737373',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: 12,
                opacity: visible.hero ? 1 : 0,
                transform: visible.hero ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
              }}
            >
              Free open source tool for the running community. Find the{' '}
              <a
                href="https://github.com/LaylinesSteve/open-source-ai-running-coach"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-hero-github-link"
              >
                codebase on GitHub
              </a>
            </p>
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(3.5rem, 14vw, 6rem)',
                fontWeight: 400,
                letterSpacing: '0.02em',
                lineHeight: 0.95,
                marginBottom: 8,
                opacity: visible.hero ? 1 : 0,
                transform: visible.hero ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
              }}
            >
              Your race.
              <br />
              <span
                role="button"
                tabIndex={0}
                onDoubleClick={handleHeadlineDoubleClick}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).click()}
                style={{
                  color: '#e85d04',
                  cursor: 'pointer',
                  userSelect: 'none',
                  outline: 'none',
                }}
              >
                Your plan.
              </span>
            </h1>
            <p
              style={{
                fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                color: '#a3a3a3',
                maxWidth: 440,
                margin: '0 auto 2.5rem',
                lineHeight: 1.5,
                opacity: visible.hero ? 1 : 0,
                transform: visible.hero ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s',
              }}
            >
              A free running coach powered by Strava and AI. Personalized plans from your goal, your date, and your runs—open source for the running community.
            </p>
          </div>

          <div className="landing-tools">
            {TOOLS.map((tool, i) => (
              <div
                key={tool.title}
                className={`landing-tool${tool.link ? ' landing-tool-card' : ''}`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.08)',
                  opacity: visible.hero ? 1 : 0,
                  transform: visible.hero ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.7s ease ${0.45 + i * 0.08}s, transform 0.7s ease ${0.45 + i * 0.08}s, border-color 0.2s, background 0.2s`,
                }}
              >
                {tool.visual}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px 24px 26px' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 10px', color: '#f5f5f5' }}>{tool.title}</h2>
                  <p style={{ fontSize: '1rem', color: '#a3a3a3', lineHeight: 1.55, margin: '0 0 12px' }}>{tool.body}</p>
                  {tool.note && (
                    <p style={{ fontSize: '0.85rem', color: '#737373', margin: '0 0 18px' }}>{tool.note}</p>
                  )}
                  <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
                    {tool.link && (
                      <Link
                        href={tool.link.href}
                        className="landing-cta"
                        style={{
                          padding: '13px 22px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: '#fff',
                          background: '#e85d04',
                          borderRadius: 8,
                          textDecoration: 'none',
                        }}
                      >
                        {tool.link.label}
                      </Link>
                    )}
                    {tool.badge && (
                      <span
                        style={{
                          padding: '12px 20px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: '#a3a3a3',
                          border: '1px solid #404040',
                          borderRadius: 8,
                        }}
                      >
                        {tool.badge}
                      </span>
                    )}
                    {tool.secondary && (
                      <a
                        href={tool.secondary.href}
                        style={{ fontSize: '0.9rem', color: '#a3a3a3', textUnderlineOffset: 3 }}
                      >
                        {tool.secondary.label}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {/* Easter egg 2: click "run" twice */}
            <p
              style={{
                marginTop: 16,
                fontSize: '0.9rem',
                color: '#525252',
              }}
            >
              Built for runners who{' '}
              <span
                className="egg-word"
                onClick={handleEggWordClick}
                onKeyDown={(e) => e.key === 'Enter' && handleEggWordClick()}
                role="button"
                tabIndex={0}
                style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                run
              </span>
              .
            </p>
            {egg2Revealed && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: '0.95rem',
                  color: '#e85d04',
                  animation: 'fadeIn 0.5s ease',
                }}
              >
                You found the start line. Now go run it.
              </p>
            )}
          </div>
        </section>

        {/* Benefits */}
        <section
          ref={(el) => { sectionRefs.current.benefits = el; }}
          data-section="benefits"
          style={{
            padding: 'clamp(48px, 8vw, 88px) 24px clamp(64px, 12vw, 120px) 24px',
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 2.75rem)',
              letterSpacing: '0.02em',
              textAlign: 'center',
              marginBottom: 48,
              opacity: visible.benefits ? 1 : 0,
              transform: visible.benefits ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            Built for the road ahead
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 32,
            }}
          >
            {[
              {
                title: 'Tailored to you',
                body: 'Your race date, distance, and goal. Your Strava history and feedback shape a plan that adapts as you go.',
              },
              {
                title: 'Coach in your corner',
                body: 'Every run gets a short coach tip. Revise the plan anytime and the AI keeps context of what you asked.',
              },
              {
                title: 'Sync and stay on track',
                body: 'Connect Strava to log completed runs against the plan and see how you’re stacking up.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                style={{
                  padding: 24,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  opacity: visible.benefits ? 1 : 0,
                  transform: visible.benefits ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease ${0.1 + i * 0.1}s, transform 0.6s ease ${0.1 + i * 0.1}s`,
                }}
              >
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#f5f5f5' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#a3a3a3', lineHeight: 1.55 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Easter egg 1: Konami code */}
      {konamiFired && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            animation: 'fadeIn 0.3s ease',
          }}
          role="dialog"
          aria-live="polite"
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '2px solid #e85d04',
              borderRadius: 16,
              padding: '32px 40px',
              textAlign: 'center',
              maxWidth: 320,
              animation: 'konamiCelebrate 0.4s ease',
            }}
          >
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', marginBottom: 8 }}>
              You&apos;re ready.
            </p>
            <p style={{ color: '#a3a3a3', fontSize: '1rem' }}>Now run.</p>
            <button
              type="button"
              onClick={() => setKonamiFired(false)}
              style={{
                marginTop: 20,
                padding: '10px 24px',
                background: '#e85d04',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
