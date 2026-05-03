'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MergedWeek } from '@/lib/merge-runs';
import { weeklyGoalMinMiles } from '@/lib/plan-progress';
import { countsTowardRunningVolume } from '@/lib/strava';
import Confetti from './Confetti';

const CELEBRATION_MESSAGES = [
  "You hit your weekly goal! That's the kind of consistency that wins race day.",
  "Week complete. You're building something real—one run at a time.",
  "Boom! Weekly miles in the bag. Your future self will thank you.",
  "Goal crushed. Keep trusting the process.",
  "That's a wrap on this week's miles. Strong work.",
  "You showed up. You hit the number. That's what champions do.",
  "Another week, another checkmark. You're on track.",
  "Weekly goal: done. Enjoy the win and recover well.",
  "Miles don't lie—and you just proved you can hit them.",
  "One week closer to the start line. Nice work.",
  "You didn't just run; you ran with a plan. And you nailed it.",
  "Consistency wins. You just added another week of proof.",
  "Your legs and your plan are in sync. Keep it going.",
  "Week goal: achieved. That's how you build to race day.",
  "Strong week. You're putting in the work when it counts.",
  "Another block in the wall. Solid.",
  "You hit your target. That's the discipline that gets you to the finish.",
  "Weekly miles: complete. You're making it happen.",
  "Plan followed. Goal met. That's how you get ready.",
  "You showed up for yourself this week. That matters.",
];

function getCompletedWeekNumbers(weeks: MergedWeek[]): number[] {
  const out: number[] = [];
  for (const week of weeks) {
    const completedMi = week.runs
      .filter((r) => r.actual != null && countsTowardRunningVolume(r.actual.activityType))
      .reduce((sum, r) => sum + r.actual!.distanceMi, 0);
    const plannedMin = weeklyGoalMinMiles(week.miles);
    if (plannedMin > 0 && completedMi >= plannedMin) {
      out.push(week.num);
    }
  }
  return out;
}

export default function WeekGoalCelebration({
  planId,
  mergedWeeks,
  celebratedWeekNumbers = [],
}: {
  planId: string;
  mergedWeeks: MergedWeek[];
  celebratedWeekNumbers?: number[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [weekNumsToCelebrate, setWeekNumsToCelebrate] = useState<number[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!mergedWeeks?.length) return;
    const completed = getCompletedWeekNumbers(mergedWeeks);
    const notYetCelebrated = completed.filter((w) => !celebratedWeekNumbers.includes(w));
    if (notYetCelebrated.length === 0) return;
    setWeekNumsToCelebrate(notYetCelebrated);
    const index = notYetCelebrated[0] % CELEBRATION_MESSAGES.length;
    setMessage(CELEBRATION_MESSAGES[index]);
    setShow(true);
  }, [mergedWeeks, celebratedWeekNumbers]);

  const close = async () => {
    if (weekNumsToCelebrate.length > 0) {
      await fetch(`/api/plan/${planId}/celebrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNumbers: weekNumsToCelebrate }),
      });
      router.refresh();
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <Confetti />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'rgba(0,0,0,0.6)',
          animation: 'celebration-fadeIn 0.3s ease-out',
        }}
        onClick={close}
      >
        <style>{`
          @keyframes celebration-fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes celebration-modalPop {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }
          .celebration-modal {
            animation: celebration-modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>
        <div
          id="celebration-title"
          className="celebration-modal"
          style={{
            background: '#141414',
            border: '1px solid #262626',
            borderRadius: 16,
            padding: '2rem',
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>🎉</span>
          </div>
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.75rem',
              letterSpacing: '0.02em',
              color: '#f5f5f5',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}
          >
            Weekly goal hit!
          </h2>
          <p
            style={{
              color: '#a3a3a3',
              fontSize: '1rem',
              lineHeight: 1.6,
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={close}
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 20px',
              background: '#e85d04',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Awesome, thanks!
          </button>
        </div>
      </div>
    </>
  );
}
