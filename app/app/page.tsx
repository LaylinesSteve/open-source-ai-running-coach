'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // up up down down left right left right B A

export default function HomePage() {
  const router = useRouter();
  const passkeyRef = useRef<HTMLDivElement>(null);
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [konamiFired, setKonamiFired] = useState(false);
  const [eggClicks, setEggClicks] = useState(0);
  const [egg2Revealed, setEgg2Revealed] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({ hero: true });
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollToPasskey = () => {
    passkeyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: passkey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Invalid passkey');
        setLoading(false);
        return;
      }
      router.push('/app/form');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

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
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
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
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232, 93, 4, 0.35); }
          50% { box-shadow: 0 0 0 12px rgba(232, 93, 4, 0); }
        }
        @keyframes konamiCelebrate {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .landing-hero-bg {
          background: linear-gradient(135deg, #0a0a0a 0%, #141414 25%, #1a1a1a 50%, #141414 75%, #0a0a0a 100%);
          background-size: 400% 400%;
          animation: gradientShift 14s ease infinite;
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
        .landing-cta-hero {
          animation: pulseGlow 2.5s ease-in-out infinite;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
        .egg-word { cursor: pointer; user-select: none; }
        .egg-word:hover { color: #e85d04; }
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
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(24px, 6vw, 64px) 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 80% 50% at 50% 120%, rgba(232,93,4,0.08) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 720 }}>
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(3rem, 12vw, 5.5rem)',
                fontWeight: 400,
                letterSpacing: '0.02em',
                lineHeight: 1,
                marginBottom: 20,
                opacity: visible.hero ? 1 : 0,
                transform: visible.hero ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
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
                fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
                color: '#a3a3a3',
                maxWidth: 480,
                margin: '0 auto 40px',
                lineHeight: 1.5,
                opacity: visible.hero ? 1 : 0,
                transform: visible.hero ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
              }}
            >
              A personalized training plan built from your goal, your date, and your Strava—so you show up ready.
            </p>
            <div
              style={{
                opacity: visible.hero ? 1 : 0,
                transform: visible.hero ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
              }}
            >
              <button
                type="button"
                onClick={scrollToPasskey}
                className="landing-cta landing-cta-hero"
                style={{
                  padding: '18px 40px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#fff',
                  background: '#e85d04',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                Create my training plan
              </button>
            </div>
            <p
              style={{
                marginTop: 28,
                fontSize: '0.85rem',
                color: '#737373',
                opacity: visible.hero ? 1 : 0,
                transition: 'opacity 0.8s ease 0.4s',
              }}
            >
              Takes under a minute · Connect Strava for a plan that fits your current fitness
            </p>
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
            padding: 'clamp(64px, 12vw, 120px) 24px',
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
                body: 'Your race date, distance, and goal—plus optional Strava history—shape a plan that matches where you are.',
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

        {/* CTA + Passkey */}
        <section
          ref={(el) => { sectionRefs.current.getstarted = el; }}
          data-section="getstarted"
          style={{
            padding: 'clamp(48px, 10vw, 100px) 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
              letterSpacing: '0.02em',
              marginBottom: 12,
              opacity: visible.getstarted ? 1 : 0,
              transform: visible.getstarted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            Get started
          </h2>
          <p
            style={{
              color: '#737373',
              fontSize: '0.95rem',
              marginBottom: 32,
              opacity: visible.getstarted ? 1 : 0,
              transition: 'opacity 0.6s ease 0.1s',
            }}
          >
            Enter your passkey to create your plan.
          </p>
          <div
            ref={passkeyRef}
            style={{
              width: '100%',
              maxWidth: 360,
              opacity: visible.getstarted ? 1 : 0,
              transform: visible.getstarted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
            }}
          >
            <form onSubmit={submit}>
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Passkey"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: '#141414',
                  border: '1px solid #262626',
                  borderRadius: 10,
                  color: '#f5f5f5',
                  fontSize: 16,
                  marginBottom: 16,
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <p style={{ color: '#e85d04', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="landing-cta"
                style={{
                  width: '100%',
                  padding: 14,
                  background: '#e85d04',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
            <p style={{ marginTop: 24, fontSize: '0.85rem', color: '#737373', textAlign: 'center' }}>
              <a href="/training-plan.html" style={{ color: '#e85d04', textDecoration: 'none' }}>
                View example plan →
              </a>
            </p>
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
